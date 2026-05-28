
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order, AppNotification } from '../lib/types.supabase';

const getSessionInfo = () => {
  try {
    const saved = localStorage.getItem('qw_session');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (_) {}
  return null;
};

export function useRealtimeNotifications(userRole: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<any[]>([]); 
  const [staffStatus, setStaffStatus] = useState<Record<string, any>>({}); // { user_id: { name, role, last_event, time } }
  const shownIdsRef = useRef<Set<string>>(new Set());

  const playNotificationSound = () => {
    console.log('--- SOUND PLACEHOLDER: Reproduciendo alerta fuerte y clara ---');
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // Un timbre fuerte y claro (Double Chime) que simula una campana elegante de punto de venta
      // Primer tono (agudo y resonante)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      // Oscilador 1 (Tono base fuerte - onda triangular para presencia)
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now); // La5
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // desliza a Mi6

      // Oscilador 2 (Harmónico agudo cristalino - onda senoidal para brillo)
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, now + 0.08); // La6
      osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.25);

      // Envolturas de volumen (fuerte: 0.4 de ganancia para sonar claro)
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.01); // ataque ultra rápido de 10ms
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4); // decaimiento suave de 400ms

      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.09); 
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55); // timbre de cola largo

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.45);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.6);
    } catch (err) {
      console.warn('Web Audio synthesis failed, falling back:', err);
    }
  };

  const addToast = (toast: any) => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const fetchNotificationLogs = async (triggerAlerts = false) => {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      let query = supabase
        .from('notifications_log')
        .select('*')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false });

      // Filtrar por rol si no es admin
      if (userRole !== 'admin') {
        const sessionInfo = getSessionInfo();
        const myUserId = sessionInfo?.user_id;
        if (userRole === 'driver' && myUserId) {
          query = query.in('user_role', ['driver', `driver_${myUserId}`]);
        } else {
          query = query.eq('user_role', userRole);
        }
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      
      if (data) {
        const formatted: AppNotification[] = data.map(log => ({
          id: log.id,
          title: log.title,
          message: log.message,
          type: log.type as any,
          read: log.is_read,
          created_at: log.created_at
        }));

        // Si se solicita alertar, mostramos toasts para notificaciones unread nuevas
        if (triggerAlerts) {
          formatted.forEach(notif => {
            if (!notif.read && !shownIdsRef.current.has(notif.id)) {
              shownIdsRef.current.add(notif.id);
              
              // Solo alertar si ocurrió hace menos de 45 segundos para evitar floods
              const ageMs = Date.now() - new Date(notif.created_at).getTime();
              if (ageMs < 45000) {
                addToast({
                  title: notif.title,
                  message: notif.message,
                  type: notif.type
                });
                playNotificationSound();
              }
            }
          });
        } else {
          // En consultas normales, agregar a mostrados para evitar repetir alertas
          formatted.forEach(notif => {
            shownIdsRef.current.add(notif.id);
          });
        }

        setNotifications(formatted);
        
        const count = formatted.filter(n => !n.read).length;
        setUnreadCount(count);
      }
    } catch (err: any) {
      console.warn('Fallo silencioso al recuperar notificaciones (posible problema de red):', err.message || err);
    }
  };

  const markAllAsRead = async () => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    try {
      console.log('Marking notifications from last 24h as read...');
      const { error } = await supabase
        .from('notifications_log')
        .update({ is_read: true })
        .eq('is_read', false)
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (error) {
        console.error('Persistence Error (markAllAsRead):', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      console.log('Successfully marked all as read in DB and local state');
    } catch (err) {
      console.error('Critical failure in markAllAsRead:', err);
    }
  };

  useEffect(() => {
    if (!userRole) return;

    // Carga inicial sin disparar alertas repetidas
    fetchNotificationLogs(false);

    // Refuerzo de sincronización proactiva periódica (polling cada 8 segundos de respaldo)
    const backupInterval = setInterval(() => {
      fetchNotificationLogs(true);
    }, 8000);

    const psqlChannel = supabase.channel(`notifs_psql_${Math.random().toString(36).slice(2, 10)}`);

    psqlChannel
      // 1. Escuchar Historial de Notificaciones (Tablas directas)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications_log' }, (payload) => {
        const newLog = payload.new;
        
        // Filtrar por rol
        // Si no es admin y el rol no coincide, ignorar
        if (userRole !== 'admin') {
          const sessionInfo = getSessionInfo();
          const myUserId = sessionInfo?.user_id;
          if (userRole === 'driver' && myUserId) {
            if (newLog.user_role !== 'driver' && newLog.user_role !== `driver_${myUserId}`) {
              return;
            }
          } else if (newLog.user_role !== userRole) {
            return;
          }
        }

        // Registrar inmediatamente en mostrados
        shownIdsRef.current.add(newLog.id);

        // Formatear para el estado local
        const formatted: AppNotification = {
          id: newLog.id,
          title: newLog.title,
          message: newLog.message,
          type: newLog.type as any,
          read: newLog.is_read,
          created_at: newLog.created_at
        };

        setNotifications(prev => [formatted, ...prev]);
        if (!formatted.read) {
          setUnreadCount(prev => prev + 1);
        }
        playNotificationSound();

        // Native Browser Notification (Using global Window.Notification)
        if (typeof window !== 'undefined' && "Notification" in window && window.Notification.permission === "granted") {
          new window.Notification(formatted.title, {
            body: formatted.message,
            icon: '/favicon.ico'
          });
        }

        addToast({
          title: formatted.title,
          message: formatted.message,
          type: formatted.type
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications_log' }, (payload) => {
        const updatedLog = payload.new;
        
        // Si no es admin y el rol no coincide, ignorar
        if (userRole !== 'admin') {
          const sessionInfo = getSessionInfo();
          const myUserId = sessionInfo?.user_id;
          if (userRole === 'driver' && myUserId) {
            if (updatedLog.user_role !== 'driver' && updatedLog.user_role !== `driver_${myUserId}`) {
              return;
            }
          } else if (updatedLog.user_role !== userRole) {
            return;
          }
        }

        setNotifications(prev => {
          const oldIndex = prev.findIndex(n => n.id === updatedLog.id);
          if (oldIndex === -1) return prev;
          
          const oldNotif = prev[oldIndex];
          const newNotifs = [...prev];
          newNotifs[oldIndex] = {
            ...oldNotif,
            read: updatedLog.is_read
          };

          // Sincronizar contador de no leídos basándose en el nuevo estado
          const newCount = newNotifs.filter(n => !n.read).length;
          setUnreadCount(newCount);

          return newNotifs;
        });
      })
      .subscribe();

    // 2. Escuchar Broadcast de Asistencia en un canal separado (Staff Monitor)
    const broadcastChannel = supabase.channel(`staff_bcast_${Math.random().toString(36).slice(2, 10)}`);
    
    const sharedBroadcast = supabase.channel('asistencias_en_vivo');
    sharedBroadcast
      .on('broadcast', { event: 'attendance_event' }, (payload) => {
        const { usuario_id, nombre_empleado, rol_empleado, tipo_evento, timestamp } = payload.payload;
        setStaffStatus(prev => ({
          ...prev,
          [usuario_id]: {
            name: nombre_empleado,
            role: rol_empleado,
            last_event: tipo_evento,
            time: timestamp
          }
        }));
      })
      .subscribe();

    return () => {
      clearInterval(backupInterval);
      supabase.removeChannel(psqlChannel);
      supabase.removeChannel(sharedBroadcast);
    };
  }, [userRole]);

  const markAsRead = async (id: string) => {
    try {
      // 1. Actualizar estado local inmediatamente para UI responsiva
      setNotifications(prev => {
        const itemIndex = prev.findIndex(n => n.id === id);
        if (itemIndex === -1 || prev[itemIndex].read) return prev;
        
        const newNotifs = [...prev];
        newNotifs[itemIndex] = { ...newNotifs[itemIndex], read: true };
        setUnreadCount(newNotifs.filter(n => !n.read).length);
        return newNotifs;
      });

      // 2. Persistir en Base de Datos
      const { error, data } = await supabase
        .from('notifications_log')
        .update({ is_read: true })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase update error (markAsRead):', error);
        // Podríamos revertir el estado local aquí si el error es crítico
      } else {
        console.log(`Notification ${id} marked as read in DB:`, data);
      }
    } catch (err) {
      console.error('Unexpected error in markAsRead:', err);
    }
  };

  const deleteNotifications = async (ids: string[]) => {
    try {
      // 1. Update local state
      setNotifications(prev => {
        const remaining = prev.filter(n => !ids.includes(n.id));
        setUnreadCount(remaining.filter(n => !n.read).length);
        return remaining;
      });

      // 2. Persistir en Base de Datos
      const { error } = await supabase
        .from('notifications_log')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Supabase delete error (deleteNotifications):', error);
      }
    } catch (err) {
      console.error('Unexpected error in deleteNotifications:', err);
    }
  };

  const clearUnread = () => setUnreadCount(0);

  return { 
    notifications, 
    latestOrder, 
    unreadCount, 
    toasts, 
    staffStatus,
    markAsRead, 
    markAllAsRead,
    deleteNotifications,
    clearUnread, 
    fetchNotificationLogs 
  };
}
