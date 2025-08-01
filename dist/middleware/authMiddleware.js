"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    const authHeader = req.header("Authorization");
    const token = authHeader === null || authHeader === void 0 ? void 0 : authHeader.replace("Bearer ", "");
    console.log("🔐 AuthMiddleware - Headers recibidos:", {
        authorization: authHeader ? `${authHeader.substring(0, 20)}...` : "No encontrado",
        hasToken: !!token,
        tokenLength: (token === null || token === void 0 ? void 0 : token.length) || 0,
        jwtSecret: process.env.JWT_SECRET ? "✅ Configurado" : "❌ No encontrado"
    });
    if (!token) {
        console.log("❌ AuthMiddleware - Token no proporcionado");
        res.status(401).json({ message: "Acceso denegado. No se proporcionó un token." });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
        console.log("✅ AuthMiddleware - Token válido:", {
            userId: decoded.id,
            userRole: decoded.role
        });
        req.user = decoded; // Agrega el usuario decodificado al request
        next();
    }
    catch (error) {
        console.log("❌ AuthMiddleware - Token inválido:", {
            error: error.message,
            tokenPreview: token.substring(0, 20) + "..."
        });
        res.status(401).json({ message: "Token no válido." });
    }
};
exports.default = authMiddleware;
