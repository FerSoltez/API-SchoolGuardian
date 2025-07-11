import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/database';

interface UsersAttributes {
  id_user: number;
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  user_uuid?: string; // Opcional - solo para estudiantes
  verification: boolean;
  attempts: number;
}

interface UsersCreationAttributes {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  user_uuid?: string; // Opcional - solo para estudiantes
  verification: boolean;
  attempts: number;
}

class UsersModel extends Model<UsersAttributes, UsersCreationAttributes> implements UsersAttributes {
  public id_user!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: 'ADMIN' | 'TEACHER' | 'STUDENT';
  public user_uuid?: string; // Opcional
  public verification!: boolean;
  public attempts!: number;
}

UsersModel.init(
  {
    id_user: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'TEACHER', 'STUDENT'),
      allowNull: false,
    },
    user_uuid: {
      type: DataTypes.CHAR(36),
      allowNull: true, // Permitir NULL - solo requerido para estudiantes
      unique: true,
      defaultValue: null, // Valor por defecto explícito
    },
    verification: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
  },
  {
    sequelize,
    modelName: "Users",
    tableName: "Users",
    timestamps: false,
  }
);

export default UsersModel;
