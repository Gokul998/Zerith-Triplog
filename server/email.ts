export async function sendInviteEmail(to: string, tripTitle: string, inviterName: string, inviteToken: string, appUrl: string) {
  const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@mytriplog.in";
  const link = `${appUrl}/invite/${inviteToken}`;

  if (!apiKey) {
    console.error("Email: no BREVO_API_KEY set");
    return false;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: "TripLog", email: from },
        to: [{ email: to }],
        subject: `${inviterName} invited you to join "${tripTitle}" on TripLog`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
            <h1 style="color:#4f46e5;margin-bottom:8px">TripLog ✈️</h1>
            <p style="color:#374151;font-size:16px"><strong>${inviterName}</strong> has invited you to join the trip <strong>${tripTitle}</strong>.</p>
            <a href="${link}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Join the Trip</a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">Link expires in 7 days. If you didn't expect this invite, you can ignore this email.</p>
          </div>
        `,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Brevo API error:", JSON.stringify(data));
      return false;
    }
    console.log("Email sent via Brevo API to:", to);
    return true;
  } catch (err: any) {
    console.error("Email send failed:", err?.message || err);
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
