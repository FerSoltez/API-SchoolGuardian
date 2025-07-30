"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const devicesController_1 = __importDefault(require("../controllers/devicesController"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// Rutas para dispositivos
router.post("/devices", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Administrator"]), devicesController_1.default.createDevice); // Solo administradores
router.post("/devices/get", authMiddleware_1.default, devicesController_1.default.getAllDevices);
router.post("/devices/detalle", authMiddleware_1.default, devicesController_1.default.getDevice);
router.patch("/devices/:id", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Administrator"]), devicesController_1.default.updateDevice); // Solo administradores
router.delete("/devices/:id", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Administrator"]), devicesController_1.default.deleteDevice); // Solo administradores
// Rutas adicionales
router.post("/devices/status/:status", authMiddleware_1.default, devicesController_1.default.getDevicesByStatus);
router.post("/devices/:id/schedules", authMiddleware_1.default, devicesController_1.default.getDeviceSchedules);
router.patch("/devices/:id/status", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Administrator", "Professor"]), devicesController_1.default.updateDeviceStatus); // Admin y profesores
router.post("/devices/daily-polls", devicesController_1.default.getDailyClassPolls); // Nueva ruta para obtener polls del día
exports.default = router;
