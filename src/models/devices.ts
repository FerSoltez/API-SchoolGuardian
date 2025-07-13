import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';

interface DevicesAttributes {
  id_device: number;
  location: string;
  status: 'Active' | 'Sleep' | 'Off';
}

interface DevicesCreationAttributes extends Optional<DevicesAttributes, "id_device"> {}

class DevicesModel extends Model<DevicesAttributes, DevicesCreationAttributes> implements DevicesAttributes {
  public id_device!: number;
  public location!: string;
  public status!: 'Active' | 'Sleep' | 'Off';
}

DevicesModel.init(
  {
    id_device: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    location: {
      type: DataTypes.STRING(100),
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
      type: DataTypes.ENUM('Active', 'Sleep', 'Off'),
      allowNull: false,
      defaultValue: 'Off',
    },
  },
  {
    sequelize,
    modelName: "Devices",
    tableName: "Devices",
    timestamps: false,
  }
);

export default DevicesModel;
