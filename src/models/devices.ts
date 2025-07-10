import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/database';

interface DevicesAttributes {
  device_id: number;
  location: string;
  device_uuid: string;
  status: 'Active' | 'Sleep' | 'Off';
}

class DevicesModel extends Model<DevicesAttributes> implements DevicesAttributes {
  public device_id!: number;
  public location!: string;
  public device_uuid!: string;
  public status!: 'Active' | 'Sleep' | 'Off';
}

DevicesModel.init(
  {
    device_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    device_uuid: {
      type: DataTypes.CHAR(36),
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
