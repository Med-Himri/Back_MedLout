const nodemailer = require("nodemailer");

// Optional. Without SMTP settings, "forgot password" emails are simply turned
// off and an admin resets passwords from the Équipe page instead.
// Any SMTP provider works (Gmail app password, Brevo, Mailgun…).
// Credentials come from the environment only — never commit them.
let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
};

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Sends the password-reset email. Returns false when SMTP is not configured. */
const sendPasswordResetEmail = async ({ to, name, link, code }) => {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn("SMTP is not configured — password reset email not sent.");
    return false;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f4f4f5;padding:24px">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:28px;border-top:4px solid #C41E3A">
        <h1 style="font-size:20px;color:#1A1A1A;margin:0 0 16px">Réinitialisation du mot de passe</h1>
        <p style="font-size:15px;color:#333;line-height:1.6">Bonjour ${escapeHtml(name)},</p>
        <p style="font-size:15px;color:#333;line-height:1.6">
          Une demande de réinitialisation du mot de passe a été faite pour votre compte Medlout Auto.
          Votre code est : <strong style="font-size:18px;letter-spacing:2px">${escapeHtml(code)}</strong>
        </p>
        <p style="text-align:center;margin:28px 0">
          <a href="${escapeHtml(link)}" style="background:#C41E3A;color:#fff;text-decoration:none;padding:14px 22px;border-radius:6px;font-weight:bold">Choisir un nouveau mot de passe</a>
        </p>
        <p style="font-size:13px;color:#777">Ce lien expire dans 15 minutes. Si vous n'avez rien demandé, ignorez cet email.</p>
      </div>
    </div>`;

  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Medlout Auto — réinitialisation du mot de passe",
    text: `Bonjour ${name},\n\nVotre code : ${code}\nLien : ${link}\n\nCe lien expire dans 15 minutes.`,
    html,
  });
  return true;
};

const money = (n) => `${Number(n || 0).toFixed(2)} DH`;

/**
 * Tells the shop about a new order. Goes to ORDER_NOTIFY_EMAIL (several
 * addresses can be separated by commas), or to ADMIN_EMAIL if not set.
 * Returns false when SMTP or the recipient is not configured.
 */
const sendNewOrderEmail = async (order) => {
  const mailer = getTransporter();
  const to = process.env.ORDER_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  if (!mailer || !to) {
    console.warn("New order email not sent: SMTP_* or ORDER_NOTIFY_EMAIL/ADMIN_EMAIL not configured.");
    return false;
  }

  const frontend = (process.env.FRONTEND_URL || "https://front-med-lout.vercel.app").replace(/\/$/, "");
  const adminLink = `${frontend}/dashboard/commandes/${order._id}`;
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(i.title)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">× ${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(i.price * i.quantity)}</td>
      </tr>`
    )
    .join("");
  const line = (label, value) =>
    value ? `<p style="margin:4px 0;font-size:14px;color:#333"><strong>${label} :</strong> ${escapeHtml(value)}</p>` : "";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f4f4f5;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:28px;border-top:4px solid #C41E3A">
        <h1 style="font-size:20px;color:#1A1A1A;margin:0 0 4px">Nouvelle commande ${escapeHtml(order.orderNumber)}</h1>
        <p style="margin:0 0 20px;color:#777;font-size:13px">${new Date(order.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Casablanca" })}</p>
        ${line("Client", order.customerName)}
        ${line("Téléphone", order.phone)}
        ${line("Ville", order.city)}
        ${line("Adresse", order.address)}
        ${line("Notes", order.notes)}
        <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;color:#333">${rows}
          <tr><td style="padding-top:12px;font-weight:bold">Total</td><td></td>
          <td style="padding-top:12px;text-align:right;font-weight:bold;color:#C41E3A">${money(order.total)}</td></tr>
        </table>
        <p style="text-align:center;margin:28px 0 8px">
          <a href="${escapeHtml(adminLink)}" style="background:#C41E3A;color:#fff;text-decoration:none;padding:14px 22px;border-radius:6px;font-weight:bold">Ouvrir la commande</a>
        </p>
      </div>
    </div>`;

  const text = [
    `Nouvelle commande ${order.orderNumber}`,
    ``,
    `Client : ${order.customerName}`,
    `Téléphone : ${order.phone}`,
    order.city ? `Ville : ${order.city}` : null,
    order.address ? `Adresse : ${order.address}` : null,
    order.notes ? `Notes : ${order.notes}` : null,
    ``,
    ...order.items.map((i) => `- ${i.title} x${i.quantity} — ${money(i.price * i.quantity)}`),
    ``,
    `Total : ${money(order.total)}`,
    ``,
    adminLink,
  ]
    .filter((l) => l !== null)
    .join("\n");

  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `🛒 Nouvelle commande ${order.orderNumber} — ${money(order.total)} — ${order.customerName}`,
    text,
    html,
  });
  return true;
};

const isMailConfigured = () => getTransporter() !== null;

module.exports = { sendPasswordResetEmail, sendNewOrderEmail, isMailConfigured };
