import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';
import UsersModel from './users';
import ClassesModel from './classes';

interface AttendanceAttributes {
  attendance_id: number;
  student_id: number;
  class_id: number;
  attendance_date: Date;
  attendance_time: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
}

interface AttendanceCreationAttributes extends Optional<AttendanceAttributes, "attendance_id"> {}

class AttendanceModel extends Model<AttendanceAttributes, AttendanceCreationAttributes> implements AttendanceAttributes {
  public attendance_id!: number;
  public student_id!: number;
  public class_id!: number;
  public attendance_date!: Date;
  public attendance_time!: string;
  public status!: 'Present' | 'Late' | 'Absent' | 'Excused';
}

AttendanceModel.init(
  {
    attendance_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: UsersModel,
        key: "id_user",
      },
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ClassesModel,
        key: "class_id",
      },
    },
    attendance_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    attendance_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Present', 'Late', 'Absent', 'Excused'),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Attendance",
    tableName: "Attendance",
    timestamps: false,
  }
);

// Relaciones
AttendanceModel.belongsTo(UsersModel, { foreignKey: "student_id" });
UsersModel.hasMany(AttendanceModel, { foreignKey: "student_id" });

AttendanceModel.belongsTo(ClassesModel, { foreignKey: "class_id" });
ClassesModel.hasMany(AttendanceModel, { foreignKey: "class_id" });

export default AttendanceModel;
