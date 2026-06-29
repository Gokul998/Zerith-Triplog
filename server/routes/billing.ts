import { Router, Request, Response, NextFunction } from "express";
import { queryOne, execute } from "../db/mysql";
import { requireAuth } from "../auth";
import crypto from "crypto";
import Razorpay from "razorpay";
import Stripe from "stripe";

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-06-20" } as any);
}

const PRO_PRICE_INR = 29900; // paise = ₹299
const PRO_PRICE_USD = 499;   // cents = $4.99

function effectivePlan(user: any): string {
  if (user.plan === "pro") return "pro";
  if (user.plan === "trial" && user.trial_ends_at && new Date(user.trial_ends_at) > new Date()) return "trial";
  return "free";
}

// GET /api/billing/status
router.get("/status", requireAuth, wrap(async (req, res) => {
  const userId = (req as any).userId;
  const user = await queryOne<any>("SELECT id, plan, trial_ends_at FROM users WHERE id = ?", [userId]);
  if (!user) return res.status(404).json({ error: "User not found" });
  const plan = effectivePlan(user);
  const sub = await queryOne<any>(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  res.json({
    plan,
    raw_plan: user.plan,
    trial_ends_at: user.trial_ends_at,
    trial_expired: user.plan === "trial" && new Date(user.trial_ends_at) <= new Date(),
    subscription: sub || null,
    razorpay_key: process.env.RAZORPAY_KEY_ID || null,
    stripe_publishable: process.env.STRIPE_PUBLISHABLE_KEY || null,
  });
}));

// POST /api/billing/razorpay/order — create a Razorpay order
router.post("/razorpay/order", requireAuth, wrap(async (req, res) => {
  const razorpay = getRazorpay();
  if (!razorpay) return res.status(503).json({ error: "Razorpay not configured" });
  const userId = (req as any).userId;

  const order = await (razorpay.orders as any).create({
    amount: PRO_PRICE_INR,
    currency: "INR",
    receipt: `tl_${userId.slice(0, 8)}_${Date.now()}`,
    notes: { userId },
  });

  // Store a pending subscription record
  const id = crypto.randomUUID();
  await execute(
    "INSERT INTO subscriptions (id, user_id, provider, provider_order_id, status, plan, amount, currency, interval_type) VALUES (?, ?, 'razorpay', ?, 'pending', 'pro', ?, 'INR', 'monthly')",
    [id, userId, order.id, PRO_PRICE_INR / 100]
  );

  res.json({ order_id: order.id, amount: PRO_PRICE_INR, currency: "INR", sub_id: id });
}));

// POST /api/billing/razorpay/verify — verify payment signature and activate
router.post("/razorpay/verify", requireAuth, wrap(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) return res.status(400).json({ error: "Invalid signature" });

  const userId = (req as any).userId;
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await execute(
    `UPDATE subscriptions SET status = 'active', provider_sub_id = ?, current_period_end = ? WHERE provider_order_id = ? AND user_id = ?`,
    [razorpay_payment_id, periodEnd, razorpay_order_id, userId]
  );
  await execute("UPDATE users SET plan = 'pro' WHERE id = ?", [userId]);

  const user = await queryOne<any>("SELECT id, name, email, avatar_color, plan, trial_ends_at FROM users WHERE id = ?", [userId]);
  res.json({ ok: true, plan: "pro", user: { ...user, plan: "pro" } });
}));

// POST /api/billing/stripe/checkout — create Stripe checkout session
router.post("/stripe/checkout", requireAuth, wrap(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Stripe not configured" });
  const userId = (req as any).userId;
  const appUrl = process.env.APP_URL || "https://mytriplog.in";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: "TripLog Pro", description: "Unlimited trips, AI features, team collaboration" },
        unit_amount: PRO_PRICE_USD,
        recurring: { interval: "month" },
      },
      quantity: 1,
    }],
    metadata: { userId },
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
  });

  res.json({ url: session.url, session_id: session.id });
}));

// POST /api/billing/stripe/webhook — Stripe webhook
router.post("/stripe/webhook", express_raw_body_middleware, wrap(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(503).json({ error: "Webhook secret not set" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    if (!userId) return res.json({ received: true });

    const subId = session.subscription as string;
    const sub = await stripe.subscriptions.retrieve(subId);
    const periodEnd = new Date((sub as any).current_period_end * 1000);

    const id = crypto.randomUUID();
    await execute(
      "INSERT INTO subscriptions (id, user_id, provider, provider_sub_id, status, plan, amount, currency, interval_type, current_period_end) VALUES (?, ?, 'stripe', ?, 'active', 'pro', ?, 'USD', 'monthly', ?)",
      [id, userId, subId, PRO_PRICE_USD / 100, periodEnd]
    );
    await execute("UPDATE users SET plan = 'pro' WHERE id = ?", [userId]);
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await execute(
      "UPDATE subscriptions SET status = 'cancelled' WHERE provider_sub_id = ?",
      [sub.id]
    );
    // Check if user has any other active subs before downgrading
    const active = await queryOne(
      "SELECT id FROM subscriptions WHERE user_id = (SELECT user_id FROM subscriptions WHERE provider_sub_id = ?) AND status = 'active' LIMIT 1",
      [sub.id]
    );
    if (!active) {
      const row = await queryOne<any>("SELECT user_id FROM subscriptions WHERE provider_sub_id = ?", [sub.id]);
      if (row) await execute("UPDATE users SET plan = 'free' WHERE id = ?", [row.user_id]);
    }
  }

  res.json({ received: true });
}));

// Middleware to capture raw body for Stripe webhook signature verification
function express_raw_body_middleware(req: any, res: any, next: any) {
  let data = "";
  req.setEncoding("utf8");
  req.on("data", (chunk: string) => { data += chunk; });
  req.on("end", () => { req.rawBody = data; next(); });
}

export default router;
