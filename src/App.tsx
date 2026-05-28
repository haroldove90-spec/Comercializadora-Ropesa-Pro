import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  MessageSquare, 
  Bell, 
  Search,
  Clock,
  Menu,
  X,
  LogOut,
  Droplets,
  DollarSign,
  TrendingUp,
  Moon,
  Sun,
  Truck,
  User,
  CreditCard,
  Users,
  ShoppingBag,
  History,
  Store,
  ShieldCheck,
  Download,
  BookOpen,
  Settings,
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import WhatsAppChat from './components/WhatsAppChat';
import Finances from './components/Finances';
import DeliveryRoute from './components/DeliveryRoute';
import Profile from './components/Profile';
import Manual from './components/Manual';
import Attendance from './components/Attendance';
import NotificationHub from './components/NotificationHub';
import QualityLog from './components/QualityLog';
import ClientStatus from './components/ClientStatus';
import Notifications from './components/Notifications';
import POS from './components/POS';
import CashFloat from './components/CashFloat';

import Lobby from './components/Lobby';
import { usePWA } from './hooks/usePWA';

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabaseClient';

type View = 'lobby' | 'dashboard' | 'inventory' | 'finances' | 'route' | 'profile' | 'metrics' | 'sales' | 'customers' | 'settlement' | 'plant_cut' | 'driver_sales' | 'attendance' | 'quality' | 'client_status' | 'notifications' | 'manual' | 'pos' | 'cash_float';

