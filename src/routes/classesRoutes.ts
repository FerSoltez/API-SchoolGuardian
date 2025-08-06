import { Router } from "express";
import classesController from "../controllers/classesController";
import authMiddleware from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";
import upload from "../config/cloudinaryConfig"; // Importar configuración de Cloudinary

const router = Router();

// Rutas para clases
router.post("/classes", authMiddleware, roleMiddleware(["Administrator"]), upload.single('class_image'), classesController.createClass as any); // Solo profesores con imagen
router.post("/classes/get", authMiddleware, classesController.getAllClasses as any);
router.post("/classes/detalle", authMiddleware, classesController.getClass as any);
router.post("/classes/codigo", authMiddleware, classesController.getClassByCode as any);
router.delete("/classes/:id", authMiddleware, roleMiddleware(["Administrator"]), classesController.deleteClass as any);
router.patch("/classes/:id", authMiddleware, roleMiddleware(["Administrator"]), upload.single('class_image'), classesController.partialUpdateClass as any); // Con imagen
router.post("/classes/usuario", authMiddleware, roleMiddleware(["Professor", "Student"]), classesController.getClassesByUserId as any);

export default router;
