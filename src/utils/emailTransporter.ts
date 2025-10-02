import nodemailer from "nodemailer";

// Configuració// Función de verificación con reintentos
const verifyConnection = async (transporter: any, maxRetries = 3, delay = 5000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Verification timeout'));
        }, 15000); // 15 segundos máximo por intento

        transporter.verify((error: any, success: any) => {
          clearTimeout(timeoutId);
          if (error) {
            reject(error);
          } else {
            resolve(success);
          }
        });
      });

      console.log('✅ Servidor de email configurado correctamente');
      return true;

    } catch (error: any) {
      console.error(`❌ Intento ${attempt}/${maxRetries} falló:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('🚨 Configuración de email FALLÓ después de todos los intentos');
        console.log('📋 Posibles soluciones:');
        console.log('   1. Verificar conexión a internet');
        console.log('   2. Verificar que EMAIL_USER y EMAIL_PASS estén configurados');
        console.log('   3. Generar nueva App Password en Gmail');
        console.log('   4. Verificar firewall/antivirus');
        console.log('   5. Intentar desde otra red');
        
        if (error.code === 'ETIMEDOUT') {
          console.log('🔍 Error específico: TIMEOUT - problema de red o firewall');
        } else if (error.code === 'EAUTH') {
          console.log('🔍 Error específico: AUTENTICACIÓN - verificar credenciales');
        } else if (error.code === 'ENOTFOUND') {
          console.log('🔍 Error específico: DNS - verificar conexión a internet');
        }
        return false;
      }

      // Esperar antes del siguiente intento
      if (attempt < maxRetries) {
        console.log(`⏳ Esperando ${delay/1000} segundos antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
};

const createTransporter = () => {
  // Configuración principal (puerto 587)
  const config587 = {
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    connectionTimeout: 30000, // 30 segundos
    greetingTimeout: 20000,   // 20 segundos
    socketTimeout: 30000,     // 30 segundos
    requireTLS: true,
    debug: false, // Cambiar a true para debug
    logger: false
  };

  // Configuración alternativa (puerto 465)
  const config465 = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL/TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    debug: false,
    logger: false
  };

  // Intentar primero con puerto 587, luego 465
  try {
    return nodemailer.createTransport(config587);
  } catch (error) {
    console.log('⚠️ Puerto 587 falló, intentando con puerto 465...');
    return nodemailer.createTransport(config465);
  }
};

const transporter = createTransporter();

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