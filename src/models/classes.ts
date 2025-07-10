import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';

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
    },
  },
  {
    sequelize,
    modelName: "Classes",
    tableName: "Classes",
    timestamps: false,
  }
);

export default ClassesModel;
