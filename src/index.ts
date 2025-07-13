import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import usersRoutes from './routes/usersRoutes';
import classesRoutes from './routes/classesRoutes';
import schedulesRoutes from './routes/schedulesRoutes';
import enrollmentsRoutes from './routes/enrollmentsRoutes';
import devicesRoutes from './routes/devicesRoutes';
import attendanceRoutes from './routes/attendanceRoutes';

import path from "path";

dotenv.config();
const app: Application = express();

// Middlewares  
app.use(cors());
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
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
