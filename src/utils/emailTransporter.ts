import nodemailer from "nodemailer";

// Configuración mejorada para Gmail con manejo de errores y timeout
const transporter = nodemailer.createTransport({
  service: "gmail", // Usar 'gmail' en minúsculas
  host: "smtp.gmail.com", // Especificar host explícitamente
  port: 587, // Puerto para STARTTLS
  secure: false, // false para puerto 587, true para 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Debe ser una "App Password" de Gmail
  },
  // Configuración adicional para mayor compatibilidad
  tls: {
    rejectUnauthorized: false // Para desarrollo, remover en producción
  },
  // Configuración de timeouts
  connectionTimeout: 60000, // 60 segundos
  greetingTimeout: 30000,   // 30 segundos
  socketTimeout: 60000      // 60 segundos
});

// Verificar la configuración al inicializar
transporter.verify((error: any, success: any) => {
  if (error) {
    console.error('❌ Error en configuración de email:', error.message);
    console.log('📋 Revisa la configuración de Gmail y las App Passwords');
    
    // Información adicional para debugging
    if (error.code === 'ETIMEDOUT') {
      console.log('🔍 Error de timeout - verifica la conexión a internet y firewall');
    } else if (error.code === 'EAUTH') {
      console.log('🔍 Error de autenticación - verifica EMAIL_USER y EMAIL_PASS');
    } else if (error.code === 'ENOTFOUND') {
      console.log('� Error de DNS - verifica la conexión a internet');
    }
  } else {
    console.log('✅ Servidor de email configurado correctamente');
  }
});

export default transporter;