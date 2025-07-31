import { Request, Response } from "express";
import { InferAttributes, InferCreationAttributes } from "sequelize";
import AttendanceModel from "../models/attendance";
import AttendancePingsModel from "../models/attendancePings";
import ClassesModel from "../models/classes";
import UsersModel from "../models/users";
import EnrollmentsModel from "../models/enrollments";
import SchedulesModel from "../models/schedules";
import DevicesModel from "../models/devices";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { broadcast } from "../index"; // Importar la función broadcast

// Import associations to establish relationships
import "../models/associations";

type AttendanceCreationAttributes = InferCreationAttributes<AttendanceModel>;

// Función helper para traducir status de inglés a español
const translateStatus = (status: string): string => {
  const statusTranslations: { [key: string]: string } = {
    'Present': 'Presente',
    'Absent': 'Ausente',
    'Late': 'Tarde',
    'Justified': 'Justificado'
  };
  return statusTranslations[status] || status;
};

// Función helper para verificar si hay clase en ese día y hora
const verifyClassSchedule = async (id_class: number, attendance_date: string, attendance_time: string) => {
  try {
    // Obtener el día de la semana de la fecha
    const date = new Date(attendance_date);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdays[date.getDay()];

    // Buscar si hay un horario para esta clase en este día
    const schedule = await SchedulesModel.findOne({
      where: {
        id_class,
        weekday: weekday as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
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
  } catch (error) {
    throw new Error(`Error al verificar horario de clase: ${(error as Error).message}`);
  }
};

// Función helper para convertir tiempo a minutos
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Función helper para determinar la clase actual basándose en el dispositivo y la hora
const getCurrentClassByDevice = async (id_device: string, attendance_time: string) => {
  try {
    // Verificar que el dispositivo existe
    const device = await DevicesModel.findOne({
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
    const schedule = await SchedulesModel.findOne({
      where: {
        id_device,
        weekday: weekday as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
      },
      include: [
        {
          model: ClassesModel,
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
    const classInfo = await ClassesModel.findByPk(schedule.id_class);

    return {
      hasClass: true,
      schedule: schedule,
      classInfo: classInfo,
      device: device,
      extractedDate: dateTime.toISOString().split('T')[0], // YYYY-MM-DD
      extractedTime: timeOnly // HH:MM:SS
    };
  } catch (error) {
    throw new Error(`Error al determinar la clase actual: ${(error as Error).message}`);
  }
};

// Función auxiliar para manejar múltiples asistencias (nuevo formato)
const handleMultipleAttendances = async (req: Request, res: Response) => {
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
  const device = await DevicesModel.findByPk(id_device);
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

  const classCheck = await getCurrentClassByDevice(id_device, firstAttendance.attendance_time);
  
  if (!classCheck.hasClass) {
    return res.status(400).json({ 
      created: [],
      marked_absent: [],
      errors: [{ student_id: 'N/A', error: classCheck.message }]
    });
  }

  const id_class = classCheck.schedule!.id_class;
  const attendance_date = classCheck.extractedDate!;

  // Obtener todos los estudiantes inscritos en la clase
  const enrolledStudents = await EnrollmentsModel.findAll({
    where: { id_class },
    include: [
      {
        model: UsersModel,
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
  attendances.forEach((attendance: any, index: number) => {
    attendanceMap.set(attendance.id_student, { ...attendance, index });
  });

  // Crear un Set de estudiantes inscritos para validación rápida
  const enrolledStudentIds = new Set(enrolledStudents.map(enrollment => enrollment.id_student));

  // Validar que todos los estudiantes del JSON estén inscritos en la clase
  const invalidStudents: any[] = [];
  for (let i = 0; i < attendances.length; i++) {
    const attendance = attendances[i];
    if (!enrolledStudentIds.has(attendance.id_student)) {
      // Verificar si el estudiante existe en el sistema
      const student = await UsersModel.findOne({
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

  const results: {
    created: any[];
    marked_absent: any[];
    errors: any[];
  } = {
    created: [],
    marked_absent: [],
    errors: invalidStudents
  };

  console.log(`📱 Procesando ${enrolledStudents.length} estudiantes inscritos para dispositivo ${id_device}, clase ${id_class}`);

  // Procesar todos los estudiantes inscritos
  for (const enrollment of enrolledStudents) {
    const id_student = enrollment.id_student;
    const student = (enrollment as any).User;
    
    let attendance_time: string;
    let attendance_date_final: string;
    let status: 'Present' | 'Absent' | 'Late' | 'Justified' = 'Present';
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
      } else {
        // Estudiante no está en el JSON - marcar como ausente
        attendance_date_final = attendance_date;
        attendance_time = classCheck.extractedTime!;
        status = 'Absent';
      }

      // Buscar si ya existe un registro de asistencia para este estudiante en esta fecha y clase
      const existingAttendance = await AttendanceModel.findOne({
        where: {
          id_student,
          id_class,
          attendance_date: attendance_date_final,
        },
      });

      if (existingAttendance) {
        // Actualizar registro existente - Aplicar lógica de precedencia de estados
        const previousStatus = existingAttendance.status;
        let finalStatus: 'Present' | 'Absent' | 'Late' | 'Justified' = status;

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

        await AttendanceModel.update({
          attendance_time,
          status: finalStatus
        }, { 
          where: { id_attendance: existingAttendance.id_attendance } 
        });

        const updatedRecord = await AttendanceModel.findByPk(existingAttendance.id_attendance, {
          include: [{
            model: UsersModel,
            attributes: ['id_user', 'name', 'email']
          }]
        });

        if (isFromJson) {
          results.created.push({
            student_id: id_student,
            status: finalStatus
          });
        } else {
          results.marked_absent.push({
            student_id: id_student,
            status: finalStatus
          });
        }

        // Log para debugging
        console.log(`Attendance updated - Student: ${id_student}, Previous: ${previousStatus}, Final: ${finalStatus}, FromJSON: ${isFromJson}`);
      } else {
        // Crear nuevo registro
        const newAttendance = await AttendanceModel.create({
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
        } else {
          results.marked_absent.push({
            student_id: id_student,
            status: status
          });
        }

        console.log(`Attendance created - Student: ${id_student}, Status: ${status}, FromJSON: ${isFromJson}`);
      }

    } catch (attendanceError) {
      results.errors.push({
        student_id: id_student,
        error: (attendanceError as Error).message
      });
    }
  }

  console.log(`✅ Procesamiento completado: ${results.created.length} creados/actualizados, ${results.marked_absent.length} ausentes, ${results.errors.length} errores`);

  res.status(200).json({
    created: results.created,
    marked_absent: results.marked_absent,
    errors: results.errors
  });
};

// Función auxiliar para manejar asistencia individual (formato anterior)
const handleSingleAttendance = async (req: Request, res: Response) => {
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
  const student = await UsersModel.findOne({
    where: { id_user: id_student, role: 'Student' }
  });
  if (!student) {
    return res.status(404).json({ message: "Estudiante no encontrado" });
  }

  // Validar que la clase existe
  const classExists = await ClassesModel.findByPk(id_class);
  if (!classExists) {
    return res.status(404).json({ message: "Clase no encontrada" });
  }

  // Obtener fecha y hora actual en GMT-6 (México)
  const now = new Date();
  const mexicoTime = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // GMT-6
  const currentDate = mexicoTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = mexicoTime.toTimeString().split(' ')[0]; // HH:MM:SS

  // Buscar si ya existe un registro de asistencia hoy para ese estudiante y esa clase
  const existingAttendance = await AttendanceModel.findOne({
    where: {
      id_student,
      id_class,
      attendance_date: currentDate,
    },
  });

  let attendanceRecord;
  let actionTaken: string;

  if (!existingAttendance) {
    // No existe registro - Crear nuevo
    attendanceRecord = await AttendanceModel.create({
      id_student,
      id_class,
      attendance_date: new Date(currentDate),
      attendance_time: currentTime,
      status,
    });

    actionTaken = "created";
  } else {
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
    
    await AttendanceModel.update({
      status: finalStatus,
      attendance_time: currentTime, // Actualizar con la hora del nuevo sondeo
    }, { 
      where: { id_attendance: existingAttendance.id_attendance } 
    });

    // Obtener el registro actualizado
    attendanceRecord = await AttendanceModel.findByPk(existingAttendance.id_attendance);
    
    actionTaken = "updated";
    
    // Log para debugging (opcional)
    console.log(`Attendance updated - Student: ${id_student}, Class: ${id_class}, Previous: ${previousStatus}, New: ${status}, Final: ${finalStatus}, Time: ${currentTime}`);
  }

  // Validar que el registro existe antes de continuar
  if (!attendanceRecord) {
    return res.status(500).json({ message: "Error al procesar el registro de asistencia" });
  }

  // Obtener el registro final con información completa
  const finalRecord = await AttendanceModel.findByPk(attendanceRecord.id_attendance, {
    include: [
      {
        model: UsersModel,
        attributes: ['id_user', 'name', 'email']
      },
      {
        model: ClassesModel,
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
};

const attendanceController = {
  // Crear asistencia (Solo profesores pueden registrar asistencia)
  createAttendance: async (req: Request, res: Response) => {
    try {
      const { id_student, id_class, attendance_date, attendance_time, status } = req.body;

      // Validar que los campos requeridos estén presentes
      if (!id_student || !id_class || !attendance_date || !attendance_time || !status) {
        return res.status(400).json({ 
          message: "Todos los campos son requeridos: id_student, id_class, attendance_date, attendance_time, status" 
        });
      }

      // Validar que el estudiante existe y tiene rol de Student
      const student = await UsersModel.findOne({
        where: { id_user: id_student, role: 'Student' }
      });
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }

      // Validar que la clase existe
      const classExists = await ClassesModel.findByPk(id_class);
      if (!classExists) {
        return res.status(404).json({ message: "Clase no encontrada" });
      }

      // Verificar si hay clase programada en ese día y hora
      const scheduleCheck = await verifyClassSchedule(id_class, attendance_date, attendance_time);
      if (!scheduleCheck.hasClass) {
        return res.status(400).json({ 
          message: scheduleCheck.message 
        });
      }

      // Verificar si ya existe una asistencia para el estudiante en la clase en la misma fecha
      const existingAttendance = await AttendanceModel.findOne({
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
      const newAttendance = await AttendanceModel.create({
        id_student,
        id_class,
        attendance_date: new Date(attendance_date),
        attendance_time,
        status,
      } as AttendanceCreationAttributes);

      // Obtener la asistencia creada con información de estudiante y clase
      const attendanceWithDetails = await AttendanceModel.findByPk(newAttendance.id_attendance, {
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'email']
          },
          {
            model: ClassesModel,
            attributes: ['id_class', 'name', 'class_code']
          }
        ]
      });

      res.status(201).json({
        message: "Asistencia registrada exitosamente",
        attendance: attendanceWithDetails,
        schedule_info: {
          weekday: scheduleCheck.schedule?.weekday,
          class_time: `${scheduleCheck.schedule?.start_time} - ${scheduleCheck.schedule?.end_time}`
        }
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener todas las asistencias
  getAllAttendances: async (req: Request, res: Response) => {
    try {
      const attendances = await AttendanceModel.findAll({
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'email'],
            as: 'Users'
          },
          {
            model: ClassesModel,
            attributes: ['id_class', 'name', 'class_code', 'group_name'],
            as: 'Classes'
          }
        ],
        order: [['attendance_date', 'DESC'], ['attendance_time', 'DESC']]
      });

      res.status(200).json(attendances);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener asistencia por ID
  getAttendance: async (req: Request, res: Response) => {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ message: "ID de asistencia es requerido" });
      }

      const attendance = await AttendanceModel.findByPk(id, {
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'email']
          },
          {
            model: ClassesModel,
            attributes: ['id_class', 'name', 'class_code', 'group_name']
          }
        ]
      });

      if (attendance) {
        res.status(200).json(attendance);
      } else {
        res.status(404).json({ message: "Asistencia no encontrada" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Actualizar asistencia (Solo profesores)
  updateAttendance: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { attendance_date, attendance_time, status } = req.body;

      // Validar que la asistencia existe
      const existingAttendance = await AttendanceModel.findByPk(id);
      if (!existingAttendance) {
        return res.status(404).json({ message: "Asistencia no encontrada" });
      }

      // Actualizar solo los campos permitidos
      const updateData: any = {};
      if (attendance_date) updateData.attendance_date = new Date(attendance_date);
      if (attendance_time) updateData.attendance_time = attendance_time;
      if (status) updateData.status = status;

      const [updated] = await AttendanceModel.update(updateData, { 
        where: { id_attendance: id } 
      });

      if (updated) {
        const updatedAttendance = await AttendanceModel.findByPk(id, {
          include: [
            {
              model: UsersModel,
              attributes: ['id_user', 'name', 'email']
            },
            {
              model: ClassesModel,
              attributes: ['id_class', 'name', 'class_code']
            }
          ]
        });
        res.status(200).json({
          message: "Asistencia actualizada exitosamente",
          attendance: updatedAttendance
        });
      } else {
        res.status(404).json({ message: "No se pudo actualizar la asistencia" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Eliminar asistencia (Solo profesores)
  deleteAttendance: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const attendance = await AttendanceModel.findByPk(id);
      if (!attendance) {
        return res.status(404).json({ message: "Asistencia no encontrada" });
      }

      const deleted = await AttendanceModel.destroy({
        where: { id_attendance: id },
      });

      if (deleted) {
        res.status(200).json({ message: "Asistencia eliminada exitosamente" });
      } else {
        res.status(404).json({ message: "No se pudo eliminar la asistencia" });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener asistencias por estudiante (Solo el mismo estudiante puede ver sus asistencias)
  getAttendancesByStudent: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const user = req.user as { id: number; role: string };
      const { id_student } = req.body;

      // Verificar que el usuario autenticado es el mismo estudiante o es profesor/admin
      if (user.role === 'Student' && user.id !== id_student) {
        return res.status(403).json({ 
          message: "Acceso denegado. Los estudiantes solo pueden ver sus propias asistencias." 
        });
      }

      // Validar que el estudiante existe
      const student = await UsersModel.findOne({
        where: { id_user: id_student, role: 'Student' }
      });
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }

      // Obtener las asistencias del estudiante
      const attendances = await AttendanceModel.findAll({
        where: { id_student: id_student },
        include: [
          {
            model: ClassesModel,
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
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener asistencias por clase (Solo profesores de esa clase)
  getAttendancesByClass: async (req: Request, res: Response) => {
    try {
      const { id_class } = req.body;

      if (!id_class) {
        return res.status(400).json({ message: "ID de clase es requerido" });
      }

      // Validar que la clase existe
      const classExists = await ClassesModel.findByPk(id_class);
      if (!classExists) {
        return res.status(404).json({ message: "Clase no encontrada" });
      }

      // Obtener las asistencias de la clase
      const attendances = await AttendanceModel.findAll({
        where: { id_class: id_class },
        include: [
          {
            model: UsersModel,
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
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener asistencias por fecha
  getAttendancesByDate: async (req: Request, res: Response) => {
    try {
      const { date } = req.body;

      if (!date) {
        return res.status(400).json({ message: "Fecha es requerida" });
      }

      const attendances = await AttendanceModel.findAll({
        where: { attendance_date: new Date(date) },
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'email']
          },
          {
            model: ClassesModel,
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
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener estadísticas de asistencia por estudiante
  getAttendanceStats: async (req: Request, res: Response) => {
    try {
      const { id_student } = req.body;

      if (!id_student) {
        return res.status(400).json({ message: "ID de estudiante es requerido" });
      }

      // Validar que el estudiante existe
      const student = await UsersModel.findOne({
        where: { id_user: id_student, role: 'Student' }
      });
      if (!student) {
        return res.status(404).json({ message: "Estudiante no encontrado" });
      }

      // Obtener estadísticas de asistencia
      const attendances = await AttendanceModel.findAll({
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
        statistics: {
          ...stats,
          attendance_percentage: `${attendance_percentage}%`
        }
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Manejar status de asistencia desde dispositivo (sondeo automático)
  handleDeviceAttendanceStatus: async (req: Request, res: Response) => {
    try {
      // Detectar formato del JSON de entrada
      const { id_device, attendances, id_student, id_class, status } = req.body;

      // Formato nuevo: con id_device y array de attendances
      if (id_device && attendances && Array.isArray(attendances)) {
        return await handleMultipleAttendances(req, res);
      }
      
      // Formato anterior: campos individuales (mantener compatibilidad)
      if (id_student && id_class && status) {
        return await handleSingleAttendance(req, res);
      }

      // Si no coincide con ningún formato
      return res.status(400).json({ 
        success: false,
        message: "Formato de JSON inválido. Usa formato nuevo: {id_device, attendances} o formato anterior: {id_student, id_class, status}" 
      });

    } catch (error) {
      console.error('Error in handleDeviceAttendanceStatus:', error);
      res.status(500).json({ 
        success: false,
        message: "Error interno del servidor",
        error: (error as Error).message 
      });
    }
  },

  // Crear asistencias basándose en dispositivo (Solo profesores - Asistencia por dispositivo)
  createAttendanceByDevice: async (req: Request, res: Response) => {
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
      const classCheck = await getCurrentClassByDevice(id_device, firstAttendance.attendance_time);
      
      if (!classCheck.hasClass) {
        return res.status(400).json({ 
          message: classCheck.message 
        });
      }

      const id_class = classCheck.schedule!.id_class;
      const attendance_date = classCheck.extractedDate!;

      // Obtener todos los estudiantes inscritos en la clase
      const enrolledStudents = await EnrollmentsModel.findAll({
        where: { id_class },
        include: [
          {
            model: UsersModel,
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
      attendances.forEach((attendance: any, index: number) => {
        attendanceMap.set(attendance.id_student, { ...attendance, index });
      });

      // Crear un Set de estudiantes inscritos para validación rápida
      const enrolledStudentIds = new Set(enrolledStudents.map(enrollment => enrollment.id_student));

      // Validar que todos los estudiantes del JSON estén inscritos en la clase
      const invalidStudents: any[] = [];
      for (let i = 0; i < attendances.length; i++) {
        const attendance = attendances[i];
        if (!enrolledStudentIds.has(attendance.id_student)) {
          // Verificar si el estudiante existe en el sistema
          const student = await UsersModel.findOne({
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

      const results: {
        created: any[];
        marked_absent: any[];
        errors: any[];
        summary: {
          total_enrolled: number;
          sent_in_json: number;
          marked_absent_count: number;
          successful: number;
          failed: number;
        };
      } = {
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
        const student = (enrollment as any).User;
        
        let attendance_time: string;
        let attendance_date_final: string;
        let status: 'Present' | 'Late' | 'Absent' | 'Justified' = 'Present';
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
          } else {
            // Estudiante no está en el JSON - marcar como ausente
            attendance_date_final = attendance_date;
            attendance_time = classCheck.extractedTime!;
            status = 'Absent';
          }

          // Verificar si ya existe una asistencia para este estudiante en esta fecha y clase
          const existingAttendance = await AttendanceModel.findOne({
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
            } else {
              // Para estudiantes no en JSON, actualizar a ausente si no estaba ausente
              if (existingAttendance.status !== 'Absent') {
                await AttendanceModel.update({
                  attendance_time,
                  status: 'Absent',
                }, { 
                  where: { id_attendance: existingAttendance.id_attendance } 
                });

                const updatedRecord = await AttendanceModel.findByPk(existingAttendance.id_attendance, {
                  include: [
                    {
                      model: UsersModel,
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
              } else {
                // Ya estaba ausente, no hacer nada
                results.summary.successful++;
              }
            }
            continue;
          } else {
            // Crear nueva asistencia
            const newAttendance = await AttendanceModel.create({
              id_student,
              id_class,
              attendance_date: new Date(attendance_date_final),
              attendance_time,
              status,
            });

            const newRecord = await AttendanceModel.findByPk(newAttendance.id_attendance, {
              include: [
                {
                  model: UsersModel,
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
            } else {
              results.marked_absent.push({
                attendance: newRecord,
                action: "created_as_absent",
                reason: "Student not detected by device"
              });
              results.summary.marked_absent_count++;
            }
          }

          results.summary.successful++;

        } catch (attendanceError) {
          results.errors.push({
            index: isFromJson ? jsonIndex : -1,
            id_student,
            student_name: student.name,
            error: (attendanceError as Error).message
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

    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Manejar llegada de un ping de asistencia
  handleAttendancePing: async (req: Request, res: Response) => {
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

      // Verificar que el dispositivo existe
      const device = await DevicesModel.findByPk(id_device);
      if (!device) {
        return res.status(404).json({ 
          message: `Dispositivo con ID ${id_device} no encontrado` 
        });
      }

      // Usar el primer attendance_time para determinar la clase actual
      const firstAttendance = attendances[0];
      if (!firstAttendance.attendance_time) {
        return res.status(400).json({
          message: "Se requiere attendance_time para determinar la clase"
        });
      }

      const classCheck = await getCurrentClassByDevice(id_device, firstAttendance.attendance_time);
      
      if (!classCheck.hasClass) {
        return res.status(400).json({ 
          message: classCheck.message 
        });
      }

      const id_class = classCheck.schedule!.id_class;
      const attendance_date = classCheck.extractedDate!;

      // Obtener todos los estudiantes inscritos en la clase
      const enrolledStudents = await EnrollmentsModel.findAll({
        where: { id_class },
        include: [
          {
            model: UsersModel,
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
      attendances.forEach((attendance: any, index: number) => {
        attendanceMap.set(attendance.id_student, { ...attendance, index });
      });

      const results = {
        created: [] as any[],
        marked_absent: [] as any[],
        errors: [] as any[]
      };

      console.log(`📱 Procesando ${enrolledStudents.length} estudiantes inscritos para dispositivo ${id_device}, clase ${id_class}`);

      // Procesar todos los estudiantes inscritos en la clase
      for (const enrollment of enrolledStudents) {
        const id_student = enrollment.id_student;
        const student = (enrollment as any).User;
        
        let isFromJson = false;
        let attendanceData = null;

        try {
          // NUEVA VALIDACIÓN: Verificar si ya existe asistencia definitiva en la tabla Attendance
          const existingAttendance = await AttendanceModel.findOne({
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
            } else {
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
            const existingPingsCount = await AttendancePingsModel.count({
              where: {
                id_student,
                id_class,
                ping_time: {
                  [Op.between]: [
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

            // Insertar nuevo ping
            const newPing = await AttendancePingsModel.create({
              id_student,
              id_class,
              ping_time: dateTime,
              status: 'Present',
              ping_number
            });

            results.created.push({
              student_id: id_student,
              status: translateStatus("Present")
            });

            // Si este es el tercer ping, consolidar automáticamente
            if (ping_number === 3) {
              const consolidationResult = await attendanceController.consolidateAttendancePings(id_student, id_class, attendance_date);
              if (!consolidationResult.success) {
                console.error(`Error al consolidar asistencia para estudiante ${id_student}:`, consolidationResult.error);
              }
            }

          } else {
            // Estudiante no está en el JSON - crear ping como ausente
            
            // Buscar cuántos pings existen para este estudiante en esta clase y fecha
            const existingPingsCount = await AttendancePingsModel.count({
              where: {
                id_student,
                id_class,
                ping_time: {
                  [Op.between]: [
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

            // Usar la hora del primer estudiante detectado o hora actual para el ping de ausente
            const firstAttendance = attendances[0];
            const dateTime = firstAttendance ? new Date(firstAttendance.attendance_time) : new Date();
            const ping_number = existingPingsCount + 1;

            // Insertar nuevo ping como ausente
            const newAbsentPing = await AttendancePingsModel.create({
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
              const consolidationResult = await attendanceController.consolidateAttendancePings(id_student, id_class, attendance_date);
              if (!consolidationResult.success) {
                console.error(`Error al consolidar asistencia para estudiante ${id_student}:`, consolidationResult.error);
              }
            }
          }

        } catch (pingError) {
          results.errors.push({
            student_id: id_student,
            error: (pingError as Error).message
          });
        }
      }

      // Validar estudiantes en JSON que no están inscritos
      for (let i = 0; i < attendances.length; i++) {
        const attendance = attendances[i];
        const id_student = attendance.id_student;
        
        if (!enrolledStudentIds.has(id_student)) {
          const student = await UsersModel.findOne({
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
      
      const activePings = await AttendancePingsModel.findAll({
        where: {
          id_class,
          ping_time: {
            [Op.between]: [
              new Date(attendance_date + ' 00:00:00'),
              new Date(attendance_date + ' 23:59:59')
            ]
          }
        },
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'matricula']
          }
        ],
        order: [['ping_time', 'DESC']]
      });
      
      // Agrupar por estudiante y traducir status para el broadcast
      const groupedPings = activePings.reduce((acc: any, ping: any) => {
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
      
      broadcast({
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
        errors: results.errors
      });

    } catch (error) {
      console.error('Error in handleAttendancePing:', error);
      res.status(500).json({ 
        message: "Error interno del servidor",
        error: (error as Error).message 
      });
    }
  },

  // Consolidar los 3 pings en un registro definitivo en Attendance
  consolidateAttendancePings: async (id_student: number, id_class: number, attendance_date: string) => {
    try {
      // Buscar los pings del estudiante en esa clase y fecha
      const pings = await AttendancePingsModel.findAll({
        where: {
          id_student,
          id_class,
          ping_time: {
            [Op.between]: [
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
      let final_status: 'Present' | 'Late' | 'Absent' = 'Absent';
      
      // Contar cuántos pings son de cada tipo
      const presentPings = pings.filter(ping => ping.status === 'Present').length;
      const absentPings = pings.filter(ping => ping.status === 'Absent').length;
      
      // Lógica de decisión basada en los tipos de pings:
      if (presentPings >= 2) {
        // Si tiene 2 o más detecciones como "Present", es "Present"
        final_status = 'Present';
      } else if (presentPings >= 1) {
        // Si tiene 1 detección como "Present", es "Late"
        final_status = 'Late';
      } else {
        // Si no tiene ninguna detección como "Present", es "Absent"
        final_status = 'Absent';
      }

      // Usar el tiempo del primer ping como attendance_time
      const first_ping = pings[0];
      const attendance_time = first_ping.ping_time.toTimeString().split(' ')[0]; // HH:MM:SS

      // Verificar si ya existe un registro en Attendance para evitar duplicados
      const existingAttendance = await AttendanceModel.findOne({
        where: {
          id_student,
          id_class,
          attendance_date: attendance_date
        }
      });

      let attendanceRecord;

      if (existingAttendance) {
        // Actualizar registro existente
        await AttendanceModel.update({
          attendance_time,
          status: final_status
        }, { 
          where: { id_attendance: existingAttendance.id_attendance } 
        });

        attendanceRecord = await AttendanceModel.findByPk(existingAttendance.id_attendance);
      } else {
        // Crear nuevo registro en Attendance
        attendanceRecord = await AttendanceModel.create({
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

    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  },

  // Obtener pings activos para una clase
  getActivePings: async (req: Request, res: Response) => {
    try {
      const { id_class, date } = req.body;

      if (!id_class) {
        return res.status(400).json({ message: "ID de clase es requerido" });
      }

      const search_date = date || new Date().toISOString().split('T')[0];

      const pings = await AttendancePingsModel.findAll({
        where: {
          id_class,
          ping_time: {
            [Op.between]: [
              new Date(search_date + ' 00:00:00'),
              new Date(search_date + ' 23:59:59')
            ]
          }
        },
        include: [
          {
            model: UsersModel,
            attributes: ['id_user', 'name', 'matricula']
          }
        ],
        order: [['ping_time', 'DESC']]
      });

      // Agrupar por estudiante y traducir status
      const groupedPings = pings.reduce((acc: any, ping: any) => {
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

    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Limpiar pings expirados manualmente
  cleanupExpiredPings: async (req: Request, res: Response) => {
    try {
      const { attendancePingsCleanup } = await import('../services/attendancePingsCleanup');
      const result = await attendancePingsCleanup.manualCleanup();
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Obtener estadísticas de pings
  getPingsStatistics: async (req: Request, res: Response) => {
    try {
      const { attendancePingsCleanup } = await import('../services/attendancePingsCleanup');
      const stats = await attendancePingsCleanup.getPingsStats();
      
      res.status(200).json({
        message: "Estadísticas de pings",
        statistics: stats
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  // Limpiar todos los pings (solo para testing)
  cleanupAllPings: async (req: Request, res: Response) => {
    try {
      const { attendancePingsCleanup } = await import('../services/attendancePingsCleanup');
      const result = await attendancePingsCleanup.cleanupAllPings();
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
};

export default attendanceController;
