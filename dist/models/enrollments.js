"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class EnrollmentsModel extends sequelize_1.Model {
}
EnrollmentsModel.init({
    id_enrollment: {
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
}, {
    sequelize: database_1.sequelize,
    modelName: "Enrollments",
    tableName: "Enrollments",
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['id_student', 'id_class']
        }
    ]
});
exports.default = EnrollmentsModel;
