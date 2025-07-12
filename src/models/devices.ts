import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/database';

interface DevicesAttributes {
  id_device: number;
  location: string;
  status: 'Active' | 'Sleep' | 'Off';
}

class DevicesModel extends Model<DevicesAttributes> implements DevicesAttributes {
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
