import { Request, Response, NextFunction } from "express";

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as { id: number; role: string };

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ message: "Acceso denegado. No tienes permisos para realizar esta acción." });
      return;
    }

    next();
  };
};