import { Router } from "express";
import schedulesController from "../controllers/schedulesController";
import authMiddleware from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();

// Rutas para horarios
router.post("/schedules", authMiddleware, roleMiddleware(["Professor"]), schedulesController.createSchedule as any); // Solo profesores
router.post("/schedules/clase/:id_class", authMiddleware, schedulesController.getSchedulesByClass as any);
router.post("/schedules/dia/:weekday", authMiddleware, schedulesController.getSchedulesByWeekday as any);
router.patch("/schedules/:id", authMiddleware, roleMiddleware(["Professor"]), schedulesController.updateSchedule as any);
router.delete("/schedules/:id", authMiddleware, roleMiddleware(["Professor"]), schedulesController.deleteSchedule as any);

export default router;
