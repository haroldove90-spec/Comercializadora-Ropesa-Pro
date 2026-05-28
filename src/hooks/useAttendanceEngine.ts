import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type AttendanceAction = 'check_in' | 'break_start' | 'break_end' | 'check_out';

interface UserSession {
  user_id: string;
  user_name: string;
  user_role: string;
}

export function useAttendanceEngine() {
  const [loading, setLoading] = useState(false);

  const performAttendanceAction = async (
    session: UserSession,
    action: AttendanceAction,
    location?: { lat: number; lng: number }
  ) => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    try {
      // 1. Lógica de Upsert en Supabase para mantener un solo registro por día
      const payload: any = {
        user_name: session.user_name,
        user_role: session.user_role,
        work_date: today,
        [action]: timestamp,
        last_location: location || null
      };

      let result = await supabase
        .from('daily_attendance')
        .upsert(payload, { onConflict: 'user_name, work_date' })
        .select('id, user_name, work_date, check_in, break_start, break_end, check_out, last_location, created_at')
        .single();

      if (result.error) {
        if (result.error.message && (result.error.message.includes('user_role') || result.error.message.includes('column'))) {
          const { user_role, ...cleanPayload } = payload;
          result = await supabase
            .from('daily_attendance')
            .upsert(cleanPayload, { onConflict: 'user_name, work_date' })
            .select('id, user_name, work_date, check_in, break_start, break_end, check_out, last_location, created_at')
            .single();
        }
      }

      if (result.error) {
        console.error('Supabase Error Details:', result.error);
        throw result.error;
      }

      const data = result.data;

      // 2. Insertar en log de notificaciones para el Admin
      const labelMap: Record<AttendanceAction, string> = {
        check_in: 'Llegada',
        break_start: 'Salida a Comer',
        break_end: 'Regreso de Comer',
        check_out: 'Salida Final'
      };

      try {
        await supabase.from('notifications_log').insert([{
          title: 'Registro de Asistencia',
          message: `${session.user_name} ha marcado: ${labelMap[action]}`,
          type: 'attendance',
          user_role: 'admin',
          is_read: false
        }]);
      } catch (notifErr) {
        console.error('Error al insertar notificación de asistencia:', notifErr);
      }

      // 3. Disparar Broadcast para Admin en tiempo real (Staff Monitor)
      const broadcastChannel = supabase.channel('asistencias_en_vivo');
      broadcastChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await broadcastChannel.send({
            type: 'broadcast',
            event: 'attendance_event',
            payload: {
              usuario_id: session.user_id,
              nombre_empleado: session.user_name,
              rol_empleado: session.user_role,
              tipo_evento: labelMap[action],
              timestamp
            }
          });
          // Limpiar el canal después de enviar el broadcast para evitar conflictos
          setTimeout(() => {
            supabase.removeChannel(broadcastChannel);
          }, 1000);
        }
      });

      return { success: true, data };
    } catch (err: any) {
      console.error('Attendance Engine Error:', err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    registrarAsistencia: (s: UserSession, loc?: any) => performAttendanceAction(s, 'check_in', loc),
    registrarSalidaComer: (s: UserSession, loc?: any) => performAttendanceAction(s, 'break_start', loc),
    registrarRegresoComer: (s: UserSession, loc?: any) => performAttendanceAction(s, 'break_end', loc),
    registrarSalidaDefinitiva: (s: UserSession, loc?: any) => performAttendanceAction(s, 'check_out', loc),
    fetchHistory: async () => {
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('id, user_name, work_date, check_in, break_start, break_end, check_out, last_location, created_at')
        .order('work_date', { ascending: false })
        .order('user_name', { ascending: true });
      return { success: !error, data, error };
    }
  };
}
