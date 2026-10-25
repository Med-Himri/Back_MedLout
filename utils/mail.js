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

const isMailConfigured = () => getTransporter() !== null;

module.exports = { sendPasswordResetEmail, isMailConfigured };
