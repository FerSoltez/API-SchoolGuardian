// filepath: c:\Users\Claud\OneDrive\Escritorio\Assists_API\src\utils\emailTransporter.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export default transporter;