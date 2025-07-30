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
const enrollments_1 = __importDefault(require("../models/enrollments"));
const users_1 = __importDefault(require("../models/users"));
const classes_1 = __importDefault(require("../models/classes"));
const schedules_1 = __importDefault(require("../models/schedules"));
// Import associations to establish relationships
require("../models/associations");
const enrollmentsController = {
    createEnrollment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { class_code, id_student } = req.body;
            // Validar campos obligatorios
            if (!class_code || !id_student) {
                return res.status(400).json({ message: "Código de clase y ID del estudiante son requeridos." });
            }
            // Verificar si el código de la clase es válido
            const classData = yield classes_1.default.findOne({ where: { class_code } });
            if (!classData) {
                return res.status(404).json({ message: "Código de clase inválido. No se encontró la clase." });
            }
            // Verificar que el estudiante existe
            const student = yield users_1.default.findByPk(id_student);
            if (!student) {
                return res.status(404).json({ message: "Estudiante no encontrado." });
            }
            // Verificar que el usuario es realmente un estudiante
            if (student.role !== 'Student') {
                return res.status(400).json({ message: "El usuario especificado no es un estudiante." });
            }
            // Verificar si el estudiante ya está inscrito en la clase
            const existingEnrollment = yield enrollments_1.default.findOne({
                where: { id_class: classData.id_class, id_student },
            });
            if (existingEnrollment) {
                return res.status(400).json({ message: "El estudiante ya está inscrito en esta clase." });
            }
            // Crear la inscripción
            const newEnrollment = yield enrollments_1.default.create({
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
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getAllEnrollments: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const enrollments = yield enrollments_1.default.findAll({
                include: [
                    {
                        model: classes_1.default,
                        attributes: ['name', 'group_name', 'class_code']
                    },
                    {
                        model: users_1.default,
                        attributes: ['name', 'email', 'user_uuid']
                    }
                ]
            });
            res.status(200).json(enrollments);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getEnrollment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.body;
            if (!id) {
                return res.status(400).json({ message: "ID de inscripción es requerido" });
            }
            const enrollment = yield enrollments_1.default.findByPk(id, {
                include: [
                    {
                        model: classes_1.default,
                        attributes: ['name', 'group_name', 'class_code'],
                        include: [{ model: schedules_1.default }]
                    },
                    {
                        model: users_1.default,
                        attributes: ['name', 'email', 'user_uuid']
                    }
                ]
            });
            if (enrollment) {
                res.status(200).json(enrollment);
            }
            else {
                res.status(404).json({ message: "Inscripción no encontrada" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    deleteEnrollment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Usuario no autenticado" });
            }
            const userId = req.user.id; // ID del usuario autenticado extraído del token
            const { id } = req.params; // ID de la clase
            // Verificar si existe una inscripción para el usuario autenticado y la clase especificada
            const enrollment = yield enrollments_1.default.findOne({
                where: { id_student: userId, id_class: id },
            });
            if (!enrollment) {
                return res.status(404).json({ message: "Inscripción no encontrada" });
            }
            // Eliminar la inscripción
            const deleted = yield enrollments_1.default.destroy({
                where: { id_student: userId, id_class: id },
            });
            if (deleted) {
                res.status(200).json({ message: "Inscripción eliminada exitosamente" });
            }
            else {
                res.status(404).json({ message: "Inscripción no encontrada" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getStudentsByClass: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id_class } = req.body;
            if (!id_class) {
                return res.status(400).json({ message: "ID de clase es requerido" });
            }
            // Buscar las inscripciones de la clase y obtener los datos de los estudiantes junto con la información de la clase
            const enrollments = yield enrollments_1.default.findAll({
                where: { id_class },
                include: [
                    {
                        model: users_1.default,
                        attributes: ["id_user", "name", "email", "user_uuid"],
                    },
                    {
                        model: classes_1.default,
                        attributes: ["id_class", "name", "group_name", "class_code"],
                        include: [{ model: schedules_1.default }]
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
                const user = enrollment.get('Users');
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
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    getClassesByStudent: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id_student } = req.body;
            if (!id_student) {
                return res.status(400).json({ message: "ID del estudiante es requerido" });
            }
            // Buscar las inscripciones del estudiante y obtener la información de las clases
            const enrollments = yield enrollments_1.default.findAll({
                where: { id_student },
                include: [
                    {
                        model: classes_1.default,
                        attributes: ["id_class", "name", "group_name", "class_code", "id_professor"],
                        include: [
                            {
                                model: schedules_1.default,
                                attributes: ["id_schedule", "weekday", "start_time", "end_time", "id_device"],
                            },
                            {
                                model: users_1.default, // Incluir el profesor
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
            const classes = yield Promise.all(enrollments.map((enrollment) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                const classData = enrollment.get('Classes');
                // Contar la cantidad de estudiantes inscritos en la clase
                const studentCount = yield enrollments_1.default.count({ where: { id_class: classData.id_class } });
                // Convertir el objeto Sequelize a JSON y formatear horarios
                const classJSON = classData.toJSON();
                // Formatear horarios
                const schedules = ((_a = classJSON.Schedules) === null || _a === void 0 ? void 0 : _a.map((schedule) => ({
                    id_schedule: schedule.id_schedule,
                    day: schedule.weekday,
                    time: `${schedule.start_time} - ${schedule.end_time}`,
                    device_id: schedule.id_device,
                    start_time: schedule.start_time,
                    end_time: schedule.end_time
                }))) || [];
                // Extraer el nombre del profesor
                const professorName = ((_b = classJSON.Professor) === null || _b === void 0 ? void 0 : _b.name) || "";
                // Limpiar el objeto
                delete classJSON.Schedules;
                delete classJSON.Professor;
                return Object.assign(Object.assign({}, classJSON), { studentCount,
                    schedules,
                    professorName, total_schedules: schedules.length });
            })));
            res.status(200).json(classes);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Método adicional: Inscribir estudiante autenticado a una clase
    enrollSelf: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Usuario no autenticado" });
            }
            const userId = req.user.id;
            const { class_code } = req.body;
            // Verificar que el usuario autenticado es un estudiante
            const user = yield users_1.default.findByPk(userId);
            if (!user || user.role !== 'Student') {
                return res.status(403).json({ message: "Solo los estudiantes pueden inscribirse en clases." });
            }
            // Verificar si el código de la clase es válido
            const classData = yield classes_1.default.findOne({ where: { class_code } });
            if (!classData) {
                return res.status(404).json({ message: "Código de clase inválido." });
            }
            // Verificar si ya está inscrito
            const existingEnrollment = yield enrollments_1.default.findOne({
                where: { id_class: classData.id_class, id_student: userId },
            });
            if (existingEnrollment) {
                return res.status(400).json({ message: "Ya estás inscrito en esta clase." });
            }
            // Crear la inscripción
            const newEnrollment = yield enrollments_1.default.create({
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
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    })
};
exports.default = enrollmentsController;
