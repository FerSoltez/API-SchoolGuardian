import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';

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
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
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

export default EnrollmentsModel;
