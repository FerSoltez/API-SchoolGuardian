import { Request, Response } from "express";
import Schedules from "../models/schedules";
import Classes from "../models/classes";
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

const schedulesController = {
  createSchedule: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id;
      const { id_class, id_device, weekday, start_time, end_time } = req.body;

      // Validar campos obligatorios
      if (!id_class || !id_device || !weekday || !start_time || !end_time) {
        return res.status(400).json({ 
          message: "ID de clase, ID de dispositivo, día de la semana, hora de inicio y hora de fin son requeridos." 
        });
      }

      // Verificar que la clase pertenece al usuario autenticado
      const classData = await Classes.findByPk(id_class);
      if (!classData) {
        return res.status(404).json({ message: "Clase no encontrada" });
      }
      if (classData.id_professor !== userId) {
        return res.status(403).json({ message: "Acceso denegado. No puedes crear horarios para una clase que no te pertenece." });
      }

      // Crear el horario
      const newSchedule = await Schedules.create({
        id_class,
        id_device,
        weekday,
        start_time,
        end_time
      });

      res.status(201).json({
        message: "Horario creado exitosamente",
        schedule: newSchedule
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getSchedulesByClass: async (req: Request, res: Response) => {
    try {
      const { id_class } = req.params;

      if (!id_class) {
        return res.status(400).json({ message: "ID de clase es requerido" });
      }

      const schedules = await Schedules.findAll({
        where: { id_class },
        include: [{ model: Classes, attributes: ['name', 'group_name', 'class_code'] }]
      });

      res.status(200).json(schedules);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  updateSchedule: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id;
      const { id } = req.params;

      // Verificar que el horario existe y pertenece a una clase del usuario
      const schedule = await Schedules.findByPk(id, {
        include: [{ model: Classes }]
      });

      if (!schedule) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }

      // Obtener la clase asociada
      const classData = await Classes.findByPk(schedule.id_class);
      if (!classData || classData.id_professor !== userId) {
        return res.status(403).json({ message: "Acceso denegado. No puedes actualizar horarios de una clase que no te pertenece." });
      }

      // Actualizar el horario
      await Schedules.update(req.body, { where: { id_schedule: id } });

      const updatedSchedule = await Schedules.findByPk(id, {
        include: [{ model: Classes }]
      });

      res.status(200).json({
        message: "Horario actualizado exitosamente",
        schedule: updatedSchedule
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  deleteSchedule: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id;
      const { id } = req.params;

      // Verificar que el horario existe y pertenece a una clase del usuario
      const schedule = await Schedules.findByPk(id);

      if (!schedule) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }

      // Obtener la clase asociada
      const classData = await Classes.findByPk(schedule.id_class);
      if (!classData || classData.id_professor !== userId) {
        return res.status(403).json({ message: "Acceso denegado. No puedes eliminar horarios de una clase que no te pertenece." });
      }

      // Eliminar el horario
      const deleted = await Schedules.destroy({ where: { id_schedule: id } });

      if (deleted) {
        res.status(200).json({ message: "Horario eliminado exitosamente" });
      } else {
        res.status(404).json({ message: "Horario no encontrado" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getSchedulesByWeekday: async (req: Request, res: Response) => {
    try {
      const { weekday } = req.params;

      if (!weekday) {
        return res.status(400).json({ message: "Día de la semana es requerido" });
      }

      const schedules = await Schedules.findAll({
        where: { weekday },
        include: [{ model: Classes, attributes: ['name', 'group_name', 'class_code'] }],
        order: [['start_time', 'ASC']]
      });

      res.status(200).json(schedules);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
};

export default schedulesController;
