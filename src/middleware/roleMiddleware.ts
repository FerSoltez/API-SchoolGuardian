import { Request, Response, NextFunction } from "express";

export const roleMiddleware = (allowedRoles: number[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as { id: number; id_tipo: number };

    if (!allowedRoles.includes(user.id_tipo)) {
      res.status(403).json({ message: "Acceso denegado. No tienes permisos para realizar esta acción." });
      return;
    }

    next();
  };
};