import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface AttendanceEvent {
  user_id: string;
  user_name: string;
  user_role: string;
  event_type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  timestamp: string;
  location?: { lat: number; lng: number };
}

export function useAttendanceLogic() {
  const [isProcessing, setIsProcessing] = useState(false);

  const registerAttendance = async (event: Omit<AttendanceEvent, 'timestamp'>) => {
    setIsProcessing(true);
    const timestamp = new Date().toISOString();

    try {
      // 1. Guardar en Base de Datos (Log de eventos)
      const { error: dbError } = await supabase
        .from('attendance_logs')
        .insert([{ ...event, timestamp }]);

      if (dbError) throw dbError;

      // 2. Disparar Broadcast en tiempo real para el Administrador
      const channel = supabase.channel('attendance_notifications');
      await channel.send({
        type: 'broadcast',
        event: 'attendance_alert',
        payload: {
          empleado: event.user_name,
          rol: event.user_role,
          evento: event.event_type,
          hora: timestamp,
        }
      });

      // 3. También insertamos en el log de notificaciones persistente
      await supabase.from('notifications_log').insert([{
        title: 'Movimiento de Personal',
        message: `${event.user_name} (${event.user_role}) marcó ${event.event_type}`,
        type: 'attendance',
        payload: { ...event, timestamp }
      }]);

      return { success: true, timestamp };
    } catch (err) {
      console.error('Error in registerAttendance:', err);
      return { success: false, error: err };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    registerAttendance,
    isProcessing,
    // Atajos lógicos
    handleClockIn: (data: any) => registerAttendance({ ...data, event_type: 'clock_in' }),
    handleClockOut: (data: any) => registerAttendance({ ...data, event_type: 'clock_out' }),
    handleBreakStart: (data: any) => registerAttendance({ ...data, event_type: 'break_start' }),
    handleBreakEnd: (data: any) => registerAttendance({ ...data, event_type: 'break_end' }),
  };
}
