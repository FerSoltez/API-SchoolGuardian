import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';
import UsersModel from './users';
import ClassesModel from './classes';

interface EnrollmentsAttributes {
  enrollment_id: number;
  student_id: number;
  class_id: number;
}

interface EnrollmentsCreationAttributes extends Optional<EnrollmentsAttributes, "enrollment_id"> {}

class EnrollmentsModel extends Model<EnrollmentsAttributes, EnrollmentsCreationAttributes> implements EnrollmentsAttributes {
  public enrollment_id!: number;
  public student_id!: number;
  public class_id!: number;
}

EnrollmentsModel.init(
  {
    enrollment_id: {
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
  },
  {
    sequelize,
    modelName: "Enrollments",
    tableName: "Enrollments",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['student_id', 'class_id']
      }
    ]
  }
);

// Relaciones
EnrollmentsModel.belongsTo(UsersModel, { foreignKey: "student_id" });
UsersModel.hasMany(EnrollmentsModel, { foreignKey: "student_id" });

EnrollmentsModel.belongsTo(ClassesModel, { foreignKey: "class_id" });
ClassesModel.hasMany(EnrollmentsModel, { foreignKey: "class_id" });

export default EnrollmentsModel;
