import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Phone, 
  CreditCard, 
  DollarSign, 
  Share2, 
  Printer, 
  Check, 
  Loader2, 
  X, 
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

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
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POS({ userRole }: { userRole: string | null }) {
  // Active logged-in user session
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('qw_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.user_name) {
          setUserName(parsed.user_name);
        }
      } else {
        const backupStr = localStorage.getItem('quality_water_session_backup');
        if (backupStr) {
          const parsedBackup = JSON.parse(backupStr);
          if (parsedBackup.userName) {
            setUserName(parsedBackup.userName);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading session inside POS:', e);
    }
  }, []);

  // Products & Customers from DB
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Search and Select States
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Selected Customer or Free Text Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualCustomerName, setManualCustomerName] = useState('Venta Mostrador');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [manualCustomerAddress, setManualCustomerAddress] = useState('Mostrador');

  // Transaction States
  const [offlineSalesCount, setOfflineSalesCount] = useState<number>(() => {
    try {
      const pendingStr = localStorage.getItem('pending_offline_sales');
      if (pendingStr) {
        const parsed = JSON.parse(pendingStr);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (_) {}
    return 0;
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Generated Ticket Modal
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<{
    id: string;
    customer_name: string;
    items: { name: string; quantity: number; price: number }[];
    total: number;
    payment_method: string;
    date: string;
    phone?: string;
  } | null>(null);

  // Background Auto Sychronization for Offline Sales
  const syncOfflineSales = async () => {
    try {
      const pendingStr = localStorage.getItem('pending_offline_sales');
      if (!pendingStr) return;
      const pendingList = JSON.parse(pendingStr);
      if (!Array.isArray(pendingList) || pendingList.length === 0) return;

      console.log(`📶 Intentando sincronizar ${pendingList.length} ventas locales pendientes con Supabase...`);
      
      const successfulIndexes: number[] = [];
      
      for (let i = 0; i < pendingList.length; i++) {
        const payload = pendingList[i];
        try {
          const { error } = await supabase.from('orders').insert([payload]);
          if (!error) {
            successfulIndexes.push(i);
          } else {
            console.error('Error insertando venta offline:', error);
          }
        } catch (err) {
          console.error('Fallo de red en sincronización individual:', err);
        }
      }

      if (successfulIndexes.length > 0) {
        const remainingList = pendingList.filter((_, idx) => !successfulIndexes.includes(idx));
        if (remainingList.length > 0) {
          localStorage.setItem('pending_offline_sales', JSON.stringify(remainingList));
        } else {
          localStorage.removeItem('pending_offline_sales');
        }
        setOfflineSalesCount(remainingList.length);
        
        setNotification({
          type: 'success',
          message: `📶 ¡Sincronización Exitosa! Se subieron ${successfulIndexes.length} ventas pendientes de ruta.`
        });
      }
    } catch (err) {
      console.error('Error en proceso global de sincronización:', err);
    }
  };

  // Load Data
  const fetchData = async () => {
    // Si ya cargamos del cache, no mostramos la pantalla de carga agresiva
    const hasCachedData = products.length > 0 && customers.length > 0;
    if (!hasCachedData) {
      setLoading(true);
    }
    
    try {
      // Fetch Products
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (prodError) throw prodError;
      if (prodData) {
        setProducts(prodData);
        try {
          localStorage.setItem('pos_cache_products', JSON.stringify(prodData));
        } catch (_) {}
      }

      // Fetch Customers
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (custError) throw custError;
      if (custData) {
        setCustomers(custData);
        try {
          localStorage.setItem('pos_cache_customers', JSON.stringify(custData));
        } catch (_) {}
      }
    } catch (e: any) {
      console.error('Error cargando catálogo POS:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Cargar caché súper rápido para respuesta instantánea de UI
    try {
      const cachedProducts = localStorage.getItem('pos_cache_products');
      const cachedCustomers = localStorage.getItem('pos_cache_customers');
      if (cachedProducts) {
        setProducts(JSON.parse(cachedProducts));
      }
      if (cachedCustomers) {
        setCustomers(JSON.parse(cachedCustomers));
      }
    } catch (_) {}

    // 2. Traer catálogo fresco en segundo plano
    fetchData();

    // 3. Sincronizar cola offline inmediatamente
    syncOfflineSales();

    // 4. Temporizador de autosincronización cada 20 segundos
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncOfflineSales();
      }
    }, 20000);

    // 5. Escuchar evento de red recuperada
    const handleOnline = () => {
      console.log('📶 Conexión recuperada. Sincronizando ventas...');
      syncOfflineSales();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()))
  );

  // Filter customers based on search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  // Cart Helpers
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity <= 1) {
          return prevCart.filter(item => item.product.id !== product.id);
        }
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity - 1 } 
            : item
        );
      }
      return prevCart;
    });
  };

  const getCartCount = (productId: string): number => {
    const item = cart.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setManualCustomerName(customer.name);
    setManualCustomerPhone(customer.phone || '');
    setManualCustomerAddress(customer.address || 'Domicilio Registrado');
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setManualCustomerName('Venta Mostrador');
    setManualCustomerPhone('');
    setManualCustomerAddress('Mostrador');
    setCustomerSearch('');
  };

  // Prepare Virtual Ticket Modal Details (local state only, no DB write yet)
  const handleCheckout = () => {
    if (cart.length === 0) {
      setNotification({ type: 'error', message: 'Por favor, agrega al menos un producto al ticket.' });
      return;
    }

    setNotification(null);
    const total = getCartTotal();
    
    // Structure for generating virtual ticket
    const ticketItems = cart.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));

    // Ensure fallback is Venta Mostrador
    let finalCustomerName = manualCustomerName.trim();
    if (!finalCustomerName || finalCustomerName === 'Público General') {
      finalCustomerName = 'Venta Mostrador';
    }

    // Setup Generated Ticket Details in local state
    setGeneratedTicket({
      id: `V-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: finalCustomerName,
      items: ticketItems,
      total: total,
      payment_method: paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia',
      date: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
      phone: manualCustomerPhone
    });

    setShowTicketModal(true);
  };

  // Actually Save the generated transaction in Supabase with Offline Support
  const handleSaveTransaction = async () => {
    if (!generatedTicket) return;

    setIsSubmitting(true);
    setNotification(null);

    const itemsDescription = generatedTicket.items.map(item => {
      return `${item.quantity}x ${item.name}`;
    }).join(', ');

    const payload = {
      customer_name: generatedTicket.customer_name || 'Venta Mostrador',
      address: userRole === 'driver' ? (manualCustomerAddress.trim() === 'Mostrador' ? 'Reparto' : manualCustomerAddress) : manualCustomerAddress,
      items: itemsDescription,
      total_price: generatedTicket.total,
      status: 'delivered', // Immediate delivery
      source: 'pos', // Source tracking
      assigned_to_name: userRole === 'driver' ? (userName || 'Repartidor') : (userName || 'Mostrador'),
      created_at: new Date().toISOString()
    };

    const saveOffline = () => {
      try {
        const pendingStr = localStorage.getItem('pending_offline_sales');
        const pendingList = pendingStr ? JSON.parse(pendingStr) : [];
        pendingList.push(payload);
        localStorage.setItem('pending_offline_sales', JSON.stringify(pendingList));
        setOfflineSalesCount(pendingList.length);
        
        // Simular éxito para liberar la interfaz del chofer inmediatamente
        clearCart();
        setShowTicketModal(false);
        setNotification({ 
          type: 'success', 
          message: '📶 Venta guardada en tu dispositivo (Modo Offline). Se subirá a la nube automáticamente cuando recuperes señal.' 
        });
        
        if (!selectedCustomer) {
          handleClearCustomer();
        }
      } catch (err) {
        console.error('Error guardando venta local offline:', err);
        alert('Error al guardar registro localmente: ' + err);
      }
    };

    // Si detectamos explícitamente sin internet, guardar directo sin esperar a Supabase
    if (!navigator.onLine) {
      console.log('Dispositivo desconectado (Offline). Guardando localmente...');
      saveOffline();
      setIsSubmitting(false);
      return;
    }

    try {
      // Timeout seguro de 3 segundos para que si la red del repartidor está defectuosa, guarde offline sin congelarle la pantalla
      const savePromise = supabase
        .from('orders')
        .insert([payload]);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_CONEXION_DEBIL')), 3000)
      );

      const { error }: any = await Promise.race([savePromise, timeoutPromise]);

      if (error) throw error;

      // Clear operational states on success
      clearCart();
      setShowTicketModal(false);
      setNotification({ type: 'success', message: '¡Venta registrada con éxito en la base de datos!' });

      if (!selectedCustomer) {
        handleClearCustomer();
      }
    } catch (e: any) {
      console.warn('Conexión inestable o error de base de datos. Guardando venta offline para posterior sincronización:', e);
      saveOffline();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Share receipt via WhatsApp API
  const handleShareWhatsApp = () => {
    if (!generatedTicket) return;

    let textMessage = `📦 *COMERCIALIZADORA ROPESA* 📦\n`;
    textMessage += `=========================\n`;
    textMessage += `📄 *TICKET DE Venta* (#${generatedTicket.id})\n`;
    textMessage += `📅 *Fecha:* ${generatedTicket.date}\n`;
    textMessage += `👤 *Cliente:* ${generatedTicket.customer_name}\n`;
    if (userRole === 'driver') {
      textMessage += `🚚 *Modalidad:* Reparto / Entrega\n`;
    } else {
      textMessage += `🏢 *Modalidad:* Mostrador / Planta\n`;
    }
    textMessage += `=========================\n`;
    textMessage += `🛍️ *PRODUCTOS:* \n`;
    
    generatedTicket.items.forEach(item => {
      textMessage += `• ${item.quantity}x ${item.name} ($${(item.price * item.quantity).toFixed(2)})\n`;
    });
    
    textMessage += `=========================\n`;
    textMessage += `💰 *TOTAL A PAGAR:* $${generatedTicket.total.toFixed(2)}\n`;
    textMessage += `💳 *MÉTODO DE PAGO:* ${generatedTicket.payment_method}\n`;
    textMessage += `=========================\n`;
    textMessage += `¡Gracias por su preferencia! 🌊\n`;
    textMessage += `📍 Comercializadora Ropesa 📦`;

    const encodedText = encodeURIComponent(textMessage);
    const whatsappPhone = generatedTicket.phone ? generatedTicket.phone.replace(/\D/g, '') : '';
    
    // API link: support both target number if provided or simple send
    const link = whatsappPhone 
      ? `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(link, '_blank');
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 pb-24 h-full min-h-[calc(100vh-140px)]">
      
      {/* LEFT SECTION: Large Product Buttons Catalog */}
      <div className="flex-1 space-y-6 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
              <ShoppingBag className="text-sky-500 animate-bounce shrink-0" size={32} />
              Registro de <span className="text-sky-500">Ventas (POS)</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-slate-500 dark:text-slate-400 font-bold italic uppercase text-[10px] tracking-wider">
                {userRole === 'driver' ? 'PUNTO DE VENTA EN RUTA' : 'PUNTO DE VENTA EN MOSTRADOR'}
              </p>
              {offlineSalesCount > 0 && (
                <div className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  {offlineSalesCount} por sincronizar offline
                </div>
              )}
            </div>
          </div>

          {/* Search bar inside Catalog */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-bold text-slate-700 dark:text-slate-200"
            />
            {productSearch && (
              <button 
                onClick={() => setProductSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Global Notifications inside POS */}
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-semibold border ${
              notification.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </motion.div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 flex-1 text-slate-400">
            <Loader2 className="animate-spin mb-3 text-sky-500" size={32} />
            <p className="font-bold uppercase tracking-widest text-xs">Cargando catálogo...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex-1 flex flex-col justify-center items-center">
            <ShoppingBag className="mx-auto mb-4 text-slate-300 dark:text-slate-700" size={48} />
            <p className="font-black text-slate-700 dark:text-slate-300 uppercase italic">No se encontraron productos</p>
            <p className="text-slate-400 mt-1 text-xs">Agrega productos en el módulo de Inventario para mostrarlos en el POS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto no-scrollbar max-h-[60vh] xl:max-h-none">
            {filteredProducts.map((prod) => {
              const qty = getCartCount(prod.id);
              return (
                <motion.div
                  key={prod.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => addToCart(prod)}
                  className={`relative p-6 rounded-3xl cursor-pointer select-none border-2 transition-all overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm ${
                    qty > 0 
                      ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-500' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-300'
                  }`}
                >
                  {/* Badge quantity counter inside card */}
                  {qty > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 bg-sky-500 text-white min-w-8 h-8 rounded-full flex items-center justify-center font-black text-sm z-10 shadow-md border-2 border-white dark:border-slate-900 animate-pulse"
                    >
                      {qty}
                    </motion.div>
                  )}

                  <div className="space-y-1 pr-6">
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg uppercase leading-none tracking-tight">
                      {prod.name}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase italic line-clamp-2">
                      {prod.description || 'Sin descripción'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                      <span className="text-sky-500 text-sm font-black mr-0.5">$</span>
                      {prod.price.toFixed(2)}
                    </div>

                    {/* Touch Friendly Action Buttons to change quantities from the Card */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {qty > 0 && (
                        <button
                          onClick={() => removeFromCart(prod)}
                          className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/10 active:scale-95"
                          title="Disminuir"
                        >
                          <Minus size={18} strokeWidth={2.5} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => addToCart(prod)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-md active:scale-95 ${
                          qty > 0 
                            ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/10' 
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                        }`}
                        title="Agregar"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Cart list, customer details, checkout, receipt creation */}
      <div className="w-full xl:w-[400px] flex flex-col shrink-0 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl flex flex-col overflow-hidden h-full flex-1">
          
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={18} className="text-sky-500" />
              TICKET / CARRITO
            </h2>
            {cart.length > 0 && (
              <button 
                onClick={clearCart}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 size={12} />
                Vaciar
              </button>
            )}
          </div>

          <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[300px] xl:max-h-none">
            {/* Customer Lookup and Assignment */}
            <div className="space-y-2 relative">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Cliente <span className="text-sky-500 font-bold normal-case italic">(Opcional - Venta Mostrador)</span>
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar cliente registrado o escribir nombre libre..."
                  value={customerSearch}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setManualCustomerName(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-bold text-slate-700 dark:text-slate-200"
                />
                
                {customerSearch && (
                  <button
                    onClick={handleClearCustomer}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown for existing customers */}
              <AnimatePresence>
                {showCustomerDropdown && (customerSearch !== '' || customers.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30 max-h-48 overflow-y-auto"
                  >
                    <div className="bg-slate-50 dark:bg-slate-950 p-2 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      Coincidencias en Base de Datos
                    </div>
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-xs italic text-slate-500 text-center">
                        Ningún cliente guardado coincide. Se registrará como cliente libre.
                      </div>
                    ) : (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left p-3 hover:bg-sky-50/50 dark:hover:bg-slate-800 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-none transition-colors"
                        >
                          <div>
                            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase">{c.name}</p>
                            <p className="text-[10px] text-slate-400">{c.address || 'Sin dirección'}</p>
                          </div>
                          {c.phone && (
                            <span className="text-[10px] font-mono text-sky-500">{c.phone}</span>
                          )}
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close lookup background */}
              {showCustomerDropdown && (
                <div className="fixed inset-0 z-20" onClick={() => setShowCustomerDropdown(false)} />
              )}

              {/* Selected Customer indicator badge or free input metadata details */}
              {selectedCustomer ? (
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-sky-700 dark:text-sky-400 capitalize">
                      ✓ CLIENTE SELECCIONADO
                    </p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {selectedCustomer.name}
                    </p>
                    {selectedCustomer.phone && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <Phone size={10} /> {selectedCustomer.phone}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={handleClearCustomer}
                    className="text-sky-600 dark:text-sky-400 hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Telf. WhatsApp (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ej. 5512345678"
                        value={manualCustomerPhone}
                        onChange={(e) => setManualCustomerPhone(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-sky-500 text-xs font-bold font-mono py-1 text-slate-700 dark:text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Dirección o Ruta</label>
                      <input 
                        type="text" 
                        placeholder="Mostrador/Calle"
                        value={manualCustomerAddress}
                        onChange={(e) => setManualCustomerAddress(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-sky-500 text-xs font-bold py-1 text-slate-700 dark:text-slate-200 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Selected items in current transaction */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Artículos Agregados
              </label>

              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <ShoppingBag className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="font-bold uppercase tracking-tight text-[11px] italic">Carrito vacío</p>
                  <p className="text-[9px] mt-0.5">Agrega productos tocando las tarjetas de la izquierda.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar">
                  {cart.map((item) => (
                    <div 
                      key={item.product.id}
                      className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                        <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] font-black text-sky-500 tracking-tight font-mono">
                          {item.quantity} x ${item.product.price.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => removeFromCart(item.product)}
                          className="w-7 h-7 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors"
                        >
                          <Minus size={12} strokeWidth={3} />
                        </button>
                        
                        <span className="w-6 text-center font-extrabold text-xs text-slate-800 dark:text-slate-100">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => addToCart(item.product)}
                          className="w-7 h-7 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors"
                        >
                          <Plus size={12} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Options */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Efectivo', icon: DollarSign, disabled: false },
                  { id: 'card', label: 'Tarjeta (No)', icon: CreditCard, disabled: true },
                  { id: 'transfer', label: 'Transf (No)', icon: Share2, disabled: true }
                ].map((meth) => {
                  const Icon = meth.icon;
                  const active = paymentMethod === meth.id;
                  return (
                    <button
                      key={meth.id}
                      disabled={meth.disabled}
                      onClick={() => !meth.disabled && setPaymentMethod(meth.id as any)}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 border-2 transition-all ${
                        meth.disabled
                          ? 'opacity-35 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 text-[9px]'
                          : active 
                            ? 'bg-sky-500 border-sky-500 text-white font-black' 
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-sky-300 hover:text-slate-700'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-[9px] uppercase font-bold tracking-tight text-center">{meth.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
          </div>

          {/* Pricing summary footer and checkout triggers */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL A COBRAR</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase italic mt-1">Con IVA incluido</p>
              </div>
              <div className="text-3xl font-black text-slate-800 dark:text-white flex items-center font-mono">
                <span className="text-sky-500 text-lg mr-0.5">$</span>
                {getCartTotal().toFixed(2)}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isSubmitting || cart.length === 0}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider transition-all shadow-lg active:scale-[0.98] ${
                cart.length === 0 
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white shadow-sky-500/20 hover:shadow-indigo-500/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin text-white" size={18} />
                  <span>Registrando Venta...</span>
                </>
              ) : (
                <>
                  <Check size={18} strokeWidth={3} />
                  <span>REGISTRAR VENTA & COBRAR</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* TICKET AND RECEIPT VIRTUAL MODAL */}
      <AnimatePresence>
        {showTicketModal && generatedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Modal backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTicketModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Virtual Receipt Sheet */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="relative bg-white border border-slate-200 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col z-50 text-slate-800"
            >
              {/* Header */}
              <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-sky-500 tracking-wider">COMPROBANTE DE VENTA (SISTEMA)</span>
                <button 
                  onClick={() => setShowTicketModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Pure White Background Plain Ticket */}
              <div className="p-6 space-y-6 bg-white select-all font-sans text-xs text-slate-800 border-b border-dashed border-slate-200">
                <div className="text-center space-y-1 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 bg-sky-500/10 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ShoppingBag size={24} />
                  </div>
                  <h3 className="font-extrabold text-lg text-slate-950 uppercase tracking-tight">ROPESA</h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Comercializadora y Distribución Ropesa 📦</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">¡Venta Registrada con Éxito!</p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[9px]">No. Ticket:</span> <span className="font-bold text-slate-900">#{generatedTicket.id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[9px]">Fecha:</span> <span className="text-slate-800 font-semibold">{generatedTicket.date}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[9px]">Cliente:</span> <span className="font-bold text-slate-900 uppercase truncate max-w-[150px]">{generatedTicket.customer_name}</span></div>
                  {generatedTicket.phone && (
                    <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[9px]">WhatsApp:</span> <span className="text-slate-800 font-bold font-mono">{generatedTicket.phone}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[9px]">Atendido por:</span> <span className="font-bold text-slate-800">{userRole === 'driver' ? 'Repartidor (Ruta)' : 'Operador (Planta Mostrador)'}</span></div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex justify-between font-bold text-slate-900 text-xs pb-1 border-b border-slate-100">
                    <span>CONCEPTO / CANT.</span>
                    <span>IMPORTE</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {generatedTicket.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="truncate max-w-[200px]">
                          <p className="font-bold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{item.quantity} x ${item.price.toFixed(2)}</p>
                        </div>
                        <span className="font-bold text-slate-950 shrink-0">${(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-1">
                  <div className="flex justify-between font-black text-slate-950 text-sm">
                    <span>TOTAL:</span>
                    <span>${generatedTicket.total.toFixed(2)} MXN</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Método de Pago:</span>
                    <span className="font-bold uppercase text-slate-800">{generatedTicket.payment_method}</span>
                  </div>
                </div>

                <div className="text-center font-bold text-[9px] text-slate-400 uppercase pt-4 border-t border-dashed border-slate-100">
                  --- ¡Gracias por su preferencia! ---
                </div>
              </div>

              {/* Action utilities */}
              <div className="p-4 bg-slate-50 flex flex-col gap-2">
                <button
                  onClick={handleSaveTransaction}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-black uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95 transition-all text-center disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin text-white" size={16} />
                      <span>REGISTRANDO VENTA...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>REGISTRAR VENTA</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all text-center"
                >
                  <Share2 size={14} strokeWidth={2.5} />
                  Compartir por WhatsApp
                </button>

                <button
                  onClick={() => setShowTicketModal(false)}
                  disabled={isSubmitting}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 text-[10px] text-center uppercase tracking-widest font-black"
                >
                  Cerrar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING ACTION OVERLAY FOR IMMEDIATE COBROS AND CHECKOUT */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 55 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 55 }}
            className="fixed bottom-24 lg:bottom-12 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:max-w-2xl z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_-12px_40px_rgba(0,0,0,0.5)] border border-sky-500/40 flex items-center justify-between gap-4 select-none"
          >
            <div className="flex flex-col min-w-0">
              <p className="text-[10px] font-black uppercase text-sky-500 tracking-wider">Total del Ticket</p>
              <div className="text-2xl font-black text-slate-800 dark:text-white flex items-center leading-none mt-1">
                <span className="text-sm font-black text-sky-500 mr-0.5">$</span>
                {getCartTotal().toFixed(2)}
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase ml-2.5 truncate max-w-[120px]">
                  ({cart.reduce((acc, x) => acc + x.quantity, 0)} {cart.reduce((acc, x) => acc + x.quantity, 0) === 1 ? 'prod.' : 'prods.'})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearCart}
                className="w-12 h-12 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white rounded-2xl flex items-center justify-center text-slate-500 transition-all active:scale-95"
                title="Vaciar ticket"
              >
                <Trash2 size={20} />
              </button>

              <button
                onClick={handleCheckout}
                className="px-6 h-12 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95 transition-all text-center"
              >
                <Check size={16} strokeWidth={3} />
                <span>GENERAR TICKET</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
