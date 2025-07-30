import { Request, Response } from "express";
import Enrollments from "../models/enrollments";
import Users from "../models/users";
import Classes from "../models/classes";
import Schedules from "../models/schedules";
import jwt from "jsonwebtoken";

// Import associations to establish relationships
import "../models/associations";

// Augment the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: string | jwt.JwtPayload;
    }
  }
}

const enrollmentsController = {
  createEnrollment: async (req: Request, res: Response) => {
    try {
      const { class_code, id_student } = req.body;

      // Validar campos obligatorios
      if (!class_code || !id_student) {
        return res.status(400).json({ message: "Código de clase y ID del estudiante son requeridos." });
      }

      // Verificar si el código de la clase es válido
      const classData = await Classes.findOne({ where: { class_code } });

      if (!classData) {
        return res.status(404).json({ message: "Código de clase inválido. No se encontró la clase." });
      }

      // Verificar que el estudiante existe
      const student = await Users.findByPk(id_student);
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado." });
      }

      // Verificar que el usuario es realmente un estudiante
      if (student.role !== 'Student') {
        return res.status(400).json({ message: "El usuario especificado no es un estudiante." });
      }

      // Verificar si el estudiante ya está inscrito en la clase
      const existingEnrollment = await Enrollments.findOne({
        where: { id_class: classData.id_class, id_student },
      });

      if (existingEnrollment) {
        return res.status(400).json({ message: "El estudiante ya está inscrito en esta clase." });
      }

      // Crear la inscripción
      const newEnrollment = await Enrollments.create({
        id_class: classData.id_class,
        id_student,
      });

      res.status(201).json({
        message: "Inscripción realizada exitosamente.",
        enrollment: newEnrollment,
        class_info: {
          id: classData.id_class,
          name: classData.name,
          group_name: classData.group_name,
          class_code: classData.class_code
        }
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getAllEnrollments: async (req: Request, res: Response) => {
    try {
      const enrollments = await Enrollments.findAll({
        include: [
          {
            model: Classes,
            attributes: ['name', 'group_name', 'class_code']
          },
          {
            model: Users,
            attributes: ['name', 'email', 'user_uuid']
          }
        ]
      });
      res.status(200).json(enrollments);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getEnrollment: async (req: Request, res: Response) => {
    try {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: "ID de inscripción es requerido" });
      }

      const enrollment = await Enrollments.findByPk(id, {
        include: [
          {
            model: Classes,
            attributes: ['name', 'group_name', 'class_code'],
            include: [{ model: Schedules }]
          },
          {
            model: Users,
            attributes: ['name', 'email', 'user_uuid']
          }
        ]
      });

      if (enrollment) {
        res.status(200).json(enrollment);
      } else {
        res.status(404).json({ message: "Inscripción no encontrada" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  deleteEnrollment: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id; // ID del usuario autenticado extraído del token
      const { id } = req.params; // ID de la clase

      // Verificar si existe una inscripción para el usuario autenticado y la clase especificada
      const enrollment = await Enrollments.findOne({
        where: { id_student: userId, id_class: id },
      });

      if (!enrollment) {
        return res.status(404).json({ message: "Inscripción no encontrada" });
      }

      // Eliminar la inscripción
      const deleted = await Enrollments.destroy({
        where: { id_student: userId, id_class: id },
      });

      if (deleted) {
        res.status(200).json({ message: "Inscripción eliminada exitosamente" });
      } else {
        res.status(404).json({ message: "Inscripción no encontrada" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getStudentsByClass: async (req: Request, res: Response) => {
    try {
      const { id_class } = req.body;

      if (!id_class) {
        return res.status(400).json({ message: "ID de clase es requerido" });
      }

      // Buscar las inscripciones de la clase y obtener los datos de los estudiantes junto con la información de la clase
      const enrollments = await Enrollments.findAll({
        where: { id_class },
        include: [
          {
            model: Users,
            attributes: ["id_user", "name", "email", "user_uuid"],
          },
          {
            model: Classes,
            attributes: ["id_class", "name", "group_name", "class_code"],
            include: [{ model: Schedules }]
          },
        ],
      });

      if (enrollments.length === 0) {
        return res.status(404).json({ message: "No hay estudiantes inscritos en esta clase." });
      }

      // Extraer la información de la clase (es la misma para todas las inscripciones)
      const classInfo = enrollments[0].get('Classes');

      // Extraer los datos de los estudiantes
      const students = enrollments.map((enrollment) => {
        const user = enrollment.get('Users') as any;
        return {
          id_user: user.id_user,
          name: user.name,
          email: user.email,
          user_uuid: user.user_uuid
        };
      });

      res.status(200).json({
        class: classInfo,
        students,
        total_students: students.length
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getClassesByStudent: async (req: Request, res: Response) => {
    try {
      const { id_student } = req.body;

      if (!id_student) {
        return res.status(400).json({ message: "ID del estudiante es requerido" });
      }

      // Buscar las inscripciones del estudiante y obtener la información de las clases
      const enrollments = await Enrollments.findAll({
        where: { id_student },
        include: [
          {
            model: Classes,
            attributes: ["id_class", "name", "group_name", "class_code", "id_professor"],
            include: [
              {
                model: Schedules,
                attributes: ["id_schedule", "weekday", "start_time", "end_time", "id_device"],
              },
              {
                model: Users, // Incluir el profesor
                attributes: ["name"],
                as: "Professor",
              },
            ],
          },
        ],
      });

      if (enrollments.length === 0) {
        return res.status(404).json({ message: "El estudiante no está inscrito en ninguna clase." });
      }

      // Extraer la información de las clases con la cantidad de estudiantes y horarios
      const classes = await Promise.all(
        enrollments.map(async (enrollment) => {
          const classData = enrollment.get('Classes') as any;

          // Contar la cantidad de estudiantes inscritos en la clase
          const studentCount = await Enrollments.count({ where: { id_class: classData.id_class } });

          // Convertir el objeto Sequelize a JSON y formatear horarios
          const classJSON = classData.toJSON();
          
          // Formatear horarios
          const schedules = classJSON.Schedules?.map((schedule: any) => ({
            id_schedule: schedule.id_schedule,
            day: schedule.weekday,
            time: `${schedule.start_time} - ${schedule.end_time}`,
            device_id: schedule.id_device,
            start_time: schedule.start_time,
            end_time: schedule.end_time
          })) || [];

          // Extraer el nombre del profesor
          const professorName = classJSON.Professor?.name || "";
          
          // Limpiar el objeto
          delete classJSON.Schedules;
          delete classJSON.Professor;

          return {
            ...classJSON,
            studentCount,
            schedules,
            professorName,
            total_schedules: schedules.length
          };
        })
      );

      res.status(200).json(classes);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Método adicional: Inscribir estudiante autenticado a una clase
  enrollSelf: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      
      const userId = (req.user as jwt.JwtPayload).id;
      const { class_code } = req.body;

      // Verificar que el usuario autenticado es un estudiante
      const user = await Users.findByPk(userId);
      if (!user || user.role !== 'Student') {
        return res.status(403).json({ message: "Solo los estudiantes pueden inscribirse en clases." });
      }

      // Verificar si el código de la clase es válido
      const classData = await Classes.findOne({ where: { class_code } });
      if (!classData) {
        return res.status(404).json({ message: "Código de clase inválido." });
      }

      // Verificar si ya está inscrito
      const existingEnrollment = await Enrollments.findOne({
        where: { id_class: classData.id_class, id_student: userId },
      });

      if (existingEnrollment) {
        return res.status(400).json({ message: "Ya estás inscrito en esta clase." });
      }

      // Crear la inscripción
      const newEnrollment = await Enrollments.create({
        id_class: classData.id_class,
        id_student: userId,
      });

      res.status(201).json({
        message: "Te has inscrito exitosamente en la clase.",
        enrollment: newEnrollment,
        class_info: {
          id: classData.id_class,
          name: classData.name,
          group_name: classData.group_name,
          class_code: classData.class_code
        }
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
};

export default enrollmentsController;
