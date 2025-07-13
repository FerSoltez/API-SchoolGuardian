import { Router } from "express";
import devicesController from "../controllers/devicesController";
import authMiddleware from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();

// Rutas para dispositivos
router.post("/devices", authMiddleware, roleMiddleware(["Administrator"]), devicesController.createDevice as any); // Solo administradores
router.post("/devices/get", authMiddleware, devicesController.getAllDevices as any);
router.post("/devices/detalle", authMiddleware, devicesController.getDevice as any);
router.patch("/devices/:id", authMiddleware, roleMiddleware(["Administrator"]), devicesController.updateDevice as any); // Solo administradores
router.delete("/devices/:id", authMiddleware, roleMiddleware(["Administrator"]), devicesController.deleteDevice as any); // Solo administradores

// Rutas adicionales
router.post("/devices/status/:status", authMiddleware, devicesController.getDevicesByStatus as any);
router.post("/devices/:id/schedules", authMiddleware, devicesController.getDeviceSchedules as any);
router.patch("/devices/:id/status", authMiddleware, roleMiddleware(["Administrator", "Professor"]), devicesController.updateDeviceStatus as any); // Admin y profesores

export default router;
