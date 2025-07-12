import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';

interface SchedulesAttributes {
  id_schedule: number;
  id_class: number;
  id_device: number;
  weekday: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  start_time: string;
  end_time: string;
}

interface SchedulesCreationAttributes extends Optional<SchedulesAttributes, "id_schedule"> {}

class SchedulesModel extends Model<SchedulesAttributes, SchedulesCreationAttributes> implements SchedulesAttributes {
  public id_schedule!: number;
  public id_class!: number;
  public id_device!: number;
  public weekday!: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  public start_time!: string;
  public end_time!: string;
}

SchedulesModel.init(
  {
    id_schedule: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_class: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_device: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    weekday: {
      type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Schedules",
    tableName: "Schedules",
    timestamps: false,
  }
);

export default SchedulesModel;
