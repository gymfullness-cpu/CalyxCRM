const nodemailer = require("nodemailer");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Brak env: ${name}`);
  return v;
}

function createTransport() {
  // Najprościej: SMTP z maila firmowego / testowo Mailtrap
  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, html }) {
  const from = requireEnv("SMTP_FROM"); // np. "Biuro <biuro@twojadomena.pl>"
  const transporter = createTransport();

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  return info;
}

module.exports = { sendEmail };
