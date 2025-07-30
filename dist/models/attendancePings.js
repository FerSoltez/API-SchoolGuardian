"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
// Definir el modelo
class AttendancePingsModel extends sequelize_1.Model {
}
// Inicializar el modelo
AttendancePingsModel.init({
    id_ping: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    id_student: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id_user',
        },
    },
    id_class: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Classes',
            key: 'id_class',
        },
    },
    ping_time: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Present', 'Late', 'Absent'),
        allowNull: false,
    },
    ping_number: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: false,
        validate: {
            min: 1,
            max: 3
        }
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "AttendancePings",
    tableName: "Attendance_Pings",
    timestamps: false, // Desactivar timestamps ya que la tabla no los tiene
});
exports.default = AttendancePingsModel;
