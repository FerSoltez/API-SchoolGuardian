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
exports.attendancePingsCleanup = void 0;
const cron = __importStar(require("node-cron"));
const sequelize_1 = require("sequelize");
const attendancePings_1 = __importDefault(require("../models/attendancePings"));
const index_1 = require("../index");
class AttendancePingsCleanupService {
    constructor() {
        this.cleanupJob = null;
    }
    // Iniciar el servicio de limpieza automática
    startCleanupService() {
        console.log('🧹 Iniciando servicio de limpieza de Attendance_Pings...');
        // Ejecutar cada 30 segundos
        this.cleanupJob = cron.schedule('*/30 * * * * *', () => __awaiter(this, void 0, void 0, function* () {
            yield this.cleanupExpiredPings();
        }));
        console.log('✅ Servicio de limpieza iniciado - se ejecuta cada 30 segundos');
    }
    // Detener el servicio de limpieza
    stopCleanupService() {
        if (this.cleanupJob) {
            this.cleanupJob.stop();
            this.cleanupJob = null;
            console.log('🛑 Servicio de limpieza detenido');
        }
    }
    // Limpiar pings de estudiantes que ya completaron sus 3 sondeos (sin restricción de tiempo)
    cleanupExpiredPings() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Buscar grupos de estudiantes que tienen 3 pings (completaron el proceso)
                const studentsWithCompletePings = yield attendancePings_1.default.findAll({
                    attributes: ['id_student', 'id_class'],
                    where: {
                        ping_number: 3 // Solo estudiantes que han completado los 3 pings
                    },
                    group: ['id_student', 'id_class']
                });
                let totalDeleted = 0;
                // Para cada estudiante que completó sus 3 pings
                for (const student of studentsWithCompletePings) {
                    const { id_student, id_class } = student;
                    // Eliminar TODOS los pings de ese estudiante para esa clase
                    const deletedCount = yield attendancePings_1.default.destroy({
                        where: {
                            id_student,
                            id_class
                        }
                    });
                    totalDeleted += deletedCount;
                }
                if (totalDeleted > 0) {
                    (0, index_1.broadcast)({
                        message: `Limpieza automática: ${totalDeleted} pings eliminados (estudiantes con 3 sondeos completados)`,
                    });
                    console.log(`🗑️ Limpieza automática: ${totalDeleted} pings eliminados (estudiantes con 3 sondeos completados)`);
                }
            }
            catch (error) {
                console.error('❌ Error en limpieza automática de pings:', error.message);
            }
        });
    }
    // Limpiar pings de estudiantes que completaron 3 sondeos manualmente
    manualCleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Buscar grupos de estudiantes que tienen 3 pings (completaron el proceso)
                const studentsWithCompletePings = yield attendancePings_1.default.findAll({
                    attributes: ['id_student', 'id_class'],
                    where: {
                        ping_number: 3 // Solo estudiantes que han completado los 3 pings
                    },
                    group: ['id_student', 'id_class']
                });
                let totalDeleted = 0;
                // Para cada estudiante que completó sus 3 pings
                for (const student of studentsWithCompletePings) {
                    const { id_student, id_class } = student;
                    // Eliminar TODOS los pings de ese estudiante para esa clase
                    const deletedCount = yield attendancePings_1.default.destroy({
                        where: {
                            id_student,
                            id_class
                        }
                    });
                    totalDeleted += deletedCount;
                }
                return {
                    deleted: totalDeleted,
                    message: `Limpieza manual completada: ${totalDeleted} pings eliminados (estudiantes con 3 sondeos completados)`
                };
            }
            catch (error) {
                throw new Error(`Error en limpieza manual: ${error.message}`);
            }
        });
    }
    // Limpiar todos los pings (para testing)
    cleanupAllPings() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedCount = yield attendancePings_1.default.destroy({
                    where: {} // Sin condiciones = eliminar todos
                });
                return {
                    deleted: deletedCount,
                    message: `Todos los pings eliminados: ${deletedCount} registros`
                };
            }
            catch (error) {
                throw new Error(`Error al eliminar todos los pings: ${error.message}`);
            }
        });
    }
    // Obtener estadísticas de pings
    getPingsStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const total = yield attendancePings_1.default.count();
                // Contar estudiantes que tienen exactamente 3 pings
                const studentsWithCompletePings = yield attendancePings_1.default.count({
                    distinct: true,
                    col: 'id_student',
                    where: {
                        ping_number: 3
                    }
                });
                // Contar estudiantes que tienen 1 o 2 pings (incompletos)
                const studentsWithIncompletePings = (yield attendancePings_1.default.count({
                    distinct: true,
                    col: 'id_student',
                    where: {
                        ping_number: {
                            [sequelize_1.Op.in]: [1, 2]
                        }
                    }
                })) - studentsWithCompletePings; // Restar los que ya tienen 3 pings
                // Los estudiantes listos para limpieza son los que tienen 3 pings (sin restricción de tiempo)
                const readyForCleanup = studentsWithCompletePings;
                return {
                    total,
                    students_with_complete_pings: studentsWithCompletePings,
                    students_with_incomplete_pings: Math.max(0, studentsWithIncompletePings),
                    ready_for_cleanup: readyForCleanup
                };
            }
            catch (error) {
                throw new Error(`Error al obtener estadísticas: ${error.message}`);
            }
        });
    }
}
// Exportar instancia singleton
exports.attendancePingsCleanup = new AttendancePingsCleanupService();
exports.default = AttendancePingsCleanupService;
