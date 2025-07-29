import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

// Definir la interfaz para los atributos del modelo
interface AttendancePingsAttributes {
  id_ping: number;
  id_student: number;
  id_class: number;
  ping_time: Date;
  status: 'Present' | 'Late' | 'Absent';
  ping_number: number;
}

// Definir la interfaz para la creación (sin id_ping y ping_time que son auto-generados)
interface AttendancePingsCreationAttributes extends Optional<AttendancePingsAttributes, 'id_ping' | 'ping_time'> {}

// Definir el modelo
class AttendancePingsModel extends Model<AttendancePingsAttributes, AttendancePingsCreationAttributes> implements AttendancePingsAttributes {
  public id_ping!: number;
  public id_student!: number;
  public id_class!: number;
  public ping_time!: Date;
  public status!: 'Present' | 'Late' | 'Absent';
  public ping_number!: number;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Inicializar el modelo
AttendancePingsModel.init(
  {
    id_ping: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_student: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id_user',
      },
    },
    id_class: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Classes',
        key: 'id_class',
      },
    },
    ping_time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM('Present', 'Late', 'Absent'),
      allowNull: false,
    },
    ping_number: {
      type: DataTypes.TINYINT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "AttendancePings",
    tableName: "Attendance_Pings",
    timestamps: true,
  }
);

export default AttendancePingsModel;
