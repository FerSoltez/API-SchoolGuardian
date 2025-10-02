import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000
});

const verifyEmailConnection = async () => {
  const maxRetries = 3;
  
  console.log("Verificando email...");
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Variables de entorno faltantes");
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt}/${maxRetries}...`);
      
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        transporter.verify((error: any, success: any) => {
          clearTimeout(timeoutId);
          if (error) {
            reject(error);
          } else {
            resolve(success);
          }
        });
      });

      console.log("Email configurado correctamente");
      return true;

    } catch (error: any) {
      console.error(`Intento ${attempt} fallo:`, error.message);
      
      if (attempt === maxRetries) {
        console.error("Error persistente - verificar conexion y credenciales");
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
};

verifyEmailConnection();

export default transporter;
