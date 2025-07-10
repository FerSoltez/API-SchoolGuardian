import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ message: "Acceso denegado. No se proporcionó un token." });
    return;
  }

  try {
    const decoded = jwt.verify(token, "your_jwt_secret") as { id: number; id_tipo: number };
    req.user = decoded; // Agrega el usuario decodificado al request
    next();
  } catch (error) {
    res.status(401).json({ message: "Token no válido." });
  }
};

export default authMiddleware;