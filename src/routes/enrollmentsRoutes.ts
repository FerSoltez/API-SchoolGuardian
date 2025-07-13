import { Router } from "express";
import enrollmentsController from "../controllers/enrollmentsController";
import authMiddleware from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();

// Rutas para inscripciones
router.post("/enrollments", authMiddleware, roleMiddleware([2]), enrollmentsController.createEnrollment as any); // Solo estudiantes
router.post("/enrollments/get", authMiddleware, enrollmentsController.getAllEnrollments as any);
router.post("/enrollments/detalle", authMiddleware, enrollmentsController.getEnrollment as any);
router.delete("/enrollments/:id", authMiddleware, roleMiddleware([2]), enrollmentsController.deleteEnrollment as any); // Solo estudiantes
router.post("/enrollments/clase", authMiddleware, roleMiddleware([1]), enrollmentsController.getStudentsByClass as any); // Solo profesores
router.post("/enrollments/alumno", authMiddleware, roleMiddleware([2]), enrollmentsController.getClassesByStudent as any); // Solo estudiantes
router.post("/enrollments/self", authMiddleware, roleMiddleware([2]), enrollmentsController.enrollSelf as any); // Estudiante se inscribe a sí mismo

export default router;
