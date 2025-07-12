import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from '../config/database';

interface EnrollmentsAttributes {
  id_enrollment: number;
  id_student: number;
  id_class: number;
}

interface EnrollmentsCreationAttributes extends Optional<EnrollmentsAttributes, "id_enrollment"> {}

class EnrollmentsModel extends Model<EnrollmentsAttributes, EnrollmentsCreationAttributes> implements EnrollmentsAttributes {
  public id_enrollment!: number;
  public id_student!: number;
  public id_class!: number;
}

EnrollmentsModel.init(
  {
    id_enrollment: {
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
  },
  {
    sequelize,
    modelName: "Enrollments",
    tableName: "Enrollments",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['id_student', 'id_class']
      }
    ]
  }
);

export default EnrollmentsModel;
