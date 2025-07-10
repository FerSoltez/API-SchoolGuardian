// Model relationships - defined separately to avoid circular imports
import UsersModel from './users';
import ClassesModel from './classes';
import DevicesModel from './devices';
import EnrollmentsModel from './enrollments';
import AttendanceModel from './attendance';
import SchedulesModel from './schedules';

// Users relationships
UsersModel.hasMany(ClassesModel, { foreignKey: "teacher_id" });
UsersModel.hasMany(EnrollmentsModel, { foreignKey: "student_id" });
UsersModel.hasMany(AttendanceModel, { foreignKey: "student_id" });

// Classes relationships
ClassesModel.belongsTo(UsersModel, { foreignKey: "teacher_id" });
ClassesModel.belongsTo(DevicesModel, { foreignKey: "device_id" });
ClassesModel.hasMany(EnrollmentsModel, { foreignKey: "class_id" });
ClassesModel.hasMany(AttendanceModel, { foreignKey: "class_id" });
ClassesModel.hasMany(SchedulesModel, { foreignKey: "class_id" });

// Devices relationships
DevicesModel.hasMany(ClassesModel, { foreignKey: "device_id" });

// Enrollments relationships
EnrollmentsModel.belongsTo(UsersModel, { foreignKey: "student_id" });
EnrollmentsModel.belongsTo(ClassesModel, { foreignKey: "class_id" });

// Attendance relationships
AttendanceModel.belongsTo(UsersModel, { foreignKey: "student_id" });
AttendanceModel.belongsTo(ClassesModel, { foreignKey: "class_id" });

// Schedules relationships
SchedulesModel.belongsTo(ClassesModel, { foreignKey: "class_id" });

export {
  UsersModel,
  ClassesModel,
  DevicesModel,
  EnrollmentsModel,
  AttendanceModel,
  SchedulesModel
};
