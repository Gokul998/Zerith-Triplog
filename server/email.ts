import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  });
}

export async function sendInviteEmail(to: string, tripTitle: string, inviterName: string, inviteToken: string, appUrl: string) {
  const link = `${appUrl}/invite/${inviteToken}`;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || "noreply@triplog.app",
      to,
      subject: `${inviterName} invited you to join "${tripTitle}" on TripLog`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h1 style="color:#4f46e5;margin-bottom:8px">TripLog ✈️</h1>
          <p style="color:#374151;font-size:16px"><strong>${inviterName}</strong> has invited you to join the trip <strong>${tripTitle}</strong>.</p>
          <a href="${link}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Join the Trip</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Link expires in 7 days. If you didn't expect this invite, you can ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("Email send failed:", err);
    return false;
  }
}

export async function sendSmsViaEmail(phone: string, carrier: string, message: string) {
  const gateways: Record<string, string> = {
    att: "txt.att.net", tmobile: "tmomail.net", verizon: "vtext.com",
    sprint: "messaging.sprintpcs.com", boost: "sms.myboostmobile.com",
    cricket: "sms.cricketwireless.net", metro: "mymetropcs.com",
    airtel: "airtelap.com", jio: "jionet.co.in",
  };
  const gateway = gateways[carrier.toLowerCase()];
  if (!gateway) return false;
  const to = `${phone.replace(/\D/g, "")}@${gateway}`;
  try {
    await getTransporter().sendMail({ from: process.env.SMTP_FROM || "noreply@triplog.app", to, subject: "", text: message });
    return true;
  } catch {
    return false;
  }
}
