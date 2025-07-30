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
const schedules_1 = __importDefault(require("../models/schedules"));
const classes_1 = __importDefault(require("../models/classes"));
// Import associations to establish relationships
require("../models/associations");
const schedulesController = {
    createSchedule: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Usuario no autenticado" });
            }
            const userId = req.user.id;
            const { id_class, id_device, weekday, start_time, end_time } = req.body;
            // Validar campos obligatorios
            if (!id_class || !id_device || !weekday || !start_time || !end_time) {
                return res.status(400).json({
                    message: "ID de clase, ID de dispositivo, día de la semana, hora de inicio y hora de fin son requeridos."
                });
            }
            // Verificar que la clase pertenece al usuario autenticado
            const classData = yield classes_1.default.findByPk(id_class);
            if (!classData) {
                return res.status(404).json({ message: "Clase no encontrada" });
            }
            if (classData.id_professor !== userId) {
                return res.status(403).json({ message: "Acceso denegado. No puedes crear horarios para una clase que no te pertenece." });
            }
            // Crear el horario
            const newSchedule = yield schedules_1.default.create({
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
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getSchedulesByClass: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id_class } = req.params;
            if (!id_class) {
                return res.status(400).json({ message: "ID de clase es requerido" });
            }
            const schedules = yield schedules_1.default.findAll({
                where: { id_class },
                include: [{ model: classes_1.default, attributes: ['name', 'group_name', 'class_code'] }]
            });
            res.status(200).json(schedules);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    updateSchedule: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Usuario no autenticado" });
            }
            const userId = req.user.id;
            const { id } = req.params;
            // Verificar que el horario existe y pertenece a una clase del usuario
            const schedule = yield schedules_1.default.findByPk(id, {
                include: [{ model: classes_1.default }]
            });
            if (!schedule) {
                return res.status(404).json({ message: "Horario no encontrado" });
            }
            // Obtener la clase asociada
            const classData = yield classes_1.default.findByPk(schedule.id_class);
            if (!classData || classData.id_professor !== userId) {
                return res.status(403).json({ message: "Acceso denegado. No puedes actualizar horarios de una clase que no te pertenece." });
            }
            // Actualizar el horario
            yield schedules_1.default.update(req.body, { where: { id_schedule: id } });
            const updatedSchedule = yield schedules_1.default.findByPk(id, {
                include: [{ model: classes_1.default }]
            });
            res.status(200).json({
                message: "Horario actualizado exitosamente",
                schedule: updatedSchedule
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    deleteSchedule: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Usuario no autenticado" });
            }
            const userId = req.user.id;
            const { id } = req.params;
            // Verificar que el horario existe y pertenece a una clase del usuario
            const schedule = yield schedules_1.default.findByPk(id);
            if (!schedule) {
                return res.status(404).json({ message: "Horario no encontrado" });
            }
            // Obtener la clase asociada
            const classData = yield classes_1.default.findByPk(schedule.id_class);
            if (!classData || classData.id_professor !== userId) {
                return res.status(403).json({ message: "Acceso denegado. No puedes eliminar horarios de una clase que no te pertenece." });
            }
            // Eliminar el horario
            const deleted = yield schedules_1.default.destroy({ where: { id_schedule: id } });
            if (deleted) {
                res.status(200).json({ message: "Horario eliminado exitosamente" });
            }
            else {
                res.status(404).json({ message: "Horario no encontrado" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getSchedulesByWeekday: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { weekday } = req.params;
            if (!weekday) {
                return res.status(400).json({ message: "Día de la semana es requerido" });
            }
            const schedules = yield schedules_1.default.findAll({
                where: { weekday },
                include: [{ model: classes_1.default, attributes: ['name', 'group_name', 'class_code'] }],
                order: [['start_time', 'ASC']]
            });
            res.status(200).json(schedules);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
};
exports.default = schedulesController;
