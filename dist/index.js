"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const usersRoutes_1 = __importDefault(require("./routes/usersRoutes"));
const classesRoutes_1 = __importDefault(require("./routes/classesRoutes"));
const schedulesRoutes_1 = __importDefault(require("./routes/schedulesRoutes"));
const enrollmentsRoutes_1 = __importDefault(require("./routes/enrollmentsRoutes"));
const devicesRoutes_1 = __importDefault(require("./routes/devicesRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const attendancePingsCleanup_1 = require("./services/attendancePingsCleanup");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    // Iniciar el servicio de limpieza automática de pings
    attendancePingsCleanup_1.attendancePingsCleanup.startCleanupService();
});
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
