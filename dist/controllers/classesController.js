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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const classes_1 = __importDefault(require("../models/classes"));
const schedules_1 = __importDefault(require("../models/schedules"));
const enrollments_1 = __importDefault(require("../models/enrollments"));
// Import associations to establish relationships
require("../models/associations");
const classesController = {
    createClass: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const newClass = yield classes_1.default.create({
                name,
                group_name,
                id_professor,
                class_code
            });
            // Crear los horarios asociados
            const schedulesData = schedules.map((schedule) => ({
                id_class: newClass.id_class,
                id_device: schedule.id_device,
                weekday: schedule.weekday,
                start_time: schedule.start_time,
                end_time: schedule.end_time
            }));
            const createdSchedules = yield schedules_1.default.bulkCreate(schedulesData);
            // Obtener la clase completa con sus horarios
            const classWithSchedules = yield classes_1.default.findByPk(newClass.id_class, {
                include: [{ model: schedules_1.default }],
            });
            res.status(201).json({
                message: "Clase creada exitosamente",
                class: classWithSchedules,
                schedules_created: createdSchedules.length
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getAllClasses: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const classes = yield classes_1.default.findAll({
                include: [{ model: schedules_1.default }], // Incluir los horarios asociados
            });
            res.status(200).json(classes);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getClass: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.body;
            if (!id) {
                return res.status(400).json({ message: "ID de clase es requerido" });
            }
            const classData = yield classes_1.default.findByPk(id, {
                include: [{ model: schedules_1.default }], // Incluir los horarios asociados
            });
            if (classData) {
                res.status(200).json(classData);
            }
            else {
                res.status(404).json({ message: "Clase no encontrada" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    deleteClass: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Usuario no autenticado" });
            }
            const userId = req.user.id; // ID del usuario autenticado extraído del token
            const { id } = req.params;
            // Verificar si la clase pertenece al usuario autenticado
            const classData = yield classes_1.default.findByPk(id);
            if (!classData) {
                return res.status(404).json({ message: "Clase no encontrada" });
            }
            if (classData.id_professor !== userId) {
                return res.status(403).json({ message: "Acceso denegado. No puedes eliminar una clase que no te pertenece." });
            }
            // Eliminar los horarios asociados en SCHEDULES
            yield schedules_1.default.destroy({ where: { id_class: id } });
            // Eliminar las inscripciones asociadas
            yield enrollments_1.default.destroy({ where: { id_class: id } });
            // Eliminar la clase
            const deleted = yield classes_1.default.destroy({ where: { id_class: id } });
            if (deleted) {
                res.status(200).json({ message: "Clase y sus datos asociados eliminados exitosamente" });
            }
            else {
                res.status(404).json({ message: "Clase no encontrada" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    partialUpdateClass: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Usuario no autenticado" });
            }
            const userId = req.user.id; // ID del usuario autenticado extraído del token
            const { id } = req.params;
            // Verificar si la clase pertenece al usuario autenticado
            const classData = yield classes_1.default.findByPk(id);
            if (!classData) {
                return res.status(404).json({ message: "Clase no encontrada" });
            }
            if (classData.id_professor !== userId) {
                return res.status(403).json({ message: "Acceso denegado. No puedes actualizar una clase que no te pertenece." });
            }
            const _a = req.body, { schedules } = _a, classUpdateData = __rest(_a, ["schedules"]);
            // Actualizar los datos de la clase (nombre, grupo, etc.)
            if (Object.keys(classUpdateData).length > 0) {
                yield classes_1.default.update(classUpdateData, { where: { id_class: id } });
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
                yield schedules_1.default.destroy({ where: { id_class: id } });
                // Crear los nuevos horarios
                const schedulesData = schedules.map((schedule) => ({
                    id_class: Number(id),
                    id_device: schedule.id_device,
                    weekday: schedule.weekday,
                    start_time: schedule.start_time,
                    end_time: schedule.end_time
                }));
                yield schedules_1.default.bulkCreate(schedulesData);
            }
            // Obtener la clase actualizada con los horarios asociados
            const updatedClass = yield classes_1.default.findByPk(id, {
                include: [{ model: schedules_1.default }],
            });
            res.status(200).json({
                message: "Clase actualizada exitosamente",
                class: updatedClass
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getClassesByUserId: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Usuario no autenticado" });
            }
            const userId = req.user.id; // ID del usuario autenticado extraído del token
            const { id } = req.body;
            // Verificar si el usuario autenticado está intentando acceder a sus propias clases
            if (parseInt(id) !== userId) {
                return res.status(403).json({ message: "Acceso denegado. No puedes ver las clases de otro usuario." });
            }
            // Obtener las clases del profesor con los horarios
            const classes = yield classes_1.default.findAll({
                where: { id_professor: id },
                include: [
                    {
                        model: schedules_1.default,
                        attributes: ["id_schedule", "id_device", "weekday", "start_time", "end_time"],
                    },
                ],
            });
            // Agregar la cantidad de alumnos inscritos a cada clase y formatear horarios
            const classesWithDetails = yield Promise.all(classes.map((classData) => __awaiter(void 0, void 0, void 0, function* () {
                var _a;
                const studentCount = yield enrollments_1.default.count({ where: { id_class: classData.id_class } });
                const classJSON = classData.toJSON();
                // Mapeo de días de inglés a español
                const dayTranslation = {
                    'Monday': 'Lunes',
                    'Tuesday': 'Martes',
                    'Wednesday': 'Miércoles',
                    'Thursday': 'Jueves',
                    'Friday': 'Viernes',
                    'Saturday': 'Sábado',
                    'Sunday': 'Domingo'
                };
                // Función para formatear tiempo (solo horas y minutos con AM/PM)
                const formatTime = (time) => {
                    const [hours, minutes] = time.split(':');
                    const hour24 = parseInt(hours);
                    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                    const period = hour24 >= 12 ? 'PM' : 'AM';
                    return `${hour12}:${minutes} ${period}`;
                };
                // Formatear horarios para mostrar información más clara
                const formattedSchedules = ((_a = classJSON.Schedules) === null || _a === void 0 ? void 0 : _a.map((schedule) => ({
                    id_schedule: schedule.id_schedule,
                    day: dayTranslation[schedule.weekday] || schedule.weekday,
                    time: `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`,
                    device_id: schedule.id_device, // Representa el salón
                    start_time: schedule.start_time,
                    end_time: schedule.end_time
                }))) || [];
                // Remover el array original de Schedules y agregar el formateado
                delete classJSON.Schedules;
                return Object.assign(Object.assign({}, classJSON), { studentCount, schedules: formattedSchedules, total_schedules: formattedSchedules.length });
            })));
            res.status(200).json(classesWithDetails);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Método adicional para obtener clases por código
    getClassByCode: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { class_code } = req.body;
            if (!class_code) {
                return res.status(400).json({ message: "Código de clase es requerido" });
            }
            const classData = yield classes_1.default.findOne({
                where: { class_code },
                include: [{ model: schedules_1.default }],
            });
            if (classData) {
                res.status(200).json(classData);
            }
            else {
                res.status(404).json({ message: "Clase no encontrada con ese código" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
};
exports.default = classesController;
