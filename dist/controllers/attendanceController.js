"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const attendance_1 = __importDefault(require("../models/attendance"));
const attendancePings_1 = __importDefault(require("../models/attendancePings"));
const classes_1 = __importDefault(require("../models/classes"));
const users_1 = __importDefault(require("../models/users"));
const enrollments_1 = __importDefault(require("../models/enrollments"));
const schedules_1 = __importDefault(require("../models/schedules"));
const devices_1 = __importDefault(require("../models/devices"));
const sequelize_1 = require("sequelize");
const index_1 = require("../index"); // Importar la función broadcast
// Import associations to establish relationships
require("../models/associations");
// Función helper para traducir status de inglés a español
const translateStatus = (status) => {
    const statusTranslations = {
        'Present': 'Presente',
        'Absent': 'Ausente',
        'Late': 'Tarde',
        'Justified': 'Justificado'
    };
    return statusTranslations[status] || status;
};
// Función helper para verificar si hay clase en ese día y hora
const verifyClassSchedule = (id_class, attendance_date, attendance_time) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Obtener el día de la semana de la fecha
        const date = new Date(attendance_date);
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekday = weekdays[date.getDay()];
        // Buscar si hay un horario para esta clase en este día
        const schedule = yield schedules_1.default.findOne({
            where: {
                id_class,
                weekday: weekday
            }
        });
        if (!schedule) {
            return {
                hasClass: false,
                message: `No hay clase programada para ${weekday} en esta clase`
            };
        }
        // Verificar si la hora de asistencia está dentro del horario de clase
        const attendanceTimeMinutes = timeToMinutes(attendance_time);
        const startTimeMinutes = timeToMinutes(schedule.start_time);
        const endTimeMinutes = timeToMinutes(schedule.end_time);
        if (attendanceTimeMinutes < startTimeMinutes || attendanceTimeMinutes > endTimeMinutes) {
            return {
                hasClass: false,
                message: `La hora ${attendance_time} está fuera del horario de clase (${schedule.start_time} - ${schedule.end_time})`
            };
        }
        return {
            hasClass: true,
            schedule: schedule
        };
    }
    catch (error) {
        throw new Error(`Error al verificar horario de clase: ${error.message}`);
    }
});
// Función helper para convertir tiempo a minutos
const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};
// Función helper para determinar la clase actual basándose en el dispositivo y la hora
const getCurrentClassByDevice = (id_device, attendance_time) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar que el dispositivo existe
        const device = yield devices_1.default.findOne({
            where: { id_device }
        });
        if (!device) {
            return {
                hasClass: false,
                message: `Dispositivo con ID ${id_device} no encontrado`
            };
        }
        // Extraer fecha y hora del attendance_time (formato ISO: 2025-07-14T15:30:00Z)
        const dateTime = new Date(attendance_time);
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekday = weekdays[dateTime.getDay()];
        const timeOnly = dateTime.toTimeString().split(' ')[0]; // HH:MM:SS
        // Buscar si hay una clase programada para este dispositivo en este día y hora
        const schedule = yield schedules_1.default.findOne({
            where: {
                id_device,
                weekday: weekday
            },
            include: [
                {
                    model: classes_1.default,
                    attributes: ['id_class', 'name', 'class_code', 'group_name']
                }
            ]
        });
        if (!schedule) {
            return {
                hasClass: false,
                message: `No hay clase programada para el dispositivo ${id_device} en ${weekday}`
            };
        }
        // Verificar si la hora está dentro del horario de clase
        const attendanceTimeMinutes = timeToMinutes(timeOnly);
        const startTimeMinutes = timeToMinutes(schedule.start_time);
        const endTimeMinutes = timeToMinutes(schedule.end_time);
        if (attendanceTimeMinutes < startTimeMinutes || attendanceTimeMinutes > endTimeMinutes) {
            return {
                hasClass: false,
                message: `La hora ${timeOnly} está fuera del horario de clase (${schedule.start_time} - ${schedule.end_time}) para el dispositivo ${id_device}`
            };
        }
        // Obtener información completa de la clase
        const classInfo = yield classes_1.default.findByPk(schedule.id_class);
        return {
            hasClass: true,
            schedule: schedule,
            classInfo: classInfo,
            device: device,
            extractedDate: dateTime.toISOString().split('T')[0], // YYYY-MM-DD
            extractedTime: timeOnly // HH:MM:SS
        };
    }
    catch (error) {
        throw new Error(`Error al determinar la clase actual: ${error.message}`);
    }
});
// Función auxiliar para manejar múltiples asistencias (nuevo formato)
const handleMultipleAttendances = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_device, attendances } = req.body;
    // Validar que los campos requeridos estén presentes
    if (!id_device || !attendances || !Array.isArray(attendances)) {
        return res.status(400).json({
            created: [],
            marked_absent: [],
            errors: [{ student_id: 'N/A', error: "Campos requeridos: id_device, attendances (array)" }]
        });
    }
    if (attendances.length === 0) {
        return res.status(400).json({
            created: [],
            marked_absent: [],
            errors: [{ student_id: 'N/A', error: "El array de asistencias no puede estar vacío" }]
        });
    }
    // Verificar que el dispositivo existe
    const device = yield devices_1.default.findByPk(id_device);
    if (!device) {
        return res.status(404).json({
            created: [],
            marked_absent: [],
            errors: [{ student_id: 'N/A', error: `Dispositivo con ID ${id_device} no encontrado` }]
        });
    }
    // Usar el primer attendance_time para determinar la clase actual
    const firstAttendance = attendances[0];
    if (!firstAttendance.attendance_time) {
        return res.status(400).json({
            created: [],
            marked_absent: [],
            errors: [{ student_id: 'N/A', error: "Se requiere attendance_time para determinar la clase" }]
        });
    }
    const classCheck = yield getCurrentClassByDevice(id_device, firstAttendance.attendance_time);
    if (!classCheck.hasClass) {
        return res.status(400).json({
            created: [],
            marked_absent: [],
            errors: [{ student_id: 'N/A', error: classCheck.message }]
        });
    }
    const id_class = classCheck.schedule.id_class;
    const attendance_date = classCheck.extractedDate;
    // Obtener todos los estudiantes inscritos en la clase
    const enrolledStudents = yield enrollments_1.default.findAll({
        where: { id_class },
        include: [
            {
                model: users_1.default,
                where: { role: 'Student' },
                attributes: ['id_user', 'name', 'email']
            }
        ]
    });
    if (enrolledStudents.length === 0) {
        return res.status(404).json({
            created: [],
            marked_absent: [],
            errors: [{ student_id: 'N/A', error: "No hay estudiantes inscritos en esta clase" }]
        });
    }
    // Crear un mapa de estudiantes enviados en el JSON
    const attendanceMap = new Map();
    attendances.forEach((attendance, index) => {
        attendanceMap.set(attendance.id_student, Object.assign(Object.assign({}, attendance), { index }));
    });
    // Crear un Set de estudiantes inscritos para validación rápida
    const enrolledStudentIds = new Set(enrolledStudents.map(enrollment => enrollment.id_student));
    // Validar que todos los estudiantes del JSON estén inscritos en la clase
    const invalidStudents = [];
    for (let i = 0; i < attendances.length; i++) {
        const attendance = attendances[i];
        if (!enrolledStudentIds.has(attendance.id_student)) {
            // Verificar si el estudiante existe en el sistema
            const student = yield users_1.default.findOne({
                where: { id_user: attendance.id_student, role: 'Student' }
            });
            invalidStudents.push({
                student_id: attendance.id_student,
                error: student ?
                    `El estudiante ${student.name} no está inscrito en esta clase` :
                    'Estudiante no encontrado en el sistema'
            });
        }
    }
    const results = {
        created: [],
        marked_absent: [],
        errors: invalidStudents
    };
    console.log(`📱 Procesando ${enrolledStudents.length} estudiantes inscritos para dispositivo ${id_device}, clase ${id_class}`);
    // Procesar todos los estudiantes inscritos
    for (const enrollment of enrolledStudents) {
        const id_student = enrollment.id_student;
        const student = enrollment.User;
        let attendance_time;
        let attendance_date_final;
        let status = 'Present';
        let isFromJson = false;
        try {
            // Verificar si el estudiante está en el JSON enviado
            if (attendanceMap.has(id_student)) {
                const attendanceData = attendanceMap.get(id_student);
                // Extraer fecha y hora del attendance_time ISO
                const dateTime = new Date(attendanceData.attendance_time);
                attendance_date_final = dateTime.toISOString().split('T')[0]; // YYYY-MM-DD
                attendance_time = dateTime.toTimeString().split(' ')[0]; // HH:MM:SS
                isFromJson = true;
                status = 'Present'; // Los estudiantes detectados por el dispositivo se marcan como Present
                // Verificar que la fecha sea consistente
                if (attendance_date_final !== attendance_date) {
                    results.errors.push({
                        student_id: id_student,
                        error: `Fecha inconsistente: esperada ${attendance_date}, recibida ${attendance_date_final}`
                    });
                    continue;
                }
            }
            else {
                // Estudiante no está en el JSON - marcar como ausente
                attendance_date_final = attendance_date;
                attendance_time = classCheck.extractedTime;
                status = 'Absent';
            }
            // Buscar si ya existe un registro de asistencia para este estudiante en esta fecha y clase
            const existingAttendance = yield attendance_1.default.findOne({
                where: {
                    id_student,
                    id_class,
                    attendance_date: attendance_date_final,
                },
            });
            if (existingAttendance) {
                // Actualizar registro existente - Aplicar lógica de precedencia de estados
                const previousStatus = existingAttendance.status;
                let finalStatus = status;
                // Lógica de precedencia de estados:
                // 1. Una vez "Late", siempre "Late" (excepto si se va = "Absent")
                if (previousStatus === 'Late' && status === 'Present') {
                    finalStatus = 'Late'; // Mantener "Late" si ya estaba marcado como tal
                }
                // 2. Si estaba "Absent" y ahora es "Present", se marca como "Late" (llegó tarde)
                if (previousStatus === 'Absent' && status === 'Present') {
                    finalStatus = 'Late'; // Llegó tarde después de estar ausente
                }
                // 3. Si estaba "Present" o "Late" y ahora no está en el JSON, marcar como "Absent"
                if (!isFromJson && (previousStatus === 'Present' || previousStatus === 'Late')) {
                    finalStatus = 'Absent'; // Se fue de la clase
                }
                yield attendance_1.default.update({
                    attendance_time,
                    status: finalStatus
                }, {
                    where: { id_attendance: existingAttendance.id_attendance }
                });
                const updatedRecord = yield attendance_1.default.findByPk(existingAttendance.id_attendance, {
                    include: [{
                            model: users_1.default,
                            attributes: ['id_user', 'name', 'email']
                        }]
                });
                if (isFromJson) {
                    results.created.push({
                        student_id: id_student,
                        status: finalStatus
                    });
                }
                else {
                    results.marked_absent.push({
                        student_id: id_student,
                        status: finalStatus
                    });
                }
                // Log para debugging
                console.log(`Attendance updated - Student: ${id_student}, Previous: ${previousStatus}, Final: ${finalStatus}, FromJSON: ${isFromJson}`);
            }
            else {
                // Crear nuevo registro
                const newAttendance = yield attendance_1.default.create({
                    id_student,
                    id_class,
                    attendance_date: new Date(attendance_date_final),
                    attendance_time,
                    status,
                });
                if (isFromJson) {
                    results.created.push({
                        student_id: id_student,
                        status: status
                    });
                }
                else {
                    results.marked_absent.push({
                        student_id: id_student,
                        status: status
                    });
                }
                console.log(`Attendance created - Student: ${id_student}, Status: ${status}, FromJSON: ${isFromJson}`);
            }
        }
        catch (attendanceError) {
            results.errors.push({
                student_id: id_student,
                error: attendanceError.message
            });
        }
    }
    console.log(`✅ Procesamiento completado: ${results.created.length} creados/actualizados, ${results.marked_absent.length} ausentes, ${results.errors.length} errores`);
    res.status(200).json({
        created: results.created,
        marked_absent: results.marked_absent,
        errors: results.errors
    });
});
// Función auxiliar para manejar asistencia individual (formato anterior)
const handleSingleAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_student, id_class, status } = req.body;
    // Validar que los campos requeridos estén presentes
    if (!id_student || !id_class || !status) {
        return res.status(400).json({
            message: "Todos los campos son requeridos: id_student, id_class, status"
        });
    }
    // Validar que el estado es válido (excluyendo Justified ya que es manual)
    const validStatuses = ['Present', 'Late', 'Absent'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            message: "Estado inválido. Estados permitidos para dispositivos: Present, Late, Absent"
        });
    }
    // Validar que el estudiante existe y tiene rol de Student
    const student = yield users_1.default.findOne({
        where: { id_user: id_student, role: 'Student' }
    });
    if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
    }
    // Validar que la clase existe
    const classExists = yield classes_1.default.findByPk(id_class);
    if (!classExists) {
        return res.status(404).json({ message: "Clase no encontrada" });
    }
    // Obtener fecha y hora actual en GMT-6 (México)
    const now = new Date();
    const mexicoTime = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // GMT-6
    const currentDate = mexicoTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = mexicoTime.toTimeString().split(' ')[0]; // HH:MM:SS
    // Buscar si ya existe un registro de asistencia hoy para ese estudiante y esa clase
    const existingAttendance = yield attendance_1.default.findOne({
        where: {
            id_student,
            id_class,
            attendance_date: currentDate,
        },
    });
    let attendanceRecord;
    let actionTaken;
    if (!existingAttendance) {
        // No existe registro - Crear nuevo
        attendanceRecord = yield attendance_1.default.create({
            id_student,
            id_class,
            attendance_date: new Date(currentDate),
            attendance_time: currentTime,
            status,
        });
        actionTaken = "created";
    }
    else {
        // Ya existe registro - Aplicar lógica de precedencia de estados
        const previousStatus = existingAttendance.status;
        let finalStatus = status;
        // Lógica de precedencia de estados:
        // 1. Una vez "Late", siempre "Late" (excepto si se va = "Absent")
        if (previousStatus === 'Late' && status === 'Present') {
            finalStatus = 'Late'; // Mantener "Late" si ya estaba marcado como tal
        }
        // 2. Si estaba "Absent" y ahora es "Present", se marca como "Late" (llegó tarde)
        if (previousStatus === 'Absent' && status === 'Present') {
            finalStatus = 'Late'; // Llegó tarde después de estar ausente
        }
        yield attendance_1.default.update({
            status: finalStatus,
            attendance_time: currentTime, // Actualizar con la hora del nuevo sondeo
        }, {
            where: { id_attendance: existingAttendance.id_attendance }
        });
        // Obtener el registro actualizado
        attendanceRecord = yield attendance_1.default.findByPk(existingAttendance.id_attendance);
        actionTaken = "updated";
        // Log para debugging (opcional)
        console.log(`Attendance updated - Student: ${id_student}, Class: ${id_class}, Previous: ${previousStatus}, New: ${status}, Final: ${finalStatus}, Time: ${currentTime}`);
    }
    // Validar que el registro existe antes de continuar
    if (!attendanceRecord) {
        return res.status(500).json({ message: "Error al procesar el registro de asistencia" });
    }
    // Obtener el registro final con información completa
    const finalRecord = yield attendance_1.default.findByPk(attendanceRecord.id_attendance, {
        include: [
            {
                model: users_1.default,
                attributes: ['id_user', 'name', 'email']
            },
            {
                model: classes_1.default,
                attributes: ['id_class', 'name', 'class_code', 'group_name']
            }
        ]
    });
    res.status(200).json({
        message: `Asistencia ${actionTaken === 'created' ? 'registrada' : 'actualizada'} exitosamente por dispositivo`,
        action: actionTaken,
        attendance: finalRecord,
        device_scan_time: currentTime,
        scan_date: currentDate
    });
});
const attendanceController = {
    // Crear asistencia (Solo profesores pueden registrar asistencia)
    createAttendance: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const { id_student, id_class, attendance_date, attendance_time, status } = req.body;
            // Validar que los campos requeridos estén presentes
            if (!id_student || !id_class || !attendance_date || !attendance_time || !status) {
                return res.status(400).json({
                    message: "Todos los campos son requeridos: id_student, id_class, attendance_date, attendance_time, status"
                });
            }
            // Validar que el estudiante existe y tiene rol de Student
            const student = yield users_1.default.findOne({
                where: { id_user: id_student, role: 'Student' }
            });
            if (!student) {
                return res.status(404).json({ message: "Estudiante no encontrado" });
            }
            // Validar que la clase existe
            const classExists = yield classes_1.default.findByPk(id_class);
            if (!classExists) {
                return res.status(404).json({ message: "Clase no encontrada" });
            }
            // Verificar si hay clase programada en ese día y hora
            const scheduleCheck = yield verifyClassSchedule(id_class, attendance_date, attendance_time);
            if (!scheduleCheck.hasClass) {
                return res.status(400).json({
                    message: scheduleCheck.message
                });
            }
            // Verificar si ya existe una asistencia para el estudiante en la clase en la misma fecha
            const existingAttendance = yield attendance_1.default.findOne({
                where: {
                    id_student,
                    id_class,
                    attendance_date: attendance_date,
                },
            });
            if (existingAttendance) {
                return res.status(400).json({
                    message: "El estudiante ya tiene una asistencia registrada para esta fecha en esta clase. Use PATCH para actualizar el estado."
                });
            }
            // Crear la nueva asistencia
            const newAttendance = yield attendance_1.default.create({
                id_student,
                id_class,
                attendance_date: new Date(attendance_date),
                attendance_time,
                status,
            });
            // Obtener la asistencia creada con información de estudiante y clase
            const attendanceWithDetails = yield attendance_1.default.findByPk(newAttendance.id_attendance, {
                include: [
                    {
                        model: users_1.default,
                        attributes: ['id_user', 'name', 'email']
                    },
                    {
                        model: classes_1.default,
                        attributes: ['id_class', 'name', 'class_code']
                    }
                ]
            });
            res.status(201).json({
                message: "Asistencia registrada exitosamente",
                attendance: attendanceWithDetails,
                schedule_info: {
                    weekday: (_a = scheduleCheck.schedule) === null || _a === void 0 ? void 0 : _a.weekday,
                    class_time: `${(_b = scheduleCheck.schedule) === null || _b === void 0 ? void 0 : _b.start_time} - ${(_c = scheduleCheck.schedule) === null || _c === void 0 ? void 0 : _c.end_time}`
                }
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Obtener todas las asistencias
    getAllAttendances: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const attendances = yield attendance_1.default.findAll({
                include: [
                    {
                        model: users_1.default,
                        attributes: ['id_user', 'name', 'email'],
                        as: 'Users'
                    },
                    {
                        model: classes_1.default,
                        attributes: ['id_class', 'name', 'class_code', 'group_name'],
                        as: 'Classes'
                    }
                ],
                order: [['attendance_date', 'DESC'], ['attendance_time', 'DESC']]
            });
            res.status(200).json(attendances);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Obtener asistencia por ID
    getAttendance: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.body;
            if (!id) {
                return res.status(400).json({ message: "ID de asistencia es requerido" });
            }
            const attendance = yield attendance_1.default.findByPk(id, {
                include: [
                    {
                        model: users_1.default,
                        attributes: ['id_user', 'name', 'email']
                    },
                    {
                        model: classes_1.default,
                        attributes: ['id_class', 'name', 'class_code', 'group_name']
                    }
                ]
            });
            if (attendance) {
                res.status(200).json(attendance);
            }
            else {
                res.status(404).json({ message: "Asistencia no encontrada" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Actualizar asistencia (Solo profesores)
    updateAttendance: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { attendance_date, attendance_time, status } = req.body;
            // Validar que la asistencia existe
            const existingAttendance = yield attendance_1.default.findByPk(id);
            if (!existingAttendance) {
                return res.status(404).json({ message: "Asistencia no encontrada" });
            }
            // Actualizar solo los campos permitidos
            const updateData = {};
            if (attendance_date)
                updateData.attendance_date = new Date(attendance_date);
            if (attendance_time)
                updateData.attendance_time = attendance_time;
            if (status)
                updateData.status = status;
            const [updated] = yield attendance_1.default.update(updateData, {
                where: { id_attendance: id }
            });
            if (updated) {
                const updatedAttendance = yield attendance_1.default.findByPk(id, {
                    include: [
                        {
                            model: users_1.default,
                            attributes: ['id_user', 'name', 'email']
                        },
                        {
                            model: classes_1.default,
                            attributes: ['id_class', 'name', 'class_code']
                        }
                    ]
                });
                res.status(200).json({
                    message: "Asistencia actualizada exitosamente",
                    attendance: updatedAttendance
                });
            }
            else {
                res.status(404).json({ message: "No se pudo actualizar la asistencia" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Eliminar asistencia (Solo profesores)
    deleteAttendance: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const attendance = yield attendance_1.default.findByPk(id);
            if (!attendance) {
                return res.status(404).json({ message: "Asistencia no encontrada" });
            }
            const deleted = yield attendance_1.default.destroy({
                where: { id_attendance: id },
            });
            if (deleted) {
                res.status(200).json({ message: "Asistencia eliminada exitosamente" });
            }
            else {
                res.status(404).json({ message: "No se pudo eliminar la asistencia" });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Obtener asistencias por estudiante (Solo el mismo estudiante puede ver sus asistencias)
    getAttendancesByStudent: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Usuario no autenticado" });
            }
            const user = req.user;
            const { id_student } = req.body;
            // Verificar que el usuario autenticado es el mismo estudiante o es profesor/admin
            if (user.role === 'Student' && user.id !== id_student) {
                return res.status(403).json({
                    message: "Acceso denegado. Los estudiantes solo pueden ver sus propias asistencias."
                });
            }
            // Validar que el estudiante existe
            const student = yield users_1.default.findOne({
                where: { id_user: id_student, role: 'Student' }
            });
            if (!student) {
                return res.status(404).json({ message: "Estudiante no encontrado" });
            }
            // Obtener las asistencias del estudiante
            const attendances = yield attendance_1.default.findAll({
                where: { id_student: id_student },
                include: [
                    {
                        model: classes_1.default,
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
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Obtener asistencias por clase (Solo profesores de esa clase)
    getAttendancesByClass: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id_class } = req.body;
            if (!id_class) {
                return res.status(400).json({ message: "ID de clase es requerido" });
            }
            // Validar que la clase existe
            const classExists = yield classes_1.default.findByPk(id_class);
            if (!classExists) {
                return res.status(404).json({ message: "Clase no encontrada" });
            }
            // Obtener las asistencias de la clase
            const attendances = yield attendance_1.default.findAll({
                where: { id_class: id_class },
                include: [
                    {
                        model: users_1.default,
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
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Obtener asistencias por fecha
    getAttendancesByDate: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { date } = req.body;
            if (!date) {
                return res.status(400).json({ message: "Fecha es requerida" });
            }
            const attendances = yield attendance_1.default.findAll({
                where: { attendance_date: new Date(date) },
                include: [
                    {
                        model: users_1.default,
                        attributes: ['id_user', 'name', 'email']
                    },
                    {
                        model: classes_1.default,
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
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Obtener estadísticas de asistencia por estudiante
    getAttendanceStats: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id_student } = req.body;
            if (!id_student) {
                return res.status(400).json({ message: "ID de estudiante es requerido" });
            }
            // Validar que el estudiante existe
            const student = yield users_1.default.findOne({
                where: { id_user: id_student, role: 'Student' }
            });
            if (!student) {
                return res.status(404).json({ message: "Estudiante no encontrado" });
            }
            // Obtener estadísticas de asistencia
            const attendances = yield attendance_1.default.findAll({
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
                statistics: Object.assign(Object.assign({}, stats), { attendance_percentage: `${attendance_percentage}%` })
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Manejar status de asistencia desde dispositivo (sondeo automático)
    handleDeviceAttendanceStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Detectar formato del JSON de entrada
            const { id_device, attendances, id_student, id_class, status } = req.body;
            // Formato nuevo: con id_device y array de attendances
            if (id_device && attendances && Array.isArray(attendances)) {
                return yield handleMultipleAttendances(req, res);
            }
            // Formato anterior: campos individuales (mantener compatibilidad)
            if (id_student && id_class && status) {
                return yield handleSingleAttendance(req, res);
            }
            // Si no coincide con ningún formato
            return res.status(400).json({
                success: false,
                message: "Formato de JSON inválido. Usa formato nuevo: {id_device, attendances} o formato anterior: {id_student, id_class, status}"
            });
        }
        catch (error) {
            console.error('Error in handleDeviceAttendanceStatus:', error);
            res.status(500).json({
                success: false,
                message: "Error interno del servidor",
                error: error.message
            });
        }
    }),
    // Crear asistencias basándose en dispositivo (Solo profesores - Asistencia por dispositivo)
    createAttendanceByDevice: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id_device, attendances } = req.body;
            // Validar que los campos requeridos estén presentes
            if (!id_device || !attendances || !Array.isArray(attendances)) {
                return res.status(400).json({
                    message: "Campos requeridos: id_device, attendances (array)"
                });
            }
            if (attendances.length === 0) {
                return res.status(400).json({
                    message: "El array de asistencias no puede estar vacío"
                });
            }
            // Validar que todos los registros tengan los campos necesarios
            for (let i = 0; i < attendances.length; i++) {
                const attendance = attendances[i];
                if (!attendance.id_student || !attendance.attendance_time) {
                    return res.status(400).json({
                        message: `Registro ${i}: Campos requeridos: id_student, attendance_time`
                    });
                }
            }
            // Usar la primera asistencia para determinar la clase actual
            const firstAttendance = attendances[0];
            const classCheck = yield getCurrentClassByDevice(id_device, firstAttendance.attendance_time);
            if (!classCheck.hasClass) {
                return res.status(400).json({
                    message: classCheck.message
                });
            }
            const id_class = classCheck.schedule.id_class;
            const attendance_date = classCheck.extractedDate;
            // Obtener todos los estudiantes inscritos en la clase
            const enrolledStudents = yield enrollments_1.default.findAll({
                where: { id_class },
                include: [
                    {
                        model: users_1.default,
                        where: { role: 'Student' },
                        attributes: ['id_user', 'name', 'email']
                    }
                ]
            });
            if (enrolledStudents.length === 0) {
                return res.status(404).json({ message: "No hay estudiantes inscritos en esta clase" });
            }
            // Crear un mapa de estudiantes enviados en el JSON
            const attendanceMap = new Map();
            attendances.forEach((attendance, index) => {
                attendanceMap.set(attendance.id_student, Object.assign(Object.assign({}, attendance), { index }));
            });
            // Crear un Set de estudiantes inscritos para validación rápida
            const enrolledStudentIds = new Set(enrolledStudents.map(enrollment => enrollment.id_student));
            // Validar que todos los estudiantes del JSON estén inscritos en la clase
            const invalidStudents = [];
            for (let i = 0; i < attendances.length; i++) {
                const attendance = attendances[i];
                if (!enrolledStudentIds.has(attendance.id_student)) {
                    // Verificar si el estudiante existe en el sistema
                    const student = yield users_1.default.findOne({
                        where: { id_user: attendance.id_student, role: 'Student' }
                    });
                    invalidStudents.push({
                        index: i,
                        id_student: attendance.id_student,
                        student_name: student ? student.name : 'Estudiante no encontrado',
                        error: student ?
                            `El estudiante ${student.name} no está inscrito en esta clase` :
                            'Estudiante no encontrado en el sistema'
                    });
                }
            }
            // Si hay estudiantes inválidos, devolver error
            if (invalidStudents.length > 0) {
                return res.status(400).json({
                    errors: invalidStudents.map(student => ({
                        student_id: student.id_student,
                        error: student.error
                    }))
                });
            }
            const results = {
                created: [],
                marked_absent: [],
                errors: [],
                summary: {
                    total_enrolled: enrolledStudents.length,
                    sent_in_json: attendances.length,
                    marked_absent_count: 0,
                    successful: 0,
                    failed: 0
                }
            };
            // Procesar todos los estudiantes inscritos
            for (const enrollment of enrolledStudents) {
                const id_student = enrollment.id_student;
                const student = enrollment.User;
                let attendance_time;
                let attendance_date_final;
                let status = 'Present';
                let isFromJson = false;
                let jsonIndex = -1;
                try {
                    // Verificar si el estudiante está en el JSON enviado
                    if (attendanceMap.has(id_student)) {
                        const attendanceData = attendanceMap.get(id_student);
                        // Extraer fecha y hora del attendance_time ISO
                        const dateTime = new Date(attendanceData.attendance_time);
                        attendance_date_final = dateTime.toISOString().split('T')[0]; // YYYY-MM-DD
                        attendance_time = dateTime.toTimeString().split(' ')[0]; // HH:MM:SS
                        isFromJson = true;
                        jsonIndex = attendanceData.index;
                        // Verificar que la fecha sea consistente
                        if (attendance_date_final !== attendance_date) {
                            results.errors.push({
                                index: jsonIndex,
                                id_student,
                                student_name: student.name,
                                error: `Fecha inconsistente: esperada ${attendance_date}, recibida ${attendance_date_final}`
                            });
                            results.summary.failed++;
                            continue;
                        }
                    }
                    else {
                        // Estudiante no está en el JSON - marcar como ausente
                        attendance_date_final = attendance_date;
                        attendance_time = classCheck.extractedTime;
                        status = 'Absent';
                    }
                    // Verificar si ya existe una asistencia para este estudiante en esta fecha y clase
                    const existingAttendance = yield attendance_1.default.findOne({
                        where: {
                            id_student,
                            id_class,
                            attendance_date: attendance_date_final,
                        },
                    });
                    if (existingAttendance) {
                        // Ya existe una asistencia - no se puede crear otra
                        if (isFromJson) {
                            results.errors.push({
                                index: jsonIndex,
                                id_student,
                                student_name: student.name,
                                error: "Ya existe una asistencia para este estudiante en esta fecha. Use PATCH para actualizar."
                            });
                            results.summary.failed++;
                        }
                        else {
                            // Para estudiantes no en JSON, actualizar a ausente si no estaba ausente
                            if (existingAttendance.status !== 'Absent') {
                                yield attendance_1.default.update({
                                    attendance_time,
                                    status: 'Absent',
                                }, {
                                    where: { id_attendance: existingAttendance.id_attendance }
                                });
                                const updatedRecord = yield attendance_1.default.findByPk(existingAttendance.id_attendance, {
                                    include: [
                                        {
                                            model: users_1.default,
                                            attributes: ['id_user', 'name', 'email']
                                        }
                                    ]
                                });
                                results.marked_absent.push({
                                    attendance: updatedRecord,
                                    action: "updated_to_absent",
                                    reason: "Student not detected by device"
                                });
                                results.summary.marked_absent_count++;
                                results.summary.successful++;
                            }
                            else {
                                // Ya estaba ausente, no hacer nada
                                results.summary.successful++;
                            }
                        }
                        continue;
                    }
                    else {
                        // Crear nueva asistencia
                        const newAttendance = yield attendance_1.default.create({
                            id_student,
                            id_class,
                            attendance_date: new Date(attendance_date_final),
                            attendance_time,
                            status,
                        });
                        const newRecord = yield attendance_1.default.findByPk(newAttendance.id_attendance, {
                            include: [
                                {
                                    model: users_1.default,
                                    attributes: ['id_user', 'name', 'email']
                                }
                            ]
                        });
                        if (isFromJson) {
                            results.created.push({
                                index: jsonIndex,
                                attendance: newRecord,
                                action: "created"
                            });
                        }
                        else {
                            results.marked_absent.push({
                                attendance: newRecord,
                                action: "created_as_absent",
                                reason: "Student not detected by device"
                            });
                            results.summary.marked_absent_count++;
                        }
                    }
                    results.summary.successful++;
                }
                catch (attendanceError) {
                    results.errors.push({
                        index: isFromJson ? jsonIndex : -1,
                        id_student,
                        student_name: student.name,
                        error: attendanceError.message
                    });
                    results.summary.failed++;
                }
            }
            res.status(200).json({
                created: results.created.map(item => ({
                    student_id: item.attendance.id_student,
                    status: translateStatus(item.attendance.status)
                })),
                marked_absent: results.marked_absent.map(item => ({
                    student_id: item.attendance.id_student,
                    status: translateStatus("Absent")
                })),
                errors: results.errors.map(error => ({
                    student_id: error.id_student,
                    error: error.error
                }))
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Manejar llegada de un ping de asistencia
    handleAttendancePing: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id_device, attendances, data_time } = req.body;
            // Validar que los campos requeridos estén presentes
            if (!id_device || !attendances || !Array.isArray(attendances)) {
                return res.status(400).json({
                    message: "Campos requeridos: id_device, attendances (array)"
                });
            }
            // Permitir arrays vacíos para casos donde no se detectaron estudiantes
            // En este caso, todos los estudiantes inscritos se marcarán como ausentes
            if (attendances.length === 0) {
                console.log(`⚠️ Array de asistencias vacío para dispositivo ${id_device} - Todos los estudiantes se marcarán como ausentes`);
                console.log(`📋 Comportamiento: Se creará un ping de ausencia para cada estudiante inscrito en la clase activa`);
                // Si se proporciona data_time, usar ese timestamp para el contexto
                if (data_time) {
                    console.log(`🕐 Usando data_time proporcionado: ${data_time}`);
                }
            }
            // Verificar que el dispositivo existe
            const device = yield devices_1.default.findByPk(id_device);
            if (!device) {
                return res.status(404).json({
                    message: `Dispositivo con ID ${id_device} no encontrado`
                });
            }
            // Determinar la clase actual
            let classCheck;
            let id_class;
            let attendance_date;
            let referenceTime;
            if (data_time) {
                // Prioridad 1: Usar data_time si está disponible (más preciso)
                referenceTime = data_time;
                console.log(`🎯 Usando data_time para determinar clase: ${data_time}`);
                classCheck = yield getCurrentClassByDevice(id_device, data_time);
            }
            else if (attendances.length > 0) {
                // Prioridad 2: Usar el primer attendance_time para determinar la clase actual
                const firstAttendance = attendances[0];
                if (!firstAttendance.attendance_time) {
                    return res.status(400).json({
                        message: "Se requiere attendance_time o data_time para determinar la clase"
                    });
                }
                referenceTime = firstAttendance.attendance_time;
                console.log(`📋 Usando attendance_time del primer estudiante: ${referenceTime}`);
                classCheck = yield getCurrentClassByDevice(id_device, firstAttendance.attendance_time);
            }
            else {
                // Array vacío: usar la hora actual para determinar qué clase está activa
                const currentTime = new Date().toISOString();
                referenceTime = currentTime;
                console.log(`🕐 Array vacío - usando hora actual para determinar clase: ${currentTime}`);
                classCheck = yield getCurrentClassByDevice(id_device, currentTime);
            }
            if (!classCheck.hasClass) {
                return res.status(400).json({
                    message: classCheck.message
                });
            }
            id_class = classCheck.schedule.id_class;
            attendance_date = classCheck.extractedDate;
            // Obtener todos los estudiantes inscritos en la clase
            const enrolledStudents = yield enrollments_1.default.findAll({
                where: { id_class },
                include: [
                    {
                        model: users_1.default,
                        where: { role: 'Student' },
                        attributes: ['id_user', 'name', 'matricula']
                    }
                ]
            });
            if (enrolledStudents.length === 0) {
                return res.status(404).json({
                    message: "No hay estudiantes inscritos en esta clase"
                });
            }
            // Crear un Set de estudiantes inscritos para validación rápida
            const enrolledStudentIds = new Set(enrolledStudents.map(enrollment => enrollment.id_student));
            // Crear un mapa de estudiantes enviados en el JSON
            const attendanceMap = new Map();
            attendances.forEach((attendance, index) => {
                attendanceMap.set(attendance.id_student, Object.assign(Object.assign({}, attendance), { index }));
            });
            const results = {
                created: [],
                marked_absent: [],
                errors: []
            };
            console.log(`📱 Procesando ${enrolledStudents.length} estudiantes inscritos para dispositivo ${id_device}, clase ${id_class}`);
            if (attendances.length === 0) {
                console.log(`ARRAY VACÍO: Todos los ${enrolledStudents.length} estudiantes se marcarán como ausentes automáticamente`);
            }
            // Procesar todos los estudiantes inscritos en la clase
            for (const enrollment of enrolledStudents) {
                const id_student = enrollment.id_student;
                const student = enrollment.User;
                let isFromJson = false;
                let attendanceData = null;
                try {
                    // NUEVA VALIDACIÓN: Verificar si ya existe asistencia definitiva en la tabla Attendance
                    const existingAttendance = yield attendance_1.default.findOne({
                        where: {
                            id_student,
                            id_class,
                            attendance_date: attendance_date
                        }
                    });
                    // Si ya existe asistencia definitiva, no permitir más pings
                    if (existingAttendance) {
                        if (isFromJson) {
                            results.created.push({
                                student_id: id_student,
                                status: translateStatus(existingAttendance.status),
                                note: "Asistencia ya registrada definitivamente"
                            });
                        }
                        else {
                            results.marked_absent.push({
                                student_id: id_student,
                                status: translateStatus(existingAttendance.status),
                                note: "Asistencia ya registrada definitivamente"
                            });
                        }
                        continue; // Saltar al siguiente estudiante
                    }
                    // Verificar si el estudiante está en el JSON enviado
                    if (attendanceMap.has(id_student)) {
                        attendanceData = attendanceMap.get(id_student);
                        isFromJson = true;
                        // Buscar cuántos pings existen para este estudiante en esta clase y fecha
                        const existingPingsCount = yield attendancePings_1.default.count({
                            where: {
                                id_student,
                                id_class,
                                ping_time: {
                                    [sequelize_1.Op.between]: [
                                        new Date(attendance_date + ' 00:00:00'),
                                        new Date(attendance_date + ' 23:59:59')
                                    ]
                                }
                            }
                        });
                        // Si ya hay 3 pings, no insertar más pero marcar como creado
                        if (existingPingsCount >= 3) {
                            results.created.push({
                                student_id: id_student,
                                status: translateStatus("Present")
                            });
                            continue;
                        }
                        // Extraer fecha y hora del attendance_time ISO
                        const dateTime = new Date(attendanceData.attendance_time);
                        const ping_number = existingPingsCount + 1;
                        console.log(`💾 Guardando ping - Estudiante: ${id_student}, Clase: ${id_class}, Ping: ${ping_number}, Status: Present, Fecha/Hora: ${dateTime}`);
                        // Insertar nuevo ping
                        const newPing = yield attendancePings_1.default.create({
                            id_student,
                            id_class,
                            ping_time: dateTime,
                            status: 'Present',
                            ping_number
                        });
                        console.log(`✅ Ping guardado exitosamente - ping_time: ${newPing.ping_time}`);
                        results.created.push({
                            student_id: id_student,
                            status: translateStatus("Present")
                        });
                        // Si este es el tercer ping, consolidar automáticamente
                        if (ping_number === 3) {
                            const consolidationResult = yield attendanceController.consolidateAttendancePings(id_student, id_class, attendance_date);
                            if (!consolidationResult.success) {
                                console.error(`Error al consolidar asistencia para estudiante ${id_student}:`, consolidationResult.error);
                            }
                        }
                    }
                    else {
                        // Estudiante no está en el JSON - crear ping como ausente
                        // Buscar cuántos pings existen para este estudiante en esta clase y fecha
                        const existingPingsCount = yield attendancePings_1.default.count({
                            where: {
                                id_student,
                                id_class,
                                ping_time: {
                                    [sequelize_1.Op.between]: [
                                        new Date(attendance_date + ' 00:00:00'),
                                        new Date(attendance_date + ' 23:59:59')
                                    ]
                                }
                            }
                        });
                        // Si ya hay 3 pings, no insertar más pero marcar como ausente
                        if (existingPingsCount >= 3) {
                            results.marked_absent.push({
                                student_id: id_student,
                                status: translateStatus("Absent")
                            });
                            continue;
                        }
                        // Usar data_time, attendance_time del primer estudiante, o hora actual para el ping de ausente
                        const dateTime = data_time ?
                            new Date(data_time) :
                            (attendances.length > 0 ?
                                new Date(attendances[0].attendance_time) :
                                new Date()); // Fallback: usar hora actual
                        const ping_number = existingPingsCount + 1;
                        console.log(`🚫 Creando ping de ausencia - Estudiante: ${student.name}, Ping: ${ping_number}, Fecha/Hora: ${dateTime}, Fuente: ${data_time ? 'data_time' : (attendances.length > 0 ? 'attendance_time' : 'hora_actual')}`);
                        // Insertar nuevo ping como ausente
                        const newAbsentPing = yield attendancePings_1.default.create({
                            id_student,
                            id_class,
                            ping_time: dateTime,
                            status: 'Absent',
                            ping_number
                        });
                        results.marked_absent.push({
                            student_id: id_student,
                            status: translateStatus("Absent")
                        });
                        // Si este es el tercer ping, consolidar automáticamente
                        if (ping_number === 3) {
                            const consolidationResult = yield attendanceController.consolidateAttendancePings(id_student, id_class, attendance_date);
                            if (!consolidationResult.success) {
                                console.error(`Error al consolidar asistencia para estudiante ${id_student}:`, consolidationResult.error);
                            }
                        }
                    }
                }
                catch (pingError) {
                    results.errors.push({
                        student_id: id_student,
                        error: pingError.message
                    });
                }
            }
            // Validar estudiantes en JSON que no están inscritos
            for (let i = 0; i < attendances.length; i++) {
                const attendance = attendances[i];
                const id_student = attendance.id_student;
                if (!enrolledStudentIds.has(id_student)) {
                    const student = yield users_1.default.findOne({
                        where: { id_user: id_student, role: 'Student' }
                    });
                    results.errors.push({
                        student_id: id_student,
                        error: student ?
                            `El estudiante ${student.name} no está inscrito en esta clase` :
                            'Estudiante no encontrado en el sistema'
                    });
                }
            }
            // Al final de handleAttendancePing, justo antes del broadcast
            console.log(`✅ Procesamiento completado: ${results.created.length} creados, ${results.marked_absent.length} ausentes, ${results.errors.length} errores`);
            // Obtener la fecha de inicio y fin del día en formato local
            const startOfDay = new Date(attendance_date + 'T00:00:00');
            const endOfDay = new Date(attendance_date + 'T23:59:59');
            console.log(`🔍 Consultando pings para clase ${id_class} entre ${startOfDay.toISOString()} y ${endOfDay.toISOString()}`);
            const activePings = yield attendancePings_1.default.findAll({
                where: {
                    id_class,
                    ping_time: {
                        [sequelize_1.Op.between]: [startOfDay, endOfDay]
                    }
                },
                include: [
                    {
                        model: users_1.default,
                        attributes: ['id_user', 'name', 'matricula']
                    }
                ],
                order: [['ping_time', 'DESC']]
            });
            // Agrupar por estudiante y traducir status para el broadcast
            const groupedPings = activePings.reduce((acc, ping) => {
                const studentId = ping.id_student;
                if (!acc[studentId]) {
                    acc[studentId] = {
                        student: ping.User,
                        pings: [],
                        ping_count: 0
                    };
                }
                acc[studentId].pings.push({
                    ping_number: ping.ping_number,
                    ping_time: ping.ping_time,
                    status: translateStatus(ping.status) // Traducir status para WebSocket
                });
                acc[studentId].ping_count = acc[studentId].pings.length;
                return acc;
            }, {});
            console.log(`📡 Enviando por WebSocket - Clase: ${id_class}, Fecha: ${attendance_date}, Pings encontrados: ${activePings.length}`);
            if (activePings.length > 0) {
                console.log(`🕐 Rango de ping_time: ${activePings[activePings.length - 1].ping_time} a ${activePings[0].ping_time}`);
            }
            (0, index_1.broadcast)({
                type: 'active_pings_update',
                class_id: id_class,
                date: attendance_date,
                active_pings: Object.values(groupedPings),
                timestamp: new Date(),
                processing_results: {
                    created: results.created.length,
                    marked_absent: results.marked_absent.length,
                    errors: results.errors.length
                }
            });
            res.status(200).json({
                created: results.created,
                marked_absent: results.marked_absent,
                errors: results.errors,
                metadata: {
                    reference_time: referenceTime,
                    source: data_time ? 'data_time' : (attendances.length > 0 ? 'attendance_time' : 'current_time'),
                    class_id: id_class,
                    attendance_date: attendance_date
                }
            });
        }
        catch (error) {
            console.error('Error in handleAttendancePing:', error);
            res.status(500).json({
                message: "Error interno del servidor",
                error: error.message
            });
        }
    }),
    // Consolidar los 3 pings en un registro definitivo en Attendance
    consolidateAttendancePings: (id_student, id_class, attendance_date) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Buscar los pings del estudiante en esa clase y fecha
            const pings = yield attendancePings_1.default.findAll({
                where: {
                    id_student,
                    id_class,
                    ping_time: {
                        [sequelize_1.Op.between]: [
                            new Date(attendance_date + ' 00:00:00'),
                            new Date(attendance_date + ' 23:59:59')
                        ]
                    }
                },
                order: [['ping_number', 'ASC']]
            });
            if (pings.length === 0) {
                return { success: false, error: 'No se encontraron pings para consolidar' };
            }
            // Aplicar lógica de decisión para determinar el status final
            let final_status = 'Absent';
            // Contar cuántos pings son de cada tipo
            const presentPings = pings.filter(ping => ping.status === 'Present').length;
            const absentPings = pings.filter(ping => ping.status === 'Absent').length;
            // Lógica de decisión basada en los tipos de pings:
            if (presentPings >= 2) {
                // Si tiene 2 o más detecciones como "Present", es "Present"
                final_status = 'Present';
            }
            else if (presentPings >= 1) {
                // Si tiene 1 detección como "Present", es "Late"
                final_status = 'Late';
            }
            else {
                // Si no tiene ninguna detección como "Present", es "Absent"
                final_status = 'Absent';
            }
            // Usar el tiempo del primer ping como attendance_time
            const first_ping = pings[0];
            const attendance_time = first_ping.ping_time.toTimeString().split(' ')[0]; // HH:MM:SS
            // Verificar si ya existe un registro en Attendance para evitar duplicados
            const existingAttendance = yield attendance_1.default.findOne({
                where: {
                    id_student,
                    id_class,
                    attendance_date: attendance_date
                }
            });
            let attendanceRecord;
            if (existingAttendance) {
                // Actualizar registro existente
                yield attendance_1.default.update({
                    attendance_time,
                    status: final_status
                }, {
                    where: { id_attendance: existingAttendance.id_attendance }
                });
                attendanceRecord = yield attendance_1.default.findByPk(existingAttendance.id_attendance);
            }
            else {
                // Crear nuevo registro en Attendance
                attendanceRecord = yield attendance_1.default.create({
                    id_student,
                    id_class,
                    attendance_date: new Date(attendance_date),
                    attendance_time,
                    status: final_status
                });
            }
            // NO eliminar los pings aquí - dejar que el servicio de limpieza los elimine
            // 30 segundos después del tercer ping
            // Los pings se mantendrán para visualización temporal
            return {
                success: true,
                final_status,
                attendance_record: attendanceRecord,
                pings_processed: pings.length,
                note: "Pings se eliminarán automáticamente 30 segundos después del tercer ping"
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }),
    // Obtener pings activos para una clase
    getActivePings: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id_class, date } = req.body;
            if (!id_class) {
                return res.status(400).json({ message: "ID de clase es requerido" });
            }
            const search_date = date || new Date().toISOString().split('T')[0];
            const pings = yield attendancePings_1.default.findAll({
                where: {
                    id_class,
                    ping_time: {
                        [sequelize_1.Op.between]: [
                            new Date(search_date + ' 00:00:00'),
                            new Date(search_date + ' 23:59:59')
                        ]
                    }
                },
                include: [
                    {
                        model: users_1.default,
                        attributes: ['id_user', 'name', 'matricula']
                    }
                ],
                order: [['ping_time', 'DESC']]
            });
            // Agrupar por estudiante y traducir status
            const groupedPings = pings.reduce((acc, ping) => {
                const studentId = ping.id_student;
                if (!acc[studentId]) {
                    acc[studentId] = {
                        student: ping.User,
                        pings: [],
                        ping_count: 0
                    };
                }
                acc[studentId].pings.push({
                    ping_number: ping.ping_number,
                    ping_time: ping.ping_time,
                    status: translateStatus(ping.status) // Traducir status para consistencia
                });
                acc[studentId].ping_count = acc[studentId].pings.length;
                return acc;
            }, {});
            res.status(200).json({
                class_id: id_class,
                date: search_date,
                active_pings: Object.values(groupedPings)
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Limpiar pings expirados manualmente
    cleanupExpiredPings: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { attendancePingsCleanup } = yield Promise.resolve().then(() => __importStar(require('../services/attendancePingsCleanup')));
            const result = yield attendancePingsCleanup.manualCleanup();
            res.status(200).json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Obtener estadísticas de pings
    getPingsStatistics: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { attendancePingsCleanup } = yield Promise.resolve().then(() => __importStar(require('../services/attendancePingsCleanup')));
            const stats = yield attendancePingsCleanup.getPingsStats();
            res.status(200).json({
                message: "Estadísticas de pings",
                statistics: stats
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
    // Limpiar todos los pings (solo para testing)
    cleanupAllPings: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { attendancePingsCleanup } = yield Promise.resolve().then(() => __importStar(require('../services/attendancePingsCleanup')));
            const result = yield attendancePingsCleanup.cleanupAllPings();
            res.status(200).json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }),
};
exports.default = attendanceController;
