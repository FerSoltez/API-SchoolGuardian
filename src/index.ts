import express, { Application, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import cors from "cors";
import usersRoutes from './routes/usersRoutes';
import classesRoutes from './routes/classesRoutes';
import schedulesRoutes from './routes/schedulesRoutes';
import enrollmentsRoutes from './routes/enrollmentsRoutes';
import devicesRoutes from './routes/devicesRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import { attendancePingsCleanup } from './services/attendancePingsCleanup';
import WebSocketService from './services/webSocketService';

import path from "path";

dotenv.config();
const app: Application = express();
const httpServer = createServer(app);

// Inicializar WebSocket Service
const webSocketService = new WebSocketService(httpServer);

// Hacer el servicio WebSocket accesible globalmente
declare global {
  var webSocketService: WebSocketService;
}
global.webSocketService = webSocketService;

// Middlewares  
app.use(cors({
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
app.use(express.json());

// Routes
app.use("/api", usersRoutes);
app.use("/api", classesRoutes);
app.use("/api", schedulesRoutes);
app.use("/api", enrollmentsRoutes);
app.use("/api", devicesRoutes);
app.use("/api", attendanceRoutes);

app.use(express.static(path.join(__dirname, "../public")));

// Ruta de prueba
app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("¡API en funcionamiento!");
});

// Health check para WebSocket
app.get("/health", (req: Request, res: Response) => {
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
app.get("/api/websocket/status", (req: Request, res: Response) => {
  const stats = webSocketService.getConnectionStats();
  res.json({
    websocket_active: true,
    total_connections: stats.totalConnections,
    users: stats.users,
    timestamp: new Date().toISOString()
  });
});

// Manejador de errores
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
  attendancePingsCleanup.startCleanupService();
});

// Configurar timeouts para producción
server.timeout = 120000; // 2 minutos
server.keepAliveTimeout = 65000; // 65 segundos
server.headersTimeout = 66000; // 66 segundos

// Manejar cierre graceful del servidor
process.on('SIGTERM', () => {
  console.log('🔄 Cerrando servidor...');
  attendancePingsCleanup.stopCleanupService();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
  });
});

process.on('SIGINT', () => {
  console.log('🔄 Cerrando servidor...');
  attendancePingsCleanup.stopCleanupService();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
  });
});
