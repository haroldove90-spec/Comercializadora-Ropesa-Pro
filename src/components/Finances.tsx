import React, { useState, useEffect } from 'react';
import { exportToPDF } from '../utils/pdfExport';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  AlertCircle, 
  Truck, 
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PieChart as PieChartIcon,
  Users,
  ShoppingBag,
  History,
  Store,
  ChevronRight,
  MoreVertical,
  Plus,
  ShieldCheck,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Loader2,
  Trash2,
  Edit3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const SALES_DATA = [
  { day: 'Lun', sales: 4500, orders: 42 },
  { day: 'Mar', sales: 5200, orders: 48 },
  { day: 'Mie', sales: 4800, orders: 45 },
  { day: 'Jue', sales: 6100, orders: 55 },
  { day: 'Vie', sales: 5900, orders: 53 },
  { day: 'Sab', sales: 7200, orders: 65 },
  { day: 'Dom', sales: 4000, orders: 38 },
];

const CHANNEL_DATA = [
  { name: 'WhatsApp', value: 45, color: '#C32A2C' },
  { name: 'Ruta 1 (Norte)', value: 25, color: '#f43f5e' },
  { name: 'Ruta 2 (Sur)', value: 20, color: '#881337' },
  { name: 'Mostrador', value: 10, color: '#27272a' },
];

const GLOBAL_SALES = [
  { id: 'T-9821', customer: 'Abarrotes Doña Mari', amount: 450, method: 'Efectivo', time: '14:20', items: '10 Garrafones' },
  { id: 'T-9822', customer: 'Residencial Latitud', amount: 1250, method: 'Transferencia', time: '14:45', items: '25 Garrafones' },
  { id: 'T-9823', customer: 'Gimnasio Sport City', amount: 360, method: 'Efectivo', time: '15:10', items: '8 Garrafones' },
  { id: 'T-9824', customer: 'Venta Mostrador', amount: 90, method: 'Efectivo', time: '15:30', items: '2 Garrafones' },
  { id: 'T-9825', customer: 'Oficinas BBVA', amount: 2400, method: 'Transferencia', time: '16:00', items: '50 Garrafones' },
];

const SELLER_PERFORMANCE = [
  { name: 'Carlos Ruiz', sales: 8420, orders: 24, efficiency: '98%', status: 'active' },
  { name: 'Mario Santos', sales: 7150, orders: 19, efficiency: '94%', status: 'active' },
  { name: 'Ana Lopez', sales: 4200, orders: 12, efficiency: '100%', status: 'on_break' },
];

const CLIENT_MANAGEMENT = [
  { id: 'C1', name: 'Residencial Latitud', neighborhood: 'Santa Fe', tier: 'VIP', totalOrders: 145, lastActivity: 'Hoy' },
  { id: 'C2', name: 'Abarrotes Doña Mari', neighborhood: 'Polanco', tier: 'Frecuente', totalOrders: 82, lastActivity: 'Ayer' },
  { id: 'C3', name: 'Gimnasio Sport City', neighborhood: 'Roma Norte', tier: 'Frecuente', totalOrders: 45, lastActivity: 'Hace 3 días' },
  { id: 'C4', name: 'Oficinas BBVA', neighborhood: 'Juarez', tier: 'VIP', totalOrders: 12, lastActivity: 'Hoy' },
];

type Tab = 'metrics' | 'sales' | 'customers' | 'driver_sales' | 'plant_cut';

interface FinancesProps {
  initialTab?: Tab;
  userRole: string | null;
  userName?: string | null;
}

