"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const devices_1 = __importDefault(require("../models/devices"));
const schedules_1 = __importDefault(require("../models/schedules"));
const classes_1 = __importDefault(require("../models/classes"));
// Import associations to establish relationships
require("../models/associations");
const devicesController = {
    createDevice: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const existingDevice = yield devices_1.default.findOne({ where: { location } });
            if (existingDevice) {
                return res.status(400).json({ message: "Ya existe un dispositivo en esta ubicación." });
            }
            // Crear el dispositivo
            const newDevice = yield devices_1.default.create({
                location,
                status: status || 'Off' // Por defecto 'Off' si no se especifica
            });
            res.status(201).json({
                message: "Dispositivo creado exitosamente",
                device: newDevice
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getAllDevices: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const devices = yield devices_1.default.findAll({
                order: [['location', 'ASC']]
            });
            // Agregar información adicional sobre el uso de cada dispositivo
            const devicesWithInfo = yield Promise.all(devices.map((device) => __awaiter(void 0, void 0, void 0, function* () {
                // Contar cuántos horarios están asignados a este dispositivo
                const scheduleCount = yield schedules_1.default.count({
                    where: { id_device: device.id_device }
                });
                return Object.assign(Object.assign({}, device.toJSON()), { schedules_count: scheduleCount, is_in_use: scheduleCount > 0 });
            })));
            res.status(200).json(devicesWithInfo);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getDevice: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.body;
            if (!id) {
                return res.status(400).json({ message: "ID del dispositivo es requerido" });
            }
            const device = yield devices_1.default.findByPk(id, {
                include: [
                    {
                        model: schedules_1.default,
                        attributes: ['id_schedule', 'id_class', 'weekday', 'start_time', 'end_time']
                    }
                ]
            });
            if (!device) {
                return res.status(404).json({ message: "Dispositivo no encontrado" });
            }
            res.status(200).json(device);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    updateDevice: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { location, status } = req.body;
            // Verificar que el dispositivo existe
            const device = yield devices_1.default.findByPk(id);
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
                const existingDevice = yield devices_1.default.findOne({
                    where: { location }
                });
                if (existingDevice) {
                    return res.status(400).json({ message: "Ya existe un dispositivo en esta ubicación." });
                }
            }
            // Actualizar el dispositivo
            const updateData = {};
            if (location)
                updateData.location = location;
            if (status)
                updateData.status = status;
            yield devices_1.default.update(updateData, { where: { id_device: id } });
            // Obtener el dispositivo actualizado
            const updatedDevice = yield devices_1.default.findByPk(id);
            res.status(200).json({
                message: "Dispositivo actualizado exitosamente",
                device: updatedDevice
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    deleteDevice: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Verificar que el dispositivo existe
            const device = yield devices_1.default.findByPk(id);
            if (!device) {
                return res.status(404).json({ message: "Dispositivo no encontrado" });
            }
            // Verificar si el dispositivo está siendo usado en horarios
            const scheduleCount = yield schedules_1.default.count({
                where: { id_device: id }
            });
            if (scheduleCount > 0) {
                return res.status(400).json({
                    message: `No se puede eliminar el dispositivo. Está siendo usado en ${scheduleCount} horario(s). Elimine primero los horarios asociados.`
                });
            }
            // Eliminar el dispositivo
            const deleted = yield devices_1.default.destroy({ where: { id_device: id } });
            if (deleted) {
                res.status(200).json({ message: "Dispositivo eliminado exitosamente" });
            }
            else {
                res.status(404).json({ message: "Dispositivo no encontrado" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getDevicesByStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { status } = req.params;
            // Validar el estado
            const validStatuses = ['Active', 'Sleep', 'Off'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    message: `Estado inválido. Valores válidos: ${validStatuses.join(', ')}`
                });
            }
            const devices = yield devices_1.default.findAll({
                where: { status },
                order: [['location', 'ASC']]
            });
            res.status(200).json({
                status,
                count: devices.length,
                devices
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getDeviceSchedules: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Verificar que el dispositivo existe
            const device = yield devices_1.default.findByPk(id);
            if (!device) {
                return res.status(404).json({ message: "Dispositivo no encontrado" });
            }
            // Obtener todos los horarios del dispositivo con información de las clases
            const schedules = yield schedules_1.default.findAll({
                where: { id_device: id },
                include: [
                    {
                        model: classes_1.default,
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
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    updateDeviceStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const device = yield devices_1.default.findByPk(id);
            if (!device) {
                return res.status(404).json({ message: "Dispositivo no encontrado" });
            }
            // Actualizar solo el estado
            yield devices_1.default.update({ status }, { where: { id_device: id } });
            // Obtener el dispositivo actualizado
            const updatedDevice = yield devices_1.default.findByPk(id);
            res.status(200).json({
                message: `Estado del dispositivo actualizado a '${status}'`,
                device: updatedDevice
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Método para obtener los horarios de polls de las clases del día
    getDailyClassPolls: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id_device } = req.body;
            // Validar que se proporcione el id_device
            if (!id_device) {
                return res.status(400).json({
                    success: false,
                    message: "El id_device es requerido."
                });
            }
            // Verificar que el dispositivo existe
            const device = yield devices_1.default.findByPk(id_device);
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: `No se encontró un dispositivo con el ID: ${id_device}`
                });
            }
            // Obtener el día actual de la semana en inglés
            const currentDate = new Date();
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const currentWeekday = weekdays[currentDate.getDay()];
            console.log(`📅 Buscando clases para el dispositivo ${id_device} en ${currentWeekday}`);
            // Buscar horarios del dispositivo para el día actual, incluyendo información de la clase
            const schedules = yield schedules_1.default.findAll({
                where: {
                    id_device: id_device,
                    weekday: currentWeekday
                },
                include: [{
                        model: classes_1.default,
                        attributes: ['name', 'group_name', 'class_code']
                    }],
                order: [['start_time', 'ASC']]
            });
            if (schedules.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: `No hay clases programadas para el dispositivo ${id_device} el día ${currentWeekday}`,
                    data: {
                        device_id: id_device,
                        weekday: currentWeekday,
                        polls: []
                    }
                });
            }
            // Función para calcular los horarios de poll
            const calculatePollTimes = (startTime, endTime) => {
                // Convertir tiempos a minutos desde medianoche
                const timeToMinutes = (time) => {
                    const [hours, minutes] = time.split(':').map(Number);
                    return hours * 60 + minutes;
                };
                // Convertir minutos a formato HH:MM
                const minutesToTime = (totalMinutes) => {
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                };
                const startMinutes = timeToMinutes(startTime);
                const endMinutes = timeToMinutes(endTime);
                const durationMinutes = endMinutes - startMinutes;
                // Poll 1: 10 minutos después del inicio
                const poll1Minutes = startMinutes + 10;
                // Poll 2: Mitad de la clase
                const poll2Minutes = startMinutes + Math.floor(durationMinutes / 2);
                // Poll 3: 10 minutos antes del final
                const poll3Minutes = endMinutes - 10;
                return {
                    poll1: minutesToTime(poll1Minutes),
                    poll2: minutesToTime(poll2Minutes),
                    poll3: minutesToTime(poll3Minutes)
                };
            };
            // Generar polls para cada clase (formato simplificado como solicitado)
            const polls = schedules.map((schedule) => {
                var _a;
                const pollTimes = calculatePollTimes(schedule.start_time, schedule.end_time);
                console.log(`⏰ Clase: ${((_a = schedule.Class) === null || _a === void 0 ? void 0 : _a.name) || 'N/A'} (${schedule.start_time} - ${schedule.end_time})`);
                console.log(`   Polls: ${pollTimes.poll1}, ${pollTimes.poll2}, ${pollTimes.poll3}`);
                return pollTimes; // Solo retornar los horarios de poll
            });
            console.log(`✅ Se generaron ${polls.length} sets de polls para ${schedules.length} clases`);
            // Respuesta en el formato solicitado
            res.status(200).json({
                polls: polls
            });
        }
        catch (error) {
            console.error('❌ Error al obtener polls de clases:', error);
            res.status(500).json({
                success: false,
                message: "Error interno del servidor al obtener los horarios de polls",
                error: error.message
            });
        }
    })
};
exports.default = devicesController;
