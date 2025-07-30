"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const classesController_1 = __importDefault(require("../controllers/classesController"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// Rutas para clases
router.post("/classes", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Administrator"]), classesController_1.default.createClass); // Solo profesores
router.post("/classes/get", authMiddleware_1.default, classesController_1.default.getAllClasses);
router.post("/classes/detalle", authMiddleware_1.default, classesController_1.default.getClass);
router.post("/classes/codigo", authMiddleware_1.default, classesController_1.default.getClassByCode);
router.delete("/classes/:id", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Administrator"]), classesController_1.default.deleteClass);
router.patch("/classes/:id", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor"]), classesController_1.default.partialUpdateClass);
router.post("/classes/usuario", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor"]), classesController_1.default.getClassesByUserId);
exports.default = router;
