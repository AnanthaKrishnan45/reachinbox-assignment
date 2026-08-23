import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

export async function getMailer() {
  if (transporter) {
    return transporter;
  }

  const testAccount = await nodemailer.createTestAccount();

  console.log("📧 Ethereal account created");
  console.log("Ethereal user:", testAccount.user);
  console.log("Ethereal web:", testAccount.web);

  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
}

export { nodemailer };