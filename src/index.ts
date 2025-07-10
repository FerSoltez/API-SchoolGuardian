import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import usuarioRoutes from './routes/usuarioRoutes';
import clasesRoutes from './routes/claseRoutes';
import asistenciaRoutes from "./routes/asistenciaRoutes";
import claseDiasRoutes from "./routes/claseDiasRoutes";
import inscripcionRoutes from "./routes/inscripcionRoutes";
import path from "path";

dotenv.config();
const app: Application = express();

// Middlewares  
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", usuarioRoutes);
app.use("/api", clasesRoutes);
app.use("/api", asistenciaRoutes);
app.use("/api", claseDiasRoutes);
app.use("/api", inscripcionRoutes);
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
