"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class UsersModel extends sequelize_1.Model {
}
UsersModel.init({
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    matricula: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true, // Puede ser null para Administrators
        unique: true, // Único en toda la tabla
        validate: {
            // Validación personalizada: solo Student y Professor pueden tener matrícula
            isValidForRole(value) {
                // Si es Administrator y tiene matrícula, es error
                if (value !== null && value !== undefined && this.role === 'Administrator') {
                    throw new Error('Los administradores no pueden tener matrícula');
                }
                // Si es Student o Professor y NO tiene matrícula, es error
                if ((value === null || value === undefined) && (this.role === 'Student' || this.role === 'Professor')) {
                    throw new Error('Los estudiantes y profesores deben tener matrícula');
                }
            }
        }
    },
    email: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('Administrator', 'Professor', 'Student'),
        allowNull: false,
    },
    user_uuid: {
        type: sequelize_1.DataTypes.CHAR(36),
        allowNull: true, // Nullable según el nuevo esquema - API valida esto
        unique: true,
        defaultValue: null,
    },
    verification: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    attempts: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0, // Cambiado a 0 según el nuevo esquema
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "Users",
    tableName: "Users",
    timestamps: false,
});
exports.default = UsersModel;
