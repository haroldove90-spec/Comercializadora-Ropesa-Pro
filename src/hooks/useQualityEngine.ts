import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface QualityData {
  staff_id: string;
  supervisor_name: string;
  pipeline_status: string;
  volume_received: number;
  chlorine_dosage: number;
}

export function useQualityEngine() {
  const [loading, setLoading] = useState(false);

  const handleSaveQualityLog = async (data: QualityData) => {
    setLoading(true);
    const timestamp = new Date().toISOString();

    try {
      // 1. Guardar en Base de Datos
      const { data: result, error } = await supabase
        .from('quality_logs')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      // 2. Insertar notificación para el administrador
      await supabase.from('notifications_log').insert([{
        title: 'Nueva Bitácora de Calidad',
        message: `${data.supervisor_name} registró una auditoría (${data.volume_received}L)`,
        type: 'attendance', // Usamos clock icon de attendance para calidad también
        user_role: 'admin'
      }]);

      // 3. Disparar Broadcast en tiempo real para el Administrador
      const channel = supabase.channel('produccion_en_vivo');
      await channel.send({
        type: 'broadcast',
        event: 'quality_alert',
        payload: {
          evento: 'Bitácora de Calidad Registrada',
          supervisor: data.supervisor_name,
          volumen: data.volume_received,
          hora: timestamp
        }
      });

      return { success: true, data: result };
    } catch (err: any) {
      console.error('Quality Engine Error:', err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const fetchQualityHistory = async (startDate?: string, endDate?: string) => {
    try {
      let query = supabase
        .from('quality_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error('Fetch Quality History Error:', err.message);
      return { success: false, error: err.message };
    }
  };

  return {
    loading,
    handleSaveQualityLog,
    fetchQualityHistory
  };
}
