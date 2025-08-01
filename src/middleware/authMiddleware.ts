import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  console.log("🔐 AuthMiddleware - Headers recibidos:", {
    authorization: authHeader ? `${authHeader.substring(0, 20)}...` : "No encontrado",
    hasToken: !!token,
    tokenLength: token?.length || 0,
    jwtSecret: process.env.JWT_SECRET ? "✅ Configurado" : "❌ No encontrado"
  });

  if (!token) {
    console.log("❌ AuthMiddleware - Token no proporcionado");
    res.status(401).json({ message: "Acceso denegado. No se proporcionó un token." });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret") as { id: number; role: string };
    console.log("✅ AuthMiddleware - Token válido:", {
      userId: decoded.id,
      userRole: decoded.role
    });
    req.user = decoded; // Agrega el usuario decodificado al request
    next();
  } catch (error) {
    console.log("❌ AuthMiddleware - Token inválido:", {
      error: (error as Error).message,
      tokenPreview: token.substring(0, 20) + "..."
    });
    res.status(401).json({ message: "Token no válido." });
  }
};

export default authMiddleware;