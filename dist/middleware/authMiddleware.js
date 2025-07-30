"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    var _a;
    const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ message: "Acceso denegado. No se proporcionó un token." });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, "your_jwt_secret");
        req.user = decoded; // Agrega el usuario decodificado al request
        next();
    }
    catch (error) {
        res.status(401).json({ message: "Token no válido." });
    }
};
exports.default = authMiddleware;
