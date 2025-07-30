"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class AttendanceModel extends sequelize_1.Model {
}
AttendanceModel.init({
    id_attendance: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    id_student: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    id_class: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    attendance_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    attendance_time: {
        type: sequelize_1.DataTypes.TIME,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Present', 'Late', 'Absent', 'Justified'),
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "Attendance",
    tableName: "Attendance",
    timestamps: false,
});
exports.default = AttendanceModel;
