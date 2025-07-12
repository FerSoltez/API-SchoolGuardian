import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/database';

interface UsersAttributes {
  id_user: number;
  name: string;
  email: string;
  password: string;
  role: 'Administrator' | 'Professor' | 'Student';
  user_uuid?: string; // Nullable según el nuevo esquema - API valida esto
  verification: boolean;
  attempts: number;
}

interface UsersCreationAttributes {
  name: string;
  email: string;
  password: string;
  role: 'Administrator' | 'Professor' | 'Student';
  user_uuid?: string; // Nullable - API valida esto
  verification: boolean;
  attempts: number;
}

class UsersModel extends Model<UsersAttributes, UsersCreationAttributes> implements UsersAttributes {
  public id_user!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: 'Administrator' | 'Professor' | 'Student';
  public user_uuid?: string; // Nullable
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
      type: DataTypes.ENUM('Administrator', 'Professor', 'Student'),
      allowNull: false,
    },
    user_uuid: {
      type: DataTypes.CHAR(36),
      allowNull: true, // Nullable según el nuevo esquema - API valida esto
      unique: true,
      defaultValue: null,
    },
    verification: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // Cambiado a 0 según el nuevo esquema
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
