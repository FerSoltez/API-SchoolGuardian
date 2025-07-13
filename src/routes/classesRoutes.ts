import { Router } from "express";
import classesController from "../controllers/classesController";
import authMiddleware from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();

// Rutas para clases
router.post("/classes", authMiddleware, roleMiddleware([1]), classesController.createClass as any); // Solo profesores
router.post("/classes/get", authMiddleware, classesController.getAllClasses as any);
router.post("/classes/detalle", authMiddleware, classesController.getClass as any);
router.post("/classes/codigo", authMiddleware, classesController.getClassByCode as any);
router.delete("/classes/:id", authMiddleware, roleMiddleware([1]), classesController.deleteClass as any);
router.patch("/classes/:id", authMiddleware, roleMiddleware([1]), classesController.partialUpdateClass as any);
router.post("/classes/usuario", authMiddleware, roleMiddleware([1]), classesController.getClassesByUserId as any);

export default router;
