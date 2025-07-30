"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendanceController_1 = __importDefault(require("../controllers/attendanceController"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// Rutas para asistencia
// Crear asistencia (Solo profesores)
router.post("/attendance", attendanceController_1.default.createAttendance);
// Crear asistencias basándose en dispositivo (Solo profesores - Asistencia por dispositivo)
router.post("/attendance/device", attendanceController_1.default.createAttendanceByDevice);
// Manejar llegada de ping de asistencia (sin autenticación - para dispositivos)
router.post("/attendance/ping", attendanceController_1.default.handleAttendancePing);
// Obtener pings activos para una clase
router.post("/attendance/pings/active", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor", "Administrator"]), attendanceController_1.default.getActivePings);
// Manejar status de asistencia desde dispositivo (sondeo automático) - PATCH porque actualiza/crea
router.patch("/attendance/device-status", attendanceController_1.default.handleDeviceAttendanceStatus);
// Obtener todas las asistencias (Solo profesores y administradores)
router.post("/attendance/get", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor", "Administrator"]), attendanceController_1.default.getAllAttendances);
// Obtener asistencia por ID
router.post("/attendance/detalle", authMiddleware_1.default, attendanceController_1.default.getAttendance);
// Actualizar asistencia (Solo profesores)
router.patch("/attendance/:id", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor"]), attendanceController_1.default.updateAttendance);
// Eliminar asistencia (Solo profesores)
router.delete("/attendance/:id", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor"]), attendanceController_1.default.deleteAttendance);
// Obtener asistencias por estudiante (Estudiantes ven solo las suyas, profesores/admin ven cualquiera)
router.post("/attendance/student", authMiddleware_1.default, attendanceController_1.default.getAttendancesByStudent);
// Obtener asistencias por clase (Solo profesores y administradores)
router.post("/attendance/class", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor", "Administrator"]), attendanceController_1.default.getAttendancesByClass);
// Obtener asistencias por fecha (Solo profesores y administradores)
router.post("/attendance/date", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor", "Administrator"]), attendanceController_1.default.getAttendancesByDate);
// Obtener estadísticas de asistencia (Solo profesores y administradores, estudiantes ven solo las suyas)
router.post("/attendance/stats", authMiddleware_1.default, attendanceController_1.default.getAttendanceStats);
// Endpoints para manejo de pings
router.delete("/attendance/pings/cleanup", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor", "Administrator"]), attendanceController_1.default.cleanupExpiredPings);
router.post("/attendance/pings/stats", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor", "Administrator"]), attendanceController_1.default.getPingsStatistics);
router.delete("/attendance/pings/all", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Administrator"]), attendanceController_1.default.cleanupAllPings);
exports.default = router;
