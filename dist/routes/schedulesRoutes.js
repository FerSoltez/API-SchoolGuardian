"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schedulesController_1 = __importDefault(require("../controllers/schedulesController"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// Rutas para horarios
router.post("/schedules", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor"]), schedulesController_1.default.createSchedule); // Solo profesores
router.post("/schedules/clase/:id_class", authMiddleware_1.default, schedulesController_1.default.getSchedulesByClass);
router.post("/schedules/dia/:weekday", authMiddleware_1.default, schedulesController_1.default.getSchedulesByWeekday);
router.patch("/schedules/:id", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor"]), schedulesController_1.default.updateSchedule);
router.delete("/schedules/:id", authMiddleware_1.default, (0, roleMiddleware_1.roleMiddleware)(["Professor"]), schedulesController_1.default.deleteSchedule);
exports.default = router;
