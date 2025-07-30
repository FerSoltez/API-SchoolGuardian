"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class SchedulesModel extends sequelize_1.Model {
}
SchedulesModel.init({
    id_schedule: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    id_class: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    id_device: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    weekday: {
        type: sequelize_1.DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        allowNull: false,
    },
    start_time: {
        type: sequelize_1.DataTypes.TIME,
        allowNull: false,
    },
    end_time: {
        type: sequelize_1.DataTypes.TIME,
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "Schedules",
    tableName: "Schedules",
    timestamps: false,
});
exports.default = SchedulesModel;
