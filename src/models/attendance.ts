import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';

interface AttendanceAttributes {
  id_attendance: number;
  id_student: number;
  id_class: number;
  attendance_date: Date;
  attendance_time: string;
  status: 'Present' | 'Late' | 'Absent' | 'Justified';
}

interface AttendanceCreationAttributes extends Optional<AttendanceAttributes, "id_attendance"> {}

class AttendanceModel extends Model<AttendanceAttributes, AttendanceCreationAttributes> implements AttendanceAttributes {
  public id_attendance!: number;
  public id_student!: number;
  public id_class!: number;
  public attendance_date!: Date;
  public attendance_time!: string;
  public status!: 'Present' | 'Late' | 'Absent' | 'Justified';
}

AttendanceModel.init(
  {
    id_attendance: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_student: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_class: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      type: DataTypes.ENUM('Present', 'Late', 'Absent', 'Justified'),
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

export default AttendanceModel;
