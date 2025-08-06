import { Request, Response } from "express";
import Classes from "../models/classes";
import Schedules from "../models/schedules";
import jwt from "jsonwebtoken";
import Enrollments from "../models/enrollments";
import { v2 as cloudinary } from 'cloudinary';

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

      // Preparar datos de la clase
      const classData: any = { 
        name, 
        group_name, 
        id_professor, 
        class_code 
      };

      // Manejar imagen de la clase si se proporciona
      if (req.file && req.file.path) {
        console.log("🖼️ Imagen de clase detectada:", {
          fileName: req.file.filename,
          path: req.file.path,
          size: req.file.size
        });

        // Verificar que la imagen se subió correctamente a Cloudinary
        if (!req.file.path || !req.file.path.includes('cloudinary.com')) {
          console.log("❌ Error: La imagen de clase no se subió correctamente a Cloudinary");
          
          // Intentar limpiar la imagen si falló
          try {
            if (req.file.path) {
              const urlParts = req.file.path.split('/');
              const fileNameWithExtension = urlParts[urlParts.length - 1];
              const publicId = `uploads/classes/${fileNameWithExtension.split('.')[0]}`;
              await cloudinary.uploader.destroy(publicId);
            }
          } catch (cleanupError) {
            console.log("⚠️ No se pudo limpiar imagen fallida:", (cleanupError as Error).message);
          }
          
          return res.status(500).json({ 
            message: "Error al subir la imagen de la clase. Inténtelo de nuevo." 
          });
        }

        classData.class_image_url = req.file.path;
        console.log("✅ Imagen de clase configurada:", req.file.path);
      }

      // Crear la clase
      const newClass = await Classes.create(classData);

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
      let imageUpdateSuccessful = false;
      let previousImageUrl = classData.class_image_url;

      // PASO 1: Manejar actualización de imagen si se proporciona
      if (req.file && req.file.path) {
        console.log("🖼️ Nueva imagen de clase detectada:", {
          fileName: req.file.filename,
          path: req.file.path,
          size: req.file.size
        });

        // Verificar que la nueva imagen se subió correctamente a Cloudinary
        if (!req.file.path || !req.file.path.includes('cloudinary.com')) {
          console.log("❌ Error: La nueva imagen de clase no se subió correctamente a Cloudinary");
          return res.status(500).json({ 
            message: "Error al subir la nueva imagen de la clase. Inténtelo de nuevo." 
          });
        }

        const newImageUrl = req.file.path;
        let newImagePublicId = null;
        
        // Extraer el public_id de la nueva imagen para rollback si es necesario
        try {
          const urlParts = newImageUrl.split('/');
          const fileNameWithExtension = urlParts[urlParts.length - 1];
          newImagePublicId = `uploads/classes/${fileNameWithExtension.split('.')[0]}`;
        } catch (extractError) {
          console.log("⚠️ No se pudo extraer public_id de la nueva imagen de clase:", (extractError as Error).message);
        }
        
        try {
          console.log("💾 Actualizando imagen de clase en base de datos:", newImageUrl);
          
          // Agregar la nueva URL de imagen a los datos de actualización
          classUpdateData.class_image_url = newImageUrl;
          imageUpdateSuccessful = true;
          
        } catch (imageError) {
          console.log("❌ Error al preparar actualización de imagen:", (imageError as Error).message);
          
          // Rollback: eliminar la nueva imagen de Cloudinary
          if (newImagePublicId) {
            try {
              console.log("🔄 ROLLBACK: Eliminando nueva imagen de clase de Cloudinary:", newImagePublicId);
              await cloudinary.uploader.destroy(newImagePublicId);
              console.log("✅ Rollback exitoso: nueva imagen de clase eliminada");
            } catch (rollbackError) {
              console.log("❌ Error en rollback de imagen de clase:", (rollbackError as Error).message);
              console.log(`🚨 ATENCIÓN: Imagen de clase huérfana en Cloudinary: ${newImagePublicId}`);
            }
          }
          
          return res.status(500).json({ 
            message: "Error al procesar la nueva imagen de la clase",
            error: (imageError as Error).message
          });
        }
      }

      // PASO 2: Actualizar datos de la clase (incluyendo imagen si hay una nueva)
      if (Object.keys(classUpdateData).length > 0) {
        try {
          console.log("💾 Actualizando datos de clase:", Object.keys(classUpdateData));
          
          const [updatedRows] = await Classes.update(classUpdateData, { where: { id_class: id } });
          
          if (updatedRows === 0) {
            throw new Error("No se pudo actualizar la clase en la base de datos");
          }
          
          console.log("✅ Datos de clase actualizados exitosamente");

          // Si se actualizó la imagen exitosamente, eliminar la imagen anterior
          if (imageUpdateSuccessful && previousImageUrl && previousImageUrl.includes('cloudinary.com')) {
            try {
              const urlParts = previousImageUrl.split('/');
              const fileNameWithExtension = urlParts[urlParts.length - 1];
              const previousPublicId = `uploads/classes/${fileNameWithExtension.split('.')[0]}`;
              
              console.log("🗑️ Eliminando imagen anterior de clase de Cloudinary:", previousPublicId);
              const deleteResult = await cloudinary.uploader.destroy(previousPublicId);
              
              if (deleteResult.result === 'ok') {
                console.log("✅ Imagen anterior de clase eliminada exitosamente");
              } else {
                console.log("⚠️ La imagen anterior de clase no se pudo eliminar completamente:", deleteResult);
              }
            } catch (deleteError) {
              console.log("⚠️ Error al eliminar imagen anterior de clase (no crítico):", (deleteError as Error).message);
            }
          }

        } catch (updateError) {
          console.log("❌ Error crítico al actualizar datos de clase:", (updateError as Error).message);
          
          // Si había una nueva imagen, hacer rollback
          if (imageUpdateSuccessful && req.file && req.file.path) {
            try {
              const urlParts = req.file.path.split('/');
              const fileNameWithExtension = urlParts[urlParts.length - 1];
              const rollbackPublicId = `uploads/classes/${fileNameWithExtension.split('.')[0]}`;
              
              console.log("🔄 ROLLBACK: Eliminando nueva imagen de clase de Cloudinary:", rollbackPublicId);
              await cloudinary.uploader.destroy(rollbackPublicId);
              console.log("✅ Rollback exitoso: nueva imagen de clase eliminada");
            } catch (rollbackError) {
              console.log("❌ Error en rollback de imagen de clase:", (rollbackError as Error).message);
            }
          }
          
          return res.status(500).json({ 
            message: "Error al actualizar los datos de la clase",
            error: (updateError as Error).message
          });
        }
      }

      // PASO 3: Actualizar horarios si se proporcionan
      if (schedules && Array.isArray(schedules)) {
        try {
          console.log("📅 Actualizando horarios de clase");
          
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
          console.log("✅ Horarios actualizados exitosamente");
          
        } catch (schedulesError) {
          console.log("❌ Error al actualizar horarios:", (schedulesError as Error).message);
          return res.status(500).json({ 
            message: "Error al actualizar los horarios de la clase",
            error: (schedulesError as Error).message
          });
        }
      }

      // PASO 4: Obtener y devolver la clase actualizada
      const updatedClass = await Classes.findByPk(id, {
        include: [{ model: Schedules }],
      });

      console.log("✅ Clase actualizada completamente:", {
        classId: updatedClass?.id_class,
        hasNewImage: imageUpdateSuccessful,
        imageUrl: updatedClass?.class_image_url || null,
        schedulesCount: (updatedClass as any)?.schedules?.length || 0
      });

      res.status(200).json({
        message: "Clase actualizada exitosamente",
        class: updatedClass,
        updates: {
          data_updated: Object.keys(classUpdateData).length > 0,
          image_updated: imageUpdateSuccessful,
          schedules_updated: schedules && Array.isArray(schedules)
        }
      });
    } catch (error) {
      console.log("❌ Error general en partialUpdateClass:", (error as Error).message);
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
