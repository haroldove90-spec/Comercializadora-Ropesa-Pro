import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  Unlock, 
  FileText, 
  TrendingUp, 
  User, 
  Plus, 
  RefreshCw, 
  Download, 
  UserPlus, 
  Trash2,
  ChevronRight,
  ClipboardList,
  Check,
  Building,
  Printer,
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { exportToPDF } from '../utils/pdfExport';

interface CashFloatProps {
  userRole?: 'admin' | 'operator' | 'driver' | 'client' | null;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  phone?: string;
  status?: string;
}

interface AttendanceRecord {
  id: string;
  user_name: string;
  user_role?: string;
  work_date: string;
  check_in?: string;
  check_out?: string;
  last_location?: any; // JSONB storage
}

interface OrderItemSummary {
  driverName: string;
  salesTotal: number;
  ordersCount: number;
}

export default function CashFloat({ userRole }: CashFloatProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [todaySales, setTodaySales] = useState<Record<string, OrderItemSummary>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeDriverSession, setActiveDriverSession] = useState<any>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // helper to match names exactly (case-insensitive, trimmed, and normalized double spaces)
  const namesMatch = (name1?: string, name2?: string): boolean => {
    if (!name1 || !name2) return false;
    const n1 = name1.toLowerCase().replace(/\s+/g, ' ').trim();
    const n2 = name2.toLowerCase().replace(/\s+/g, ' ').trim();
    return n1 === n2;
  };

  // Helper to safely parse JSON field to object
  const parseJsonFields = (val: any): any => {
    if (!val) return {};
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch (_) {
      return {};
    }
  };

  const getDriverSalesObj = (driverName: string) => {
    const emp = employees.find(e => namesMatch(e.name, driverName));
    const isOperator = emp?.role === 'operator' || currentUser.role === 'operator';

    if (isOperator) {
      const ownKey = Object.keys(todaySales).find(k => namesMatch(k, driverName));
      const mostradorKey = Object.keys(todaySales).find(k => namesMatch(k, 'Mostrador'));
      
      const ownSales = ownKey ? todaySales[ownKey] : { salesTotal: 0, ordersCount: 0 };
      const mostradorSales = mostradorKey ? todaySales[mostradorKey] : { salesTotal: 0, ordersCount: 0 };
      
      return {
        driverName: driverName,
        salesTotal: (ownSales.salesTotal || 0) + (mostradorSales.salesTotal || 0),
        ordersCount: (ownSales.ordersCount || 0) + (mostradorSales.ordersCount || 0)
      };
    }

    const foundKey = Object.keys(todaySales).find(k => namesMatch(k, driverName));
    return foundKey ? todaySales[foundKey] : { salesTotal: 0, ordersCount: 0 };
  };
  
  // Toggle for admins and operators to view either the master list or personal drawer
  const [viewMode, setViewMode] = useState<'admin' | 'personal'>('personal');

  // New assignment form state
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formFloatAmount, setFormFloatAmount] = useState('600');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');

  // Tick local date and time in real-time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setFormDate(`${yyyy}-${mm}-${dd}`);

      const hh = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setFormTime(`${hh}:${mins}:${secs}`);
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFormAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeName) {
      alert('Por favor selecciona un empleado del menú desplegable.');
      return;
    }
    const val = Number(formFloatAmount);
    if (isNaN(val) || val <= 0) {
      alert('Por favor ingresa una cantidad en pesos válida mayor a cero.');
      return;
    }
    await handleAssignFloat(formEmployeeName, val);
    setFormEmployeeName(''); // Reset selection upon successful assignment
  };

  // Modals and inputs
  const [selectedDriverForFloat, setSelectedDriverForFloat] = useState<Employee | null>(null);
  const [assignedSuccessModal, setAssignedSuccessModal] = useState<{ employeeName: string; amount: number } | null>(null);
  const [customFloatAmount, setCustomFloatAmount] = useState('600');
  const [selectedDriverForClose, setSelectedDriverForClose] = useState<any | null>(null);

  // Get current date
  const todayDate = new Date().toISOString().split('T')[0];

  // Get current logger info
  const [currentUser, setCurrentUser] = useState({
    name: 'Empleado Demo',
    role: userRole || 'driver'
  });

  useEffect(() => {
    const saved = localStorage.getItem('qw_session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.user_name) {
          const matchedRole = userRole || session.user_role || 'driver';
          setCurrentUser({
            name: session.user_name,
            role: matchedRole
          });
          setViewMode(matchedRole === 'admin' ? 'admin' : 'personal');
        }
      } catch (e) {}
    } else {
      const backupStr = localStorage.getItem('quality_water_session_backup');
      if (backupStr) {
        try {
          const backup = JSON.parse(backupStr);
          if (backup.userName) {
            const matchedRole = userRole || backup.currentRoleView || 'driver';
            setCurrentUser({
              name: backup.userName,
              role: matchedRole
            });
            setViewMode(matchedRole === 'admin' ? 'admin' : 'personal');
          }
        } catch (_) {}
      }
    }
  }, [userRole]);

  // Load all necessary info (employees, today's attendance, today's order sales)
  const loadData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // 1. Fetch all staff members (excluding customers/clients)
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      
      let driversList: Employee[] = [];
      if (empData) {
        driversList = empData.filter(e => 
          e.role !== 'client' && 
          e.role !== 'customer'
        );
        setEmployees(driversList);
      }

      // 2. Fetch daily attendance entries for today
      const { data: attData } = await supabase
        .from('daily_attendance')
        .select('id, user_name, work_date, check_in, break_start, break_end, check_out, last_location, created_at')
        .eq('work_date', today);

      const attendancesList = (attData || []).map((a: any) => ({
        ...a,
        last_location: parseJsonFields(a.last_location)
      })) as AttendanceRecord[];
      setAttendances(attendancesList);

      // 3. Fetch today's orders delivered by these drivers
      // To ensure no sales are lost due to timezone differences, we fetch orders
      // from yesterday to tomorrow, and then we filter in JavaScript by matching
      // either the UTC date of the order, or its local date string, to today.
      const startOfYesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00.000Z';
      const endOfTomorrow = new Date(new Date(today).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T23:59:59.999Z';

      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_price, assigned_to_name, status, created_at')
        .eq('status', 'delivered')
        .gte('created_at', startOfYesterday)
        .lte('created_at', endOfTomorrow);

      const salesSummary: Record<string, OrderItemSummary> = {};
      
      // Initialize for all drivers
      driversList.forEach(drv => {
        salesSummary[drv.name] = {
          driverName: drv.name,
          salesTotal: 0,
          ordersCount: 0
        };
      });

      const localToday = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
      if (ordersData) {
        ordersData.forEach(o => {
          const name = o.assigned_to_name;
          if (name) {
            // Match order date: either UTC matches or local format matches
            const orderUtcDate = o.created_at.split('T')[0];
            const orderLocalDate = new Date(o.created_at).toLocaleDateString('en-CA');
            const isTodayOrder = (orderUtcDate === today) || (orderLocalDate === localToday);
            
            if (!isTodayOrder) {
              return; // skip if it's from another day
            }

            if (!salesSummary[name]) {
              salesSummary[name] = {
                driverName: name,
                salesTotal: 0,
                ordersCount: 0
              };
            }
            salesSummary[name].salesTotal += Number(o.total_price || 0);
            salesSummary[name].ordersCount += 1;
          }
        });
      }
      setTodaySales(salesSummary);

      // 4. Find if there is a session for the currently logged-in driver employee
      const loggedInDriverName = currentUser.name;
      const driverAttendance = attendancesList.find(a => namesMatch(a.user_name, loggedInDriverName));
      setActiveDriverSession(driverAttendance || null);

    } catch (e) {
      console.warn('Error fetching cash float dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup realtime subscription
    const channel = supabase
      .channel('cash_float_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_attendance' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.name, userRole]);

  // Assign starting cash float to a driver (Upserts attendance entry with custom metadata)
  const handleAssignFloat = async (employeeName: string, amount: number) => {
    setActionLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Find existing attendance
      const { data: existing } = await supabase
        .from('daily_attendance')
        .select('id, user_name, work_date, check_in, break_start, break_end, check_out, last_location, created_at')
        .eq('user_name', employeeName)
        .eq('work_date', today)
        .maybeSingle();

      const existingLocation = parseJsonFields(existing?.last_location);
      const updatedLocation = {
        ...existingLocation,
        cash_float: amount,
        cash_closed: false,
        cash_assigned_at: new Date().toISOString()
      };

      const targetEmp = employees.find(e => namesMatch(e.name, employeeName));
      const targetUserId = targetEmp?.id || targetEmp?.user_id || null;
      let targetUserRole = targetEmp?.role || 'driver';

      // Normalizar roles para las alertas en tiempo real
      const normRole = targetUserRole.toLowerCase().trim();
      if (normRole === 'administrador' || normRole === 'admin') {
        targetUserRole = 'driver'; // Los administradores que reciben fondos actúan como repartidores
      } else if (normRole === 'operador' || normRole === 'planta' || normRole === 'operator') {
        targetUserRole = 'operator';
      } else {
        targetUserRole = 'driver';
      }

      let { error } = await supabase
        .from('daily_attendance')
        .upsert(
          {
            ...(existing || {}),
            user_name: employeeName,
            work_date: today,
            user_role: targetUserRole,
            last_location: updatedLocation
          },
          { onConflict: 'user_name, work_date' }
        );

      if (error) {
        if (error.message && (error.message.includes('user_role') || error.message.includes('column'))) {
          const retryResult = await supabase
            .from('daily_attendance')
            .upsert(
              {
                ...(existing || {}),
                user_name: employeeName,
                work_date: today,
                last_location: updatedLocation
              },
              { onConflict: 'user_name, work_date' }
            );
          error = retryResult.error;
        }
      }

      if (error) throw error;

      // Add notifications for both the target employee role and the admin
      await supabase.from('notifications_log').insert([
        {
          title: '💲 Fondo de Caja Recibido',
          message: `Hola ${employeeName}, se te ha asignado un fondo de caja de $${amount} pesos para iniciar tu jornada de hoy.`,
          type: 'finance',
          user_role: targetUserRole === 'driver' && targetUserId ? `driver_${targetUserId}` : targetUserRole,
          is_read: false
        },
        {
          title: '💲 Fondo de Caja Asignado',
          message: `Fondo de caja de $${amount} pesos asignado a ${employeeName} (${targetUserRole === 'operator' ? 'Planta' : 'Repartidor'}).`,
          type: 'finance',
          user_role: 'admin',
          is_read: false
        }
      ]);

      await loadData();
      setSelectedDriverForFloat(null);
      setAssignedSuccessModal({ employeeName, amount });
    } catch (e: any) {
      if (e.message && (e.message.includes('user_role') || e.message.includes('column'))) {
        alert(
          'Falta la columna "user_role" en la tabla "daily_attendance" de tu base de datos Supabase.\n\n' +
          'Para solucionarlo de inmediato de forma 100% segura:\n\n' +
          '1. Abre tu panel de Supabase -> SQL Editor\n' +
          '2. Crea una pestaña nueva pulsando "+ New Query"\n' +
          '3. Copia y pega EXACTAMENTE esta línea:\n\n' +
          '   ALTER TABLE public.daily_attendance ADD COLUMN IF NOT EXISTS user_role TEXT;\n' +
          '   NOTIFY pgrst, \'reload schema\';\n\n' +
          '4. Haz clic en "RUN" abajo a la derecha.\n\n' +
          '¡Con eso se soluciona de inmediato! Recarga la app después de correr el script.'
        );
      } else {
        alert('Error al asignar fondo: ' + e.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Close shift cash drawer
  const handleCloseCashDrawer = async (employeeName: string, floatAmount: number, salesAmount: number, ordersCount?: number) => {
    setActionLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    const cleanFloatAmount = isNaN(floatAmount) ? 0 : floatAmount;
    const cleanSalesAmount = isNaN(salesAmount) ? 0 : salesAmount;
    const cleanOrdersCount = (ordersCount !== undefined && !isNaN(ordersCount)) ? ordersCount : (Number(selectedDriverForClose?.orders_count || 0) || 0);
    const totalToDeliver = cleanFloatAmount + cleanSalesAmount;

    try {
      const { data: existing } = await supabase
        .from('daily_attendance')
        .select('id, user_name, work_date, check_in, break_start, break_end, check_out, last_location, created_at')
        .eq('user_name', employeeName)
        .eq('work_date', today)
        .maybeSingle();

      const existingLocation = parseJsonFields(existing?.last_location);
      const updatedLocation = {
        ...existingLocation,
        cash_float: cleanFloatAmount,
        cash_closed: true,
        cash_closed_at: new Date().toISOString(),
        cash_sales_total: cleanSalesAmount,
        cash_orders_count: cleanOrdersCount,
        cash_total_to_deliver: totalToDeliver,
        closed_by_role: currentUser.role,
        closed_by_name: currentUser.name
      };

      const targetEmp = employees.find(e => namesMatch(e.name, employeeName));
      const targetUserId = targetEmp?.id || targetEmp?.user_id || null;
      let targetUserRole = targetEmp?.role || 'driver';

      // Normalizar roles para las alertas en tiempo real
      const normRole = targetUserRole.toLowerCase().trim();
      if (normRole === 'administrador' || normRole === 'admin') {
        targetUserRole = 'driver'; // Los administradores que reciben fondos actúan como repartidores
      } else if (normRole === 'operador' || normRole === 'planta' || normRole === 'operator') {
        targetUserRole = 'operator';
      } else {
        targetUserRole = 'driver';
      }

      // Also set check_out timestamp if closing cash itself is treated as check_out
      const fieldsToUpdate: any = {
        ...(existing || {}),
        user_name: employeeName,
        work_date: today,
        user_role: targetUserRole,
        last_location: updatedLocation
      };

      // If the driver closes it, automatically log a check_out if there wasn't one
      if (!existing?.check_out) {
        fieldsToUpdate.check_out = new Date().toISOString();
      }

      let { error } = await supabase
        .from('daily_attendance')
        .upsert(fieldsToUpdate, { onConflict: 'user_name, work_date' });

      if (error) {
        if (error.message && (error.message.includes('user_role') || error.message.includes('column'))) {
          const { user_role, ...cleanFields } = fieldsToUpdate;
          const retryResult = await supabase
            .from('daily_attendance')
            .upsert(cleanFields, { onConflict: 'user_name, work_date' });
          error = retryResult.error;
        }
      }

      if (error) throw error;

      // Log notifications for both target employee and admin
      await supabase.from('notifications_log').insert([
        {
          title: '📌 Caja Cerrada y Liquidada',
          message: `Tu caja ha sido cerrada con éxito. Total liquidado: $${totalToDeliver} pesos (Fondo: $${cleanFloatAmount} + Ventas: $${cleanSalesAmount}).`,
          type: 'finance',
          user_role: targetUserRole === 'driver' && targetUserId ? `driver_${targetUserId}` : targetUserRole,
          is_read: false
        },
        {
          title: '🚨 Cierre de Caja Realizado',
          message: `Arqueo y liquidación completados para ${employeeName}. Total entregado: $${totalToDeliver} pesos (Fondo: $${cleanFloatAmount} + Ventas: $${cleanSalesAmount}).`,
          type: 'finance',
          user_role: 'admin',
          is_read: false
        }
      ]);

      await loadData();
      setSelectedDriverForClose(null);
      alert(`¡Cierre exitoso para ${employeeName}! Caja cerrada debidamente.`);
    } catch (e: any) {
      alert('Error en cierre de caja: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Perform global cash register close (corte global de caja) for all employees today
  const handleGlobalCashClose = async () => {
    if (!confirm('¿Estás seguro de realizar el corte de caja GLOBAL de hoy? Esto cerrará y liquidará la sesión de todos los empleados y operadores que iniciaron jornada.')) return;
    
    setActionLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // 1. Fetch all attendance logs of today
      const { data: attData, error: attErr } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('work_date', today);
        
      if (attErr) throw attErr;

      if (!attData || attData.length === 0) {
        alert('No hay ninguna jornada activa u operaciones registradas el día de hoy para poder realizar el corte global.');
        return;
      }

      let closedCount = 0;
      const notificationsToInsert = [];

      for (const att of attData) {
        const lastLoc = parseJsonFields(att.last_location);
        const floatAmount = lastLoc.cash_float !== undefined ? Number(lastLoc.cash_float) : null;
        const isClosed = !lastLoc.cash_closed;

        // Skip if already closed, or if they don't even have a cash float assigned (meaning session was never opened)
        if (isClosed || floatAmount === null) {
          continue;
        }

        // Calculate sales total for this specific employee
        const sales = getDriverSalesObj(att.user_name);
        const totalToDeliver = floatAmount + sales.salesTotal;

        const updatedLocation = {
          ...lastLoc,
          cash_float: floatAmount,
          cash_closed: true,
          cash_closed_at: new Date().toISOString(),
          cash_sales_total: sales.salesTotal,
          cash_orders_count: sales.ordersCount,
          cash_total_to_deliver: totalToDeliver,
          closed_by_role: currentUser.role,
          closed_by_name: currentUser.name
        };

        const fieldsToUpdate: any = {
          ...att,
          last_location: updatedLocation
        };

        // If they hadn't checked out yet, automatically set a check_out timestamp
        if (!att.check_out) {
          fieldsToUpdate.check_out = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from('daily_attendance')
          .upsert(fieldsToUpdate, { onConflict: 'user_name, work_date' });

        if (!updateError) {
          closedCount++;
          
          notificationsToInsert.push({
            title: '📌 Caja Cerrada (Corte Global)',
            message: `Tu caja ha sido cerrada por el Administrador en corte global. Total: $${totalToDeliver} (Fondo: $${floatAmount} + Ventas: $${sales.salesTotal}).`,
            type: 'finance',
            user_role: att.user_role || 'driver',
            is_read: false
          });
        }
      }

      if (closedCount > 0) {
        notificationsToInsert.push({
          title: '🚨 Corte Global Realizado',
          message: `El Administrador realizó un cierre general y arqueo completo de ${closedCount} cajas el día de hoy.`,
          type: 'finance',
          user_role: 'admin',
          is_read: false
        });

        await supabase.from('notifications_log').insert(notificationsToInsert);

        await loadData();
        alert(`¡Corte Global completado con éxito! Se cerraron y liquidaron ${closedCount} cajas de empleados.`);
      } else {
        alert('Todas las cajas activas de hoy ya estaban cerradas.');
      }
    } catch (e: any) {
      alert('Error en corte de caja global: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Export a consolidated daily balance PDF for all employees and overall flows
  const handleExportGlobalPDF = () => {
    const todayDate = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const columns = ['Empleado', 'Estatus', 'Fondo Inicial', 'Ventas del Día', 'Pedidos', 'Efectivo a Entregar'];
    
    const data = driversStatusData.map(d => {
      const statusStr = d.is_closed ? 'CERRADA' : d.cash_float !== null ? 'ABIERTA' : 'SIN INICIAR';
      const roleStr = d.role === 'admin' ? 'Admin' : d.role === 'operator' ? 'Planta' : 'Repartidor';
      return [
        `${d.name} (${roleStr})`,
        statusStr,
        d.cash_float !== null ? `$${Number(d.cash_float).toFixed(2)}` : '$0.00',
        `$${Number(d.sales_total).toFixed(2)}`,
        `${d.orders_count} ped.`,
        `$${Number(d.total_to_deliver).toFixed(2)}`
      ];
    });

    data.push(['', '', '', '', '', '']); // space row
    data.push(['RESUMEN DE CAPITAL CONSOLIDADO', '', '', '', '', '']);
    data.push(['Total Fondos Asignados', '', '', '', '', `$${assignedFloatsTotal.toFixed(2)}`]);
    data.push(['Total Ventas RegistradasToday', '', '', '', '', `$${registeredSalesTotal.toFixed(2)}`]);
    data.push(['Total Efectivo Recaudado (Cierres)', '', '', '', '', `$${collectedTotal.toFixed(2)}`]);
    data.push(['Total Flotante Pendiente', '', '', '', '', `$${activeInPlayTotal.toFixed(2)}`]);
    data.push(['GRAN TOTAL PATRIMONIAL DIARIO', '', '', '', '', `$${(assignedFloatsTotal + registeredSalesTotal).toFixed(2)}`]);

    exportToPDF({
      title: 'Reporte Global de Cortes de Caja',
      subtitle: `QualityWater Purificadora - Consolidado Diario - Fecha: ${todayDate}`,
      columns,
      data,
      filename: `Reporte_Global_Cortes_${new Date().toISOString().split('T')[0]}`
    });
  };

  // Re-open Cash drawer (Admin lock toggle)
  const handleReopenCashDrawer = async (employeeName: string) => {
    if (!confirm(`¿Estás seguro de reabrir la caja de ${employeeName}?`)) return;
    setActionLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data: existing } = await supabase
        .from('daily_attendance')
        .select('id, user_name, work_date, check_in, break_start, break_end, check_out, last_location, created_at')
        .eq('user_name', employeeName)
        .eq('work_date', today)
        .maybeSingle();

      const existingLocation = parseJsonFields(existing?.last_location);
      const updatedLocation = {
        ...existingLocation,
        cash_closed: false,
        cash_reopened_at: new Date().toISOString(),
        cash_reopened_by: currentUser.name
      };

      const targetEmp = employees.find(e => namesMatch(e.name, employeeName));
      let targetUserRole = targetEmp?.role || 'driver';

      // Normalizar roles para las alertas en tiempo real
      const normRole = targetUserRole.toLowerCase().trim();
      if (normRole === 'administrador' || normRole === 'admin') {
        targetUserRole = 'driver'; // Los administradores que reciben fondos actúan como repartidores
      } else if (normRole === 'operador' || normRole === 'planta' || normRole === 'operator') {
        targetUserRole = 'operator';
      } else {
        targetUserRole = 'driver';
      }

      let { error } = await supabase
        .from('daily_attendance')
        .upsert({
          ...(existing || {}),
          user_name: employeeName,
          work_date: today,
          user_role: targetUserRole,
          last_location: updatedLocation
        }, { onConflict: 'user_name, work_date' });

      if (error) {
        if (error.message && (error.message.includes('user_role') || error.message.includes('column'))) {
          const retryResult = await supabase
            .from('daily_attendance')
            .upsert({
              ...(existing || {}),
              user_name: employeeName,
              work_date: today,
              last_location: updatedLocation
            }, { onConflict: 'user_name, work_date' });
          error = retryResult.error;
        }
      }

      if (error) throw error;
      await loadData();
    } catch (e: any) {
      alert('Error al reabrir caja: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete/Revert assigned cash float
  const handleDeleteFloat = async (employeeName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el fondo de caja asignado a ${employeeName}?`)) return;
    setActionLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Find existing attendance
      const { data: existing, error: findError } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('user_name', employeeName)
        .eq('work_date', today)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        console.log(`Deleting row completely for ${employeeName}`);
        const { error: deleteError } = await supabase
          .from('daily_attendance')
          .delete()
          .eq('id', existing.id);
        
        if (deleteError) {
          console.error('Delete error, trying alternative delete by unique tuple:', deleteError);
          const { error: altDeleteError } = await supabase
            .from('daily_attendance')
            .delete()
            .eq('user_name', employeeName)
            .eq('work_date', today);
          
          if (altDeleteError) throw altDeleteError;
        }


        // Add notification for safety (both employee and admin)
        const targetEmp = employees.find(e => namesMatch(e.name, employeeName));
        const targetUserId = targetEmp?.id || targetEmp?.user_id || null;
        let targetUserRole = targetEmp?.role || 'driver';
        const normRole = targetUserRole.toLowerCase().trim();
        if (normRole === 'administrador' || normRole === 'admin') {
          targetUserRole = 'driver';
        } else if (normRole === 'operador' || normRole === 'planta' || normRole === 'operator') {
          targetUserRole = 'operator';
        } else {
          targetUserRole = 'driver';
        }

        await supabase.from('notifications_log').insert([
          {
            title: '🚫 Fondo de Caja Revertido',
            message: `El fondo de caja asignado para hoy a ${employeeName} ha sido cancelado por el administrador.`,
            type: 'finance',
            user_role: targetUserRole === 'driver' && targetUserId ? `driver_${targetUserId}` : targetUserRole,
            is_read: false
          },
          {
            title: '🚫 Fondo de Caja Revertido',
            message: `Fondo de caja cancelado para ${employeeName}.`,
            type: 'finance',
            user_role: 'admin',
            is_read: false
          }
        ]);
      }

      await loadData();
      alert(`Fondo de caja para ${employeeName} eliminado exitosamente.`);
    } catch (e: any) {
      alert('Error al desactivar el fondo de caja: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk delete/reset selected cash float / entries
  const handleBulkDeleteFloat = async () => {
    if (selectedEmployees.length === 0) {
      alert('Por favor selecciona al menos un registro para borrar.');
      return;
    }

    const confirmMsg = `¿Estás seguro de eliminar el registro de fondo de caja, asistencia o asignación de los ${selectedEmployees.length} empleados seleccionados? Esto restablecerá su estado de caja y turno para hoy.`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Fetch all selected attendance records in a single query
      const { data: existingRecords, error: fetchError } = await supabase
        .from('daily_attendance')
        .select('*')
        .in('user_name', selectedEmployees)
        .eq('work_date', today);

      if (fetchError) throw fetchError;

      let countProcessed = 0;

      if (existingRecords && existingRecords.length > 0) {
        const idsToDelete = existingRecords.map(r => r.id);
        const { error: deleteError } = await supabase
          .from('daily_attendance')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error('Bulk delete failed:', deleteError);
          throw deleteError;
        }
        countProcessed = existingRecords.length;
      }

      // Add a single notification reporting the action
      if (countProcessed > 0) {
        await supabase.from('notifications_log').insert([
          {
            title: '🚫 Borrado Masivo de Fondos',
            message: `El administrador eliminó o restableció los fondos/asistencias de ${countProcessed} empleado(s) seleccionados.`,
            type: 'finance',
            user_role: 'admin',
            is_read: false
          }
        ]);
      }

      setSelectedEmployees([]);
      await loadData();
      alert(`Se procesaron y eliminaron/restablecieron los registros de ${countProcessed} empleado(s).`);
    } catch (e: any) {
      alert('Error en el borrado masivo: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete/reset all cash float / entries for today
  const handleResetAllFloats = async () => {
    const confirmMsg = `¿Estás seguro de restablecer o eliminar el registro de fondo de caja, asistencia y asignación de TODOS los empleados de la lista de hoy?`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Fetch all attendance for today in a single query
      const { data: allAtt, error: fetchError } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('work_date', today);

      if (fetchError) throw fetchError;

      let countProcessed = 0;

      if (allAtt && allAtt.length > 0) {
        const idsToDelete = allAtt.map(r => r.id);
        const { error: deleteError } = await supabase
          .from('daily_attendance')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error('Reset all failed:', deleteError);
          throw deleteError;
        }
        countProcessed = allAtt.length;
      }

      // Add a single notification reporting the action
      if (countProcessed > 0) {
        await supabase.from('notifications_log').insert([
          {
            title: '🚫 Restablecimiento Completo de Fondos',
            message: `El administrador restableció por completo todos los fondos de caja y registros de asistencia de hoy (${countProcessed} registro(s)).`,
            type: 'finance',
            user_role: 'admin',
            is_read: false
          }
        ]);
      }

      setSelectedEmployees([]);
      await loadData();
      alert('Se han restablecido exitosamente todos los fondos de caja y cierres de hoy.');
    } catch (e: any) {
      alert('Error al restablecer todos los registros: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Print shift receipt PDF
  const handleExportReceiptPDF = (driverData: any) => {
    const columns = ['Concepto', 'Detalle'];
    
    const isClosed = !!driverData.is_closed || !!driverData.closed_at;
    const statusLabel = isClosed ? 'Cerrada / Liquidada' : 'Caja Abierta (Sesión Activa)';
    const closeTimeStr = isClosed 
      ? new Date(driverData.closed_at || '').toLocaleString() 
      : 'Borrador (Sesión en Curso)';

    const data = [
      ['Empleado', `${driverData.name}`],
      ['Fondo de Caja (Inicio)', `$${Number(driverData.cash_float || 0).toFixed(2)} pesos`],
      ['Ventas del Día (Entregas)', `$${Number(driverData.sales_total || 0).toFixed(2)} pesos`],
      ['Total de Entregas Realizadas', `${driverData.orders_count || 0} pedidos`],
      ['Monto Total Neto a Entregar', `$${Number(driverData.total_to_deliver || 0).toFixed(2)} pesos`],
      ['Estatus de Caja', statusLabel],
      ['Fecha de Cierre / Reporte', closeTimeStr],
      ['Firmado por', `${driverData.name} (Empleado)`],
      ['Recibido por', `${driverData.closed_by_name || 'Administrador (Pendiente)'}`],
    ];

    exportToPDF({
      title: isClosed ? 'Comprobante de Cierre de Caja' : 'Borrador de Corte de Caja',
      subtitle: `QualityWater - Empleado: ${driverData.name} - Fecha: ${todayDate}`,
      columns,
      data,
      filename: `Comprobante_Cierre_${driverData.name.replace(/\s+/g, '_')}`
    });
  };

  // Build the list of driver statuses with floats
  const getDriversStatuses = () => {
    return employees.map(emp => {
      const att = attendances.find(a => namesMatch(a.user_name, emp.name));
      const sales = getDriverSalesObj(emp.name);
      
      const lastLoc = parseJsonFields(att?.last_location);
      const floatVal = lastLoc.cash_float !== undefined && lastLoc.cash_float !== null ? Number(lastLoc.cash_float) : null;
      const isClosed = !!lastLoc.cash_closed;
      const closedAt = lastLoc.cash_closed_at || null;
      const closedByName = lastLoc.closed_by_name || null;

      // Closed session values
      const salesTotal = isClosed && lastLoc.cash_sales_total !== undefined 
        ? Number(lastLoc.cash_sales_total) 
        : sales.salesTotal;
        
      const ordersCount = isClosed && lastLoc.cash_orders_count !== undefined
        ? Number(lastLoc.cash_orders_count)
        : sales.ordersCount;

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        phone: emp.phone,
        hasClockedIn: !!att?.check_in,
        checkInTime: att?.check_in,
        cash_float: floatVal,
        sales_total: salesTotal,
        orders_count: ordersCount,
        is_closed: isClosed,
        closed_at: closedAt,
        closed_by_name: closedByName,
        total_to_deliver: floatVal !== null ? floatVal + salesTotal : salesTotal
      };
    });
  };

  const driversStatusData = getDriversStatuses();

  // Calculate high-level KPI cards for the admin
  const assignedFloatsTotal = driversStatusData.reduce((acc, d) => acc + (d.cash_float || 0), 0);
  const registeredSalesTotal = driversStatusData.reduce((acc, d) => acc + d.sales_total, 0);
  const collectedTotal = driversStatusData.filter(d => d.is_closed).reduce((acc, d) => acc + d.total_to_deliver, 0);
  const activeInPlayTotal = driversStatusData.filter(d => !d.is_closed).reduce((acc, d) => acc + d.total_to_deliver, 0);

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800 italic uppercase">
            Módulo <span className="text-sky-500">Fondo de Caja</span>
          </h2>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest leading-none">
            {isAdmin 
              ? 'Control de capital diario, flotantes y liquidación de personal' 
              : 'Detalle de fondo flotante asignado y balance de liquidación diario'}
          </p>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-100 p-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar Datos
        </button>
      </div>

      {/* View Switcher Pill (Interactive toggle only for Admin role) */}
      {isAdmin && (
        <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-sm border border-slate-200/50 shadow-inner">
          <button
            onClick={() => setViewMode('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              viewMode === 'admin' 
                ? 'bg-white text-slate-800 shadow-md border border-slate-100' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building size={14} />
            Control General
          </button>
          <button
            onClick={() => setViewMode('personal')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              viewMode === 'personal' 
                ? 'bg-white text-slate-800 shadow-md border border-slate-100' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User size={14} />
            Mi Caja Personal
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-[40px] border border-slate-100 p-20 flex flex-col justify-center items-center shadow-sm">
          <Loader2 size={48} className="text-sky-500 animate-spin mb-4" />
          <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Cargando cuentas de caja...</p>
        </div>
      ) : (
        <>
          {/* ROL ADMIN / PLANTA PANEL */}
          {isAdmin && viewMode === 'admin' ? (
            <div className="space-y-8">
              {/* Metrics KPIs Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fondos de Caja Asignados</p>
                  <p className="text-2xl font-black text-slate-800 mt-2">${assignedFloatsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <div className="absolute top-6 right-6 w-10 h-10 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500">
                    <DollarSign size={20} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ventas en Ruta Hoy</p>
                  <p className="text-2xl font-black text-slate-800 mt-2">${registeredSalesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <div className="absolute top-6 right-6 w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                    <TrendingUp size={20} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efectivo Recaudado</p>
                  <p className="text-2xl font-black text-emerald-500 mt-2">${collectedTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <div className="absolute top-6 right-6 w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pendiente en Ruta</p>
                  <p className="text-2xl font-black text-slate-800 mt-2">${activeInPlayTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <div className="absolute top-6 right-6 w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                    <Clock size={20} />
                  </div>
                </div>
              </div>

              {/* FORMULARIO DE ASIGNACIÓN DIRECTA */}
              <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight flex items-center gap-2">
                    <Plus size={18} className="text-sky-500" />
                    Registrar y Asignar <span className="text-sky-500">Fondo de Caja</span>
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                    Habilita el fondo de caja diario seleccionando a cualquier empleado, ingresando el monto y enviando el registro
                  </p>
                </div>

                <form onSubmit={handleFormAssignSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
                  {/* Nombre del Empleado Dropdown */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block ml-1">Empleado</label>
                    <select
                      value={formEmployeeName}
                      onChange={(e) => setFormEmployeeName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 transition-all cursor-pointer"
                    >
                      <option value="">Selecciona un empleado...</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.name}>
                          {e.name} ({e.role === 'admin' ? 'Admin' : e.role === 'operator' ? 'Planta' : 'Repartidor'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad en pesos */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block ml-1">Fondo en Pesos ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        value={formFloatAmount}
                        onChange={(e) => setFormFloatAmount(e.target.value)}
                        placeholder="Ej. 600"
                        className="w-full bg-slate-50 border border-slate-100 pl-8 pr-4 py-4 rounded-2xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20 transition-all placeholder:font-bold"
                      />
                    </div>
                  </div>

                  {/* Campo fecha */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block ml-1">Fecha de Registro</label>
                    <input
                      type="date"
                      value={formDate}
                      disabled
                      className="w-full bg-slate-100/60 border border-slate-100/50 p-4 rounded-2xl text-xs font-black text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>

                  {/* Campo hora */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block ml-1">Hora de Registro</label>
                    <input
                      type="text"
                      value={formTime}
                      disabled
                      className="w-full bg-slate-100/60 border border-slate-100/50 p-4 rounded-2xl text-xs font-black text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>

                  {/* Botón de envío */}
                  <div>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-500/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Unlock size={14} />
                      )}
                      Asignar Fondo
                    </button>
                  </div>
                </form>
              </div>

              {/* Main Table for staff cash registers */}
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                      <ClipboardList size={18} className="text-sky-500" />
                      Estado de Fondos y Cierres de Personal
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Asignación diaria de fondos e historial de liquidaciones de hoy</p>
                  </div>
                  {isAdmin && (
                     <div className="flex items-center gap-2">
                      {selectedEmployees.length > 0 && (
                        <button
                          type="button"
                          onClick={handleBulkDeleteFloat}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm border border-rose-100"
                        >
                          <Trash2 size={12} />
                          Borrar Seleccionados ({selectedEmployees.length})
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleGlobalCashClose}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md shadow-amber-500/10"
                          title="Realizar Corte de Caja Global para todos los empleados de hoy"
                        >
                          <Lock size={12} />
                          Corte Global
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleExportGlobalPDF}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm"
                          title="Exportar Reporte Global de Cortes de Caja de hoy en PDF"
                        >
                          <Printer size={12} />
                          Reporte Global (PDF)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleResetAllFloats}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                        title="Restablecer todos los registros de fondos y asistencia de hoy"
                      >
                        <RefreshCw size={12} className={actionLoading ? 'animate-spin' : ''} />
                        Borrar Todo
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <tr>
                        {isAdmin && (
                          <th className="px-6 py-4 text-center w-12">
                            <input
                              type="checkbox"
                              checked={driversStatusData.length > 0 && selectedEmployees.length === driversStatusData.length}
                              onChange={() => {
                                const allChecked = driversStatusData.length > 0 && selectedEmployees.length === driversStatusData.length;
                                if (allChecked) {
                                  setSelectedEmployees([]);
                                } else {
                                  setSelectedEmployees(driversStatusData.map(d => d.name));
                                }
                              }}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer h-4 w-4"
                            />
                          </th>
                        )}
                        <th className="px-8 py-4">Personal</th>
                        <th className="px-8 py-4">Asistencia</th>
                        <th className="px-8 py-4 text-center">Fondo Inicial</th>
                        <th className="px-8 py-4 text-center">Ventas Hoy</th>
                        <th className="px-8 py-4 text-center">Total a Cobrar</th>
                        <th className="px-8 py-4">Estado Caja</th>
                        <th className="px-8 py-4 text-right">Caja / Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {driversStatusData.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 8 : 7} className="px-8 py-12 text-center text-xs font-bold text-slate-300 uppercase italic">
                            Sin personal registrado en el sistema.
                          </td>
                        </tr>
                      ) : (
                        driversStatusData.map((drv) => (
                          <tr key={drv.id} className="hover:bg-slate-50 transition-all">
                            {isAdmin && (
                              <td className="px-6 py-5 text-center w-12">
                                <input
                                  type="checkbox"
                                  checked={selectedEmployees.includes(drv.name)}
                                  onChange={() => {
                                    if (selectedEmployees.includes(drv.name)) {
                                      setSelectedEmployees(selectedEmployees.filter(name => name !== drv.name));
                                    } else {
                                      setSelectedEmployees([...selectedEmployees, drv.name]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer h-4 w-4"
                                />
                              </td>
                            )}
                            <td className="px-8 py-5">
                              <p className="font-black text-slate-800 text-sm whitespace-nowrap italic">{drv.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  drv.role === 'admin' 
                                    ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                                    : drv.role === 'operator' 
                                      ? 'bg-indigo-50 text-indigo-500 border border-indigo-100'
                                      : 'bg-sky-50 text-sky-500 border border-sky-100'
                                }`}>
                                  {drv.role === 'admin' ? 'Admin' : drv.role === 'operator' ? 'Planta' : 'Repartidor'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{drv.phone || 'Sin número'}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              {drv.hasClockedIn ? (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase inline-block self-start">En Turno</span>
                                  <span className="text-[9px] font-bold text-slate-400 mt-1">
                                    {new Date(drv.checkInTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-0.5 rounded-lg uppercase inline-block">Sin Marcaje</span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-center">
                              {drv.cash_float !== null ? (
                                <span className="font-black text-sm text-slate-800">$ {drv.cash_float.toFixed(2)}</span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-400 uppercase italic">No asignado</span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="font-bold text-xs text-slate-500">${drv.sales_total.toFixed(2)}</span>
                              <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{drv.orders_count} pedidos</span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="font-black text-sm text-slate-800">
                                ${drv.total_to_deliver.toFixed(2)}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 block leading-tight mt-0.5 uppercase tracking-widest">(Fondo + Ventas)</span>
                            </td>
                            <td className="px-8 py-5">
                              {drv.is_closed ? (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-lg uppercase inline-block self-start">🟢 LIQUIDADO</span>
                                  <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase leading-none">
                                    Al: {new Date(drv.closed_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              ) : drv.cash_float !== null ? (
                                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 uppercase inline-block">🟡 CAJA ABIERTA</span>
                              ) : (
                                <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg uppercase inline-block">SIN INICIAR</span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Assign or Edit Float */}
                                {!drv.is_closed && (
                                  <button
                                    onClick={() => {
                                      setSelectedDriverForFloat(drv);
                                      setCustomFloatAmount(drv.cash_float !== null ? String(drv.cash_float) : '600');
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
                                  >
                                    {drv.cash_float !== null ? 'Modif. Fondo' : '+ Dar Fondo'}
                                  </button>
                                )}

                                {/* Reset/Delete assigned Float / Closure (Always visible to Admin to allow resetting any entry) */}
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteFloat(drv.name)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Eliminar registro de fondo/cierre/asistencia"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}

                                {/* Perform close */}
                                {!drv.is_closed && drv.cash_float !== null ? (
                                  <button
                                    onClick={() => setSelectedDriverForClose(drv)}
                                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md shadow-sky-100 transition-all active:scale-95"
                                  >
                                    Cerrar Caja
                                  </button>
                                ) : null}

                                {/* Print tickets for closed drawers */}
                                {drv.cash_float !== null && (
                                  <>
                                    <button
                                      onClick={() => handleExportReceiptPDF(drv)}
                                      className="p-2 bg-slate-50 text-slate-400 hover:text-sky-500 rounded-xl hover:bg-slate-100 transition-all"
                                      title="Comprobante PDF"
                                    >
                                      <Printer size={15} />
                                    </button>
                                    <button
                                      onClick={() => { if (drv.is_closed) handleReopenCashDrawer(drv.name); }}
                                      className={`p-1.5 text-slate-400 hover:text-amber-500 transition-colors ${drv.is_closed ? "" : "hidden"}`}
                                      title="Reabrir caja"
                                    >
                                      <Unlock size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* DRIVER ROLE PANEL (Vuelo de Repartidor) */
            <div className="space-y-8 max-w-2xl mx-auto">
              {/* Shift status banner */}
              <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <span className="text-[9px] font-black text-sky-400 uppercase tracking-[0.2em] block">
                    {currentUser.role === 'operator' ? 'SISTEMA DE LIQUIDACIÓN DE PLANTA' : 'SISTEMA DE LIQUIDACIÓN DE RUTA'}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center font-black">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase leading-none">
                        {currentUser.role === 'operator' ? 'Operador de Planta activo' : 'Repartidor activo'}
                      </p>
                      <p className="text-lg font-black italic text-white uppercase mt-1">{currentUser.name}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Estatus actual de tu caja</p>
                      <div className="flex items-center gap-2 mt-1">
                        {activeDriverSession ? (
                          <>
                            {activeDriverSession.last_location?.cash_closed ? (
                              <span className="text-[10px] font-black text-emerald-400 uppercase">🟢 CERRADO Y ENTREGADO</span>
                            ) : activeDriverSession.last_location?.cash_float !== undefined ? (
                              <span className="text-[10px] font-black text-amber-400 uppercase">🟡 EN CURSO (ABIERTA)</span>
                            ) : (
                              <span className="text-[10px] font-black text-yellow-500 uppercase">⚠️ ESPERANDO ASIGNACIÓN DE FONDO</span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-black text-rose-400 uppercase">🔴 SIN REGISTRO DE ENTRADA HOY</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Timestamp if closed */}
                    {activeDriverSession?.last_location?.cash_closed && (
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Cerrado el</p>
                        <p className="font-bold text-white mt-0.5">{new Date(activeDriverSession.last_location.cash_closed_at).toLocaleTimeString()}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl" />
              </div>

              {/* Main workflow box */}
              {activeDriverSession?.last_location?.cash_closed ? (
                /* Closed Ticket Mockup */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl text-center space-y-6"
                >
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase italic">¡Caja Liquidada!</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">Has realizado tu cierre de caja de hoy con éxito.</p>
                  </div>

                  {/* Receipt overview details */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-4 max-w-sm mx-auto font-mono text-xs">
                    <div className="border-b border-dashed border-slate-200 pb-3 text-center">
                      <p className="font-extrabold text-[10px] tracking-widest text-slate-400 uppercase">QUALITYWATER PURIFICADORA</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">Ticket #: CLOS-{activeDriverSession.id.substring(0, 6).toUpperCase()}</p>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase">Fondo Recibido:</span>
                      <span className="font-black text-slate-800">${Number(activeDriverSession.last_location?.cash_float || 0).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase">Ventas Entregadas:</span>
                      <span className="font-black text-slate-800">${Number(activeDriverSession.last_location?.cash_sales_total || 0).toFixed(2)}</span>
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between font-extrabold text-sm">
                      <span className="text-slate-500 uppercase">TOTAL ENTREGADO:</span>
                      <span className="text-slate-800">${Number(activeDriverSession.last_location?.cash_total_to_deliver || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const completeClosureData = {
                        name: currentUser.name,
                        cash_float: Number(activeDriverSession.last_location?.cash_float || 0),
                        sales_total: Number(activeDriverSession.last_location?.cash_sales_total || 0),
                        orders_count: getDriverSalesObj(currentUser.name).ordersCount,
                        total_to_deliver: Number(activeDriverSession.last_location?.cash_total_to_deliver || 0),
                        closed_at: activeDriverSession.last_location?.cash_closed_at,
                        closed_by_name: activeDriverSession.last_location?.closed_by_name
                      };
                      handleExportReceiptPDF(completeClosureData);
                    }}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl transition-all mx-auto active:scale-95"
                  >
                    <Download size={16} /> Descargar Comprobante PDF
                  </button>
                </motion.div>
              ) : activeDriverSession?.last_location?.cash_float !== undefined ? (
                /* Driver Drawer active - can perform Cierre */
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Fondo de Caja (Inicio)</p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        ${Number(activeDriverSession?.last_location?.cash_float || 0).toFixed(2)}
                      </p>
                      <span className="text-[8px] text-slate-400 block mt-1 uppercase">Entregado por el Admin</span>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Tus Ventas de Hoy</p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        ${Number(getDriverSalesObj(currentUser.name).salesTotal).toFixed(2)}
                      </p>
                      <span className="text-[8px] text-slate-400 block mt-1 uppercase">
                        {getDriverSalesObj(currentUser.name).ordersCount} pedidos confirmados
                      </span>
                    </div>
                  </div>

                  {/* Math Formula visual presentation */}
                  <div className="bg-sky-50/50 p-8 rounded-[36px] border border-sky-100/50 space-y-6">
                    <h4 className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Cálculo de Fórmula de Cierre de Caja</h4>
                    
                    <div className="space-y-3 font-bold text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Fondo de Caja inicial:</span>
                        <span className="text-slate-800">${Number(activeDriverSession.last_location.cash_float).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-sky-100 pb-3">
                        <span>+ Ventas cobradas hoy:</span>
                        <span className="text-slate-800">${Number(getDriverSalesObj(currentUser.name).salesTotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-black pt-2 text-slate-800">
                        <span className="uppercase">EFECTIVO A ENTREGAR:</span>
                        <span className="text-sky-600">
                          ${(Number(activeDriverSession.last_location.cash_float) + Number(getDriverSalesObj(currentUser.name).salesTotal)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cierre Action Button */}
                  <button
                    onClick={() => {
                      const dummyDrv = {
                        name: currentUser.name,
                        cash_float: Number(activeDriverSession.last_location.cash_float),
                        sales_total: Number(getDriverSalesObj(currentUser.name).salesTotal)
                      };
                      setSelectedDriverForClose(dummyDrv);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-950/10 active:scale-95 transition-all"
                  >
                    <Lock size={16} /> Realizar Cierre de Caja de Hoy
                  </button>
                </div>
              ) : (
                /* Waiting for cash float assignment */
                <div className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-xl text-center space-y-6">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <Clock size={32} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase italic">Esperando Asignación de Fondo</h3>
                    <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto uppercase mt-2 leading-relaxed">
                      Para poder iniciar tu jornada y registrar tus ventas, el administrador o encargado debe asignarte un fondo de caja de inicio (ej. $600 pesos).
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    {currentUser.role === 'operator' ? (
                      <span>⚠️ Por favor solicita tu fondo al encargado antes de iniciar operaciones en la planta.</span>
                    ) : (
                      <span>⚠️ Por favor solicita tu fondo al encargado antes de salir a ruta.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL: ASSIGN INITIAL FLOAT (FOR ADMIN/OPERATORS) */}
      <AnimatePresence>
        {selectedDriverForFloat && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !actionLoading && setSelectedDriverForFloat(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 z-[121]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 uppercase italic">Asignar <span className="text-sky-500">Fondo de Caja</span></h3>
                <button 
                  type="button"
                  onClick={() => setSelectedDriverForFloat(null)}
                  disabled={actionLoading}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black">
                    {selectedDriverForFloat.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase">Fondo para el repartidor</p>
                    <p className="text-sm font-black text-slate-800 uppercase italic">{selectedDriverForFloat.name}</p>
                  </div>
                </div>

                {/* Preset quick values selector */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Valores Rápidos de Asignación</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['200', '400', '600', '1000'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCustomFloatAmount(val)}
                        className={`p-3 rounded-2xl font-black text-xs transition-all border ${
                          customFloatAmount === val 
                            ? 'bg-sky-50 border-sky-500 text-sky-600' 
                            : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom numeric field */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">O Ingresa un Monto Personalizado ($)</label>
                  <input 
                    type="number"
                    value={customFloatAmount}
                    onChange={(e) => setCustomFloatAmount(e.target.value)}
                    placeholder="Ej. 600"
                    placeholderClassName="placeholder:font-bold"
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-base font-black text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setSelectedDriverForFloat(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all text-center"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    disabled={actionLoading || !customFloatAmount || isNaN(Number(customFloatAmount))}
                    onClick={() => handleAssignFloat(selectedDriverForFloat.name, Number(customFloatAmount))}
                    className="flex-2 bg-sky-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-sky-500/10 hover:bg-sky-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                    Asignar $ {customFloatAmount}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SHIFT CLOSING CONFIRMATION */}
      <AnimatePresence>
        {selectedDriverForClose && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !actionLoading && setSelectedDriverForClose(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 z-[121]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 uppercase italic">Confirmar <span className="text-sky-500">Cierre de Caja</span></h3>
                <button 
                  type="button"
                  onClick={() => setSelectedDriverForClose(null)}
                  disabled={actionLoading}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                  ¿Confirmas que {currentUser.role === 'operator' ? 'el personal de planta' : 'el repartidor'} ha concluido su turno y deseas realizar el cierre contable con los siguientes datos?
                </p>

                {/* Closing details list */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400 uppercase">{currentUser.role === 'operator' ? 'Operador/Planta:' : 'Repartidor:'}</span>
                    <span className="font-black text-slate-800 italic uppercase">{selectedDriverForClose.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400 uppercase">Fondo Inicial:</span>
                    <span className="font-black text-slate-800">${Number(selectedDriverForClose.cash_float).toFixed(2)} pesos</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400 uppercase">Ventas reportadas:</span>
                    <span className="font-black text-slate-800">${Number(selectedDriverForClose.sales_total).toFixed(2)} pesos</span>
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-3.5 flex justify-between text-slate-800 font-extrabold">
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">EFECTIVO TOTAL ENTREGADO:</span>
                    <span className="text-sm font-black text-sky-600">
                      ${(Number(selectedDriverForClose.cash_float) + Number(selectedDriverForClose.sales_total)).toFixed(2)} pesos
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setSelectedDriverForClose(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all text-center"
                  >
                    Volver
                  </button>
                  <button 
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleCloseCashDrawer(selectedDriverForClose.name, Number(selectedDriverForClose.cash_float), Number(selectedDriverForClose.sales_total), Number(selectedDriverForClose.orders_count))}
                    className="flex-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-950/10 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    Confirmar y Liquidar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ASSIGN SUCCESS POPUP (FOR ADMIN/OPERATORS) */}
      <AnimatePresence>
        {assignedSuccessModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssignedSuccessModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 z-[131] text-center"
            >
              <div className="flex justify-end absolute top-4 right-4">
                <button 
                  type="button"
                  onClick={() => setAssignedSuccessModal(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex flex-col items-center mt-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6">
                  <CheckCircle2 size={36} />
                </div>
                
                <h3 className="text-xl font-black text-slate-800 uppercase italic mb-2">¡Asignación <span className="text-emerald-500">Exitosa</span>!</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-6">
                  Fondo de caja registrado correctamente
                </p>

                <div className="w-full bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 mb-6">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase mb-1">Empleado</span>
                    <span className="text-sm font-black text-slate-800 uppercase italic leading-none">{assignedSuccessModal.employeeName}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-200" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase mb-1">Monto Asignado</span>
                    <span className="text-2xl font-black text-emerald-600">${assignedSuccessModal.amount.toFixed(2)} pesos</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setAssignedSuccessModal(null)}
                  className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