export default function App() {
  const { isInstallable, installApp, requestPermissions } = usePWA();
  const [activeView, setActiveView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem('activeView');
      if (saved && saved !== 'lobby') return saved as View;
    } catch (_) {}
    return 'lobby';
  });
  const [userRole, setUserRole] = useState<'admin' | 'operator' | 'driver' | 'client' | null>(() => {
    try {
      const backupStr = localStorage.getItem('quality_water_session_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup?.userRole) return backup.userRole;
      }
    } catch (_) {}
    return null;
  });
  const [currentRoleView, setCurrentRoleView] = useState<'admin' | 'operator' | 'driver' | 'client' | null>(() => {
    try {
      const backupStr = localStorage.getItem('quality_water_session_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup?.currentRoleView) return backup.currentRoleView;
      }
      const saved = localStorage.getItem('currentRoleView');
      if (saved) return saved as any;
    } catch (_) {}
    return null;
  });
  const [userName, setUserName] = useState<string | null>(() => {
    try {
      const backupStr = localStorage.getItem('quality_water_session_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup?.userName) return backup.userName;
      }
    } catch (_) {}
    return null;
  });
  const [session, setSession] = useState<any>(() => {
    try {
      const backupStr = localStorage.getItem('quality_water_session_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup?.session) return backup.session;
      }
    } catch (_) {}
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Backup sync effect
  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem('quality_water_session_backup', JSON.stringify({
          session,
          userRole,
          currentRoleView,
          userName
        }));
      } catch (_) {}
    } else if (session === null) {
      try {
        localStorage.removeItem('quality_water_session_backup');
      } catch (_) {}
    }
  }, [session, userRole, currentRoleView, userName]);

  useEffect(() => {
    try {
      if (userName || currentRoleView) {
        localStorage.setItem('qw_session', JSON.stringify({
          user_id: session?.user?.id || '00000000-0000-0000-0000-000000000000',
          user_name: userName || 'Empleado Demo',
          user_role: currentRoleView || userRole || 'repartidor'
        }));
      }
    } catch (_) {}
  }, [userName, currentRoleView, userRole, session]);

  useEffect(() => {
    if (activeView && activeView !== 'lobby') {
      try {
        localStorage.setItem('activeView', activeView);
      } catch (_) {}
    }
  }, [activeView]);

  useEffect(() => {
    if (currentRoleView) {
      try {
        localStorage.setItem('currentRoleView', currentRoleView);
      } catch (_) {}
    }
  }, [currentRoleView]);

  useEffect(() => {
    let mounted = true;

    // Función auxiliar para auto-limpieza en caso de tokens corruptos
    const cleanCorruptTokens = () => {
      console.warn('Detectado token o sesión corrupta de Supabase. Limpiando almacenamiento local...');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => {
          try {
            localStorage.removeItem(k);
          } catch (e) {}
        });
      } catch (e) {
        console.error('No se pudo limpiar localStorage:', e);
      }
    };

    // Control global de rechazos asíncronos para evitar alertas molestas y auto-recuperar la app
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!mounted) return;
      const reason = event.reason;
      
      let message = '';
      try {
        message = reason?.message || reason?.error_description || String(reason || '');
        if (reason && typeof reason === 'object') {
          message += ' ' + JSON.stringify(reason);
        }
      } catch (_) {
        message = String(reason || '');
      }
      
      const lowerMsg = message.toLowerCase();
      if (
        lowerMsg.includes('failed to fetch') ||
        lowerMsg.includes('fetch') ||
        lowerMsg.includes('networkerror') ||
        lowerMsg.includes('network error')
      ) {
        console.warn('Capturado y mitigado error de red offline en background:', message);
        try {
          event.preventDefault();
          event.stopPropagation();
        } catch (_) {}
        return;
      }
      
      if (
        lowerMsg.includes('refresh token') || 
        lowerMsg.includes('refresh_token') || 
        lowerMsg.includes('invalid_grant') || 
        lowerMsg.includes('grant') || 
        lowerMsg.includes('authapierror') ||
        lowerMsg.includes('token not found')
      ) {
        console.warn('Capturado y mitigado error de Auth del servidor (unhandledrejection):', message);
        try {
          event.preventDefault();
          event.stopPropagation();
        } catch (_) {}

        cleanCorruptTokens();
        supabase.auth.signOut().catch(() => {});
        
        setSession(null);
        setUserRole(null);
        setCurrentRoleView(null);
        setUserName(null);
        setActiveView('lobby');
        setLoading(false);
      }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      if (!mounted) return;
      const message = event.message || '';
      const errorObj = event.error;
      let fullMessage = message;
      try {
        if (errorObj) {
          fullMessage += ' ' + (errorObj.message || '') + ' ' + JSON.stringify(errorObj);
        }
      } catch (_) {}

      const lowerMsg = fullMessage.toLowerCase();
      if (
        lowerMsg.includes('refresh token') || 
        lowerMsg.includes('refresh_token') || 
        lowerMsg.includes('invalid_grant') ||
        lowerMsg.includes('grant') ||
        lowerMsg.includes('authapierror')
      ) {
        console.warn('Capturado y mitigado error de Auth en error global (onerror):', fullMessage);
        try {
          event.preventDefault();
          event.stopPropagation();
        } catch (_) {}

        cleanCorruptTokens();
        supabase.auth.signOut().catch(() => {});

        setSession(null);
        setUserRole(null);
        setCurrentRoleView(null);
        setUserName(null);
        setActiveView('lobby');
        setLoading(false);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    // Timeout de seguridad definitivo: si en 4 segundos la app sigue cargando por temas de red, forzamos el cierre de la pantalla de carga.
    // Esto asegura que la app siempre cargue el Lobby o la pantalla principal de forma inmediata.
    const safetyTimeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Freno de seguridad de carga activado (Timeout).');
        setLoading(false);
      }
    }, 4000);

    // 1. Escuchar cambios de autenticación
    console.log('Iniciando suscripción a cambios de Auth...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      console.log(`Evento de Auth detectado: ${event}`);
      
      if (currentSession) {
        setSession(currentSession);
        fetchUserRole(currentSession.user.id, currentSession.user.user_metadata?.full_name);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserRole(null);
        setCurrentRoleView(null);
        setActiveView('lobby');
        setLoading(false);
      }
    });

    // 2. Intento de carga inicial de sesión
    const init = async () => {
      console.log('Iniciando carga inicial de sesión...');
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Error al recuperar sesión inicial:', error);
          if (
            error.message?.includes('Refresh Token') || 
            error.message?.includes('refresh_token') || 
            error.message?.includes('grant')
          ) {
            cleanCorruptTokens();
            await supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUserRole(null);
            setCurrentRoleView(null);
            setActiveView('lobby');
          }
        } else if (initialSession) {
          console.log('Sesión inicial recuperada con éxito');
          setSession(initialSession);
          await fetchUserRole(initialSession.user.id, initialSession.user.user_metadata?.full_name);
        } else {
          console.log('No inicial de Supabase. Comprobando backup...');
          // Si no hay sesión devuelta por Supabase pero tenemos backup, ¡lo conservamos!
          const backupStr = localStorage.getItem('quality_water_session_backup');
          let hasBackup = false;
          if (backupStr) {
            try {
              const backup = JSON.parse(backupStr);
              if (backup && backup.session) {
                console.log('Sesión recuperada desde el backup de localStorage en refresh');
                setSession(backup.session);
                setUserRole(backup.userRole);
                setCurrentRoleView(backup.currentRoleView);
                setUserName(backup.userName);
                hasBackup = true;
              }
            } catch (_) {}
          }
          
          if (!hasBackup) {
            setUserRole(null);
            setCurrentRoleView(null);
            setActiveView('lobby');
          }
        }
      } catch (err: any) {
        console.error('Fallo de inicialización crítica en init:', err);
        const errMsg = err?.message || String(err || '');
        if (
          errMsg.includes('Refresh Token') || 
          errMsg.includes('refresh_token') || 
          errMsg.includes('grant')
        ) {
          cleanCorruptTokens();
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUserRole(null);
          setCurrentRoleView(null);
          setActiveView('lobby');
        }
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeoutId);
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeoutId);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Si la pantalla es móvil, cerrar el sidebar por defecto para que no obstaculice
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const fetchUserRole = async (userId: string, defaultName?: string) => {
    try {
      console.log('Cargando rol para:', userId);
      // Timeout para la consulta a la base de datos (4 segundos máximo)
      const rolePromise = supabase
        .from('employees')
        .select('role, name')
        .eq('auth_id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout en DB')), 4000)
      );

      const { data, error }: any = await Promise.race([rolePromise, timeoutPromise]);
      
      if (error) throw error;

      if (data) {
        let role = String(data.role || 'driver').toLowerCase();
        
        // Normalización de roles (Español -> English Interno)
        if (role === 'planta' || role === 'operador') role = 'operator';
        if (role === 'repartidor' || role === 'chofer' || role === 'client' || role === 'vendedor') role = 'driver';
        if (role === 'administrador') role = 'admin';
        
        setUserRole(role as any);
        
        // Mantener la vista de rol seleccionada previamente por el usuario si está guardada en localStorage
        const savedRoleView = localStorage.getItem('currentRoleView');
        const finalRoleView = (savedRoleView && ['admin', 'operator', 'driver', 'client'].includes(savedRoleView))
          ? (savedRoleView as any)
          : (role as any);
          
        setCurrentRoleView(finalRoleView);
        setUserName(data.name);
        
        // Cambio de vista inmediato respetando la selección previa de localStorage
        const savedActiveView = localStorage.getItem('activeView');
        if (savedActiveView && savedActiveView !== 'lobby') {
          setActiveView(savedActiveView as View);
        } else if (activeView === 'lobby') {
          switch(finalRoleView) {
            case 'admin': setActiveView('metrics'); break;
            case 'operator': setActiveView('pos'); break;
            case 'driver': setActiveView('pos'); break;
            default: setActiveView('pos');
          }
        }
      } else {
        const savedRoleView = localStorage.getItem('currentRoleView') as any;
        setUserRole('driver');
        setCurrentRoleView(savedRoleView && ['admin', 'operator', 'driver', 'client'].includes(savedRoleView) ? savedRoleView : 'driver');
        setUserName(defaultName || 'Vendedor');
        
        const savedActiveView = localStorage.getItem('activeView');
        if (savedActiveView && savedActiveView !== 'lobby') {
          setActiveView(savedActiveView as View);
        } else if (activeView === 'lobby') {
          setActiveView('pos');
        }
      }
    } catch (err) {
      console.error('Error obteniendo rol:', err);
      const savedRoleView = localStorage.getItem('currentRoleView') as any;
      setUserRole('driver');
      setCurrentRoleView(savedRoleView && ['admin', 'operator', 'driver', 'client'].includes(savedRoleView) ? savedRoleView : 'driver');
      setUserName(defaultName || 'Usuario');
      
      const savedActiveView = localStorage.getItem('activeView');
      if (savedActiveView && savedActiveView !== 'lobby') {
        setActiveView(savedActiveView as View);
      } else if (activeView === 'lobby') {
        setActiveView('pos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = (role: 'admin' | 'operator' | 'driver' | 'client') => {
    // This is now purely for visual priority if needed, but real role comes from DB
    requestPermissions();
  };

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    
    console.log('Cierre de sesión iniciado...');
    
    try {
      // Intentamos cerrar sesión en segundo plano, no bloqueamos la UI
      supabase.auth.signOut().catch(err => console.warn('Supabase signOut error (ignorable):', err));
    } catch (e) {
      console.error('Excepción en logout:', e);
    } finally {
      // Limpieza inmediata y forzada
      try {
        localStorage.removeItem('activeView');
        localStorage.removeItem('currentRoleView');
        localStorage.removeItem('quality_water_session_backup');
      } catch (_) {}
      setSession(null);
      setUserRole(null);
      setCurrentRoleView(null);
      setUserName(null);
      setActiveView('lobby');
      setLoggingOut(false);
      console.log('Sesión cerrada exitosamente en local');
    }
  };

  const getNavItems = () => {
    let items: any[] = [];
    
    if (currentRoleView === 'admin') {
      items = [
        { id: 'dashboard', label: 'Pedidos', icon: LayoutDashboard },
        { id: 'manual', label: 'Manual Usuario', icon: BookOpen },
        { id: 'inventory', label: 'Gestión de Productos', icon: Package },
        { id: 'metrics', label: 'Métricas', icon: TrendingUp },
        { id: 'attendance', label: 'Asistencia', icon: Clock },
        { id: 'cash_float', label: 'Asignación de inventarios', icon: DollarSign },
        { id: 'sales', label: 'Métricas', icon: History },
        { id: 'customers', label: 'Clientes', icon: Users },
        { id: 'driver_sales', label: 'Empleados', icon: Truck },
        { id: 'notifications', label: 'Notificaciones', icon: Bell },
        { id: 'profile', label: 'Perfil', icon: User },
      ];
    } else if (currentRoleView === 'driver') {
      items = [
        { id: 'pos', label: 'Venta POS', icon: CreditCard },
        { id: 'manual', label: 'Manual Usuario', icon: BookOpen },
        { id: 'route', label: 'Mi Ruta', icon: Truck },
        { id: 'sales', label: 'Mis Ventas', icon: History },
        { id: 'customers', label: 'Clientes', icon: Users },
        { id: 'attendance', label: 'Asistencia', icon: Clock },
        { id: 'cash_float', label: 'Asignación de inventarios', icon: DollarSign },
        { id: 'notifications', label: 'Notificaciones', icon: Bell },
        { id: 'profile', label: 'Perfil', icon: User },
      ];
    } else if (currentRoleView === 'client') {
      items = [
        { id: 'client_status', label: 'Mi Pedido', icon: MessageSquare },
        { id: 'profile', label: 'Perfil', icon: User },
      ];
    }

    // Agregar accesos directos de cambio de rol para el administrador real
    if (userRole === 'admin') {
      if (currentRoleView === 'admin') {
        items.push(
          { id: 'switch_to_driver', label: 'Vista Vendedor', icon: Truck, isShortcut: true }
        );
      } else {
        items.push(
          { id: 'switch_to_admin', label: 'Ver Admin', icon: ShieldCheck, isShortcut: true }
        );
      }
    }

    return items;
  };

  const handleNavClick = (itemId: string) => {
    if (itemId === 'switch_to_driver') {
      setCurrentRoleView('driver');
      setActiveView('pos');
    } else if (itemId === 'switch_to_admin') {
      setCurrentRoleView('admin');
      setActiveView('metrics');
    } else {
      setActiveView(itemId as View);
    }

    // Auto-close sidebar on mobile after clicking a navigation item
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8 overflow-hidden rounded-3xl border-4 border-zinc-900 bg-zinc-950 p-6 shadow-2xl">
          <img 
            src="https://cossma.com.mx/ropesa.png" 
            alt="Splash Ropesa" 
            className="max-w-[200px] h-auto mx-auto object-contain animate-pulse"
          />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Ropesa</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Iniciando Centro de Control...</p>
          </div>
          <button 
            onClick={() => setLoading(false)}
            className="text-[10px] font-black text-white uppercase tracking-widest hover:bg-[#C32A2C] hover:border-[#C32A2C] transition-all bg-transparent border border-zinc-800 px-5 py-3 rounded-full cursor-pointer"
          >
            ¿Tarda mucho? Cargar Manualmente
          </button>
        </div>
      </div>
    );
  }

  const navItems = getNavItems();

  if (!session) {
    return <Lobby onSelectRole={handleRoleSelection} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-slate-100">
      
      {/* Background overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/80 z-[45] backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        />
      )}

      {/* Header - Mobile Only */}
      <header className="md:hidden shrink-0 sticky top-0 z-[50] border-b border-zinc-900 bg-[#000000]">
        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-3">
            {/* Hamburger / Close Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl bg-[#C32A2C] text-white hover:bg-[#a12022] active:scale-95 transition-all cursor-pointer"
              title={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
              aria-label="Toggle menú"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-2">
              <img 
                src="https://cossma.com.mx/ropesa.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain rounded"
              />
              <div className="flex flex-col">
                <span className="font-display font-black text-sm tracking-tight leading-none text-white">
                  Ropesa
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-[#C32A2C] mt-1">{userName || 'Usuario'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={installApp}
                title="Instalar App"
                className="p-2 rounded-xl bg-[#C32A2C]/20 text-[#C32A2C] hover:bg-[#C32A2C] hover:text-white transition-all flex items-center gap-1"
              >
                <Download size={14} />
                <span className="text-[8px] font-black uppercase tracking-tight">Instalar</span>
              </button>
            )}
            <NotificationHub userRole={currentRoleView} onViewAll={() => setActiveView('notifications')} />
          </div>
        </div>


      </header>

      {/* Toast Notification Container Removed */}

      {/* Sidebar - Desktop and Mobile responsive navigation */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 280 : 80) }}
        className={`flex flex-col fixed inset-y-0 left-0 z-50 border-r border-zinc-900 transition-transform duration-300 ease-in-out ${
          isSidebarOpen 
            ? 'translate-x-0' 
            : '-translate-x-full md:translate-x-0'
        } bg-[#000000] text-white`}
      >
        <div 
          className="p-6 flex items-center gap-3 group border-b border-zinc-900"
        >
          <img 
            src="https://cossma.com.mx/ropesa.png" 
            alt="Logo" 
            className="w-10 h-10 object-contain rounded-lg group-hover:scale-110 transition-transform"
          />
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight whitespace-nowrap leading-none text-white">Ropesa</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-[#C32A2C] mt-1">{userName || 'Usuario'}</span>
            </div>
          )}
        </div>

          <nav className="flex-1 px-4 mt-4 space-y-2 overflow-y-auto custom-scrollbar-sidebar">
            {isInstallable && (
              <button
                onClick={installApp}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all bg-[#C32A2C]/10 text-[#C32A2C] hover:bg-[#C32A2C] hover:text-white mb-4 border border-[#C32A2C]/20"
              >
                <Download size={22} className="shrink-0" />
                {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest text-left">Instalar Aplicación</span>}
              </button>
            )}

            {navItems.map((item: any) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                item.isShortcut 
                  ? 'border border-dashed border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
                  : activeView === item.id 
                    ? 'bg-[#C32A2C] text-white shadow-lg shadow-[#C32A2C]/20 font-black' 
                    : 'text-slate-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <item.icon size={22} className={item.isShortcut ? 'text-amber-400 animate-pulse shrink-0' : 'shrink-0'} />
              {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wider">{item.label}</span>}
            </button>
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 mt-8 cursor-pointer"
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Cerrar Sesión</span>}
          </button>
        </nav>

        <div className="p-6">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-[#C32A2C] hover:bg-[#a12022] text-white transition-colors cursor-pointer"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.aside>

      <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-[280px]' : 'md:ml-[80px]'}`}>
        {/* Header - Desktop */}
        <header className="h-16 hidden md:flex border-b border-zinc-900 bg-[#000000] items-center justify-between px-6 shrink-0 sticky top-0 z-50 text-white">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#C32A2C] italic">
              {navItems.find((i: any) => i.id === activeView)?.label || 'Panel'}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <NotificationHub userRole={currentRoleView} onViewAll={() => setActiveView('notifications')} />
            {isInstallable && (
              <button
                onClick={installApp}
                title="Instalar App"
                className="p-2 rounded-lg bg-[#C32A2C]/10 text-[#C32A2C] hover:bg-[#C32A2C] hover:text-white transition-all flex items-center gap-2 border border-[#C32A2C]/20 cursor-pointer"
              >
                <Download size={18} />
                <span className="text-[9px] font-black uppercase tracking-tight">Instalar</span>
              </button>
            )}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {currentRoleView === 'admin' ? 'Administrador' : currentRoleView === 'operator' ? 'Planta' : currentRoleView === 'driver' ? 'Vendedor' : 'Cliente'}
                  {currentRoleView !== userRole && (
                    <span className="text-amber-500 ml-1 text-[8px] tracking-normal lowercase italic">(vista)</span>
                  )}
                </p>
                <p className="text-xs font-bold text-slate-200 uppercase italic">{userName || 'Usuario'}</p>
              </div>
              <div className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Sistema Online" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8 flex flex-col lg:flex-row gap-6 overflow-hidden min-w-0 md:h-[calc(100vh-64px)]">
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar md:pr-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
              >
                {activeView === 'dashboard' ? <Dashboard userRole={currentRoleView} /> : 
                 activeView === 'inventory' ? <Inventory userRole={currentRoleView} /> :
                 activeView === 'pos' ? <POS userRole={currentRoleView} /> :
                 activeView === 'finances' ? <Finances userRole={currentRoleView} userName={userName} /> :
                 activeView === 'metrics' ? <Finances initialTab="metrics" userRole={currentRoleView} userName={userName} /> :
                 activeView === 'sales' ? <Finances initialTab="sales" userRole={currentRoleView} userName={userName} /> :
                 activeView === 'customers' ? <Finances initialTab="customers" userRole={currentRoleView} userName={userName} /> :
                 activeView === 'driver_sales' ? <Finances initialTab="driver_sales" userRole={currentRoleView} userName={userName} /> :
                 activeView === 'plant_cut' ? <Finances initialTab="plant_cut" userRole={currentRoleView} userName={userName} /> :
                 activeView === 'attendance' ? <Attendance userRole={currentRoleView} userName={userName} /> :
                 activeView === 'cash_float' ? <CashFloat userRole={currentRoleView} /> :
                 activeView === 'quality' ? <QualityLog userRole={currentRoleView} /> :
                 activeView === 'route' ? <DeliveryRoute userRole={currentRoleView} /> :
                 activeView === 'client_status' ? <ClientStatus userRole={currentRoleView} /> :
                 activeView === 'notifications' ? <Notifications userRole={currentRoleView} /> :
                 activeView === 'manual' ? <Manual role={currentRoleView} /> :
                 <Profile />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

