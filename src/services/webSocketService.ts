import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import UsersModel from '../models/users';
import ClassesModel from '../models/classes';
import EnrollmentsModel from '../models/enrollments';
import AttendancePingsModel from '../models/attendancePings';
import { Op } from 'sequelize';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
  userName?: string;
}

import { Socket } from 'socket.io';

class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, { userId: number; role: string; name: string; socketId: string }> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          "http://localhost:3000",
          "http://localhost:3001", 
          "https://your-frontend-domain.com", // Reemplazar con tu dominio frontend
          "https://api-schoolguardian.onrender.com"
        ],
        methods: ["GET", "POST"],
        credentials: true
      },
      allowEIO3: true,
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e6
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  // Middleware de autenticación para WebSocket
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        console.log('🔍 WebSocket Auth - Token recibido:', token ? `${token.substring(0, 20)}...` : 'No token');
        
        if (!token) {
          console.log('❌ WebSocket Auth - No se proporcionó token');
          return next(new Error('Token de autenticación requerido'));
        }

        // Verificar el token JWT
        console.log('🔐 WebSocket Auth - Verificando token JWT...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        
        console.log('✅ WebSocket Auth - Token decodificado:', {
          id: decoded.id,
          role: decoded.role,
          iat: decoded.iat,
          exp: decoded.exp,
          current_time: Math.floor(Date.now() / 1000)
        });
        
        // Obtener información del usuario
        const user = await UsersModel.findByPk(decoded.id);
        if (!user) {
          console.log('❌ WebSocket Auth - Usuario no encontrado en BD:', decoded.id);
          return next(new Error('Usuario no encontrado'));
        }

        console.log('✅ WebSocket Auth - Usuario encontrado:', {
          id: user.id_user,
          name: user.name,
          role: user.role
        });

        // Agregar información del usuario al socket
        socket.userId = user.id_user;
        socket.userRole = user.role;
        socket.userName = user.name;

        next();
      } catch (error) {
        console.error('❌ WebSocket Auth - Error:', error);
        
        if (error instanceof jwt.TokenExpiredError) {
          return next(new Error('Token expirado'));
        } else if (error instanceof jwt.JsonWebTokenError) {
          return next(new Error('Token inválido'));
        } else {
          return next(new Error('Error de autenticación'));
        }
      }
    });
  }

  // Configurar event handlers
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 Usuario conectado: ${socket.userName} (${socket.userRole}) - Socket ID: ${socket.id}`);

      // Agregar usuario a la lista de conectados
      this.connectedUsers.set(socket.id, {
        userId: socket.userId!,
        role: socket.userRole!,
        name: socket.userName!,
        socketId: socket.id
      });

      // Enviar confirmación de conexión
      socket.emit('connection-confirmed', {
        message: `Conectado como ${socket.userName}`,
        role: socket.userRole,
        timestamp: new Date(),
        server_info: {
          env: process.env.NODE_ENV || 'development',
          version: '1.0.0'
        }
      });

      // Eventos del cliente
      this.handleJoinClassRoom(socket);
      this.handleLeaveClassRoom(socket);
      this.handleGetConnectedUsers(socket);
      this.handleDisconnection(socket);

      // Manejar errores de socket
      socket.on('error', (error) => {
        console.error(`❌ Error en socket de ${socket.userName}:`, error);
        socket.emit('error', { 
          message: 'Error en la conexión WebSocket',
          timestamp: new Date()
        });
      });
    });

    // Manejar errores del servidor WebSocket
    this.io.on('error', (error) => {
      console.error('❌ Error en WebSocket Server:', error);
    });

    // Log de estado del servidor
    this.io.on('connection_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
    });
  }

  // Unirse a una sala de clase específica
  private handleJoinClassRoom(socket: AuthenticatedSocket): void {
    socket.on('join-class', async (data: { classId: number }) => {
      try {
        const { classId } = data;

        // Verificar que la clase existe
        const classExists = await ClassesModel.findByPk(classId);
        if (!classExists) {
          socket.emit('error', { message: 'Clase no encontrada' });
          return;
        }

        // Verificar permisos (profesores pueden ver cualquier clase, estudiantes solo las suyas)
        if (socket.userRole === 'Student') {
          const enrollment = await EnrollmentsModel.findOne({
            where: { id_student: socket.userId, id_class: classId }
          });
          if (!enrollment) {
            socket.emit('error', { message: 'No tienes permisos para acceder a esta clase' });
            return;
          }
        }

        const roomName = `class-${classId}`;
        socket.join(roomName);
        
        console.log(`👥 ${socket.userName} se unió a la sala: ${roomName}`);
        
        // Enviar lista actual de estudiantes inscritos
        await this.sendEnrolledStudents(socket, classId);
        
        // Enviar pings activos actuales
        await this.sendActivePings(socket, classId);

        socket.emit('joined-class', { 
          classId, 
          message: `Te has unido a la clase ${classExists.name}` 
        });

      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });
  }

  // Salir de una sala de clase
  private handleLeaveClassRoom(socket: AuthenticatedSocket): void {
    socket.on('leave-class', (data: { classId: number }) => {
      const { classId } = data;
      const roomName = `class-${classId}`;
      socket.leave(roomName);
      
      console.log(`👋 ${socket.userName} salió de la sala: ${roomName}`);
      socket.emit('left-class', { classId });
    });
  }

  // Obtener usuarios conectados
  private handleGetConnectedUsers(socket: AuthenticatedSocket): void {
    socket.on('get-connected-users', () => {
      const users = Array.from(this.connectedUsers.values());
      socket.emit('connected-users', users);
    });
  }

  // Manejar desconexión
  private handleDisconnection(socket: AuthenticatedSocket): void {
    socket.on('disconnect', () => {
      console.log(`🔌 Usuario desconectado: ${socket.userName} - Socket ID: ${socket.id}`);
      this.connectedUsers.delete(socket.id);
    });
  }

  // Enviar lista de estudiantes inscritos a un socket específico
  private async sendEnrolledStudents(socket: AuthenticatedSocket, classId: number): Promise<void> {
    try {
      const enrolledStudents = await EnrollmentsModel.findAll({
        where: { id_class: classId },
        include: [
          {
            model: UsersModel,
            where: { role: 'Student' },
            attributes: ['id_user', 'name', 'email']
          }
        ]
      });

      const students = enrolledStudents.map((enrollment: any) => ({
        id_student: enrollment.id_student,
        name: enrollment.User.name,
        email: enrollment.User.email,
        enrollment_date: enrollment.createdAt
      }));

      socket.emit('enrolled-students', {
        classId,
        students,
        total: students.length
      });

    } catch (error) {
      socket.emit('error', { message: `Error al obtener estudiantes: ${(error as Error).message}` });
    }
  }

  // Enviar pings activos a un socket específico
  private async sendActivePings(socket: AuthenticatedSocket, classId: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const pings = await AttendancePingsModel.findAll({
        where: {
          id_class: classId,
          ping_time: {
            [Op.between]: [
              new Date(today + ' 00:00:00'),
              new Date(today + ' 23:59:59')
            ]
          }
        },
        order: [['ping_time', 'DESC']]
      });

      // Obtener información de estudiantes
      const studentIds = [...new Set(pings.map(ping => ping.id_student))];
      const students = await UsersModel.findAll({
        where: { id_user: { [Op.in]: studentIds } },
        attributes: ['id_user', 'name', 'email']
      });

      const studentMap = new Map();
      students.forEach(student => {
        studentMap.set(student.id_user, student);
      });

      // Agrupar pings por estudiante
      const groupedPings = pings.reduce((acc: any, ping: any) => {
        const studentId = ping.id_student;
        const student = studentMap.get(studentId);
        
        if (!acc[studentId]) {
          acc[studentId] = {
            student: student ? {
              id_user: student.id_user,
              name: student.name,
              email: student.email
            } : {
              id_user: studentId,
              name: 'Estudiante no encontrado',
              email: 'N/A'
            },
            pings: [],
            ping_count: 0
          };
        }
        acc[studentId].pings.push({
          id_ping: ping.id_ping,
          ping_number: ping.ping_number,
          ping_time: ping.ping_time,
          status: ping.status
        });
        acc[studentId].ping_count = acc[studentId].pings.length;
        return acc;
      }, {});

      socket.emit('active-pings', {
        classId,
        date: today,
        pings: Object.values(groupedPings),
        total_pings: pings.length
      });

    } catch (error) {
      socket.emit('error', { message: `Error al obtener pings: ${(error as Error).message}` });
    }
  }

  // Métodos públicos para emitir eventos desde otros servicios

  // Notificar nuevo ping a una clase específica
  public notifyNewPing(classId: number, pingData: any): void {
    const roomName = `class-${classId}`;
    console.log(`📡 Emitiendo nuevo ping a sala ${roomName}:`, pingData);
    
    this.io.to(roomName).emit('new-ping', {
      classId,
      ping: pingData,
      timestamp: new Date()
    });

    // También enviar pings actualizados
    this.broadcastActivePings(classId);
  }

  // Notificar lote de pings (optimizado para arrays)
  public notifyBatchPings(classId: number, pings: any[]): void {
    const roomName = `class-${classId}`;
    console.log(`📦 Emitiendo lote de ${pings.length} pings a sala ${roomName}`);
    
    this.io.to(roomName).emit('batch-pings', {
      classId,
      pings,
      timestamp: new Date(),
      total_pings: pings.length
    });

    // También enviar pings actualizados
    this.broadcastActivePings(classId);
  }

  // Notificar consolidación de asistencia
  public notifyAttendanceConsolidated(classId: number, studentId: number, finalStatus: string): void {
    const roomName = `class-${classId}`;
    console.log(`📡 Emitiendo consolidación de asistencia a sala ${roomName}`);
    
    this.io.to(roomName).emit('attendance-consolidated', {
      classId,
      studentId,
      finalStatus,
      timestamp: new Date()
    });
  }

  // Notificar cambios en inscripciones
  public notifyEnrollmentChange(classId: number): void {
    const roomName = `class-${classId}`;
    console.log(`📡 Emitiendo cambio de inscripciones a sala ${roomName}`);
    
    this.broadcastEnrolledStudents(classId);
  }

  // Broadcast de estudiantes inscritos a toda la sala
  private async broadcastEnrolledStudents(classId: number): Promise<void> {
    try {
      const enrolledStudents = await EnrollmentsModel.findAll({
        where: { id_class: classId },
        include: [
          {
            model: UsersModel,
            where: { role: 'Student' },
            attributes: ['id_user', 'name', 'email']
          }
        ]
      });

      const students = enrolledStudents.map((enrollment: any) => ({
        id_student: enrollment.id_student,
        name: enrollment.User.name,
        email: enrollment.User.email,
        enrollment_date: enrollment.createdAt
      }));

      const roomName = `class-${classId}`;
      this.io.to(roomName).emit('enrolled-students', {
        classId,
        students,
        total: students.length
      });

    } catch (error) {
      console.error('Error al broadcast estudiantes inscritos:', error);
    }
  }

  // Broadcast de pings activos a toda la sala
  private async broadcastActivePings(classId: number): Promise<void> {
    const roomName = `class-${classId}`;
    
    // Emitir a toda la sala sin iterar sobre sockets individuales
    this.io.to(roomName).emit('refresh-pings', { classId });
  }

  // Obtener instancia de Socket.IO para uso externo
  public getIO(): SocketIOServer {
    return this.io;
  }

  // Obtener estadísticas de conexiones
  public getConnectionStats(): { totalConnections: number; users: any[] } {
    return {
      totalConnections: this.connectedUsers.size,
      users: Array.from(this.connectedUsers.values())
    };
  }
}

export default WebSocketService;
