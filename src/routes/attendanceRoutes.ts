import { Router } from "express";
import attendanceController from "../controllers/attendanceController";
import authMiddleware from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();

// Rutas para asistencia

// Crear asistencia (Solo profesores)
router.post("/attendance", attendanceController.createAttendance as any);

// Crear múltiples asistencias (Solo profesores - Asistencia masiva)
router.post("/attendance/bulk", attendanceController.createBulkAttendance as any);

// Manejar status de asistencia desde dispositivo (sondeo automático) - PATCH porque actualiza/crea
router.patch("/attendance/device-status", attendanceController.handleDeviceAttendanceStatus as any);

// Obtener todas las asistencias (Solo profesores y administradores)
router.post("/attendance/get", authMiddleware, roleMiddleware(["Professor", "Administrator"]), attendanceController.getAllAttendances as any);

// Obtener asistencia por ID
router.post("/attendance/detalle", authMiddleware, attendanceController.getAttendance as any);

// Actualizar asistencia (Solo profesores)
router.patch("/attendance/:id", authMiddleware, roleMiddleware(["Professor"]), attendanceController.updateAttendance as any);

// Eliminar asistencia (Solo profesores)
router.delete("/attendance/:id", authMiddleware, roleMiddleware(["Professor"]), attendanceController.deleteAttendance as any);

// Obtener asistencias por estudiante (Estudiantes ven solo las suyas, profesores/admin ven cualquiera)
router.post("/attendance/student", authMiddleware, attendanceController.getAttendancesByStudent as any);

// Obtener asistencias por clase (Solo profesores y administradores)
router.post("/attendance/class", authMiddleware, roleMiddleware(["Professor", "Administrator"]), attendanceController.getAttendancesByClass as any);

// Obtener asistencias por fecha (Solo profesores y administradores)
router.post("/attendance/date", authMiddleware, roleMiddleware(["Professor", "Administrator"]), attendanceController.getAttendancesByDate as any);

// Obtener estadísticas de asistencia (Solo profesores y administradores, estudiantes ven solo las suyas)
router.post("/attendance/stats", authMiddleware, attendanceController.getAttendanceStats as any);

export default router;
