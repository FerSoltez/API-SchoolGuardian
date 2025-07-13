import { Request, Response } from "express";
import { InferAttributes, InferCreationAttributes } from "sequelize";
import AttendanceModel from "../models/attendance";
import ClassesModel from "../models/classes";
import UsersModel from "../models/users";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";

type AttendanceCreationAttributes = InferCreationAttributes<AttendanceModel>;

const attendanceController = {
  // Crear asistencia (Solo profesores pueden registrar asistencia)
  createAttendance: async (req: Request, res: Response) => {
    try {
      const { id_student, id_class, attendance_date, attendance_time, status } = req.body;

      // Validar que los campos requeridos estén presentes
      if (!id_student || !id_class || !attendance_date || !attendance_time || !status) {
        return res.status(400).json({ 
          message: "Todos los campos son requeridos: id_student, id_class, attendance_date, attendance_time, status" 
        });
      }

      // Validar que el estudiante existe y tiene rol de Student
      const student = await UsersModel.findOne({
        where: { id_user: id_student, role: 'Student' }
      });
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }

      // Validar que la clase existe
      const classExists = await ClassesModel.findByPk(id_class);
      if (!classExists) {
        return res.status(404).json({ message: "Clase no encontrada" });
      }

      // Verificar si ya existe una asistencia para el estudiante en la clase en la misma fecha
      const existingAttendance = await AttendanceModel.findOne({
        where: {
          id_student,
          id_class,
          attendance_date: attendance_date,
        },
      });

      if (existingAttendance) {
        return res.status(400).json({ 
          message: "El estudiante ya tiene una asistencia registrada para esta fecha en esta clase." 
        });
      }

      // Crear la nueva asistencia
      const newAttendance = await AttendanceModel.create({
        id_student,
        id_class,
        attendance_date: new Date(attendance_date),
        attendance_time,
        status,
      } as AttendanceCreationAttributes);

      // Obtener la asistencia creada con información de estudiante y clase
      const attendanceWithDetails = await AttendanceModel.findByPk(newAttendance.id_attendance, {
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'email']
          },
          {
            model: ClassesModel,
            attributes: ['id_class', 'name', 'class_code']
          }
        ]
      });

      res.status(201).json({
        message: "Asistencia registrada exitosamente",
        attendance: attendanceWithDetails
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener todas las asistencias
  getAllAttendances: async (req: Request, res: Response) => {
    try {
      const attendances = await AttendanceModel.findAll({
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'email'],
            as: 'Users'
          },
          {
            model: ClassesModel,
            attributes: ['id_class', 'name', 'class_code', 'group_name'],
            as: 'Classes'
          }
        ],
        order: [['attendance_date', 'DESC'], ['attendance_time', 'DESC']]
      });

      res.status(200).json(attendances);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener asistencia por ID
  getAttendance: async (req: Request, res: Response) => {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ message: "ID de asistencia es requerido" });
      }

      const attendance = await AttendanceModel.findByPk(id, {
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'email']
          },
          {
            model: ClassesModel,
            attributes: ['id_class', 'name', 'class_code', 'group_name']
          }
        ]
      });

      if (attendance) {
        res.status(200).json(attendance);
      } else {
        res.status(404).json({ message: "Asistencia no encontrada" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Actualizar asistencia (Solo profesores)
  updateAttendance: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { attendance_date, attendance_time, status } = req.body;

      // Validar que la asistencia existe
      const existingAttendance = await AttendanceModel.findByPk(id);
      if (!existingAttendance) {
        return res.status(404).json({ message: "Asistencia no encontrada" });
      }

      // Actualizar solo los campos permitidos
      const updateData: any = {};
      if (attendance_date) updateData.attendance_date = new Date(attendance_date);
      if (attendance_time) updateData.attendance_time = attendance_time;
      if (status) updateData.status = status;

      const [updated] = await AttendanceModel.update(updateData, { 
        where: { id_attendance: id } 
      });

      if (updated) {
        const updatedAttendance = await AttendanceModel.findByPk(id, {
          include: [
            {
              model: UsersModel,
              attributes: ['id_user', 'name', 'email']
            },
            {
              model: ClassesModel,
              attributes: ['id_class', 'name', 'class_code']
            }
          ]
        });
        res.status(200).json({
          message: "Asistencia actualizada exitosamente",
          attendance: updatedAttendance
        });
      } else {
        res.status(404).json({ message: "No se pudo actualizar la asistencia" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Eliminar asistencia (Solo profesores)
  deleteAttendance: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const attendance = await AttendanceModel.findByPk(id);
      if (!attendance) {
        return res.status(404).json({ message: "Asistencia no encontrada" });
      }

      const deleted = await AttendanceModel.destroy({
        where: { id_attendance: id },
      });

      if (deleted) {
        res.status(200).json({ message: "Asistencia eliminada exitosamente" });
      } else {
        res.status(404).json({ message: "No se pudo eliminar la asistencia" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener asistencias por estudiante (Solo el mismo estudiante puede ver sus asistencias)
  getAttendancesByStudent: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const user = req.user as { id: number; role: string };
      const { id_student } = req.body;

      // Verificar que el usuario autenticado es el mismo estudiante o es profesor/admin
      if (user.role === 'Student' && user.id !== id_student) {
        return res.status(403).json({ 
          message: "Acceso denegado. Los estudiantes solo pueden ver sus propias asistencias." 
        });
      }

      // Validar que el estudiante existe
      const student = await UsersModel.findOne({
        where: { id_user: id_student, role: 'Student' }
      });
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }

      // Obtener las asistencias del estudiante
      const attendances = await AttendanceModel.findAll({
        where: { id_student: id_student },
        include: [
          {
            model: ClassesModel,
            attributes: ['id_class', 'name', 'class_code', 'group_name']
          }
        ],
        order: [['attendance_date', 'DESC'], ['attendance_time', 'DESC']]
      });

      res.status(200).json({
        student: {
          id: student.id_user,
          name: student.name,
          email: student.email
        },
        attendances: attendances
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener asistencias por clase (Solo profesores de esa clase)
  getAttendancesByClass: async (req: Request, res: Response) => {
    try {
      const { id_class } = req.body;

      if (!id_class) {
        return res.status(400).json({ message: "ID de clase es requerido" });
      }

      // Validar que la clase existe
      const classExists = await ClassesModel.findByPk(id_class);
      if (!classExists) {
        return res.status(404).json({ message: "Clase no encontrada" });
      }

      // Obtener las asistencias de la clase
      const attendances = await AttendanceModel.findAll({
        where: { id_class: id_class },
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'email']
          }
        ],
        order: [['attendance_date', 'DESC'], ['attendance_time', 'DESC']]
      });

      res.status(200).json({
        class: {
          id: classExists.id_class,
          name: classExists.name,
          class_code: classExists.class_code,
          group_name: classExists.group_name
        },
        attendances: attendances
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener asistencias por fecha
  getAttendancesByDate: async (req: Request, res: Response) => {
    try {
      const { date } = req.body;

      if (!date) {
        return res.status(400).json({ message: "Fecha es requerida" });
      }

      const attendances = await AttendanceModel.findAll({
        where: { attendance_date: new Date(date) },
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'email']
          },
          {
            model: ClassesModel,
            attributes: ['id_class', 'name', 'class_code', 'group_name']
          }
        ],
        order: [['attendance_time', 'ASC']]
      });

      res.status(200).json({
        date: date,
        total_attendances: attendances.length,
        attendances: attendances
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener estadísticas de asistencia por estudiante
  getAttendanceStats: async (req: Request, res: Response) => {
    try {
      const { id_student } = req.body;

      if (!id_student) {
        return res.status(400).json({ message: "ID de estudiante es requerido" });
      }

      // Validar que el estudiante existe
      const student = await UsersModel.findOne({
        where: { id_user: id_student, role: 'Student' }
      });
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }

      // Obtener estadísticas de asistencia
      const attendances = await AttendanceModel.findAll({
        where: { id_student: id_student },
        attributes: ['status'],
      });

      const stats = {
        total: attendances.length,
        present: attendances.filter(a => a.status === 'Present').length,
        late: attendances.filter(a => a.status === 'Late').length,
        absent: attendances.filter(a => a.status === 'Absent').length,
        justified: attendances.filter(a => a.status === 'Justified').length,
      };

      const attendance_percentage = stats.total > 0 ? 
        ((stats.present + stats.late + stats.justified) / stats.total * 100).toFixed(2) : '0.00';

      res.status(200).json({
        student: {
          id: student.id_user,
          name: student.name,
          email: student.email
        },
        statistics: {
          ...stats,
          attendance_percentage: `${attendance_percentage}%`
        }
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
};

export default attendanceController;
