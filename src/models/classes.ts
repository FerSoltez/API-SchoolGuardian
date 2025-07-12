import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';

interface ClassesAttributes {
  id_class: number;
  id_professor: number;
  name: string;
  group_name: string;
  class_code: string;
}

interface ClassesCreationAttributes extends Optional<ClassesAttributes, "id_class"> {}

class ClassesModel extends Model<ClassesAttributes, ClassesCreationAttributes> implements ClassesAttributes {
  public id_class!: number;
  public id_professor!: number;
  public name!: string;
  public group_name!: string;
  public class_code!: string;
}

ClassesModel.init(
  {
    id_class: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_professor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    group_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    class_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
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
