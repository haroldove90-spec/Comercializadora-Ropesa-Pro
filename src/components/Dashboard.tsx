import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  DollarSign, 
  AlertTriangle, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Package,
  Search,
  CheckCircle2,
  Truck,
  ArrowRightLeft,
  Download,
  Loader2,
  UserPlus,
  Send,
  X,
  Plus,
  Trash2,
  Phone,
  Store,
  Save,
  MessageSquare
} from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { supabase } from '../lib/supabaseClient';

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface Order {
  id: string;
  customer_name: string;
  address: string;
  items: string;
  total_price: number;
  status: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  tier: string;
  geolocation_url?: string;
  created_at?: string;
}

export default function Dashboard({ userRole }: { userRole: string | null }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    address: '',
    items: '',
    total_price: '',
    source: 'local' as 'local' | 'phone' | 'whatsapp',
    assigned_to: '',
    assigned_to_name: ''
  });

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setOrders(data);
    } catch (err) {
      console.warn('Error fetching orders:', err);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role')
        .eq('role', 'driver')
        .eq('status', 'active');
      if (error) throw error;
      if (data) setDrivers(data);
    } catch (err) {
      console.warn('Error fetching drivers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      if (data) setProducts(data);
    } catch (err) {
      console.warn('Error fetching products:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      if (data) setCustomers(data as Customer[]);
    } catch (err) {
      console.warn('Error fetching customers:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    fetchProducts();
    fetchCustomers();
    setLoading(false);

    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAssignOrder = async (driverId: string, driverName: string) => {
    if (!selectedOrder) return;
    setIsAssigning(true);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'assigned',
          assigned_to: driverId,
          assigned_to_name: driverName
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Crear notificación para el repartidor
      await supabase.from('notifications_log').insert([
        {
          title: 'Nuevo Pedido Asignado',
          message: `Se te ha asignado el pedido de ${selectedOrder.customer_name}`,
          type: 'order',
          user_role: `driver_${driverId}`
        },
        {
          title: 'Pedido Despachado',
          message: `El pedido de ${selectedOrder.customer_name} fue asignado a ${driverName}`,
          type: 'order',
          user_role: 'admin'
        }
      ]);

      setSelectedOrder(null);
      fetchOrders();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const stats = [
    { label: 'Pedidos Hoy', value: orders.length.toString(), subValue: 'Total', color: 'text-white' },
    { label: 'Pdtes de Asignar', value: orders.filter(o => o.status === 'pending').length.toString(), subValue: '! Acción Requerida', color: 'text-[#C32A2C]', trendColor: 'text-[#C32A2C]' },
    { label: 'En Ruta', value: orders.filter(o => o.status === 'assigned').length.toString(), subValue: 'Activos', color: 'text-rose-400' },
  ];

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportGlobal = () => {
    const columns = ['ID / Referencia', 'Cliente', 'Dirección', 'Artículos', 'Vendedor', 'Estado', 'Fecha'];
    const data = filteredOrders.map(order => [
      order.id.slice(0, 8).toUpperCase(),
      order.customer_name,
      order.address,
      order.items,
      order.assigned_to_name || 'Sin Asignar',
      order.status === 'delivered' ? 'Completado' : order.status === 'assigned' ? 'En Ruta' : 'Pendiente',
      new Date(order.created_at).toLocaleString()
    ]);
    exportToPDF({
      title: 'Reporte Global de Pedidos y Despacho',
      subtitle: `Resumen de ${filteredOrders.length} pedido(s) correspondiente a la lista actual de despacho.`,
      columns,
      data,
      filename: 'Reporte_Global_Despacho'
    });
  };

  const handleExportIndividual = (order: any) => {
    const columns = ['Campo', 'Detalle'];
    const data = [
      ['ID de Pedido', order.id.toUpperCase()],
      ['Cliente', order.customer_name],
      ['Dirección de Despacho', order.address],
      ['Detalles / Artículos', order.items],
      ['Vendedor Asignado', order.assigned_to_name || 'Sin Asignar'],
      ['Estado Actual', order.status === 'delivered' ? 'Completado / Entregado' : order.status === 'assigned' ? 'En Ruta / Asignado' : 'Pendiente de Despacho'],
      ['Tipo de Entrega', order.source === 'local' ? 'Venta Local en Planta' : 'Pedido de Entrega domicilio'],
      ['Fecha y Hora', new Date(order.created_at).toLocaleString()]
    ];
    exportToPDF({
      title: `Comprobante de Pedido #${order.id.slice(0, 8).toUpperCase()}`,
      subtitle: `Detalle individual para despacho o entrega física de botella/garrafón.`,
      columns,
      data,
      filename: `Pedido_${order.customer_name.replace(/\s+/g, '_')}`
    });
  };

  const handleRegisterOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOrder(true);
    
    try {
      const isAssigned = newOrder.source !== 'local' && newOrder.assigned_to !== '';
      
      const { data: orderData, error } = await supabase
        .from('orders')
        .insert([{
          customer_name: newOrder.customer_name,
          address: newOrder.source === 'local' ? 'Venta en Planta' : newOrder.address,
          items: newOrder.items,
          total_price: parseFloat(newOrder.total_price) || 0,
          source: newOrder.source,
          status: newOrder.source === 'local' ? 'delivered' : (isAssigned ? 'assigned' : 'pending'),
          assigned_to: isAssigned ? newOrder.assigned_to : null,
          assigned_to_name: isAssigned ? newOrder.assigned_to_name : null
        }])
        .select()
        .single();

      if (error) throw error;

      // Notificación para todos los roles relevantes
      const sourceType = newOrder.source === 'local' ? 'Venta Local' : newOrder.source === 'whatsapp' ? 'WhatsApp' : 'Teléfono';
      const notificationType = newOrder.source === 'local' ? 'sale' : 'order';
      
      const notifications = [
        {
          title: `Nuevo Registro: ${sourceType}`,
          message: `${newOrder.customer_name} - ${newOrder.items}`,
          type: notificationType,
          user_role: 'admin'
        },
        {
          title: `Nuevo Registro: ${sourceType}`,
          message: `${newOrder.customer_name} - ${newOrder.items}`,
          type: notificationType,
          user_role: 'operator'
        }
      ];

      // Si se asignó un chofer directamente, notificarle
      if (isAssigned) {
        notifications.push({
          title: 'Nuevo Pedido Asignado',
          message: `Se te ha asignado el pedido de ${newOrder.customer_name}`,
          type: 'order',
          user_role: `driver_${newOrder.assigned_to}`
        });
      }

      await supabase.from('notifications_log').insert(notifications);

      setShowRegisterModal(false);
      setNewOrder({ customer_name: '', address: '', items: '', total_price: '', source: 'local', assigned_to: '', assigned_to_name: '' });
      fetchOrders();
    } catch (e: any) {
      console.error('Order Save Error:', e);
      alert('Error al registrar pedido: ' + (e.message || 'Verifica tu conexión'));
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDeleteOrder = async (id: string, customer: string) => {
    if (!confirm(`¿Estás seguro de eliminar el pedido de ${customer}? Esta acción no se puede deshacer.`)) return;
    
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      fetchOrders();
      // Notificar eliminación si es necesario
      await supabase.from('notifications_log').insert({
        title: 'Pedido Eliminado',
        message: `El pedido de ${customer} fue eliminado del sistema por el administrador`,
        type: 'system',
        user_role: 'admin'
      });
    }
  };

  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`¿Estás seguro de eliminar los ${selectedOrderIds.length} pedidos seleccionados? Esta acción no se puede deshacer.`)) return;

    const { error } = await supabase
      .from('orders')
      .delete()
      .in('id', selectedOrderIds);

    if (error) {
      alert('Error al eliminar pedidos: ' + error.message);
    } else {
      setSelectedOrderIds([]);
      fetchOrders();
      await supabase.from('notifications_log').insert({
        title: 'Pedidos Eliminados en Lote',
        message: `Se eliminaron ${selectedOrderIds.length} pedidos en lote por el administrador`,
        type: 'system',
        user_role: 'admin'
      });
    }
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase italic leading-none">Gestión de <span className="text-[#C32A2C]">Pedidos</span></h1>
          <p className="text-zinc-400 mt-2 font-bold uppercase text-[9px] tracking-[0.2em]">Centro de despacho y asignación en tiempo real</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 bg-[#C32A2C] hover:bg-[#a12022] text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus size={18} /> Registrar Venta/Ped.
          </button>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o dirección..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-500 rounded-2xl focus:ring-2 focus:ring-[#C32A2C] outline-none transition-all shadow-sm font-bold text-sm"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#212020] p-6 rounded-[24px] border border-zinc-900 shadow-xl overflow-hidden relative group"
          >
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
              <span className={`text-[10px] font-black uppercase ${stat.trendColor || 'text-zinc-600'}`}>
                {stat.subValue}
              </span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform text-white">
              <Package size={80} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table Area */}
      <div className="bg-[#212020] rounded-[24px] border border-zinc-900 overflow-hidden shadow-2xl">
        <div className="p-6 md:p-8 border-b border-zinc-900 flex flex-wrap justify-between items-center bg-[#212020] gap-4 font-sans">
          <h2 className="font-black text-white uppercase italic flex items-center gap-3">
            <Truck size={20} className="text-[#C32A2C]" />
            Control de Despacho
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {selectedOrderIds.length > 0 && userRole === 'admin' && (
              <button
                onClick={handleBulkDeleteOrders}
                className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 px-3.5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 size={12} className="text-rose-400 animate-pulse" />
                Eliminar Seleccionados ({selectedOrderIds.length})
              </button>
            )}
            <button
              onClick={handleExportGlobal}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 px-3.5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
              title="Exportar todos los pedidos de la lista actual"
            >
              <Download size={12} className="text-[#C32A2C]" />
              Exportar Todo ({filteredOrders.length})
            </button>
            <span className="text-[10px] bg-zinc-900 border border-zinc-850 text-slate-300 px-3 py-2 rounded-xl font-black uppercase tracking-widest whitespace-nowrap">
              {filteredOrders.length} Resultados
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#000000] text-[#C32A2C] uppercase text-[9px] font-black tracking-[0.2em] border-b border-zinc-900">
              <tr>
                {userRole === 'admin' && (
                  <th className="px-8 py-5 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-[#C32A2C] accent-[#C32A2C] cursor-pointer w-4 h-4"
                      checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrderIds(filteredOrders.map(o => o.id));
                        } else {
                          setSelectedOrderIds([]);
                        }
                      }}
                    />
                  </th>
                )}
                <th className="px-8 py-5">Cliente / Detalle</th>
                <th className="px-8 py-5">Productos</th>
                <th className="px-8 py-5">Vendedor</th>
                <th className="px-8 py-5">Estatus</th>
                <th className="px-8 py-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-900/50 transition-colors group">
                  {userRole === 'admin' && (
                    <td className="px-8 py-6 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-[#C32A2C] accent-[#C32A2C] cursor-pointer w-4 h-4"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(prev => [...prev, order.id]);
                          } else {
                            setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                          }
                        }}
                      />
                    </td>
                  )}
                  <td className="px-8 py-6">
                    <p className="font-black text-white uppercase italic leading-none">{order.customer_name}</p>
                    <p className="text-[11px] text-zinc-400 font-bold mt-2 flex items-center gap-1.5 leading-tight">
                      <MapPin size={12} className="text-[#C32A2C]" /> {order.address}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-zinc-400 italic max-w-[200px] truncate">{order.items}</p>
                  </td>
                  <td className="px-8 py-6">
                    {order.assigned_to_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-zinc-900 rounded-full flex items-center justify-center text-[#C32A2C]">
                          <Users size={14} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-tight text-zinc-200">{order.assigned_to_name}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] inline-flex items-center gap-2 ${
                      order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      order.status === 'assigned' ? 'bg-[#C32A2C]/10 text-rose-400 border border-[#C32A2C]/20' :
                      'bg-zinc-800 text-zinc-400 border border-zinc-700 animate-pulse'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'delivered' ? 'bg-emerald-400' : 'bg-[#C32A2C]'}`} />
                      {order.status === 'assigned' ? 'En Ruta' : order.status === 'delivered' ? (order.source === 'local' ? 'Venta Local' : 'Entregado') : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleExportIndividual(order); }}
                        className="p-2 text-zinc-500 hover:text-[#C32A2C] transition-colors cursor-pointer"
                        title="Exportar Reporte Individual"
                      >
                        <Download size={16} />
                      </button>
                      {userRole === 'admin' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id, order.customer_name); }}
                          className="p-2 text-zinc-500 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Eliminar Pedido"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {order.status === 'pending' ? (
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="bg-[#C32A2C] text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#C32A2C]/20 hover:bg-[#a12022] transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                        >
                          <UserPlus size={14} /> Asignar
                        </button>
                      ) : (
                        <button className="text-zinc-500 hover:text-[#C32A2C] p-2 transition-colors cursor-pointer">
                          <ChevronRight size={20} />
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

      {/* Assignment Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-950 rounded-[32px] shadow-2xl border border-zinc-900 z-[101] overflow-hidden text-white"
            >
              <div className="p-10 pb-0 flex justify-between items-center bg-zinc-950">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase italic">Despachar <span className="text-[#C32A2C]">Pedido</span></h2>
                  <p className="text-[10px] font-black text-[#C32A2C] uppercase tracking-widest mt-1 italic">Cliente: {selectedOrder.customer_name}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-3 bg-zinc-900 border border-zinc-850 rounded-2xl text-zinc-400 hover:text-[#C32A2C] transition-all cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="p-10 pt-8 space-y-6">
                <div className="bg-[#000000]/60 p-6 rounded-[24px] border border-zinc-900 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Choferes Activos</span>
                    <span className="text-lg font-black text-white">{drivers.length}</span>
                  </div>
                  <Truck size={32} className="text-[#C32A2C] opacity-30 animate-pulse" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1 block mb-2">Seleccionar Vendedor</label>
                  <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {drivers.map(driver => (
                      <button
                        key={driver.id}
                        disabled={isAssigning}
                        onClick={() => handleAssignOrder(driver.id, driver.name)}
                        className="w-full flex items-center justify-between p-4 bg-zinc-900 border border-zinc-850 rounded-2xl hover:border-[#C32A2C] hover:shadow-lg hover:shadow-[#C32A2C]/10 transition-all group cursor-pointer text-white"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-[#C32A2C] group-hover:bg-[#C32A2C] group-hover:text-white transition-colors">
                            <Users size={18} />
                          </div>
                          <span className="font-bold text-zinc-250 italic uppercase group-hover:text-white transition-colors">{driver.name}</span>
                        </div>
                        <Send size={16} className="text-zinc-650 group-hover:text-[#C32A2C] transition-colors" />
                      </button>
                    ))}
                    {drivers.length === 0 && (
                      <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-3xl mt-4">
                         <Users size={32} className="mx-auto mb-3 opacity-20 text-zinc-400" />
                         <p className="text-[10px] font-black uppercase tracking-widest">No hay choferes disponibles</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-full p-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-[#C32A2C] hover:bg-[#C32A2C]/10 transition-colors mt-4 cursor-pointer"
                >
                  Cancelar Operación
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRegisterModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] md:w-full max-w-xl bg-zinc-950 rounded-[32px] shadow-2xl border border-zinc-900 z-[101] overflow-y-auto max-h-[90vh] md:max-h-auto text-white"
            >
              <div className="p-8 pb-4 flex justify-between items-center bg-zinc-950">
                <h2 className="text-2xl font-black text-white uppercase italic">Registrar <span className="text-[#C32A2C]">Venta/Pedido</span></h2>
                <button onClick={() => setShowRegisterModal(false)} className="p-2 text-zinc-500 hover:text-[#C32A2C] transition-colors cursor-pointer">
                  <X />
                </button>
              </div>

              <form onSubmit={handleRegisterOrder} className="p-8 pt-4 grid grid-cols-2 gap-6 bg-zinc-950">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">Fuente del Registro</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'local', label: 'Local', icon: Store, color: 'bg-emerald-500', disabled: false },
                      { id: 'phone', label: 'Teléfono', icon: Phone, color: 'bg-[#C32A2C]', disabled: false },
                      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500', disabled: true }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        type="button"
                        disabled={btn.disabled}
                        onClick={() => setNewOrder({...newOrder, source: btn.id as any})}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                          btn.disabled 
                            ? 'opacity-40 cursor-not-allowed border-zinc-900 bg-zinc-900 text-zinc-650'
                            : newOrder.source === btn.id 
                              ? `border-transparent text-white ${btn.color}` 
                              : 'border-zinc-900 text-zinc-500 bg-zinc-900/40 hover:bg-zinc-900'
                        }`}
                      >
                        <btn.icon size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{btn.disabled ? 'Inactivo' : btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`${newOrder.source === 'local' ? 'col-span-2' : 'col-span-1'} relative`}>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Nombre del Cliente</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerModal(true)}
                      className="text-[10px] font-black text-[#C32A2C] hover:text-[#a12022] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <UserPlus size={12} /> + Nuevo Cliente
                    </button>
                  </div>
                  <input 
                    required
                    type="text"
                    value={newOrder.customer_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewOrder({...newOrder, customer_name: val});
                      setCustomerSearchQuery(val);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => {
                      setCustomerSearchQuery(newOrder.customer_name);
                      setShowCustomerDropdown(true);
                    }}
                    placeholder="Escribe para buscar o ingresar..."
                    className="w-full p-4 bg-zinc-900 border border-zinc-850 rounded-2xl font-bold text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#C32A2C] outline-none"
                  />
                  
                  {showCustomerDropdown && (
                    <div className="absolute left-0 right-0 z-[110] mt-1 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar text-white">
                      <div className="p-2 border-b border-zinc-800 text-[9px] font-black uppercase text-zinc-500 tracking-wider">
                        Clientes Registrados
                      </div>
                      {customers
                        .filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setNewOrder({
                                ...newOrder,
                                customer_name: c.name,
                                address: c.address || ''
                              });
                              setShowCustomerDropdown(false);
                            }}
                            className="w-full text-left p-3 hover:bg-zinc-800 flex flex-col transition-colors border-b border-zinc-800 last:border-none cursor-pointer"
                          >
                            <span className="font-bold text-xs text-white">{c.name}</span>
                            <span className="text-[10px] font-medium text-zinc-400">{c.address || 'Sin dirección'}</span>
                          </button>
                        ))}
                      {customers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-xs text-zinc-500 font-bold">
                          Sin coincidencias. Haz clic en "+ Nuevo Cliente" arriba.
                        </div>
                      )}
                    </div>
                  )}
                  {showCustomerDropdown && (
                    <div 
                      className="fixed inset-0 z-[109]" 
                      onClick={() => setShowCustomerDropdown(false)}
                    />
                  )}
                </div>

                {newOrder.source !== 'local' && (
                  <div className="col-span-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">Dirección de Entrega</label>
                    <input 
                      required
                      type="text"
                      value={newOrder.address}
                      onChange={(e) => setNewOrder({...newOrder, address: e.target.value})}
                      placeholder="Calle, Colonia, CP"
                      className="w-full p-4 bg-zinc-900 border border-zinc-850 rounded-2xl font-bold text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#C32A2C] outline-none"
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">Detalle de Productos</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {products.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const currentItems = newOrder.items ? newOrder.items + ', ' : '';
                          const currentTotal = (parseFloat(newOrder.total_price) || 0) + p.price;
                          setNewOrder({
                            ...newOrder, 
                            items: currentItems + '1x ' + p.name,
                            total_price: currentTotal.toFixed(2)
                          });
                        }}
                        className="bg-zinc-900 hover:bg-[#C32A2C]/25 text-zinc-350 hover:text-white border border-zinc-850 hover:border-[#C32A2C]/50 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        + {p.name} (${p.price})
                      </button>
                    ))}
                  </div>
                  <textarea 
                    required
                    value={newOrder.items}
                    onChange={(e) => setNewOrder({...newOrder, items: e.target.value})}
                    placeholder="Ej. 1x Garrafón 20L"
                    className="w-full p-4 bg-zinc-900 border border-zinc-850 rounded-2xl font-bold text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#C32A2C] outline-none h-20 resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">Total ($)</label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C32A2C]" />
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={newOrder.total_price}
                      onChange={(e) => setNewOrder({...newOrder, total_price: e.target.value})}
                      placeholder="0.00"
                      className="w-full p-4 pl-10 bg-zinc-900 border border-zinc-850 text-white font-bold rounded-2xl focus:ring-2 focus:ring-[#C32A2C] outline-none text-xl"
                    />
                  </div>
                </div>

                {newOrder.source !== 'local' && (
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">Asignar Vendedor (Opcional)</label>
                    <select 
                      value={newOrder.assigned_to}
                      onChange={(e) => {
                        const driver = drivers.find(d => d.id === e.target.value);
                        setNewOrder({
                          ...newOrder, 
                          assigned_to: e.target.value,
                          assigned_to_name: driver ? driver.name : ''
                        });
                      }}
                      className="w-full p-4 bg-zinc-900 border border-zinc-850 rounded-2xl font-bold text-white focus:ring-2 focus:ring-[#C32A2C] outline-none appearance-none"
                    >
                      <option value="" className="bg-zinc-900 text-white">Pendiente de Asignar</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id} className="bg-zinc-900 text-white">
                          {driver.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="col-span-2 pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="flex-1 p-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-[#C32A2C] hover:bg-[#C32A2C]/10 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSavingOrder}
                    className="flex-[2] bg-[#C32A2C] text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#C32A2C]/20 hover:bg-[#a12022] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingOrder ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Finalizar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Customer from Order Modal */}
      <AnimatePresence>
        {showNewCustomerModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingCustomer && setShowNewCustomerModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-950 rounded-[32px] shadow-2xl p-8 border border-zinc-900 z-[121] text-white"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase italic">Alta de <span className="text-[#C32A2C]">Cliente (Pedido)</span></h3>
                <button 
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  disabled={isSavingCustomer}
                  className="p-2 hover:bg-zinc-900 rounded-xl transition-colors text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingCustomer(true);
                
                const formData = new FormData(e.currentTarget);
                const aliasValue = (formData.get('alias') as string) || '';
                const newCustomer: any = {
                  name: formData.get('name') as string,
                  alias: aliasValue,
                  address: formData.get('address') as string,
                  phone: formData.get('phone') as string,
                  tier: (formData.get('tier') as string)?.toLowerCase() || 'frequent',
                  geolocation_url: formData.get('geolocation_url') as string,
                };

                try {
                  const { error } = await supabase
                    .from('customers')
                    .insert([newCustomer]);

                  if (error) throw error;
                  
                  await fetchCustomers();
                  
                  setNewOrder({
                    ...newOrder,
                    customer_name: newCustomer.name,
                    address: newCustomer.address
                  });
                  
                  setShowNewCustomerModal(false);
                } catch (error: any) {
                  console.warn('Fallo inicial con campo alias en Dashboard, intentando fallback sin la columna alias...', error);
                  try {
                    const fallbackCustomer = {
                      ...newCustomer,
                      name: newCustomer.name + (aliasValue ? ` (${aliasValue})` : '')
                    };
                    delete fallbackCustomer.alias;

                    const { error: fallbackError } = await supabase
                      .from('customers')
                      .insert([fallbackCustomer]);

                    if (fallbackError) throw fallbackError;

                    await fetchCustomers();
                    
                    setNewOrder({
                      ...newOrder,
                      customer_name: fallbackCustomer.name,
                      address: fallbackCustomer.address
                    });
                    
                    setShowNewCustomerModal(false);
                  } catch (fallbackErr: any) {
                    alert('ERROR AL GUARDAR CLIENTE: ' + (fallbackErr.message || 'Error desconocido'));
                  }
                } finally {
                  setIsSavingCustomer(false);
                }
              }} className="space-y-4 bg-zinc-950">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre Completo / Razón Social</label>
                  <input name="name" required type="text" placeholder="Ej. Juan Pérez / Residencial Palmas" className="w-[100%] bg-zinc-900 border border-zinc-850 text-white placeholder-zinc-500 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C] transition-all font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Alias / Identificador Corto (Opcional)</label>
                  <input name="alias" type="text" placeholder="Ej. Palmas 3, Ofi Carlos, Don Pedro" className="w-[100%] bg-zinc-900 border border-zinc-850 text-white placeholder-zinc-500 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C] transition-all font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Dirección de Entrega</label>
                  <input name="address" required type="text" placeholder="Ej. Calle Palmas #123, Santa Fe" className="w-[100%] bg-zinc-900 border border-zinc-850 text-white placeholder-zinc-500 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C] transition-all font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Teléfono</label>
                    <input name="phone" required type="tel" placeholder="55 1234 5678" className="w-[100%] bg-zinc-900 border border-zinc-850 text-white placeholder-zinc-500 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C] transition-all font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nivel</label>
                    <select name="tier" className="w-[100%] bg-zinc-900 border border-zinc-850 text-white p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C] transition-all font-bold appearance-none">
                      <option value="frequent" className="bg-zinc-900 text-white">Frecuente</option>
                      <option value="vip" className="bg-zinc-900 text-white">VIP</option>
                      <option value="company" className="bg-zinc-900 text-white">Empresa</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Link de Ubicación (Google Maps / Waze)</label>
                  <input 
                    name="geolocation_url"
                    type="url" 
                    placeholder="https://maps.google.com/..." 
                    className="w-[100%] bg-zinc-900 border border-zinc-850 text-white placeholder-zinc-500 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C] transition-all font-bold" 
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSavingCustomer}
                  className="w-full bg-[#C32A2C] text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-[#C32A2C]/20 hover:bg-[#a12022] transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSavingCustomer ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Guardar Cliente y Asociar'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
