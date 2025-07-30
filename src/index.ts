import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import usersRoutes from './routes/usersRoutes';
import classesRoutes from './routes/classesRoutes';
import schedulesRoutes from './routes/schedulesRoutes';
import enrollmentsRoutes from './routes/enrollmentsRoutes';
import devicesRoutes from './routes/devicesRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import { attendancePingsCleanup } from './services/attendancePingsCleanup';

import path from "path";
import { WebSocketServer } from "ws";

dotenv.config();
const app: Application = express();

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

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Iniciar el servicio de limpieza automática de pings
  attendancePingsCleanup.startCleanupService();
});

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

// Configurar WebSocketServer
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Cliente conectado');
  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});

export const broadcast = (data: any) => {
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};