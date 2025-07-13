import { Request, Response } from "express";
import Devices from "../models/devices";
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

const devicesController = {
  createDevice: async (req: Request, res: Response) => {
    try {
      const { location, status } = req.body;

      // Validar campos obligatorios
      if (!location) {
        return res.status(400).json({ message: "La ubicación del dispositivo es requerida." });
      }

      // Validar el estado si se proporciona
      const validStatuses = ['Active', 'Sleep', 'Off'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Estado inválido. Valores válidos: ${validStatuses.join(', ')}` 
        });
      }

      // Verificar si ya existe un dispositivo en esa ubicación
      const existingDevice = await Devices.findOne({ where: { location } });
      if (existingDevice) {
        return res.status(400).json({ message: "Ya existe un dispositivo en esta ubicación." });
      }

      // Crear el dispositivo
      const newDevice = await Devices.create({
        location,
        status: status || 'Off' // Por defecto 'Off' si no se especifica
      });

      res.status(201).json({
        message: "Dispositivo creado exitosamente",
        device: newDevice
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getAllDevices: async (req: Request, res: Response) => {
    try {
      const devices = await Devices.findAll({
        order: [['location', 'ASC']]
      });

      // Agregar información adicional sobre el uso de cada dispositivo
      const devicesWithInfo = await Promise.all(
        devices.map(async (device) => {
          // Contar cuántos horarios están asignados a este dispositivo
          const scheduleCount = await Schedules.count({ 
            where: { id_device: device.id_device } 
          });

          return {
            ...device.toJSON(),
            schedules_count: scheduleCount,
            is_in_use: scheduleCount > 0
          };
        })
      );

      res.status(200).json(devicesWithInfo);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getDevice: async (req: Request, res: Response) => {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ message: "ID del dispositivo es requerido" });
      }

      const device = await Devices.findByPk(id, {
        include: [
          {
            model: Schedules,
            attributes: ['id_schedule', 'id_class', 'weekday', 'start_time', 'end_time']
          }
        ]
      });

      if (!device) {
        return res.status(404).json({ message: "Dispositivo no encontrado" });
      }

      res.status(200).json(device);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  updateDevice: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { location, status } = req.body;

      // Verificar que el dispositivo existe
      const device = await Devices.findByPk(id);
      if (!device) {
        return res.status(404).json({ message: "Dispositivo no encontrado" });
      }

      // Validar el estado si se proporciona
      const validStatuses = ['Active', 'Sleep', 'Off'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Estado inválido. Valores válidos: ${validStatuses.join(', ')}` 
        });
      }

      // Si se está actualizando la ubicación, verificar que no esté duplicada
      if (location && location !== device.location) {
        const existingDevice = await Devices.findOne({ 
          where: { location } 
        });
        if (existingDevice) {
          return res.status(400).json({ message: "Ya existe un dispositivo en esta ubicación." });
        }
      }

      // Actualizar el dispositivo
      const updateData: any = {};
      if (location) updateData.location = location;
      if (status) updateData.status = status;

      await Devices.update(updateData, { where: { id_device: id } });

      // Obtener el dispositivo actualizado
      const updatedDevice = await Devices.findByPk(id);

      res.status(200).json({
        message: "Dispositivo actualizado exitosamente",
        device: updatedDevice
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  deleteDevice: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verificar que el dispositivo existe
      const device = await Devices.findByPk(id);
      if (!device) {
        return res.status(404).json({ message: "Dispositivo no encontrado" });
      }

      // Verificar si el dispositivo está siendo usado en horarios
      const scheduleCount = await Schedules.count({ 
        where: { id_device: id } 
      });

      if (scheduleCount > 0) {
        return res.status(400).json({ 
          message: `No se puede eliminar el dispositivo. Está siendo usado en ${scheduleCount} horario(s). Elimine primero los horarios asociados.` 
        });
      }

      // Eliminar el dispositivo
      const deleted = await Devices.destroy({ where: { id_device: id } });

      if (deleted) {
        res.status(200).json({ message: "Dispositivo eliminado exitosamente" });
      } else {
        res.status(404).json({ message: "Dispositivo no encontrado" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getDevicesByStatus: async (req: Request, res: Response) => {
    try {
      const { status } = req.params;

      // Validar el estado
      const validStatuses = ['Active', 'Sleep', 'Off'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Estado inválido. Valores válidos: ${validStatuses.join(', ')}` 
        });
      }

      const devices = await Devices.findAll({
        where: { status },
        order: [['location', 'ASC']]
      });

      res.status(200).json({
        status,
        count: devices.length,
        devices
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getDeviceSchedules: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verificar que el dispositivo existe
      const device = await Devices.findByPk(id);
      if (!device) {
        return res.status(404).json({ message: "Dispositivo no encontrado" });
      }

      // Obtener todos los horarios del dispositivo con información de las clases
      const schedules = await Schedules.findAll({
        where: { id_device: id },
        include: [
          {
            model: Classes,
            attributes: ['name', 'group_name', 'class_code']
          }
        ],
        order: [['weekday', 'ASC'], ['start_time', 'ASC']]
      });

      res.status(200).json({
        device: {
          id_device: device.id_device,
          location: device.location,
          status: device.status
        },
        schedules,
        total_schedules: schedules.length
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  updateDeviceStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Estado es requerido" });
      }

      // Validar el estado
      const validStatuses = ['Active', 'Sleep', 'Off'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Estado inválido. Valores válidos: ${validStatuses.join(', ')}` 
        });
      }

      // Verificar que el dispositivo existe
      const device = await Devices.findByPk(id);
      if (!device) {
        return res.status(404).json({ message: "Dispositivo no encontrado" });
      }

      // Actualizar solo el estado
      await Devices.update({ status }, { where: { id_device: id } });

      // Obtener el dispositivo actualizado
      const updatedDevice = await Devices.findByPk(id);

      res.status(200).json({
        message: `Estado del dispositivo actualizado a '${status}'`,
        device: updatedDevice
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
};

export default devicesController;
