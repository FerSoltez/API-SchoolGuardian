"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const usersRoutes_1 = __importDefault(require("./routes/usersRoutes"));
const classesRoutes_1 = __importDefault(require("./routes/classesRoutes"));
const schedulesRoutes_1 = __importDefault(require("./routes/schedulesRoutes"));
const enrollmentsRoutes_1 = __importDefault(require("./routes/enrollmentsRoutes"));
const devicesRoutes_1 = __importDefault(require("./routes/devicesRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const attendancePingsCleanup_1 = require("./services/attendancePingsCleanup");
const webSocketService_1 = __importDefault(require("./services/webSocketService"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Inicializar WebSocket Service
const webSocketService = new webSocketService_1.default(httpServer);
global.webSocketService = webSocketService;
// Middlewares  
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://your-frontend-domain.com", // Reemplazar con tu dominio frontend
        "https://api-schoolguardian.onrender.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"]
}));
app.use(express_1.default.json());
// Routes
app.use("/api", usersRoutes_1.default);
app.use("/api", classesRoutes_1.default);
app.use("/api", schedulesRoutes_1.default);
app.use("/api", enrollmentsRoutes_1.default);
app.use("/api", devicesRoutes_1.default);
app.use("/api", attendanceRoutes_1.default);
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
// Ruta de prueba
app.get("/", (req, res, next) => {
    res.send("¡API en funcionamiento!");
});
// Health check para WebSocket
app.get("/health", (req, res) => {
    const stats = webSocketService.getConnectionStats();
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        websocket: {
            active: true,
            connected_users: stats.totalConnections
        },
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            env: process.env.NODE_ENV || 'development'
        }
    });
});
// Endpoint específico para verificar WebSocket
app.get("/api/websocket/status", (req, res) => {
    const stats = webSocketService.getConnectionStats();
    res.json({
        websocket_active: true,
        total_connections: stats.totalConnections,
        users: stats.users,
        timestamp: new Date().toISOString()
    });
});
// Manejador de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Algo salió mal");
});
// Puerto del servidor
const PORT = process.env.PORT || 3002;
// Configuración adicional para producción
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
const server = httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP corriendo en el puerto ${PORT}`);
    console.log(`🔌 WebSocket Server iniciado en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    // Iniciar el servicio de limpieza automática de pings
    attendancePingsCleanup_1.attendancePingsCleanup.startCleanupService();
});
// Configurar timeouts para producción
server.timeout = 120000; // 2 minutos
server.keepAliveTimeout = 65000; // 65 segundos
server.headersTimeout = 66000; // 66 segundos
// Manejar cierre graceful del servidor
process.on('SIGTERM', () => {
    console.log('🔄 Cerrando servidor...');
    attendancePingsCleanup_1.attendancePingsCleanup.stopCleanupService();
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
    });
});
process.on('SIGINT', () => {
    console.log('🔄 Cerrando servidor...');
    attendancePingsCleanup_1.attendancePingsCleanup.stopCleanupService();
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
    });
});
