"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const users_1 = __importDefault(require("../models/users"));
const classes_1 = __importDefault(require("../models/classes"));
const enrollments_1 = __importDefault(require("../models/enrollments"));
const attendancePings_1 = __importDefault(require("../models/attendancePings"));
const sequelize_1 = require("sequelize");
class WebSocketService {
    constructor(server) {
        this.connectedUsers = new Map();
        this.io = new socket_io_1.Server(server, {
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
    setupMiddleware() {
        this.io.use((socket, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const token = socket.handshake.auth.token || ((_a = socket.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', ''));
                console.log('🔍 WebSocket Auth - Token recibido:', token ? `${token.substring(0, 20)}...` : 'No token');
                if (!token) {
                    console.log('❌ WebSocket Auth - No se proporcionó token');
                    return next(new Error('Token de autenticación requerido'));
                }
                // Verificar el token JWT
                console.log('🔐 WebSocket Auth - Verificando token JWT...');
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                console.log('✅ WebSocket Auth - Token decodificado:', {
                    id: decoded.id,
                    role: decoded.role,
                    iat: decoded.iat,
                    exp: decoded.exp,
                    current_time: Math.floor(Date.now() / 1000)
                });
                // Obtener información del usuario
                const user = yield users_1.default.findByPk(decoded.id);
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
            }
            catch (error) {
                console.error('❌ WebSocket Auth - Error:', error);
                if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                    return next(new Error('Token expirado'));
                }
                else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                    return next(new Error('Token inválido'));
                }
                else {
                    return next(new Error('Error de autenticación'));
                }
            }
        }));
    }
    // Configurar event handlers
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Usuario conectado: ${socket.userName} (${socket.userRole}) - Socket ID: ${socket.id}`);
            // Agregar usuario a la lista de conectados
            this.connectedUsers.set(socket.id, {
                userId: socket.userId,
                role: socket.userRole,
                name: socket.userName,
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
    handleJoinClassRoom(socket) {
        socket.on('join-class', (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { classId } = data;
                // Verificar que la clase existe
                const classExists = yield classes_1.default.findByPk(classId);
                if (!classExists) {
                    socket.emit('error', { message: 'Clase no encontrada' });
                    return;
                }
                // Verificar permisos (profesores pueden ver cualquier clase, estudiantes solo las suyas)
                if (socket.userRole === 'Student') {
                    const enrollment = yield enrollments_1.default.findOne({
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
                yield this.sendEnrolledStudents(socket, classId);
                // Enviar pings activos actuales
                yield this.sendActivePings(socket, classId);
                socket.emit('joined-class', {
                    classId,
                    message: `Te has unido a la clase ${classExists.name}`
                });
            }
            catch (error) {
                socket.emit('error', { message: error.message });
            }
        }));
    }
    // Salir de una sala de clase
    handleLeaveClassRoom(socket) {
        socket.on('leave-class', (data) => {
            const { classId } = data;
            const roomName = `class-${classId}`;
            socket.leave(roomName);
            console.log(`👋 ${socket.userName} salió de la sala: ${roomName}`);
            socket.emit('left-class', { classId });
        });
    }
    // Obtener usuarios conectados
    handleGetConnectedUsers(socket) {
        socket.on('get-connected-users', () => {
            const users = Array.from(this.connectedUsers.values());
            socket.emit('connected-users', users);
        });
    }
    // Manejar desconexión
    handleDisconnection(socket) {
        socket.on('disconnect', () => {
            console.log(`🔌 Usuario desconectado: ${socket.userName} - Socket ID: ${socket.id}`);
            this.connectedUsers.delete(socket.id);
        });
    }
    // Enviar lista de estudiantes inscritos a un socket específico
    sendEnrolledStudents(socket, classId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const enrolledStudents = yield enrollments_1.default.findAll({
                    where: { id_class: classId },
                    include: [
                        {
                            model: users_1.default,
                            where: { role: 'Student' },
                            attributes: ['id_user', 'name', 'email']
                        }
                    ]
                });
                const students = enrolledStudents.map((enrollment) => ({
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
            }
            catch (error) {
                socket.emit('error', { message: `Error al obtener estudiantes: ${error.message}` });
            }
        });
    }
    // Enviar pings activos a un socket específico
    sendActivePings(socket, classId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const today = new Date().toISOString().split('T')[0];
                const pings = yield attendancePings_1.default.findAll({
                    where: {
                        id_class: classId,
                        ping_time: {
                            [sequelize_1.Op.between]: [
                                new Date(today + ' 00:00:00'),
                                new Date(today + ' 23:59:59')
                            ]
                        }
                    },
                    order: [['ping_time', 'DESC']]
                });
                // Obtener información de estudiantes
                const studentIds = [...new Set(pings.map(ping => ping.id_student))];
                const students = yield users_1.default.findAll({
                    where: { id_user: { [sequelize_1.Op.in]: studentIds } },
                    attributes: ['id_user', 'name', 'email']
                });
                const studentMap = new Map();
                students.forEach(student => {
                    studentMap.set(student.id_user, student);
                });
                // Agrupar pings por estudiante
                const groupedPings = pings.reduce((acc, ping) => {
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
            }
            catch (error) {
                socket.emit('error', { message: `Error al obtener pings: ${error.message}` });
            }
        });
    }
    // Métodos públicos para emitir eventos desde otros servicios
    // Notificar nuevo ping a una clase específica
    notifyNewPing(classId, pingData) {
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
    notifyBatchPings(classId, pings) {
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
    notifyAttendanceConsolidated(classId, studentId, finalStatus) {
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
    notifyEnrollmentChange(classId) {
        const roomName = `class-${classId}`;
        console.log(`📡 Emitiendo cambio de inscripciones a sala ${roomName}`);
        this.broadcastEnrolledStudents(classId);
    }
    // Broadcast de estudiantes inscritos a toda la sala
    broadcastEnrolledStudents(classId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const enrolledStudents = yield enrollments_1.default.findAll({
                    where: { id_class: classId },
                    include: [
                        {
                            model: users_1.default,
                            where: { role: 'Student' },
                            attributes: ['id_user', 'name', 'email']
                        }
                    ]
                });
                const students = enrolledStudents.map((enrollment) => ({
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
            }
            catch (error) {
                console.error('Error al broadcast estudiantes inscritos:', error);
            }
        });
    }
    // Broadcast de pings activos a toda la sala
    broadcastActivePings(classId) {
        return __awaiter(this, void 0, void 0, function* () {
            const roomName = `class-${classId}`;
            // Emitir a toda la sala sin iterar sobre sockets individuales
            this.io.to(roomName).emit('refresh-pings', { classId });
        });
    }
    // Obtener instancia de Socket.IO para uso externo
    getIO() {
        return this.io;
    }
    // Obtener estadísticas de conexiones
    getConnectionStats() {
        return {
            totalConnections: this.connectedUsers.size,
            users: Array.from(this.connectedUsers.values())
        };
    }
}
exports.default = WebSocketService;
