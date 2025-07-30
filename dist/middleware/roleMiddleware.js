"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = void 0;
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!allowedRoles.includes(user.role)) {
            res.status(403).json({ message: "Acceso denegado. No tienes permisos para realizar esta acción." });
            return;
        }
        next();
    };
};
exports.roleMiddleware = roleMiddleware;
