import { Request, Response } from "express";
import Users from "../models/users";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import Attendance from "../models/attendance";
import Classes from "../models/classes";
import Enrollments from "../models/enrollments";
import Schedules from "../models/schedules";
import transporter from "../utils/emailTransporter";
import { v4 as uuidv4 } from 'uuid';

// Import associations to establish relationships
import "../models/associations";

// Augment the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: string | jwt.JwtPayload;
    }
  }
}

const cuentasBloqueadas: { [email: string]: number } = {};

const usersController = {
  createUser: async (req: Request, res: Response) => {
    try {
      const { name, matricula, email, password, role, user_uuid } = req.body;

      // Validar campos obligatorios
      if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "Nombre, email, contraseña y rol son requeridos." });
      }

      // Validar matrícula según el rol
      if (role === 'Student' || role === 'Professor') {
        if (!matricula) {
          return res.status(400).json({ 
            message: `La matrícula es obligatoria para ${role === 'Student' ? 'estudiantes' : 'profesores'}.` 
          });
        }
        
        // Verificar que la matrícula no esté ya en uso
        const existingUserWithMatricula = await Users.findOne({ where: { matricula } });
        if (existingUserWithMatricula) {
          return res.status(400).json({ message: "La matrícula ya está en uso." });
        }
      } else if (role === 'Administrator' && matricula) {
        return res.status(400).json({ message: "Los administradores no pueden tener matrícula." });
      }

      // Validar que el user_uuid sea obligatorio solo para estudiantes
      if (role === 'Student') {
        if (!user_uuid) {
          return res.status(400).json({ message: "El campo user_uuid es obligatorio para estudiantes." });
        }
        
        // Verificar que el user_uuid no esté ya en uso
        const existingUserWithUuid = await Users.findOne({ where: { user_uuid } });
        if (existingUserWithUuid) {
          return res.status(400).json({ message: "El user_uuid ya está en uso." });
        }
      }

      // Verificar si ya existe un usuario con el mismo correo
      const existingUser = await Users.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: "Ya existe un usuario con este correo." });
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Preparar datos del usuario
      const userData: any = {
        name,
        email,
        password: hashedPassword,
        role,
        attempts: 3, // Inicia con 3 intentos disponibles
        verification: role !== 'Student' // Solo los estudiantes necesitan verificación
      };

      // Agregar matrícula para estudiantes y profesores
      if (role === 'Student' || role === 'Professor') {
        userData.matricula = matricula;
      }

      // Solo agregar user_uuid para estudiantes
      if (role === 'Student') {
        userData.user_uuid = user_uuid;
      }
      // Para maestros y administradores, user_uuid se omite completamente

      // Crear el nuevo usuario
      const newUser = await Users.create(userData);

      // Enviar correo de verificación SOLO para estudiantes
      if (role === 'Student') {
        // Preparar datos para el token JWT
        const tokenData: any = { email, user_uuid };

        const verificationToken = jwt.sign(
          tokenData, 
          process.env.JWT_SECRET || 'secret_key', 
          { expiresIn: '24h' }
        );

        const mailOptions = {
          from: '"Soporte SchoolGuardian" <tu_correo@gmail.com>',
          to: email,
          subject: "Verificación de Cuenta",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
              <div style="background-color: #1a1a1a; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; color: white;">SCHOOL GUARDIAN</h1>
              </div>
              
              <div style="padding: 30px; line-height: 1.6;">
                <div style="font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; color: #333;">Verificación de Cuenta</div>
                
                <p style="margin-bottom: 15px;">Hola, ${name},</p>
                
                <p style="margin-bottom: 20px;">Gracias por registrarte en SchoolGuardian. Para activar tu cuenta, haz clic en el siguiente botón:</p>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://api-schoolguardian.onrender.com/verificarCuenta.html?token=${verificationToken}" style="display: inline-block; background-color: #1a1a1a; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 500;">Verificar Cuenta</a>
                </div>
                
                <div style="margin-top: 25px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; font-size: 14px;">
                  <p style="margin-top: 0;">Si no te registraste en nuestra plataforma, puedes ignorar este correo.</p>
                  <p style="margin-bottom: 0;">Por razones de seguridad, este enlace expirará en 24 horas.</p>
                </div>
              </div>
              
              <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 14px; color: #666;">
                <p style="margin: 0;">&copy; 2025 SchoolGuardian. Todos los derechos reservados.</p>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
      }

      // Respuesta diferenciada según el rol
      const message = role === 'Student' 
        ? "Usuario creado exitosamente. Revisa tu correo para verificar tu cuenta."
        : "Usuario creado exitosamente. Tu cuenta está lista para usar.";

      res.status(201).json({
        message,
        user: {
          id: newUser.id_user,
          name: newUser.name,
          email: newUser.email,
          matricula: newUser.matricula,
          role: newUser.role,
          user_uuid: newUser.user_uuid, // Importante para estudiantes
          verification: newUser.verification
        }
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  verifyEmail: async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Token de verificación es requerido" });
      }

      // Verificar el token
      let decoded: any;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key') as { email: string, user_uuid?: string };
      } catch (error) {
        console.error('Error al verificar token:', error);
        return res.status(400).json({ message: "Token inválido o expirado" });
      }

      // Buscar usuario por email y user_uuid (si existe)
      const whereClause: any = { email: decoded.email };
      if (decoded.user_uuid) {
        whereClause.user_uuid = decoded.user_uuid;
      }

      const user = await Users.findOne({ where: whereClause });

      if (!user) {
        console.error('Usuario no encontrado:', decoded.email, decoded.user_uuid);
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Verificar si ya está verificado
      if (user.verification === true) {
        return res.status(400).json({ message: "La cuenta ya está verificada" });
      }

      // Actualizar el campo verification a true
      const [affectedRows] = await Users.update(
        { verification: true }, 
        { where: { id_user: user.id_user } }
      );

      if (affectedRows === 0) {
        console.error('No se pudo actualizar el usuario:', user.id_user);
        return res.status(500).json({ message: "Error al verificar la cuenta" });
      }

      console.log('Usuario verificado exitosamente:', user.email);
      res.status(200).json({ message: "Cuenta verificada exitosamente" });
    } catch (error) {
      console.error('Error en verifyEmail:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Método adicional para verificar cuenta via GET (para enlaces más simples)
  verifyAccountGet: async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ message: "Token de verificación es requerido" });
      }

      // Verificar el token
      let decoded: any;
      try {
        decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'secret_key') as { email: string, user_uuid?: string };
      } catch (error) {
        console.error('Error al verificar token (GET):', error);
        return res.status(400).json({ message: "Token inválido o expirado" });
      }

      // Buscar usuario por email y user_uuid (si existe)
      const whereClause: any = { email: decoded.email };
      if (decoded.user_uuid) {
        whereClause.user_uuid = decoded.user_uuid;
      }

      const user = await Users.findOne({ where: whereClause });

      if (!user) {
        console.error('Usuario no encontrado (GET):', decoded.email, decoded.user_uuid);
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      if (user.verification === true) {
        return res.status(400).json({ message: "La cuenta ya está verificada" });
      }

      // Actualizar el campo verification a true
      const [affectedRows] = await Users.update(
        { verification: true }, 
        { where: { id_user: user.id_user } }
      );

      if (affectedRows === 0) {
        console.error('No se pudo actualizar el usuario (GET):', user.id_user);
        return res.status(500).json({ message: "Error al verificar la cuenta" });
      }

      console.log('Usuario verificado exitosamente (GET):', user.email);
      res.status(200).json({ message: "Cuenta verificada exitosamente" });
    } catch (error) {
      console.error('Error en verifyAccountGet:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  },

  loginUser: async (req: Request, res: Response) => {
    try {
      const { email, password, user_uuid } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña son requeridos" });
      }
  
      const user = await Users.findOne({ where: { email } });
  
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Verificar que el user_uuid coincida SOLO para estudiantes
      if (user.role === 'Student') {
        if (!user_uuid) {
          return res.status(400).json({ 
            message: "UUID es requerido para estudiantes"
          });
        }
        
        if (user.user_uuid !== user_uuid) {
          return res.status(403).json({ message: "UUID de usuario inválido" });
        }
      }

      // Verificar si la cuenta está verificada
      if (!user.verification) {
        return res.status(403).json({ message: "Cuenta no verificada. Revisa tu correo electrónico." });
      }

      // Verificar si la cuenta está agotada de intentos (attempts = 0)
      if (user.attempts === 0) {
        return res.status(403).json({ message: "Cuenta bloqueada por múltiples intentos fallidos. Contacta al administrador." });
      }
  
      // Verificar si la cuenta está bloqueada
      if (cuentasBloqueadas[email]) {
        const tiempoActual = Date.now();
        const tiempoBloqueo = cuentasBloqueadas[email];
  
        if (tiempoActual < tiempoBloqueo) {
          const tiempoRestante = Math.ceil((tiempoBloqueo - tiempoActual) / 1000);
          return res.status(403).json({ message: `Cuenta bloqueada. Intenta nuevamente en ${tiempoRestante} segundos.` });
        }
  
        // Desbloquear la cuenta después de que pase el tiempo de bloqueo
        delete cuentasBloqueadas[email];
        await Users.update({ attempts: 3 }, { where: { id_user: user.id_user } });
      }
  
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        const intentosRestantes = user.attempts - 1;
  
        if (intentosRestantes === 0) {
          // Bloquear la cuenta por 30 segundos
          cuentasBloqueadas[email] = Date.now() + 30 * 1000; // 30 segundos
          await Users.update({ attempts: 0 }, { where: { id_user: user.id_user } });
          return res.status(403).json({ message: "Cuenta bloqueada por múltiples intentos fallidos. Intenta nuevamente en 30 segundos." });
        }
  
        // Decrementar los intentos restantes
        await Users.update({ attempts: intentosRestantes }, { where: { id_user: user.id_user } });
        return res.status(401).json({ message: `Contraseña incorrecta. Intentos restantes: ${intentosRestantes}` });
      }
  
      // Restablecer intentos en caso de inicio de sesión exitoso
      await Users.update({ attempts: 3 }, { where: { id_user: user.id_user } });
  
      const token = jwt.sign(
        { id: user.id_user, role: user.role }, 
        process.env.JWT_SECRET || "your_jwt_secret", 
        { expiresIn: "1h" }
      );
  
      res.status(200).json({ 
        message: "Inicio de sesión exitoso", 
        token,
        user: {
          id: user.id_user,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getAllUsers: async (req: Request, res: Response) => {
    try {
      const users = await Users.findAll({
        attributes: { exclude: ['password'] }
      });
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getUser: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id;
      const { id } = req.body;

      // Verificar si el usuario autenticado está intentando acceder a sus propios datos
      if (parseInt(id) !== userId) {
        return res.status(403).json({ message: "Acceso denegado. No puedes ver los datos de otro usuario." });
      }

      const user = await Users.findByPk(id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      let additionalData = {};

      if (user.role === 'Professor') {
        // Si el usuario es un profesor, obtener sus clases con horarios
        const classes = await Classes.findAll({
          where: { id_professor: userId },
          include: [{ model: Schedules }],
        });
        additionalData = { classes };
      } else if (user.role === 'Student') {
        // Si el usuario es un estudiante, obtener sus asistencias y inscripciones
        const attendance = await Attendance.findAll({
          where: { id_student: userId },
        });
        const enrollments = await Enrollments.findAll({
          where: { id_student: userId },
          include: [{ model: Classes }],
        });
        additionalData = { attendance, enrollments };
      }

      res.status(200).json({
        user,
        ...additionalData,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id;
      const { id } = req.params;
  
      // Verificar si el usuario autenticado está intentando eliminar sus propios datos
      if (parseInt(id) !== userId) {
        return res.status(403).json({ message: "Acceso denegado. No puedes eliminar los datos de otro usuario." });
      }
  
      const user = await Users.findByPk(id);
  
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
  
      // Eliminar datos relacionados según el rol
      if (user.role === 'Student') {
        await Attendance.destroy({ where: { id_student: id } });
        await Enrollments.destroy({ where: { id_student: id } });
      } else if (user.role === 'Professor') {
        await Classes.destroy({ where: { id_professor: id } });
      }
  
      const deleted = await Users.destroy({ where: { id_user: id } });
      if (deleted) {
        res.status(200).json({ message: "Usuario eliminado exitosamente" });
      } else {
        res.status(404).json({ message: "Usuario no encontrado" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  
  partialUpdateUser: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id;
      const { id } = req.params;
  
      // Verificar si el usuario autenticado está intentando actualizar sus propios datos
      if (parseInt(id) !== userId) {
        return res.status(403).json({ message: "Acceso denegado. No puedes actualizar los datos de otro usuario." });
      }
  
      const user = await Users.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Validaciones específicas para matrícula
      if (req.body.matricula !== undefined) {
        // Si el usuario es administrador, no puede tener matrícula
        if (user.role === 'Administrator' && req.body.matricula !== null) {
          return res.status(400).json({ message: "Los administradores no pueden tener matrícula." });
        }
        
        // Si el usuario es estudiante o profesor, debe tener matrícula
        if ((user.role === 'Student' || user.role === 'Professor') && !req.body.matricula) {
          return res.status(400).json({ 
            message: `La matrícula es obligatoria para ${user.role === 'Student' ? 'estudiantes' : 'profesores'}.` 
          });
        }
        
        // Verificar que la matrícula no esté ya en uso por otro usuario
        if (req.body.matricula) {
          const existingUserWithMatricula = await Users.findOne({ 
            where: { 
              matricula: req.body.matricula,
              id_user: { [Op.ne]: id } // Excluir el usuario actual
            } 
          });
          if (existingUserWithMatricula) {
            return res.status(400).json({ message: "La matrícula ya está en uso por otro usuario." });
          }
        }
      }

      // Si se está actualizando la contraseña, hashearla
      if (req.body.password) {
        req.body.password = await bcrypt.hash(req.body.password, 10);
      }
  
      await Users.update(req.body, { where: { id_user: id } });
      const updatedUser = await Users.findByPk(id, {
        attributes: { exclude: ['password'] }
      });
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  clearDatabase: async (req: Request, res: Response) => {
    try {
      await Attendance.destroy({ where: {}, truncate: false, cascade: true });
      await Enrollments.destroy({ where: {}, truncate: false, cascade: true });
      await Schedules.destroy({ where: {}, truncate: false, cascade: true });
      await Classes.destroy({ where: {}, truncate: false, cascade: true });
      await Users.destroy({ where: {}, truncate: false, cascade: true });

      res.status(200).json({ message: "Datos borrados exitosamente de todas las tablas" });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  changePassword: async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
  
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token y nueva contraseña son requeridos" });
      }
  
      // Verificar el token
      let email: string;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key') as { email: string };
        email = decoded.email;
      } catch (error) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }
  
      const user = await Users.findOne({ where: { email } });
  
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      await Users.update({ password: hashedPassword }, { where: { email } });
  
      res.status(200).json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  
  sendPasswordResetEmail: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
  
      if (!email) {
        return res.status(400).json({ message: "El correo electrónico es requerido." });
      }
  
      const user = await Users.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }
  
      const token = jwt.sign({ email }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '24h' });
  
      const mailOptions = {
        from: '"Soporte SchoolGuardian" <tu_correo@gmail.com>',
        to: email,
        subject: "Cambio de Contraseña",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #1a1a1a; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; color: white;">SCHOOL GUARDIAN</h1>
            </div>
            
            <div style="padding: 30px; line-height: 1.6;">
              <div style="font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; color: #333;">Cambio de Contraseña</div>
              
              <p style="margin-bottom: 15px;">Hola, ${user.name},</p>
              
              <p style="margin-bottom: 20px;">Hemos recibido una solicitud para cambiar tu contraseña. Para continuar con este proceso, haz clic en el siguiente botón:</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="https://tu-dominio.com/cambiarContrasena.html?token=${token}" style="display: inline-block; background-color: #1a1a1a; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 500;">Cambiar Contraseña</a>
              </div>
              
              <div style="margin-top: 25px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; font-size: 14px;">
                <p style="margin-top: 0;">Si no solicitaste este cambio, puedes ignorar este correo. Tu cuenta seguirá segura.</p>
                <p style="margin-bottom: 0;">Por razones de seguridad, este enlace expirará en 24 horas.</p>
              </div>
            </div>
            
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 14px; color: #666;">
              <p style="margin: 0;">&copy; 2025 SchoolGuardian. Todos los derechos reservados.</p>
            </div>
          </div>
        `,
      };
  
      await transporter.sendMail(mailOptions);
  
      res.status(200).json({ message: "Correo enviado exitosamente." });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Endpoint de debug para verificar usuarios (temporal)
  debugUsers: async (req: Request, res: Response) => {
    try {
      const users = await Users.findAll({
        attributes: ['id_user', 'name', 'email', 'role', 'user_uuid', 'verification', 'attempts'],
        limit: 10
      });
      
      console.log('Usuarios en la base de datos:', users.map(u => ({
        id: u.id_user,
        email: u.email,
        verification: u.verification,
        verification_type: typeof u.verification
      })));
      
      res.status(200).json({
        count: users.length,
        users: users.map(u => ({
          id: u.id_user,
          email: u.email,
          verification: u.verification,
          verification_type: typeof u.verification
        }))
      });
    } catch (error) {
      console.error('Error en debugUsers:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Endpoint para verificar un token JWT (temporal - solo para debug)
  verifyToken: async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token es requerido" });
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key') as { email: string, user_uuid: string };
        console.log('Token decodificado:', decoded);
        
        res.status(200).json({
          valid: true,
          decoded: decoded,
          message: "Token válido"
        });
      } catch (error) {
        console.error('Error al verificar token:', error);
        res.status(400).json({
          valid: false,
          error: (error as Error).message,
          message: "Token inválido"
        });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Método para crear estudiantes sin verificación (solo para pruebas)
  createStudentForTesting: async (req: Request, res: Response) => {
    try {
      const { name, email, password, user_uuid } = req.body;

      // Log de información de entrada
      console.log('📝 Creando estudiante:', {
        name,
        email,
        user_uuid,
        timestamp: new Date().toISOString()
      });

      // Validar campos obligatorios
      if (!name || !email || !password || !user_uuid) {
        const errorMessage = "Todos los campos son requeridos: name, email, password, user_uuid";
        console.log('❌ Error de validación:', errorMessage);
        return res.status(400).json({ 
          success: false,
          message: errorMessage,
          data: {
            receivedFields: { name: !!name, email: !!email, password: !!password, user_uuid: !!user_uuid }
          }
        });
      }

      // Verificar si ya existe un usuario con el mismo correo
      const existingUserByEmail = await Users.findOne({ where: { email } });
      if (existingUserByEmail) {
        const errorMessage = `Ya existe un usuario con el correo: ${email}`;
        console.log('❌ Error - Usuario duplicado por email:', errorMessage);
        return res.status(400).json({ 
          success: false,
          message: errorMessage,
          data: {
            conflictField: 'email',
            conflictValue: email
          }
        });
      }

      // Verificar si ya existe un usuario con el mismo user_uuid
      const existingUserByUuid = await Users.findOne({ where: { user_uuid } });
      if (existingUserByUuid) {
        const errorMessage = `Ya existe un usuario con el user_uuid: ${user_uuid}`;
        console.log('❌ Error - Usuario duplicado por UUID:', errorMessage);
        return res.status(400).json({ 
          success: false,
          message: errorMessage,
          data: {
            conflictField: 'user_uuid',
            conflictValue: user_uuid
          }
        });
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear el usuario estudiante sin verificación
      const userData: {
        name: string;
        email: string;
        password: string;
        role: "Administrator" | "Professor" | "Student";
        user_uuid: string;
        attempts: number;
        verification: boolean;
      } = {
        name,
        email,
        password: hashedPassword,
        role: 'Student',
        user_uuid,
        attempts: 3,
        verification: true // Marcamos como verificado automáticamente para pruebas
      };

      const newUser = await Users.create(userData);

      // Log de éxito
      console.log('✅ Estudiante creado exitosamente:', {
        id: newUser.id_user,
        name: newUser.name,
        email: newUser.email,
        user_uuid: newUser.user_uuid,
        role: newUser.role,
        verification: newUser.verification,
        timestamp: new Date().toISOString()
      });

      // Respuesta de éxito
      res.status(201).json({
        success: true,
        message: "🎓 Estudiante creado exitosamente. Cuenta verificada automáticamente.",
        data: {
          user: {
            id: newUser.id_user,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            user_uuid: newUser.user_uuid,
            verification: newUser.verification,
            attempts: newUser.attempts
          },
          testingInfo: {
            autoVerified: true,
            createdAt: new Date().toISOString(),
            purpose: "Testing purposes - No email verification required"
          }
        }
      });

    } catch (error) {
      const errorMessage = `Error al crear estudiante: ${(error as Error).message}`;
      console.log('❌ Error interno del servidor:', {
        error: errorMessage,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({ 
        success: false,
        message: errorMessage,
        data: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      });
    }
  },
};

export default usersController;
