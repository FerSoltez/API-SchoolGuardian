import nodemailer from "nodemailer";

// ⚠️ MODO DESACTIVADO: Nodemailer temporalmente deshabilitado
const EMAIL_DISABLED = true;

let transporter: any;

if (EMAIL_DISABLED) {
  // Crear un transportador mock que simula el envío de emails
  console.log('📧 MODO MOCK: Envío de correos desactivado temporalmente');
  
  transporter = {
    sendMail: async (mailOptions: any) => {
      console.log('📧 [MOCK] Simulando envío de correo:');
      console.log('   📤 Para:', mailOptions.to);
      console.log('   📝 Asunto:', mailOptions.subject);
      console.log('   🎯 Tipo:', mailOptions.html ? 'HTML' : 'Texto plano');
      
      // Simular un delay como si se enviara realmente
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            messageId: `mock-${Date.now()}@localhost`,
            response: '250 OK: Mensaje simulado enviado exitosamente',
            accepted: [mailOptions.to],
            rejected: [],
            pending: [],
            envelope: {
              from: mailOptions.from,
              to: [mailOptions.to]
            }
          });
        }, 500); // Simular 500ms de envío
      });
    },
    verify: (callback: any) => {
      console.log('✅ [MOCK] Servidor de email simulado configurado correctamente');
      if (callback) callback(null, true);
    }
  };
} else {
  // Configuración real de nodemailer (cuando EMAIL_DISABLED = false)
  transporter = nodemailer.createTransport({
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
}

export default transporter;