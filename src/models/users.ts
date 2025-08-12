import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/database';

interface UsersAttributes {
  id_user: number;
  name: string;
  matricula?: string; // Nuevo campo - solo para Student y Professor
  email: string;
  password: string;
  role: 'Administrator' | 'Professor' | 'Student';
  user_uuid?: string; // Nullable según el nuevo esquema - API valida esto
  verification: boolean;
  attempts: number;
  profile_image_url?: string; // URL de la imagen de perfil en Cloudinary
  last_uuid_change?: Date; // Fecha del último cambio de UUID
}

interface UsersCreationAttributes {
  name: string;
  matricula?: string; // Nuevo campo - solo para Student y Professor
  email: string;
  password: string;
  role: 'Administrator' | 'Professor' | 'Student';
  user_uuid?: string; // Nullable - API valida esto
  verification: boolean;
  attempts: number;
  profile_image_url?: string; // URL de la imagen de perfil en Cloudinary
  last_uuid_change?: Date; // Fecha del último cambio de UUID
}

class UsersModel extends Model<UsersAttributes, UsersCreationAttributes> implements UsersAttributes {
  public id_user!: number;
  public name!: string;
  public matricula?: string; // Nuevo campo - solo para Student y Professor
  public email!: string;
  public password!: string;
  public role!: 'Administrator' | 'Professor' | 'Student';
  public user_uuid?: string; // Nullable
  public verification!: boolean;
  public attempts!: number;
  public profile_image_url?: string; // URL de la imagen de perfil en Cloudinary
  public last_uuid_change?: Date; // Fecha del último cambio de UUID
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
    matricula: {
      type: DataTypes.STRING(50),
      allowNull: true, // Puede ser null para Administrators
      unique: true, // Único en toda la tabla
      validate: {
        // Validación personalizada: solo Student y Professor pueden tener matrícula
        isValidForRole(value: string | null) {
          // Si es Administrator y tiene matrícula, es error
          if (value !== null && value !== undefined && this.role === 'Administrator') {
            throw new Error('Los administradores no pueden tener matrícula');
          }
          // Si es Student o Professor y NO tiene matrícula, es error
          if ((value === null || value === undefined) && (this.role === 'Student' || this.role === 'Professor')) {
            throw new Error('Los estudiantes y profesores deben tener matrícula');
          }
        }
      }
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
    profile_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },
    last_uuid_change: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
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
