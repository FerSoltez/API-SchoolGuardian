// Model relationships - defined separately to avoid circular imports
import UsersModel from './users';
import ClassesModel from './classes';
import DevicesModel from './devices';
import EnrollmentsModel from './enrollments';
import AttendanceModel from './attendance';
import SchedulesModel from './schedules';

// Users relationships
UsersModel.hasMany(ClassesModel, { foreignKey: "id_professor" });
UsersModel.hasMany(EnrollmentsModel, { foreignKey: "id_student" });
UsersModel.hasMany(AttendanceModel, { foreignKey: "id_student" });

// Classes relationships
ClassesModel.belongsTo(UsersModel, { foreignKey: "id_professor" });
ClassesModel.hasMany(EnrollmentsModel, { foreignKey: "id_class" });
ClassesModel.hasMany(AttendanceModel, { foreignKey: "id_class" });
ClassesModel.hasMany(SchedulesModel, { foreignKey: "id_class" });

// Devices relationships
DevicesModel.hasMany(SchedulesModel, { foreignKey: "id_device" });

// Enrollments relationships
EnrollmentsModel.belongsTo(UsersModel, { foreignKey: "id_student" });
EnrollmentsModel.belongsTo(ClassesModel, { foreignKey: "id_class" });

// Attendance relationships
AttendanceModel.belongsTo(UsersModel, { foreignKey: "id_student" });
AttendanceModel.belongsTo(ClassesModel, { foreignKey: "id_class" });

// Schedules relationships
SchedulesModel.belongsTo(ClassesModel, { foreignKey: "id_class" });
SchedulesModel.belongsTo(DevicesModel, { foreignKey: "id_device" });

export {
  UsersModel,
  ClassesModel,
  DevicesModel,
  EnrollmentsModel,
  AttendanceModel,
  SchedulesModel
};
