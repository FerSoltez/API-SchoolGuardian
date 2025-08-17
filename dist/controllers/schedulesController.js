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
const sequelize_1 = require("sequelize");
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
            // Verificar que no existe un horario duplicado (misma clase, mismo día, misma hora)
            const existingSchedule = yield schedules_1.default.findOne({
                where: {
                    id_class,
                    weekday,
                    start_time,
                    end_time
                }
            });
            if (existingSchedule) {
                return res.status(409).json({
                    message: "Ya existe un horario para esta clase en el mismo día y hora.",
                    existing_schedule: {
                        id: existingSchedule.id_schedule,
                        weekday: existingSchedule.weekday,
                        start_time: existingSchedule.start_time,
                        end_time: existingSchedule.end_time
                    }
                });
            }
            // Verificar que no hay conflictos de horarios superpuestos para la misma clase en el mismo día
            const overlappingSchedule = yield schedules_1.default.findOne({
                where: {
                    id_class,
                    weekday,
                    [sequelize_1.Op.or]: [
                        // Nuevo horario empieza durante un horario existente
                        {
                            start_time: { [sequelize_1.Op.lte]: start_time },
                            end_time: { [sequelize_1.Op.gt]: start_time }
                        },
                        // Nuevo horario termina durante un horario existente
                        {
                            start_time: { [sequelize_1.Op.lt]: end_time },
                            end_time: { [sequelize_1.Op.gte]: end_time }
                        },
                        // Nuevo horario contiene completamente un horario existente
                        {
                            start_time: { [sequelize_1.Op.gte]: start_time },
                            end_time: { [sequelize_1.Op.lte]: end_time }
                        }
                    ]
                }
            });
            if (overlappingSchedule) {
                return res.status(409).json({
                    message: "El horario se superpone con un horario existente para esta clase.",
                    conflicting_schedule: {
                        id: overlappingSchedule.id_schedule,
                        weekday: overlappingSchedule.weekday,
                        start_time: overlappingSchedule.start_time,
                        end_time: overlappingSchedule.end_time
                    }
                });
            }
            // Verificar que no hay conflictos con otras clases del mismo grupo en el mismo día
            const groupConflict = yield schedules_1.default.findOne({
                include: [{
                        model: classes_1.default,
                        where: { group_name: classData.group_name },
                        attributes: ['name', 'group_name', 'id_professor']
                    }],
                where: {
                    weekday,
                    id_class: { [sequelize_1.Op.ne]: id_class }, // Excluir la clase actual
                    [sequelize_1.Op.or]: [
                        // Nuevo horario empieza durante un horario existente
                        {
                            start_time: { [sequelize_1.Op.lte]: start_time },
                            end_time: { [sequelize_1.Op.gt]: start_time }
                        },
                        // Nuevo horario termina durante un horario existente
                        {
                            start_time: { [sequelize_1.Op.lt]: end_time },
                            end_time: { [sequelize_1.Op.gte]: end_time }
                        },
                        // Nuevo horario contiene completamente un horario existente
                        {
                            start_time: { [sequelize_1.Op.gte]: start_time },
                            end_time: { [sequelize_1.Op.lte]: end_time }
                        }
                    ]
                }
            });
            if (groupConflict) {
                return res.status(409).json({
                    message: `Conflicto de horario: El grupo "${classData.group_name}" ya tiene otra clase en este horario.`,
                    conflicting_class: {
                        schedule_id: groupConflict.id_schedule,
                        class_name: groupConflict.Class.name,
                        group_name: groupConflict.Class.group_name,
                        weekday: groupConflict.weekday,
                        start_time: groupConflict.start_time,
                        end_time: groupConflict.end_time
                    }
                });
            }
            // Verificar que el profesor no tiene otra clase en el mismo horario
            const professorConflict = yield schedules_1.default.findOne({
                include: [{
                        model: classes_1.default,
                        where: { id_professor: classData.id_professor },
                        attributes: ['name', 'group_name', 'id_professor']
                    }],
                where: {
                    weekday,
                    id_class: { [sequelize_1.Op.ne]: id_class }, // Excluir la clase actual
                    [sequelize_1.Op.or]: [
                        // Nuevo horario empieza durante un horario existente
                        {
                            start_time: { [sequelize_1.Op.lte]: start_time },
                            end_time: { [sequelize_1.Op.gt]: start_time }
                        },
                        // Nuevo horario termina durante un horario existente
                        {
                            start_time: { [sequelize_1.Op.lt]: end_time },
                            end_time: { [sequelize_1.Op.gte]: end_time }
                        },
                        // Nuevo horario contiene completamente un horario existente
                        {
                            start_time: { [sequelize_1.Op.gte]: start_time },
                            end_time: { [sequelize_1.Op.lte]: end_time }
                        }
                    ]
                }
            });
            if (professorConflict) {
                return res.status(409).json({
                    message: "Conflicto de horario: El profesor ya tiene otra clase programada en este horario.",
                    conflicting_class: {
                        schedule_id: professorConflict.id_schedule,
                        class_name: professorConflict.Class.name,
                        group_name: professorConflict.Class.group_name,
                        weekday: professorConflict.weekday,
                        start_time: professorConflict.start_time,
                        end_time: professorConflict.end_time
                    }
                });
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
            // Si se están actualizando datos de horario, verificar duplicados
            const { id_class, weekday, start_time, end_time } = req.body;
            if (id_class || weekday || start_time || end_time) {
                // Usar valores actuales si no se proporcionan nuevos
                const newIdClass = id_class || schedule.id_class;
                const newWeekday = weekday || schedule.weekday;
                const newStartTime = start_time || schedule.start_time;
                const newEndTime = end_time || schedule.end_time;
                // Verificar que no existe otro horario con los mismos datos
                const existingSchedule = yield schedules_1.default.findOne({
                    where: {
                        id_class: newIdClass,
                        weekday: newWeekday,
                        start_time: newStartTime,
                        end_time: newEndTime,
                        id_schedule: { [sequelize_1.Op.ne]: id } // Excluir el horario actual
                    }
                });
                if (existingSchedule) {
                    return res.status(409).json({
                        message: "Ya existe otro horario para esta clase en el mismo día y hora.",
                        existing_schedule: {
                            id: existingSchedule.id_schedule,
                            weekday: existingSchedule.weekday,
                            start_time: existingSchedule.start_time,
                            end_time: existingSchedule.end_time
                        }
                    });
                }
                // Verificar que no hay conflictos de horarios superpuestos
                const overlappingSchedule = yield schedules_1.default.findOne({
                    where: {
                        id_class: newIdClass,
                        weekday: newWeekday,
                        id_schedule: { [sequelize_1.Op.ne]: id }, // Excluir el horario actual
                        [sequelize_1.Op.or]: [
                            // Nuevo horario empieza durante un horario existente
                            {
                                start_time: { [sequelize_1.Op.lte]: newStartTime },
                                end_time: { [sequelize_1.Op.gt]: newStartTime }
                            },
                            // Nuevo horario termina durante un horario existente
                            {
                                start_time: { [sequelize_1.Op.lt]: newEndTime },
                                end_time: { [sequelize_1.Op.gte]: newEndTime }
                            },
                            // Nuevo horario contiene completamente un horario existente
                            {
                                start_time: { [sequelize_1.Op.gte]: newStartTime },
                                end_time: { [sequelize_1.Op.lte]: newEndTime }
                            }
                        ]
                    }
                });
                if (overlappingSchedule) {
                    return res.status(409).json({
                        message: "El horario actualizado se superpone con un horario existente para esta clase.",
                        conflicting_schedule: {
                            id: overlappingSchedule.id_schedule,
                            weekday: overlappingSchedule.weekday,
                            start_time: overlappingSchedule.start_time,
                            end_time: overlappingSchedule.end_time
                        }
                    });
                }
                // Obtener información de la clase para las validaciones adicionales
                const updatedClassData = yield classes_1.default.findByPk(newIdClass);
                if (!updatedClassData) {
                    return res.status(404).json({ message: "Clase no encontrada para la validación." });
                }
                // Verificar que no hay conflictos con otras clases del mismo grupo
                const groupConflict = yield schedules_1.default.findOne({
                    include: [{
                            model: classes_1.default,
                            where: { group_name: updatedClassData.group_name },
                            attributes: ['name', 'group_name', 'id_professor']
                        }],
                    where: {
                        weekday: newWeekday,
                        id_schedule: { [sequelize_1.Op.ne]: id }, // Excluir el horario actual
                        id_class: { [sequelize_1.Op.ne]: newIdClass }, // Excluir la clase actual
                        [sequelize_1.Op.or]: [
                            // Nuevo horario empieza durante un horario existente
                            {
                                start_time: { [sequelize_1.Op.lte]: newStartTime },
                                end_time: { [sequelize_1.Op.gt]: newStartTime }
                            },
                            // Nuevo horario termina durante un horario existente
                            {
                                start_time: { [sequelize_1.Op.lt]: newEndTime },
                                end_time: { [sequelize_1.Op.gte]: newEndTime }
                            },
                            // Nuevo horario contiene completamente un horario existente
                            {
                                start_time: { [sequelize_1.Op.gte]: newStartTime },
                                end_time: { [sequelize_1.Op.lte]: newEndTime }
                            }
                        ]
                    }
                });
                if (groupConflict) {
                    return res.status(409).json({
                        message: `Conflicto de horario: El grupo "${updatedClassData.group_name}" ya tiene otra clase en este horario.`,
                        conflicting_class: {
                            schedule_id: groupConflict.id_schedule,
                            class_name: groupConflict.Class.name,
                            group_name: groupConflict.Class.group_name,
                            weekday: groupConflict.weekday,
                            start_time: groupConflict.start_time,
                            end_time: groupConflict.end_time
                        }
                    });
                }
                // Verificar que el profesor no tiene otra clase en el mismo horario
                const professorConflict = yield schedules_1.default.findOne({
                    include: [{
                            model: classes_1.default,
                            where: { id_professor: updatedClassData.id_professor },
                            attributes: ['name', 'group_name', 'id_professor']
                        }],
                    where: {
                        weekday: newWeekday,
                        id_schedule: { [sequelize_1.Op.ne]: id }, // Excluir el horario actual
                        id_class: { [sequelize_1.Op.ne]: newIdClass }, // Excluir la clase actual
                        [sequelize_1.Op.or]: [
                            // Nuevo horario empieza durante un horario existente
                            {
                                start_time: { [sequelize_1.Op.lte]: newStartTime },
                                end_time: { [sequelize_1.Op.gt]: newStartTime }
                            },
                            // Nuevo horario termina durante un horario existente
                            {
                                start_time: { [sequelize_1.Op.lt]: newEndTime },
                                end_time: { [sequelize_1.Op.gte]: newEndTime }
                            },
                            // Nuevo horario contiene completamente un horario existente
                            {
                                start_time: { [sequelize_1.Op.gte]: newStartTime },
                                end_time: { [sequelize_1.Op.lte]: newEndTime }
                            }
                        ]
                    }
                });
                if (professorConflict) {
                    return res.status(409).json({
                        message: "Conflicto de horario: El profesor ya tiene otra clase programada en este horario.",
                        conflicting_class: {
                            schedule_id: professorConflict.id_schedule,
                            class_name: professorConflict.Class.name,
                            group_name: professorConflict.Class.group_name,
                            weekday: professorConflict.weekday,
                            start_time: professorConflict.start_time,
                            end_time: professorConflict.end_time
                        }
                    });
                }
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
