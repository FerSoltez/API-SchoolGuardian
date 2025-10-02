import * as cron from 'node-cron';
import { Op } from 'sequelize';
import AttendancePingsModel from '../models/attendancePings';
import {broadcast} from '../index';

class AttendancePingsCleanupService {
  private cleanupJob: cron.ScheduledTask | null = null;

  // Iniciar el servicio de limpieza automática
  public startCleanupService(): void {
    console.log('🧹 Iniciando servicio de limpieza de Attendance_Pings...');
    
    // Ejecutar cada 1 minuto
    this.cleanupJob = cron.schedule('0 * * * * *', async () => {
      await this.cleanupExpiredPings();
    });

    console.log('✅ Servicio de limpieza iniciado - se ejecuta cada 1 minuto');
  }

  // Detener el servicio de limpieza
  public stopCleanupService(): void {
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      this.cleanupJob = null;
      console.log('🛑 Servicio de limpieza detenido');
    }
  }

  // Limpiar pings de estudiantes que ya completaron sus 3 sondeos (sin restricción de tiempo)
  private async cleanupExpiredPings(): Promise<void> {
    try {
      // Buscar grupos de estudiantes que tienen 3 pings (completaron el proceso)
      const studentsWithCompletePings = await AttendancePingsModel.findAll({
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
        const deletedCount = await AttendancePingsModel.destroy({
          where: {
            id_student,
            id_class
          }
        });

        totalDeleted += deletedCount;
      }

      if (totalDeleted > 0) {
        broadcast({
          message: `Limpieza automática: ${totalDeleted} pings eliminados (estudiantes con 3 sondeos completados)`,
        });
        console.log(`🗑️ Limpieza automática: ${totalDeleted} pings eliminados (estudiantes con 3 sondeos completados)`);
      }
    } catch (error) {
      console.error('❌ Error en limpieza automática de pings:', (error as Error).message);
    }
  }

  // Limpiar pings de estudiantes que completaron 3 sondeos manualmente
  public async manualCleanup(): Promise<{ deleted: number; message: string }> {
    try {
      // Buscar grupos de estudiantes que tienen 3 pings (completaron el proceso)
      const studentsWithCompletePings = await AttendancePingsModel.findAll({
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
        const deletedCount = await AttendancePingsModel.destroy({
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
    } catch (error) {
      throw new Error(`Error en limpieza manual: ${(error as Error).message}`);
    }
  }

  // Limpiar todos los pings (para testing)
  public async cleanupAllPings(): Promise<{ deleted: number; message: string }> {
    try {
      const deletedCount = await AttendancePingsModel.destroy({
        where: {} // Sin condiciones = eliminar todos
      });

      return {
        deleted: deletedCount,
        message: `Todos los pings eliminados: ${deletedCount} registros`
      };
    } catch (error) {
      throw new Error(`Error al eliminar todos los pings: ${(error as Error).message}`);
    }
  }

  // Obtener estadísticas de pings
  public async getPingsStats(): Promise<{
    total: number;
    students_with_complete_pings: number;
    students_with_incomplete_pings: number;
    ready_for_cleanup: number;
  }> {
    try {
      const total = await AttendancePingsModel.count();
      
      // Contar estudiantes que tienen exactamente 3 pings
      const studentsWithCompletePings = await AttendancePingsModel.count({
        distinct: true,
        col: 'id_student',
        where: {
          ping_number: 3
        }
      });

      // Contar estudiantes que tienen 1 o 2 pings (incompletos)
      const studentsWithIncompletePings = await AttendancePingsModel.count({
        distinct: true,
        col: 'id_student',
        where: {
          ping_number: {
            [Op.in]: [1, 2]
          }
        }
      }) - studentsWithCompletePings; // Restar los que ya tienen 3 pings

      // Los estudiantes listos para limpieza son los que tienen 3 pings (sin restricción de tiempo)
      const readyForCleanup = studentsWithCompletePings;

      return { 
        total, 
        students_with_complete_pings: studentsWithCompletePings,
        students_with_incomplete_pings: Math.max(0, studentsWithIncompletePings),
        ready_for_cleanup: readyForCleanup
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${(error as Error).message}`);
    }
  }
}

// Exportar instancia singleton
export const attendancePingsCleanup = new AttendancePingsCleanupService();
export default AttendancePingsCleanupService;
