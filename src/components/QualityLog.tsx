
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Thermometer, ShieldCheck, ClipboardList, Plus, Search, CheckCircle2, X, Loader2, AlertCircle, Download, Trash2 } from 'lucide-react';
import { useQualityEngine } from '../hooks/useQualityEngine';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { exportToPDF } from '../utils/pdfExport';
import { supabase } from '../lib/supabaseClient';

interface QualityLogProps {
  userRole?: 'admin' | 'operator' | 'driver' | 'client' | null;
}

export default function QualityLog({ userRole }: QualityLogProps) {
  const { handleSaveQualityLog, fetchQualityHistory, loading: isSaving } = useQualityEngine();
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess] = useState(false);

  // Determinar si es Admin (Monitor) o Planta (Registro)
  const isMonitorMode = userRole === 'admin';
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const columns = ['Supervisor', 'Parámetro', 'Valor', 'Estatus', 'Fecha'];
      const data = dbLogs.map(l => [
        l.supervisor_name,
        'Entrada de Agua',
        `${l.volume_received}L / ${l.chlorine_dosage}g`,
        l.pipeline_status === 'good' ? 'Óptimo' : 'Revisión',
        new Date(l.created_at).toLocaleString()
      ]);

      exportToPDF({
        title: 'Bitácora de Calidad QualityWater',
        subtitle: `Reporte de auditoría generado el ${new Date().toLocaleDateString()}`,
        columns,
        data,
        filename: 'Reporte_Calidad'
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // Mock de sesión local
  const [session, setSession] = useState({
    user_id: '0000000-0000-0000-0000-000000000000',
    user_name: 'Supervisor Planta'
  });

  useEffect(() => {
    const saved = localStorage.getItem('qw_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSession({ user_id: s.user_id, user_name: s.user_name });
      } catch (e) {}
    }
    
    loadHistory();

    // Suscripción Realtime para actualizar la tabla histórica automáticamente
    const channel = supabase
      .channel('quality_logs_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quality_logs' }, () => {
        loadHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadHistory = async () => {
    const res = await fetchQualityHistory();
    if (res.success) setDbLogs(res.data);
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('¿Eliminar este registro de calidad?')) return;
    const { error } = await supabase.from('quality_logs').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadHistory();
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      staff_id: session.user_id,
      supervisor_name: session.user_name,
      pipeline_status: formData.get('status') as string,
      volume_received: Number(formData.get('volume')),
      chlorine_dosage: Number(formData.get('chlorine'))
    };

    const res = await handleSaveQualityLog(data);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowModal(false);
        loadHistory();
      }, 2000);
    }
  };

  const displayLogs = dbLogs.length > 0 ? dbLogs : [
    { id: 1, type: 'Cloro', value: '0.8 ppm', status: 'optimal', time: '08:00 AM', tech: 'Juan P.' },
    { id: 2, type: 'Dureza', value: '2 mg/L', status: 'optimal', time: '09:30 AM', tech: 'Maria S.' },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-black text-slate-800 italic uppercase">Bitácoras de <span className="text-sky-500">Calidad</span></h2>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest italic">Monitoreo Físico-Químico • NORMA-127-SSA1</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportPDF}
            disabled={isExporting || dbLogs.length === 0}
            className="flex items-center gap-3 bg-slate-100 text-slate-600 px-6 py-4 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            PDF Auditoría
          </button>
          {!isMonitorMode && (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
            >
              <Plus size={18} /> Nuevo Registro
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Log Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                <ClipboardList size={18} className="text-sky-500" />
                Historial Técnico {isMonitorMode ? '(Modo Auditor)' : ''}
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input type="text" placeholder="Buscar parámetro..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500/10 transition-all font-bold" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Parámetro / Supervisor</th>
                    <th className="px-8 py-6">Valor / Auditoría</th>
                    <th className="px-8 py-6">Estatus</th>
                    <th className="px-8 py-6">Hora</th>
                    {isMonitorMode && <th className="px-8 py-6 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dbLogs.length === 0 ? (
                    <tr>
                      <td colSpan={isMonitorMode ? 5 : 4} className="px-8 py-12 text-center text-slate-300 font-bold italic">No hay registros dinámicos aún</td>
                    </tr>
                  ) : dbLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 group transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-800 text-sm italic">Entrada de Agua</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{log.supervisor_name}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-900 text-sm">{log.volume_received}L</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{log.chlorine_dosage}g Cloro</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                          log.pipeline_status === 'good' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {log.pipeline_status === 'good' ? 'Óptimo' : 'Revisión'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-500 italic">
                        <div className="flex items-center justify-between gap-2">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMonitorMode && (
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
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

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="bg-sky-500 p-8 rounded-[40px] text-white shadow-2xl shadow-sky-500/20">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-80">Cumplimiento Normativo</h4>
            <div className="flex items-center gap-6 mb-8">
              <div className="text-5xl font-black">100%</div>
              <div className="text-[10px] font-black uppercase leading-tight opacity-80">Rendimiento<br/>Hoy</div>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Supervisor en Turno</h4>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center font-black">
                {session.user_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 uppercase italic">{session.user_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activo ahora</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Registro */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSaving && setShowModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase italic">Auditoría <span className="text-sky-500">Producción</span></h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {success ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={48} />
                  </div>
                  <p className="text-2xl font-black text-slate-800 uppercase italic">¡Bitácora <span className="text-emerald-500">Guardada!</span></p>
                  <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Notificado al administrador</p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estatus de Entrada (Pipa/Red)</label>
                    <select name="status" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold appearance-none">
                      <option value="good">Óptimo (Transparente/Sin olor)</option>
                      <option value="warning">Revisión (Turbiedad leve)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Volumen (Litros)</label>
                      <input required name="volume" type="number" placeholder="Ej. 10000" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dosificación Cloro (g)</label>
                      <input required name="chlorine" type="number" step="0.1" placeholder="Ej. 50" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                    </div>
                  </div>

                  <button 
                    disabled={isSaving}
                    className="w-full bg-sky-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-95 mt-6 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Registrar Bitácora'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
