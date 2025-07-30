"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendancePingsModel = exports.SchedulesModel = exports.AttendanceModel = exports.EnrollmentsModel = exports.DevicesModel = exports.ClassesModel = exports.UsersModel = void 0;
// Model relationships - defined separately to avoid circular imports
const users_1 = __importDefault(require("./users"));
exports.UsersModel = users_1.default;
const classes_1 = __importDefault(require("./classes"));
exports.ClassesModel = classes_1.default;
const devices_1 = __importDefault(require("./devices"));
exports.DevicesModel = devices_1.default;
const enrollments_1 = __importDefault(require("./enrollments"));
exports.EnrollmentsModel = enrollments_1.default;
const attendance_1 = __importDefault(require("./attendance"));
exports.AttendanceModel = attendance_1.default;
const schedules_1 = __importDefault(require("./schedules"));
exports.SchedulesModel = schedules_1.default;
const attendancePings_1 = __importDefault(require("./attendancePings"));
exports.AttendancePingsModel = attendancePings_1.default;
// Users relationships
users_1.default.hasMany(classes_1.default, { foreignKey: "id_professor" });
users_1.default.hasMany(enrollments_1.default, { foreignKey: "id_student" });
users_1.default.hasMany(attendance_1.default, { foreignKey: "id_student" });
users_1.default.hasMany(attendancePings_1.default, { foreignKey: "id_student" });
// Classes relationships
classes_1.default.belongsTo(users_1.default, { foreignKey: "id_professor" });
classes_1.default.hasMany(enrollments_1.default, { foreignKey: "id_class" });
classes_1.default.hasMany(attendance_1.default, { foreignKey: "id_class" });
classes_1.default.hasMany(schedules_1.default, { foreignKey: "id_class" });
classes_1.default.hasMany(attendancePings_1.default, { foreignKey: "id_class" });
// Devices relationships
devices_1.default.hasMany(schedules_1.default, { foreignKey: "id_device" });
// Enrollments relationships
enrollments_1.default.belongsTo(users_1.default, { foreignKey: "id_student" });
enrollments_1.default.belongsTo(classes_1.default, { foreignKey: "id_class" });
// Attendance relationships
attendance_1.default.belongsTo(users_1.default, { foreignKey: "id_student" });
attendance_1.default.belongsTo(classes_1.default, { foreignKey: "id_class" });
// AttendancePings relationships
attendancePings_1.default.belongsTo(users_1.default, { foreignKey: "id_student" });
attendancePings_1.default.belongsTo(classes_1.default, { foreignKey: "id_class" });
// Schedules relationships
schedules_1.default.belongsTo(classes_1.default, { foreignKey: "id_class" });
schedules_1.default.belongsTo(devices_1.default, { foreignKey: "id_device" });
