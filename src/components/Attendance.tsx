
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, CheckCircle2, AlertCircle, Loader2, ArrowRight, LogOut, Coffee, Users, Search, Download, ClipboardList, Trash2 } from 'lucide-react';
import { useAttendanceEngine, AttendanceAction } from '../hooks/useAttendanceEngine';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { exportToPDF } from '../utils/pdfExport';
import { supabase } from '../lib/supabaseClient';

interface AttendanceProps {
  userRole?: 'admin' | 'operator' | 'driver' | 'client' | null;
  userName?: string | null;
}

export default function Attendance({ userRole, userName }: AttendanceProps) {
  // Determinar si estamos en modo monitor (Admin) o modo marcado (Empleado)
  const isMonitorMode = userRole === 'admin';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  const { registrarAsistencia, registrarSalidaComer, registrarRegresoComer, registrarSalidaDefinitiva, fetchHistory } = useAttendanceEngine();
  const { staffStatus } = useRealtimeNotifications(userRole || null);

  useEffect(() => {
    if (isMonitorMode) {
      loadHistory();

      // Suscripción Realtime para actualizar la tabla histórica automáticamente
      const channel = supabase
        .channel('attendance_table_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_attendance' }, () => {
          loadHistory();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isMonitorMode]);

  const loadHistory = async () => {
    const res = await (fetchHistory as any)();
    if (res.success) {
      setHistory(res.data);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const columns = ['Empleado', 'Fecha', 'Entrada', 'Comida I', 'Comida R', 'Salida'];
      const data = history.map(h => [
        h.user_name,
        h.work_date,
        h.check_in ? new Date(h.check_in).toLocaleTimeString() : '-',
        h.break_start ? new Date(h.break_start).toLocaleTimeString() : '-',
        h.break_end ? new Date(h.break_end).toLocaleTimeString() : '-',
        h.check_out ? new Date(h.check_out).toLocaleTimeString() : '-'
      ]);

      exportToPDF({
        title: 'Reporte de Asistencia Personal',
        subtitle: `Generado el ${new Date().toLocaleDateString()} - Historial Completo`,
        columns,
        data,
        filename: 'Reporte_Asistencia'
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAttendance = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar registro de asistencia de ${name}?`)) return;
    const { error } = await supabase.from('daily_attendance').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadHistory();
  };

  const handleBulkDeleteAttendance = async () => {
    if (selectedAttendanceIds.length === 0) return;
    if (!confirm(`¿Estás seguro de eliminar los ${selectedAttendanceIds.length} registros de asistencia seleccionados?`)) return;

    const { error } = await supabase
      .from('daily_attendance')
      .delete()
      .in('id', selectedAttendanceIds);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setSelectedAttendanceIds([]);
      loadHistory();
    }
  };

  // Datos de sesión - Prioriza localStorage para coherencia entre módulos
  const [userData, setUserData] = useState({
    user_id: userRole === 'admin' ? 'admin-id' : '00000000-0000-0000-0000-000000000000',
    user_name: userName || (userRole === 'admin' ? 'Administrador' : 'Empleado Demo'),
    user_role: userRole || 'repartidor'
  });

  useEffect(() => {
    const savedSession = localStorage.getItem('qw_session');
    let finalName = userName || (userRole === 'admin' ? 'Administrador' : 'Empleado Demo');
    let finalId = userRole === 'admin' ? 'admin-id' : '00000000-0000-0000-0000-000000000000';
    let finalRole = userRole || 'repartidor';

    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.user_name && !userName) finalName = session.user_name;
        if (session.user_id) finalId = session.user_id;
        if (session.user_role) finalRole = session.user_role;
      } catch (e) {}
    }

    if (userName) {
      finalName = userName;
    }

    setUserData({
      user_id: finalId,
      user_name: finalName,
      user_role: finalRole
    });
  }, [userRole, userName]);

  const handleAction = async (actionType: AttendanceAction) => {
    setStatus('loading');
    
    try {
      let location = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) {
        console.warn('Geolocation blocked');
      }

      const actionMap = {
        check_in: registrarAsistencia,
        break_start: registrarSalidaComer,
        break_end: registrarRegresoComer,
        check_out: registrarSalidaDefinitiva
      };

      const result = await actionMap[actionType](userData, location);

      if (result.success) {
        setStatus('success');
        const labels: Record<AttendanceAction, string> = {
          check_in: 'Entrada',
          break_start: 'Comida (Salida)',
          break_end: 'Comida (Regreso)',
          check_out: 'Salida Turno'
        };
        setLastAction(`${labels[actionType]} - ${new Date().toLocaleTimeString()}`);
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        throw new Error('Action failed');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 italic uppercase">
            {isMonitorMode ? 'Monitor de ' : 'Control de '}
            <span className="text-[#C32A2C]">Asistencia</span>
          </h2>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">
            {isMonitorMode ? 'Estado de la Plantilla en Tiempo Real' : 'Sincronizado en tiempo real con Administrador'}
          </p>
        </div>
        
        {isMonitorMode && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting || history.length === 0}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Exportar PDF
            </button>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
              <Users size={16} className="text-[#C32A2C]" />
              <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Activos: {Object.keys(staffStatus).length}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!isMonitorMode ? (
          <>
            {/* Action Card para Empleados */}
            <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Clock size={28} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Sesión de: {userData.user_name}</p>
                    <p className="text-lg font-black text-slate-800 italic uppercase">Logueado como {userData.user_role}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => handleAction('check_in')}
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-between p-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} />
                      <span>Entrada Al Turno</span>
                    </div>
                    <ArrowRight size={16} />
                  </button>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleAction('break_start')}
                      disabled={status === 'loading'}
                      className="flex items-center justify-between p-5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <Coffee size={18} />
                        <span>Ir Comer</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => handleAction('break_end')}
                      disabled={status === 'loading'}
                      className="flex items-center justify-between p-5 bg-[#C32A2C] hover:bg-[#a12022] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#C32A2C]/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>Volver</span>
                      </div>
                    </button>
                  </div>

                  <button 
                    onClick={() => handleAction('check_out')}
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-between p-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut size={18} />
                      <span>Salida Definitiva</span>
                    </div>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Status Overlay */}
              <AnimatePresence>
                {status !== 'idle' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 size={64} className="text-[#C32A2C] animate-spin mb-6" />
                        <p className="text-xl font-black text-slate-800 uppercase italic">Procesando <span className="text-[#C32A2C]">Registro...</span></p>
                      </>
                    ) : status === 'success' ? (
                      <>
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                          <CheckCircle2 size={48} />
                        </div>
                        <p className="text-2xl font-black text-slate-800 uppercase italic">¡Notificado al <span className="text-emerald-500">Admin!</span></p>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6">
                          <AlertCircle size={48} />
                        </div>
                        <p className="text-2xl font-black text-slate-800 uppercase italic">Error en <span className="text-rose-500">Registro</span></p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-slate-100 rounded-full group-hover:scale-110 transition-transform duration-700 opacity-50" />
            </div>
          </>
        ) : (
          /* Monitor Mode (Admin) */
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Personal Activo Hoy</span>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar empleado..." 
                    className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-[#C32A2C]/20 placeholder:font-bold"
                  />
                </div>
              </div>
              
              <div className="divide-y divide-slate-50">
                {Object.keys(staffStatus).length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs font-bold text-slate-300 italic uppercase">Sin actividad realtime reciente</p>
                  </div>
                ) : (
                  Object.entries(staffStatus).map(([id, info]: [string, any]) => (
                    <motion.div 
                      key={id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xs ${
                          id.includes('chofer') ? 'bg-emerald-500' : 'bg-[#C32A2C]'
                        }`}>
                          {info.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 leading-none">{info.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{info.role}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                          info.last_event === 'Llegada' ? 'bg-emerald-100 text-emerald-600' :
                          info.last_event === 'Salida a Comer' ? 'bg-amber-100 text-amber-600' :
                          info.last_event === 'Regreso de Comer' ? 'bg-rose-100 text-[#C32A2C]' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {info.last_event}
                        </span>
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                          {new Date(info.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Historical Table */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <ClipboardList size={18} className="text-[#C32A2C]" />
                    Historial de Asistencia Completo
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Todas las entradas, salidas y comidas registradas</p>
                </div>
                {selectedAttendanceIds.length > 0 && isMonitorMode && (
                  <button
                    onClick={handleBulkDeleteAttendance}
                    className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3.5 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95"
                  >
                    <Trash2 size={12} className="text-rose-500" />
                    Eliminar Seleccionados ({selectedAttendanceIds.length})
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                    <tr>
                      {isMonitorMode && (
                        <th className="px-8 py-4 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-slate-200 accent-[#C32A2C] cursor-pointer w-4 h-4 text-[#C32A2C] focus:ring-[#C32A2C]"
                            checked={history.length > 0 && selectedAttendanceIds.length === history.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAttendanceIds(history.map(h => h.id));
                              } else {
                                setSelectedAttendanceIds([]);
                              }
                            }}
                          />
                        </th>
                      )}
                      <th className="px-8 py-4">Empleado / Fecha</th>
                      <th className="px-8 py-4">Entrada</th>
                      <th className="px-8 py-4">Comida (I/R)</th>
                      <th className="px-8 py-4">Salida</th>
                      {isMonitorMode && <th className="px-8 py-4 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={isMonitorMode ? 6 : 4} className="px-8 py-12 text-center text-slate-300 font-bold uppercase italic text-xs">Cargando historial...</td>
                      </tr>
                    ) : history.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                        {isMonitorMode && (
                          <td className="px-8 py-5 w-10">
                            <input
                              type="checkbox"
                              className="rounded border-slate-200 accent-[#C32A2C] cursor-pointer w-4 h-4 text-[#C32A2C] focus:ring-[#C32A2C]"
                              checked={selectedAttendanceIds.includes(record.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAttendanceIds(prev => [...prev, record.id]);
                                } else {
                                  setSelectedAttendanceIds(prev => prev.filter(id => id !== record.id));
                                }
                              }}
                            />
                          </td>
                        )}
                        <td className="px-8 py-5">
                          <p className="font-black text-slate-800 text-xs italic">{record.user_name}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-tight">{record.work_date}</p>
                        </td>
                        <td className="px-8 py-5">
                          {record.check_in ? (
                            <span className="text-xs font-black text-emerald-500">{new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 uppercase">Sin marc.</span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-amber-500">
                              {record.break_start ? new Date(record.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </span>
                            <span className="text-slate-200">/</span>
                            <span className="text-[10px] font-black text-[#C32A2C]">
                              {record.break_end ? new Date(record.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {record.check_out ? (
                              <span className="text-xs font-black text-slate-700">{new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-300 uppercase italic">Activo</span>
                            )}
                            {isMonitorMode && (
                              <button 
                                onClick={() => handleDeleteAttendance(record.id, record.user_name)}
                                className="p-1.5 text-slate-200 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-6">Estado del Sistema</h4>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[24px] bg-white/10 text-white flex items-center justify-center backdrop-blur-md shadow-inner">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase italic tracking-widest">GPS Gateway</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1 uppercase">
                    Protocolo Realtime Activo
                  </p>
                </div>
              </div>
              {!isMonitorMode && lastAction && (
                <div className="mt-8 pt-8 border-t border-white/10">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Último marcado:</p>
                  <p className="text-sm font-bold text-white mt-1">{lastAction}</p>
                </div>
              )}
            </div>
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#C32A2C]/10 rounded-full blur-3xl" />
          </div>

          {isMonitorMode && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Resumen del Día</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase">En Turno</span>
                  <span className="font-black text-slate-800">12</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase">En Comida</span>
                  <span className="font-black text-amber-500">2</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-50">
                  <span className="font-bold text-slate-500 uppercase">Sin Marcar</span>
                  <span className="font-black text-rose-500">1</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
