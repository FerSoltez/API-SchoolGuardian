import { Request, Response } from "express";
import Classes from "../models/classes";
import Schedules from "../models/schedules";
import jwt from "jsonwebtoken";
import Enrollments from "../models/enrollments";

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

const classesController = {
  createClass: async (req: Request, res: Response) => {
    try {
      const { name, group_name, id_professor, schedules } = req.body;

      // Validar campos obligatorios
      if (!name || !id_professor || !group_name) {
        return res.status(400).json({ message: "Nombre de clase, nombre de grupo y ID del profesor son requeridos." });
      }

      // Validar que se proporcionen horarios
      if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
        return res.status(400).json({ message: "Debe proporcionar al menos un horario para la clase." });
      }

      // Validar cada horario
      for (const schedule of schedules) {
        if (!schedule.id_device || !schedule.weekday || !schedule.start_time || !schedule.end_time) {
          return res.status(400).json({ 
            message: "Cada horario debe incluir: id_device, weekday, start_time, end_time." 
          });
        }
        
        // Validar que weekday sea válido
        const validWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!validWeekdays.includes(schedule.weekday)) {
          return res.status(400).json({ 
            message: `Día de la semana inválido: ${schedule.weekday}. Valores válidos: ${validWeekdays.join(', ')}` 
          });
        }

        // Validar formato de tiempo (opcional, pero recomendado)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (!timeRegex.test(schedule.start_time) || !timeRegex.test(schedule.end_time)) {
          return res.status(400).json({ 
            message: "Formato de tiempo inválido. Use HH:MM o HH:MM:SS" 
          });
        }
      }

      // Generar un código aleatorio de 6 dígitos
      const class_code = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Crear la clase
      const newClass = await Classes.create({ 
        name, 
        group_name, 
        id_professor, 
        class_code 
      });

      // Crear los horarios asociados
      const schedulesData = schedules.map((schedule: any) => ({
        id_class: newClass.id_class,
        id_device: schedule.id_device,
        weekday: schedule.weekday,
        start_time: schedule.start_time,
        end_time: schedule.end_time
      }));

      const createdSchedules = await Schedules.bulkCreate(schedulesData);

      // Obtener la clase completa con sus horarios
      const classWithSchedules = await Classes.findByPk(newClass.id_class, {
        include: [{ model: Schedules }],
      });

      res.status(201).json({
        message: "Clase creada exitosamente",
        class: classWithSchedules,
        schedules_created: createdSchedules.length
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getAllClasses: async (req: Request, res: Response) => {
    try {
      const classes = await Classes.findAll({
        include: [{ model: Schedules }], // Incluir los horarios asociados
      });
      res.status(200).json(classes);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getClass: async (req: Request, res: Response) => {
    try {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: "ID de clase es requerido" });
      }

      const classData = await Classes.findByPk(id, {
        include: [{ model: Schedules }], // Incluir los horarios asociados
      });
      
      if (classData) {
        res.status(200).json(classData);
      } else {
        res.status(404).json({ message: "Clase no encontrada" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  deleteClass: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id; // ID del usuario autenticado extraído del token
      const { id } = req.params;

      // Verificar si la clase pertenece al usuario autenticado
      const classData = await Classes.findByPk(id);
      if (!classData) {
        return res.status(404).json({ message: "Clase no encontrada" });
      }
      if (classData.id_professor !== userId) {
        return res.status(403).json({ message: "Acceso denegado. No puedes eliminar una clase que no te pertenece." });
      }

      // Eliminar los horarios asociados en SCHEDULES
      await Schedules.destroy({ where: { id_class: id } });

      // Eliminar las inscripciones asociadas
      await Enrollments.destroy({ where: { id_class: id } });

      // Eliminar la clase
      const deleted = await Classes.destroy({ where: { id_class: id } });

      if (deleted) {
        res.status(200).json({ message: "Clase y sus datos asociados eliminados exitosamente" });
      } else {
        res.status(404).json({ message: "Clase no encontrada" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  partialUpdateClass: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id; // ID del usuario autenticado extraído del token
      const { id } = req.params;

      // Verificar si la clase pertenece al usuario autenticado
      const classData = await Classes.findByPk(id);
      if (!classData) {
        return res.status(404).json({ message: "Clase no encontrada" });
      }
      if (classData.id_professor !== userId) {
        return res.status(403).json({ message: "Acceso denegado. No puedes actualizar una clase que no te pertenece." });
      }

      const { schedules, ...classUpdateData } = req.body;

      // Actualizar los datos de la clase (nombre, grupo, etc.)
      if (Object.keys(classUpdateData).length > 0) {
        await Classes.update(classUpdateData, { where: { id_class: id } });
      }

      // Si se proporcionan nuevos horarios, actualizarlos
      if (schedules && Array.isArray(schedules)) {
        // Validar cada horario
        for (const schedule of schedules) {
          if (!schedule.id_device || !schedule.weekday || !schedule.start_time || !schedule.end_time) {
            return res.status(400).json({ 
              message: "Cada horario debe incluir: id_device, weekday, start_time, end_time." 
            });
          }
          
          const validWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          if (!validWeekdays.includes(schedule.weekday)) {
            return res.status(400).json({ 
              message: `Día de la semana inválido: ${schedule.weekday}` 
            });
          }
        }

        // Eliminar horarios existentes
        await Schedules.destroy({ where: { id_class: id } });

        // Crear los nuevos horarios
        const schedulesData = schedules.map((schedule: any) => ({
          id_class: Number(id),
          id_device: schedule.id_device,
          weekday: schedule.weekday,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }));

        await Schedules.bulkCreate(schedulesData);
      }

      // Obtener la clase actualizada con los horarios asociados
      const updatedClass = await Classes.findByPk(id, {
        include: [{ model: Schedules }],
      });

      res.status(200).json({
        message: "Clase actualizada exitosamente",
        class: updatedClass
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getClassesByUserId: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }
      const userId = (req.user as jwt.JwtPayload).id; // ID del usuario autenticado extraído del token
      const { id } = req.body;

      // Verificar si el usuario autenticado está intentando acceder a sus propias clases
      if (parseInt(id) !== userId) {
        return res.status(403).json({ message: "Acceso denegado. No puedes ver las clases de otro usuario." });
      }

      // Obtener las clases del profesor con los horarios
      const classes = await Classes.findAll({
        where: { id_professor: id },
        include: [
          {
            model: Schedules,
            attributes: ["id_schedule", "id_device", "weekday", "start_time", "end_time"],
          },
        ],
      });

      // Agregar la cantidad de alumnos inscritos a cada clase y formatear horarios
      const classesWithDetails = await Promise.all(
        classes.map(async (classData) => {
          const studentCount = await Enrollments.count({ where: { id_class: classData.id_class } });

          const classJSON = classData.toJSON();
          
          // Mapeo de días de inglés a español
          const dayTranslation: { [key: string]: string } = {
            'Monday': 'Lunes',
            'Tuesday': 'Martes',
            'Wednesday': 'Miércoles',
            'Thursday': 'Jueves',
            'Friday': 'Viernes',
            'Saturday': 'Sábado',
            'Sunday': 'Domingo'
          };

          // Función para formatear tiempo (solo horas y minutos con AM/PM)
          const formatTime = (time: string): string => {
            const [hours, minutes] = time.split(':');
            const hour24 = parseInt(hours);
            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
            const period = hour24 >= 12 ? 'PM' : 'AM';
            return `${hour12}:${minutes} ${period}`;
          };
          
          // Formatear horarios para mostrar información más clara
          const formattedSchedules = (classJSON as any).Schedules?.map((schedule: any) => ({
            id_schedule: schedule.id_schedule,
            day: dayTranslation[schedule.weekday] || schedule.weekday,
            time: `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`,
            device_id: schedule.id_device, // Representa el salón
            start_time: schedule.start_time,
            end_time: schedule.end_time
          })) || [];

          // Remover el array original de Schedules y agregar el formateado
          delete (classJSON as any).Schedules;

          return {
            ...classJSON,
            studentCount,
            schedules: formattedSchedules,
            total_schedules: formattedSchedules.length
          };
        })
      );

      res.status(200).json(classesWithDetails);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Método adicional para obtener clases por código
  getClassByCode: async (req: Request, res: Response) => {
    try {
      const { class_code } = req.body;
      
      if (!class_code) {
        return res.status(400).json({ message: "Código de clase es requerido" });
      }

      const classData = await Classes.findOne({
        where: { class_code },
        include: [{ model: Schedules }],
      });
      
      if (classData) {
        res.status(200).json(classData);
      } else {
        res.status(404).json({ message: "Clase no encontrada con ese código" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
};

export default classesController;