export default function Finances({ initialTab = 'metrics', userRole, userName }: FinancesProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [isExporting, setIsExporting] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [isFinalizingCut, setIsFinalizingCut] = useState(false);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  const norm = (s?: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const namesMatch = (n1?: string, n2?: string) => {
    if (!n1 || !n2) return false;
    const s1 = norm(n1);
    const s2 = norm(n2);
    return s1.includes(s2) || s2.includes(s1);
  };

  const getFilteredCustomers = () => {
    let list = customersList.length > 0 ? customersList : CLIENT_MANAGEMENT;
    if (customerFilter.trim()) {
      const q = norm(customerFilter);
      list = list.filter(c => 
        norm(c.name).includes(q) || 
        norm(c.alias).includes(q) || 
        norm(c.address || c.neighborhood).includes(q) || 
        norm(c.phone).includes(q)
      );
    }
    return list;
  };

  const getFilteredSales = () => {
    let list = salesList;

    // Filter by role if not admin
    if (userRole === 'driver' && userName) {
      list = list.filter(sale => namesMatch(sale.assigned_to_name, userName));
    } else if (userRole === 'operator') {
      // Operator (Planta) roles see counter sales (Mostrador/POS) or general plant sales
      list = list.filter(sale => 
        !sale.assigned_to_name || 
        namesMatch(sale.assigned_to_name, 'Mostrador') || 
        sale.source === 'local' || 
        sale.source === 'pos'
      );
    }

    // Filter by search query
    if (salesSearch.trim()) {
      const q = norm(salesSearch);
      list = list.filter(sale => 
        norm(sale.id).includes(q) || 
        norm(sale.customer_name).includes(q) || 
        norm(sale.items).includes(q) ||
        norm(sale.assigned_to_name).includes(q)
      );
    }

    return list;
  };

  useEffect(() => {
    setActiveTab(initialTab);
    if (activeTab === 'customers') {
      fetchCustomers();
      
      const channel = supabase
        .channel('customers_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
          fetchCustomers();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    if (activeTab === 'driver_sales') {
      fetchEmployees();
      
      const channel = supabase
        .channel('employees_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
          fetchEmployees();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    if (activeTab === 'sales') {
      fetchSales();
      
      const channel = supabase
        .channel('sales_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchSales();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [initialTab, activeTab]);

  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setSalesList(data);
      }
    } catch (err) {
      console.warn('Error fetching sales:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setEmployeesList(data);
      }
    } catch (err) {
      console.warn('Error fetching employees:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setCustomersList(data);
      }
    } catch (err) {
      console.warn('Error fetching customers:', err);
    }
  };

  const handleExport = (type: string) => {
    setIsExporting(true);
    
    try {
      let columns: string[] = [];
      let data: any[][] = [];
      let filename = '';

      if (activeTab === 'sales') {
        filename = 'Reporte_Ventas';
        columns = ['Folio', 'Cliente', 'Cobrado Por', 'Productos/Items', 'Fuente', 'Monto', 'Fecha/Hora'];
        const listToExport = getFilteredSales();
        data = listToExport.map(s => [
          s.id.slice(0, 8).toUpperCase(),
          s.customer_name || 'Venta Mostrador',
          s.assigned_to_name || 'Mostrador',
          s.items || '',
          s.source === 'local' ? 'Planta' : s.source === 'whatsapp' ? 'WhatsApp' : s.source === 'pos' ? 'Venta POS' : 'Teléfono',
          `$${Number(s.total_price || 0).toFixed(2)}`,
          new Date(s.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
        ]);
      } else if (activeTab === 'customers') {
        filename = 'Directorio_Clientes';
        columns = ['Nombre', 'Zona', 'Nivel', 'Pedidos'];
        const list = customersList.length > 0 ? customersList : CLIENT_MANAGEMENT;
        data = list.map(c => [c.name, c.address || c.neighborhood, c.tier, c.totalOrders || '0']);
      } else if (activeTab === 'driver_sales') {
        filename = 'Directorio_Empleados';
        columns = ['Nombre', 'Rol', 'Teléfono', 'Estatus'];
        const list = employeesList.length > 0 ? employeesList : SELLER_PERFORMANCE;
        data = list.map(e => [e.name, e.role, e.phone || '-', e.status || 'active']);
      } else {
        // Fallback for Metrics
        filename = 'Metricas_Operativas';
        columns = ['Dia', 'Ventas', 'Pedidos'];
        data = SALES_DATA.map(d => [d.day, `$${d.sales}`, d.orders]);
      }

      exportToPDF({
        title: `Reporte: ${type}`,
        subtitle: `Generado el ${new Date().toLocaleDateString()} - Sistema Admin QualityWater`,
        columns,
        data,
        filename
      });
    } catch (error) {
      console.error('PDF Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNewCustomerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingCustomer(true);
    
    const formData = new FormData(e.currentTarget);
    const aliasValue = (formData.get('alias') as string) || '';
    const customerData: any = {
      name: formData.get('name') as string,
      alias: aliasValue,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      tier: (formData.get('tier') as string)?.toLowerCase() || 'frequent',
      geolocation_url: formData.get('geolocation_url') as string,
    };

    try {
      if (editingCustomer) {
        console.log('Intentando actualizar cliente:', customerData);
        // If it was a mock customer list edit (its id might start with C instead of standard UUID format)
        if (editingCustomer.id && editingCustomer.id.startsWith('C')) {
          const { error } = await supabase
            .from('customers')
            .insert([customerData]);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', editingCustomer.id);
          if (error) throw error;
        }
        console.log('Cliente actualizado con éxito');
      } else {
        console.log('Intentando guardar cliente:', customerData);
        const { error } = await supabase
          .from('customers')
          .insert([customerData]);

        if (error) throw error;
        console.log('Cliente guardado con éxito');
      }
      
      await fetchCustomers();
      handleCloseCustomerModal();
    } catch (error: any) {
      console.warn('Fallo inicial con campo alias, intentando fallback sin la columna alias...', error);
      // Fallback: If 'alias' column does not exist on the database table 'customers',
      // we remove 'alias' and append it to the client name so information is saved successfully.
      try {
        const fallbackData = {
          ...customerData,
          name: customerData.name + (aliasValue ? ` (${aliasValue})` : '')
        };
        delete fallbackData.alias;

        if (editingCustomer) {
          if (editingCustomer.id && editingCustomer.id.startsWith('C')) {
            const { error } = await supabase.from('customers').insert([fallbackData]);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('customers').update(fallbackData).eq('id', editingCustomer.id);
            if (error) throw error;
          }
        } else {
          const { error } = await supabase.from('customers').insert([fallbackData]);
          if (error) throw error;
        }
        console.log('Cliente guardado con éxito mediante fallback de nombre');
        await fetchCustomers();
        handleCloseCustomerModal();
      } catch (fallbackError: any) {
        console.error('Failure saving fallback client:', fallbackError);
        alert('ERROR AL GUARDAR CLIENTE: ' + (fallbackError.message || 'Error desconocido'));
      }
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleStartEditCustomer = (client: any) => {
    const preparedClient = {
      id: client.id,
      name: client.name,
      address: client.address || client.neighborhood || '',
      phone: client.phone || '',
      tier: client.tier || 'frequent',
      geolocation_url: client.geolocation_url || ''
    };
    setEditingCustomer(preparedClient);
    setShowNewCustomerModal(true);
  };

  const handleCloseCustomerModal = () => {
    setShowNewCustomerModal(false);
    setEditingCustomer(null);
  };

  const handleNewEmployeeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingEmployee(true);
    
    const formData = new FormData(e.currentTarget);
    const newEmployee = {
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      phone: formData.get('phone') as string,
      status: 'active'
    };

    try {
      console.log('Intentando guardar empleado:', newEmployee);
      const { error } = await supabase
        .from('employees')
        .insert([newEmployee]);

      if (error) {
        console.error('Error detallado de Supabase (empleados):', error);
        throw error;
      }
      
      console.log('Empleado guardado con éxito');
      await fetchEmployees();
      setShowNewEmployeeModal(false);
      
      // Notificación opcional (la envolvemos en try/catch para que no bloquee el flujo principal)
      try {
        await supabase.from('notifications_log').insert({
          title: 'Nuevo Empleado',
          message: `${newEmployee.name} se ha unido como ${newEmployee.role}`,
          type: 'system',
          user_role: 'admin'
        });
      } catch (notifErr) {
        console.warn('No se pudo crear la notificación:', notifErr);
      }

    } catch (error: any) {
      console.error('Error al guardar empleado:', error);
      alert('ERROR AL GUARDAR EMPLEADO: ' + (error.message || 'Error desconocido') + '\n\nVerifica si la tabla "employees" existe y tiene políticas RLS habilitadas para inserción.');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleFinalizeCut = () => {
    setIsFinalizingCut(true);
    setTimeout(() => {
      setIsFinalizingCut(false);
    }, 2000);
  };

  const handleDeleteSale = async (id: string, customer: string) => {
    if (!confirm(`¿Eliminar registro de venta de ${customer}?`)) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchSales();
  };

  const handleBulkDeleteSales = async () => {
    if (selectedSaleIds.length === 0) return;
    if (!confirm(`¿Eliminar los ${selectedSaleIds.length} registros de venta seleccionados?`)) return;
    const { error } = await supabase.from('orders').delete().in('id', selectedSaleIds);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      setSelectedSaleIds([]);
      fetchSales();
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar cliente ${name}?`)) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchCustomers();
  };

  const handleBulkDeleteCustomers = async () => {
    if (selectedCustomerIds.length === 0) return;
    if (!confirm(`¿Eliminar los ${selectedCustomerIds.length} clientes seleccionados?`)) return;
    const { error } = await supabase.from('customers').delete().in('id', selectedCustomerIds);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      setSelectedCustomerIds([]);
      fetchCustomers();
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar empleado ${name}?`)) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchEmployees();
  };

  const handleBulkDeleteEmployees = async () => {
    if (selectedEmployeeIds.length === 0) return;
    if (!confirm(`¿Eliminar los ${selectedEmployeeIds.length} empleados seleccionados?`)) return;
    const { error } = await supabase.from('employees').delete().in('id', selectedEmployeeIds);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      setSelectedEmployeeIds([]);
      fetchEmployees();
    }
  };

  const handleUpdateEmployeeRole = async (id: string, newRole: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ role: newRole })
      .eq('id', id);
    
    if (error) {
      alert('Error al actualizar rol: ' + error.message);
    } else {
      fetchEmployees();
    }
  };

  const handleUpdateEmployeeStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) {
      alert('Error al actualizar estatus: ' + error.message);
    } else {
      fetchEmployees();
    }
  };

  const liquidations = [
    { driver: 'Carlos Ruiz', route: 'Ruta 1', out: 120, delivered: 115, inTruck: 5, expectedCash: 5175, actualCash: 5175, status: 'ok', orders: 18 },
    { driver: 'Mario Santos', route: 'Ruta 2', out: 95, delivered: 88, inTruck: 4, expectedCash: 3960, actualCash: 3915, status: 'faltante', orders: 15 },
    { driver: 'Ana Lopez', route: 'Ruta 3', out: 50, delivered: 50, inTruck: 0, expectedCash: 2250, actualCash: 2250, status: 'ok', orders: 10 },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-12 text-white">
      {/* Header with Title and Global Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none italic uppercase">
            {activeTab === 'sales' 
              ? (userRole === 'driver' ? 'Mis Ventas' : userRole === 'operator' ? 'Ventas Planta' : 'Ventas') 
              : 'Quality'} 
            <span className="text-[#C32A2C]">
              {activeTab === 'sales' 
                ? (userRole === 'driver' || userRole === 'operator' ? ' del Día' : ' Globales') 
                : ' Admin'}
            </span>
          </h1>
          <p className="text-zinc-400 mt-2 font-bold flex items-center gap-2 text-xs uppercase tracking-wider">
            <ShieldCheck size={16} className="text-[#C32A2C]" />
            Control de Misión &bull; Ropesa System
          </p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button 
            onClick={() => handleExport('Ventas Mensuales')}
            disabled={isExporting}
            className="flex items-center gap-2 bg-[#C32A2C] hover:bg-[#a12022] text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-xl transition-all active:scale-95 uppercase tracking-widest shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            PDF Mensual
          </button>
        </div>
      </div>

      {/* Tabs handled by sidebar navigation */}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Volumen Total', value: '1,240', sub: 'Galones', icon: ShoppingBag, color: 'text-[#C32A2C]', trend: '+15%', trendUp: true },
                  { label: 'Ventas Hoy', value: '$14,580', sub: 'Calculado', icon: DollarSign, color: 'text-emerald-500', trend: '+8%', trendUp: true },
                  { label: 'Ticket Prom.', value: '$240', sub: 'MXN', icon: TrendingUp, color: 'text-[#C32A2C]', trend: '-2%', trendUp: false },
                  { label: 'Nuevos', value: '12', sub: 'Registros', icon: Users, color: 'text-[#C32A2C]', trend: '+4', trendUp: true },
                ].map((stat, i) => (
                  <div key={i} className="bg-zinc-950 p-5 rounded-3xl border border-zinc-900 shadow-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                        <stat.icon size={16} className="text-[#C32A2C]" />
                      </div>
                      <span className={`text-[10px] font-black flex items-center gap-0.5 ${stat.trendUp ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {stat.trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-white leading-none">{stat.value}</p>
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-zinc-950 p-6 rounded-[32px] border border-zinc-900 shadow-xl">
                  <h3 className="font-black text-white mb-6 uppercase text-[10px] tracking-widest">Rendimiento Histórico (Ventas x Día)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={SALES_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', borderRadius: '16px', border: '1px solid #27272a', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} />
                        <Bar dataKey="sales" fill="#C32A2C" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-zinc-950 p-6 rounded-[32px] border border-zinc-900 shadow-xl flex flex-col items-center">
                  <h3 className="font-black text-white mb-6 uppercase text-[10px] tracking-widest w-full">Canales de Pedido</h3>
                  <div className="h-48 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={CHANNEL_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="value" paddingAngle={4}>
                          {CHANNEL_DATA.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 w-full">
                    {CHANNEL_DATA.map((item, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[10px] font-black uppercase text-zinc-500">{item.name}</span>
                        </div>
                        <span className="text-sm font-black text-white">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">
                      {userRole === 'driver' ? 'Mis Registros de Ventas' : userRole === 'operator' ? 'Historial de Caja / Ventas Planta' : 'Métricas de Ventas'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      {userRole === 'driver' 
                        ? `Mostrando únicamente tus ventas registradas hoy como ${userName || 'Repartidor'}`
                        : userRole === 'operator'
                        ? 'Mostrando las ventas de mostrador / planta registradas en el día'
                        : 'Mostrando todas las ventas entregadas y liquidadas en el sistema'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {loadingSales && <Loader2 size={16} className="animate-spin text-[#C32A2C]" />}
                    {selectedSaleIds.length > 0 && userRole === 'admin' && (
                      <button
                        onClick={handleBulkDeleteSales}
                        className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3.5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all"
                      >
                        <Trash2 size={12} className="text-rose-500" />
                        Eliminar ({selectedSaleIds.length})
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleExport('Venta_Filtro')}
                        className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all shrink-0"
                      >
                        <Download size={12} /> Exportar PDF
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Buscar folio o cliente..." 
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#C32A2C]/20"
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto text-center">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <tr>
                        {userRole === 'admin' && (
                          <th className="px-6 py-4 w-10">
                            <input
                              type="checkbox"
                              className="rounded border-slate-200 accent-[#C32A2C] cursor-pointer w-4 h-4"
                              checked={getFilteredSales().length > 0 && selectedSaleIds.length === getFilteredSales().length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSaleIds(getFilteredSales().map(s => s.id));
                                } else {
                                  setSelectedSaleIds([]);
                                }
                              }}
                            />
                          </th>
                        )}
                        <th className="px-6 py-4">Ref / Hora</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Cobrado Por</th>
                        <th className="px-6 py-4">Items / Dirección</th>
                        <th className="px-6 py-4">Fuente</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        {userRole === 'admin' && <th className="px-6 py-4 text-right">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {getFilteredSales().length > 0 ? getFilteredSales().map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                          {userRole === 'admin' && (
                            <td className="px-6 py-4 w-10">
                              <input
                                type="checkbox"
                                className="rounded border-slate-200 accent-[#C32A2C] cursor-pointer w-4 h-4"
                                checked={selectedSaleIds.includes(sale.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSaleIds(prev => [...prev, sale.id]);
                                  } else {
                                    setSelectedSaleIds(prev => prev.filter(id => id !== sale.id));
                                  }
                                }}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <p className="font-black text-[#C32A2C] text-xs">{sale.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-black text-slate-800 uppercase italic leading-none">{sale.customer_name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-black uppercase text-slate-600 italic">
                              {sale.assigned_to_name || 'Mostrador'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] text-slate-500 font-black uppercase">{sale.items}</p>
                            <p className="text-[9px] text-slate-400 font-bold italic truncate w-40">{sale.address}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                              sale.source === 'local' ? 'bg-emerald-100 text-emerald-700' : 
                              sale.source === 'whatsapp' ? 'bg-green-100 text-green-700' : 
                              'bg-rose-150 text-[#C32A2C]'
                            }`}>
                              {sale.source === 'local' ? 'Planta' : sale.source === 'whatsapp' ? 'WhatsApp' : 'Teléfono'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="font-black text-slate-900">${sale.total_price.toFixed(2)}</p>
                          </td>
                          {userRole === 'admin' && (
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDeleteSale(sale.id, sale.customer_name)}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      )) : !loadingSales && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                            <History size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="font-black uppercase text-[10px] tracking-widest">No hay ventas registradas hoy</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Base de Datos de Clientes</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Buscador y directorio completo de nombres, alias y zonas</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedCustomerIds.length > 0 && userRole === 'admin' && (
                    <button
                      onClick={handleBulkDeleteCustomers}
                      className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3.5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all"
                    >
                      <Trash2 size={12} className="text-rose-500" />
                      Eliminar ({selectedCustomerIds.length})
                    </button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, alias o zona..."
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all w-56 placeholder-slate-400"
                    />
                    {customerFilter && (
                      <button
                        onClick={() => setCustomerFilter('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-extrabold"
                      >
                        [x]
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => handleExport('Cartera de Clientes')}
                    className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    <Download size={14} /> Exportar
                  </button>
                  <button 
                    onClick={() => {
                      setEditingCustomer(null);
                      setShowNewCustomerModal(true);
                    }}
                    className="flex items-center gap-2 bg-[#C32A2C] text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#C32A2C]/20 active:scale-95 transition-all shrink-0 hover:bg-[#a12022]"
                  >
                    <Plus size={16} /> Alta de Cliente
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <tr>
                      {userRole === 'admin' && (
                        <th className="px-6 py-4 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-slate-200 accent-[#C32A2C] cursor-pointer w-4 h-4"
                            checked={getFilteredCustomers().length > 0 && selectedCustomerIds.length === getFilteredCustomers().length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomerIds(getFilteredCustomers().map(c => c.id));
                              } else {
                                setSelectedCustomerIds([]);
                              }
                            }}
                          />
                        </th>
                      )}
                      <th className="px-6 py-4">Nombre / Zona / Alias</th>
                      <th className="px-6 py-4">Suscripción</th>
                      <th className="px-6 py-4">Acumulado</th>
                      <th className="px-6 py-4">Ultimo Pedido</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {getFilteredCustomers().map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                        {userRole === 'admin' && (
                          <td className="px-6 py-4 w-10">
                            <input
                              type="checkbox"
                              className="rounded border-slate-200 accent-[#C32A2C] cursor-pointer w-4 h-4"
                              checked={selectedCustomerIds.includes(client.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCustomerIds(prev => [...prev, client.id]);
                                } else {
                                  setSelectedCustomerIds(prev => prev.filter(id => id !== client.id));
                                }
                              }}
                            />
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-slate-800 text-sm">{client.name}</p>
                            {client.alias && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 shadow-sm border border-amber-200">
                                {client.alias}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            {client.address || client.neighborhood || 'Sin zona'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            client.tier?.toUpperCase() === 'VIP' ? 'bg-amber-100 text-amber-700' : 'bg-rose-50 text-rose-600 border border-rose-105'
                          }`}>
                            {client.tier || 'Frecuente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-slate-800">
                          {client.totalOrders || '0'} Entregas
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase italic">
                          {client.lastActivity || 'Hoy'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleStartEditCustomer(client)}
                              className="p-2 text-slate-300 hover:text-[#C32A2C] transition-colors"
                              title="Ver / Editar"
                            >
                              <Edit3 size={16} />
                            </button>
                            {userRole === 'admin' && (
                              <button 
                                onClick={() => handleDeleteCustomer(client.id, client.name)}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {getFilteredCustomers().length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400">
                          <p className="font-black uppercase text-[10px] tracking-widest mb-1 italic">No se encontraron clientes</p>
                          <p className="text-xs">Usa otro término de búsqueda o registra un nuevo cliente arriba.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'driver_sales' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Gestión de Capital Humano</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest leading-none">Administración de puestos y accesos</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedEmployeeIds.length > 0 && userRole === 'admin' && (
                      <button
                        onClick={handleBulkDeleteEmployees}
                        className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3.5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all"
                      >
                        <Trash2 size={12} className="text-rose-500" />
                        Eliminar ({selectedEmployeeIds.length})
                      </button>
                    )}
                    <button 
                      onClick={() => handleExport('Directorio de Empleados')}
                      className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      <Download size={14} /> Exportar
                    </button>
                    <button 
                      onClick={() => setShowNewEmployeeModal(true)}
                      className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all shrink-0"
                    >
                      <Plus size={16} /> Alta de Empleado
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <tr>
                        {userRole === 'admin' && (
                          <th className="px-6 py-4 w-10">
                            <input
                              type="checkbox"
                              className="rounded border-slate-200 accent-[#C32A2C] cursor-pointer w-4 h-4"
                              checked={employeesList.length > 0 && selectedEmployeeIds.length === employeesList.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmployeeIds(employeesList.map(emp => emp.id));
                                } else {
                                  setSelectedEmployeeIds([]);
                                }
                              }}
                            />
                          </th>
                        )}
                        <th className="px-6 py-4">Empleado / Cargo</th>
                        <th className="px-6 py-4">Teléfono</th>
                        <th className="px-6 py-4">Ingreso</th>
                        <th className="px-6 py-4">Estatus</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {employeesList.length > 0 ? employeesList.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          {userRole === 'admin' && (
                            <td className="px-6 py-4 w-10">
                              <input
                                type="checkbox"
                                className="rounded border-slate-200 accent-[#C32A2C] cursor-pointer w-4 h-4"
                                checked={selectedEmployeeIds.includes(emp.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEmployeeIds(prev => [...prev, emp.id]);
                                  } else {
                                    setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                                  }
                                }}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#C32A2C] text-white flex items-center justify-center font-black text-xs">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-sm italic">{emp.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none mt-0.5">
                                  {emp.role === 'driver' ? 'Vendedor' : emp.role}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-800">{emp.phone || 'N/A'}</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase italic">
                            {new Date(emp.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                              emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-[10px]">
                            <div className="flex items-center justify-end gap-3 font-black uppercase tracking-widest">
                              <select 
                                onChange={(e) => handleUpdateEmployeeRole(emp.id, e.target.value)}
                                value={emp.role}
                                className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 outline-none text-[#C32A2C] cursor-pointer"
                              >
                                <option value="admin">Admin</option>
                                <option value="operator">Operador</option>
                                <option value="driver">Vendedor</option>
                                <option value="client">Cliente</option>
                              </select>
                              
                              <button 
                                onClick={() => handleUpdateEmployeeStatus(emp.id, emp.status === 'active' ? 'inactive' : 'active')}
                                className={`px-2 py-1 rounded-lg border transition-all ${
                                  emp.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {emp.status === 'active' ? 'Desactivar' : 'Activar'}
                              </button>

                              {userRole === 'admin' && (
                                <button 
                                  onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                  title="Eliminar registro"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : SELLER_PERFORMANCE.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors opacity-50 italic">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center font-black text-xs italic">
                                ?
                              </div>
                              <div>
                                <p className="font-black text-slate-400 text-sm whitespace-nowrap">{emp.name} (Demo)</p>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">Vendedor</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-300">55 XXXX XXXX</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-300 uppercase italic">N/A</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-50 text-slate-300 rounded-lg text-[9px] font-black uppercase">Offline</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <X size={14} className="text-slate-200" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plant_cut' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <Store size={18} className="text-[#C32A2C]" />
                    Corte de Caja en Planta
                  </h3>
                  <button 
                    onClick={() => handleExport('Corte de Caja')}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-[#C32A2C] transition-colors"
                  >
                    <Download size={18} />
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Mostrador Hoy</p>
                      <p className="text-3xl font-black text-slate-800">$1,850.00</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                      <ShoppingBag size={24} className="text-[#C32A2C]" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Llenado de Garrafón</span>
                      <span className="text-slate-800">42 Und.</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Envase Nuevo 20L</span>
                      <span className="text-slate-800">5 Und.</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-4">
                      <span>Efectivo en Caja Planta</span>
                      <span className="text-emerald-500 font-black">$1,850.00</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleFinalizeCut}
                    disabled={isFinalizingCut}
                    className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFinalizingCut ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Conciliando...
                      </>
                    ) : (
                      'Finalizar Corte y Conciliar'
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-zinc-950 to-black p-8 rounded-[40px] text-white shadow-xl border border-zinc-900 shadow-red-500/5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-10">
                    <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md">
                      <AlertCircle size={32} />
                    </div>
                    <span className="bg-white/10 text-white px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest">Insights IA</span>
                  </div>
                  <h4 className="text-2xl font-black leading-tight mb-4">La Ruta 1 está reportando mayor eficiencia que la Ruta 2.</h4>
                  <p className="text-rose-100/70 text-sm font-bold leading-relaxed italic">
                    "Detectamos que el tiempo promedio de entrega en Carlos Ruiz es 12% menor. Considera optimizar la asignación de clientes VIP en esa zona."
                  </p>
                </div>
                
                <div className="flex items-center gap-4 mt-8 bg-white/10 p-5 rounded-3xl backdrop-blur-sm">
                  <TrendingUp size={24} className="text-emerald-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Mejora Estimada</p>
                    <p className="text-lg font-black leading-none">+$3,150.00 / Mensual</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {showNewEmployeeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingEmployee && setShowNewEmployeeModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase italic">Alta de <span className="text-[#C32A2C]">Empleado</span></h3>
                <button 
                  onClick={() => setShowNewEmployeeModal(false)}
                  disabled={isSavingEmployee}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-0"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleNewEmployeeSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Trabajador</label>
                  <input name="name" required type="text" placeholder="Ej. Juan Pérez" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all font-bold" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol / Puesto Operativo</label>
                  <select name="role" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all font-bold appearance-none">
                    <option value="driver">Chofer / Repartidor</option>
                    <option value="operator">Operador de Planta</option>
                    <option value="admin">Administrador / Supervisor</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono Móvil</label>
                  <input name="phone" required type="tel" placeholder="55 0000 0000" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all font-bold" />
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 mt-2">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed italic">
                    Al registrar un nuevo empleado, tendrá acceso a las funciones correspondientes a su rol en el dispositivo móvil de la planta.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={isSavingEmployee}
                  className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingEmployee ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Guardar Empleado'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {showNewCustomerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingCustomer && handleCloseCustomerModal()}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase italic">{editingCustomer ? 'Editar' : 'Alta de'} <span className="text-[#C32A2C]">Cliente</span></h3>
                <button 
                  onClick={handleCloseCustomerModal}
                  disabled={isSavingCustomer}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-0"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleNewCustomerSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input name="name" required type="text" defaultValue={editingCustomer?.name || ''} placeholder="Ej. Residencial Palmas" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alias / Identificador Corto (Opcional)</label>
                  <input name="alias" type="text" defaultValue={editingCustomer?.alias || ''} placeholder="Ej. Palmas 3, Ofi Carlos, Don Pedro" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colonia / Zona</label>
                  <input name="address" required type="text" defaultValue={editingCustomer?.address || ''} placeholder="Ej. Santa Fe" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                    <input name="phone" required type="tel" defaultValue={editingCustomer?.phone || ''} placeholder="55 1234 5678" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel</label>
                    <select name="tier" defaultValue={editingCustomer?.tier || 'frequent'} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all font-bold appearance-none">
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
                    defaultValue={editingCustomer?.geolocation_url || ''}
                    placeholder="https://maps.google.com/..." 
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#C32A2C]/20 transition-all font-bold" 
                  />
                </div>

                <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/30 mt-2">
                  <p className="text-[9px] text-rose-600 font-bold uppercase tracking-tight leading-relaxed italic">
                    Al guardar este cliente, se le asignará automáticamente un folio de seguimiento y se activará su historial de pedidos.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={isSavingCustomer}
                  className="w-full bg-[#C32A2C] text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-[#C32A2C]/20 hover:bg-[#a12022] transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingCustomer ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    editingCustomer ? 'Guardar Cambios' : 'Guardar Cliente'
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
