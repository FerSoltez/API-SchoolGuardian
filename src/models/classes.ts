import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';
import UsersModel from './users';
import DevicesModel from './devices';

interface ClassesAttributes {
  class_id: number;
  teacher_id: number;
  name: string;
  group_name: string;
  class_code: string;
  device_id: number;
}

interface ClassesCreationAttributes extends Optional<ClassesAttributes, "class_id" | "group_name" | "device_id"> {}

class ClassesModel extends Model<ClassesAttributes, ClassesCreationAttributes> implements ClassesAttributes {
  public class_id!: number;
  public teacher_id!: number;
  public name!: string;
  public group_name!: string;
  public class_code!: string;
  public device_id!: number;
}

ClassesModel.init(
  {
    class_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: UsersModel,
        key: "id_user",
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    group_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    class_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    device_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: DevicesModel,
        key: "device_id",
      },
    },
  },
  {
    sequelize,
    modelName: "Classes",
    tableName: "Classes",
    timestamps: false,
  }
);

// Relaciones
ClassesModel.belongsTo(UsersModel, { foreignKey: "teacher_id" });
UsersModel.hasMany(ClassesModel, { foreignKey: "teacher_id" });

ClassesModel.belongsTo(DevicesModel, { foreignKey: "device_id" });
DevicesModel.hasMany(ClassesModel, { foreignKey: "device_id" });

export default ClassesModel;
