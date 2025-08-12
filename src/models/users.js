"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var sequelize_1 = require("sequelize");
var database_1 = require("../config/database");
var UsersModel = /** @class */ (function (_super) {
    __extends(UsersModel, _super);
    function UsersModel() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UsersModel;
}(sequelize_1.Model));
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
            isValidForRole: function (value) {
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
    profile_image_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null,
    },
    last_uuid_change: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "Users",
    tableName: "Users",
    timestamps: false,
});
exports.default = UsersModel;
