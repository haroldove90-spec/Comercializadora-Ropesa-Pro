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
    { label: 'Pedidos Hoy', value: orders.length.toString(), subValue: 'Total', color: 'text-slate-900' },
    { label: 'Pdtes de Asignar', value: orders.filter(o => o.status === 'pending').length.toString(), subValue: '! Acción Requerida', color: 'text-amber-600', trendColor: 'text-amber-600' },
    { label: 'En Ruta', value: orders.filter(o => o.status === 'assigned').length.toString(), subValue: 'Activos', color: 'text-sky-600' },
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
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic leading-none">Gestión de <span className="text-sky-500">Pedidos</span></h1>
          <p className="text-slate-500 mt-2 font-bold italic uppercase text-[10px] tracking-wider">Centro de despacho y asignación en tiempo real</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 shrink-0"
          >
            <Plus size={18} /> Registrar Venta/Ped.
          </button>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o dirección..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm font-bold text-sm"
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
            className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm overflow-hidden relative group"
          >
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
              <span className={`text-[10px] font-black uppercase ${stat.trendColor || 'text-slate-500/50'}`}>
                {stat.subValue}
              </span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform">
              <Package size={80} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-black text-slate-800 uppercase italic flex items-center gap-3">
            <Truck size={20} className="text-sky-500" />
            Control de Despacho
          </h2>
          <div className="flex items-center gap-2">
            {selectedOrderIds.length > 0 && userRole === 'admin' && (
              <button
                onClick={handleBulkDeleteOrders}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3.5 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95"
              >
                <Trash2 size={12} className="text-rose-500 animate-pulse" />
                Eliminar Seleccionados ({selectedOrderIds.length})
              </button>
            )}
            <button
              onClick={handleExportGlobal}
              className="flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 px-3.5 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95"
              title="Exportar todos los pedidos de la lista actual"
            >
              <Download size={12} className="text-sky-500 animate-pulse" />
              Exportar Todo ({filteredOrders.length})
            </button>
            <span className="text-[10px] bg-slate-800 text-white px-3 py-1.5 rounded-xl font-black uppercase tracking-widest whitespace-nowrap">
              {filteredOrders.length} Resultados
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 uppercase text-[9px] font-black tracking-[0.2em] border-b border-slate-50">
              <tr>
                {userRole === 'admin' && (
                  <th className="px-8 py-5 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-slate-200 accent-sky-500 cursor-pointer w-4 h-4"
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
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-sky-50/20 transition-colors group">
                  {userRole === 'admin' && (
                    <td className="px-8 py-6 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-slate-200 accent-sky-500 cursor-pointer w-4 h-4"
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
                    <p className="font-black text-slate-800 uppercase italic leading-none">{order.customer_name}</p>
                    <p className="text-[11px] text-slate-400 font-bold mt-2 flex items-center gap-1.5 leading-tight">
                      <MapPin size={12} className="text-rose-400" /> {order.address}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-500 italic max-w-[200px] truncate">{order.items}</p>
                  </td>
                  <td className="px-8 py-6">
                    {order.assigned_to_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center text-sky-600">
                          <Users size={14} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-tight text-slate-700">{order.assigned_to_name}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] inline-flex items-center gap-2 ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'assigned' ? 'bg-sky-100 text-sky-700' :
                      'bg-slate-100 text-slate-500 animate-pulse'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'delivered' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                      {order.status === 'assigned' ? 'En Ruta' : order.status === 'delivered' ? (order.source === 'local' ? 'Venta Local' : 'Entregado') : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleExportIndividual(order); }}
                        className="p-2 text-slate-300 hover:text-sky-500 transition-colors"
                        title="Exportar Reporte Individual"
                      >
                        <Download size={16} />
                      </button>
                      {userRole === 'admin' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id, order.customer_name); }}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          title="Eliminar Pedido"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {order.status === 'pending' ? (
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="bg-sky-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-200 hover:bg-sky-600 transition-all active:scale-95 flex items-center gap-2"
                        >
                          <UserPlus size={14} /> Asignar
                        </button>
                      ) : (
                        <button className="text-slate-300 hover:text-sky-500 p-2 transition-colors">
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
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[48px] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-10 pb-0 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase italic">Despachar <span className="text-sky-500">Pedido</span></h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Cliente: {selectedOrder.customer_name}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-rose-500">
                  <X />
                </button>
              </div>

              <div className="p-10 pt-8 space-y-6">
                <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Choferes Activos</span>
                    <span className="text-lg font-black text-slate-800">{drivers.length}</span>
                  </div>
                  <Truck size={32} className="text-sky-500 opacity-20" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Seleccionar Vendedor</label>
                  <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {drivers.map(driver => (
                      <button
                        key={driver.id}
                        disabled={isAssigning}
                        onClick={() => handleAssignOrder(driver.id, driver.name)}
                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-sky-500 hover:shadow-lg hover:shadow-sky-500/10 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                            <Users size={18} />
                          </div>
                          <span className="font-bold text-slate-700 italic uppercase">{driver.name}</span>
                        </div>
                        <Send size={16} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
                      </button>
                    ))}
                    {drivers.length === 0 && (
                      <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl mt-4">
                         <Users size={32} className="mx-auto mb-3 opacity-20 text-slate-400" />
                         <p className="text-[10px] font-black uppercase tracking-widest">No hay choferes disponibles</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-full p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 mt-4"
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
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] md:w-full max-w-xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-y-auto max-h-[90vh] md:max-h-auto"
            >
              <div className="p-8 pb-4 flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 uppercase italic">Registrar <span className="text-sky-500">Venta/Pedido</span></h2>
                <button onClick={() => setShowRegisterModal(false)} className="p-2 text-slate-400 hover:text-slate-800">
                  <X />
                </button>
              </div>

              <form onSubmit={handleRegisterOrder} className="p-8 pt-4 grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Fuente del Registro</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'local', label: 'Local', icon: Store, color: 'bg-emerald-500', disabled: false },
                      { id: 'phone', label: 'Teléfono', icon: Phone, color: 'bg-sky-500', disabled: false },
                      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500', disabled: true }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        type="button"
                        disabled={btn.disabled}
                        onClick={() => setNewOrder({...newOrder, source: btn.id as any})}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                          btn.disabled 
                            ? 'opacity-40 cursor-not-allowed border-slate-50 bg-slate-50 text-slate-300'
                            : newOrder.source === btn.id 
                              ? `border-transparent text-white ${btn.color}` 
                              : 'border-slate-50 text-slate-400 bg-slate-50 hover:bg-slate-100'
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nombre del Cliente</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerModal(true)}
                      className="text-[10px] font-black text-sky-500 hover:text-sky-600 uppercase tracking-wider flex items-center gap-1 transition-colors"
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
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                  
                  {showCustomerDropdown && (
                    <div className="absolute left-0 right-0 z-[110] mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                      <div className="p-2 border-b border-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-wider">
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
                            className="w-full text-left p-3 hover:bg-slate-50 flex flex-col transition-colors border-b border-slate-50 last:border-none"
                          >
                            <span className="font-bold text-xs text-slate-800">{c.name}</span>
                            <span className="text-[10px] font-medium text-slate-400">{c.address || 'Sin dirección'}</span>
                          </button>
                        ))}
                      {customers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400 font-bold">
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Dirección de Entrega</label>
                    <input 
                      required
                      type="text"
                      value={newOrder.address}
                      onChange={(e) => setNewOrder({...newOrder, address: e.target.value})}
                      placeholder="Calle, Colonia, CP"
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Detalle de Productos</label>
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
                        className="bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
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
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-sky-500 outline-none h-20 resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Total ($)</label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={newOrder.total_price}
                      onChange={(e) => setNewOrder({...newOrder, total_price: e.target.value})}
                      placeholder="0.00"
                      className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-sky-500 outline-none text-xl"
                    />
                  </div>
                </div>

                {newOrder.source !== 'local' && (
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Asignar Vendedor (Opcional)</label>
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
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                    >
                      <option value="">Pendiente de Asignar</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
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
                    className="flex-1 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSavingOrder}
                    className="flex-[2] bg-sky-500 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-2"
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 z-[121]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase italic">Alta de <span className="text-sky-500">Cliente (Pedido)</span></h3>
                <button 
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  disabled={isSavingCustomer}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} className="text-slate-400" />
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
              }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo / Razón Social</label>
                  <input name="name" required type="text" placeholder="Ej. Juan Pérez / Residencial Palmas" className="w-[100%] bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alias / Identificador Corto (Opcional)</label>
                  <input name="alias" type="text" placeholder="Ej. Palmas 3, Ofi Carlos, Don Pedro" className="w-[100%] bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección de Entrega</label>
                  <input name="address" required type="text" placeholder="Ej. Calle Palmas #123, Santa Fe" className="w-[100%] bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                    <input name="phone" required type="tel" placeholder="55 1234 5678" className="w-[100%] bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel</label>
                    <select name="tier" className="w-[100%] bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold appearance-none">
                      <option value="frequent">Frecuente</option>
                      <option value="vip">VIP</option>
                      <option value="company">Empresa</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link de Ubicación (Google Maps / Waze)</label>
                  <input 
                    name="geolocation_url"
                    type="url" 
                    placeholder="https://maps.google.com/..." 
                    className="w-[100%] bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" 
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSavingCustomer}
                  className="w-full bg-sky-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2"
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
