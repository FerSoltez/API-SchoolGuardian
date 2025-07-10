import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';
import ClassesModel from './classes';

interface SchedulesAttributes {
  schedule_id: number;
  class_id: number;
  weekday: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  start_time: string;
  end_time: string;
}

interface SchedulesCreationAttributes extends Optional<SchedulesAttributes, "schedule_id"> {}

class SchedulesModel extends Model<SchedulesAttributes, SchedulesCreationAttributes> implements SchedulesAttributes {
  public schedule_id!: number;
  public class_id!: number;
  public weekday!: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  public start_time!: string;
  public end_time!: string;
}

SchedulesModel.init(
  {
    schedule_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ClassesModel,
        key: "class_id",
      },
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

// Relaciones
SchedulesModel.belongsTo(ClassesModel, { foreignKey: "class_id" });
ClassesModel.hasMany(SchedulesModel, { foreignKey: "class_id" });

export default SchedulesModel;
