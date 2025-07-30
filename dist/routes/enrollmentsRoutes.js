"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const enrollmentsController_1 = __importDefault(require("../controllers/enrollmentsController"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// Rutas para inscripciones
router.post("/enrollments", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Student"]), enrollmentsController_1.default.createEnrollment); // Solo estudiantes
router.post("/enrollments/get", authMiddleware_1.default, enrollmentsController_1.default.getAllEnrollments);
router.post("/enrollments/detalle", authMiddleware_1.default, enrollmentsController_1.default.getEnrollment);
router.delete("/enrollments/:id", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Student"]), enrollmentsController_1.default.deleteEnrollment); // Solo estudiantes
router.post("/enrollments/clase", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor"]), enrollmentsController_1.default.getStudentsByClass); // Solo profesores
router.post("/enrollments/alumno", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Student"]), enrollmentsController_1.default.getClassesByStudent); // Solo estudiantes
router.post("/enrollments/self", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Student"]), enrollmentsController_1.default.enrollSelf); // Estudiante se inscribe a sí mismo
exports.default = router;
