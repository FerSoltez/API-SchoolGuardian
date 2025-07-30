"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class ClassesModel extends sequelize_1.Model {
}
ClassesModel.init({
    id_class: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    id_professor: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    group_name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    class_code: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "Classes",
    tableName: "Classes",
    timestamps: false,
});
exports.default = ClassesModel;
