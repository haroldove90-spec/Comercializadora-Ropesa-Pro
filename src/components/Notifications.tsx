import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  Trash2, 
  CheckSquare, 
  CheckCircle, 
  Check 
} from 'lucide-react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

interface NotificationsProps {
  userRole: string | null;
}

export default function Notifications({ userRole }: NotificationsProps) {
  const { 
    notifications: logs, 
    markAsRead, 
    markAllAsRead, 
    deleteNotifications 
  } = useRealtimeNotifications(userRole);
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => !l.read);

  const getIcon = (type: string) => {
    switch(type) {
      case 'sale': return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'order': return <MessageSquare size={18} className="text-[#C32A2C]" />;
      case 'attendance': return <Clock size={18} className="text-amber-500" />;
      default: return <Bell size={18} className="text-slate-400" />;
    }
  };

  const handleToggleSelectAll = () => {
    const allSelectedInFilter = filteredLogs.every(l => selectedIds.includes(l.id));
    if (allSelectedInFilter) {
      // Deselect all items from this filter
      setSelectedIds(prev => prev.filter(id => !filteredLogs.some(l => l.id === id)));
    } else {
      // Select all items from this filter
      const newSelected = Array.from(new Set([...selectedIds, ...filteredLogs.map(l => l.id)]));
      setSelectedIds(newSelected);
    }
  };

  const handleMarkSelectedAsRead = async () => {
    const selectedInFilter = selectedIds.filter(id => filteredLogs.some(l => l.id === id));
    if (selectedInFilter.length === 0) return;
    for (const id of selectedInFilter) {
      await markAsRead(id);
    }
    setSelectedIds(prev => prev.filter(id => !selectedInFilter.includes(id)));
  };

  const handleDeleteSelected = async () => {
    const selectedInFilter = selectedIds.filter(id => filteredLogs.some(l => l.id === id));
    if (selectedInFilter.length === 0) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente las ${selectedInFilter.length} notificaciones seleccionadas?`)) return;
    if (deleteNotifications) {
      await deleteNotifications(selectedInFilter);
    }
    setSelectedIds(prev => prev.filter(id => !selectedInFilter.includes(id)));
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight uppercase italic leading-none">Historial de <span className="text-[#C32A2C]">Notificaciones</span></h1>
          <p className="text-slate-500 mt-2 font-bold italic uppercase text-[9px] md:text-[10px] tracking-wider">Registros de actividad del día: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm animate-fade-in">
          <button 
            onClick={() => {
              setFilter('all');
              setSelectedIds([]);
            }}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            Todas
          </button>
          <button 
            onClick={() => {
              setFilter('unread');
              setSelectedIds([]);
            }}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'unread' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            No Leídas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Selection & Actions Control Bar */}
        {filteredLogs.length > 0 && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-800 transition-colors"
                title="Seleccionar todo"
              >
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all bg-slate-50 ${
                  filteredLogs.every(l => selectedIds.includes(l.id)) 
                    ? 'border-[#C32A2C] bg-rose-55 text-[#C32A2C]' 
                    : filteredLogs.some(l => selectedIds.includes(l.id))
                    ? 'border-rose-300 bg-rose-50/20 text-rose-500'
                    : 'border-slate-300'
                }`}>
                  {filteredLogs.every(l => selectedIds.includes(l.id)) ? (
                    <Check size={12} strokeWidth={3} />
                  ) : filteredLogs.some(l => selectedIds.includes(l.id)) ? (
                    <div className="w-2 h-2 bg-rose-500 rounded-sm" />
                  ) : null}
                </div>
                Seleccionar Todo
              </button>

              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                ({selectedIds.filter(id => filteredLogs.some(l => l.id === id)).length} Seleccionadas)
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 w-full md:w-auto">
              {selectedIds.filter(id => filteredLogs.some(l => l.id === id)).length > 0 && (
                <>
                  <button 
                    type="button"
                    onClick={handleMarkSelectedAsRead}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#C32A2C] hover:text-[#a12022] transition-colors bg-rose-50/20 px-3 py-1.5 rounded-xl border border-rose-100/30"
                  >
                    <CheckCircle size={13} />
                    Marcar Leídas
                  </button>
                  <button 
                    type="button"
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors bg-rose-50/50 px-3 py-1.5 rounded-xl border border-rose-100"
                  >
                    <Trash2 size={13} />
                    Borrar
                  </button>
                </>
              )}
              <button 
                type="button"
                onClick={markAllAsRead}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Ignorar Todo (Leer)
              </button>
            </div>
          </div>
        )}

        {filteredLogs.length === 0 ? (
          <div className="bg-white p-20 rounded-[48px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center animate-fade-in">
             <Bell size={48} className="text-slate-200 mb-4 animate-bounce" />
             <h3 className="text-xl font-black text-slate-800 uppercase italic">Sin notificaciones</h3>
             <p className="text-sm font-bold text-slate-400 mt-2 italic">Aún no hay registros para el día de hoy.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isSelected = selectedIds.includes(log.id);
            return (
              <motion.div
                layout
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border cursor-pointer ${
                  isSelected ? 'border-rose-300 ring-2 ring-[#C32A2C]/10 bg-rose-50/5' : log.read ? 'border-slate-50' : 'border-rose-100/30 shadow-lg shadow-[#C32A2C]/5'
                } flex items-center md:items-start gap-4 md:gap-6 group transition-all`}
              >
                {/* Custom Checkbox selector */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIds(prev => 
                      prev.includes(log.id) ? prev.filter(id => id !== log.id) : [...prev, log.id]
                    );
                  }}
                  className="p-1 select-none shrink-0"
                  title={isSelected ? "Deseleccionar" : "Seleccionar"}
                >
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'border-[#C32A2C] bg-[#C32A2C] text-white' 
                      : log.read 
                      ? 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      : 'border-rose-200 hover:border-rose-300 bg-rose-50/10'
                  }`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>

                {/* Main Notification Card Content */}
                <div 
                  onClick={() => markAsRead(log.id)}
                  className="flex-1 flex items-start gap-4 md:gap-6"
                >
                  <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${
                    log.read ? 'bg-slate-50 text-slate-400' : 'bg-rose-50/30 text-[#C32A2C]'
                  }`}>
                    {getIcon(log.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <h3 className={`font-black uppercase italic tracking-tight ${log.read ? 'text-slate-600' : 'text-slate-900 group-hover:text-[#C32A2C] transition-colors'}`}>
                          {log.title}
                        </h3>
                      </div>
                      {!log.read && (
                        <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <p className="text-slate-500 text-xs font-bold mt-2 leading-relaxed italic">
                      {log.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
