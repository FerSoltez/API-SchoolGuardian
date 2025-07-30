"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class DevicesModel extends sequelize_1.Model {
}
DevicesModel.init({
    id_device: {
        type: sequelize_1.DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El ID del dispositivo no puede estar vacío'
            },
            len: {
                args: [1, 50],
                msg: 'El ID del dispositivo debe tener entre 1 y 50 caracteres'
            }
        }
    },
    location: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'La ubicación no puede estar vacía'
            },
            len: {
                args: [1, 100],
                msg: 'La ubicación debe tener entre 1 y 100 caracteres'
            }
        }
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Active', 'Sleep', 'Off'),
        allowNull: false,
        defaultValue: 'Off',
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "Devices",
    tableName: "Devices",
    timestamps: false,
});
exports.default = DevicesModel;
