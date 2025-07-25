import nodemailer from "nodemailer";

// Configuración mejorada para Gmail con manejo de errores
const transporter = nodemailer.createTransport({
  service: "gmail", // Usar 'gmail' en minúsculas
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Debe ser una "App Password" de Gmail
  },
  // Configuración adicional para mayor compatibilidad
  secure: true, // true para 465, false para otros puertos
  tls: {
    rejectUnauthorized: false // Para desarrollo, remover en producción
  }
});

// Verificar la configuración al inicializar
transporter.verify((error: any, success: any) => {
  if (error) {
    console.error('❌ Error en configuración de email:', error.message);
    console.log('📋 Revisa la configuración de Gmail y las App Passwords');
  } else {
    console.log('✅ Servidor de email configurado correctamente');
  }
});

export default transporter;