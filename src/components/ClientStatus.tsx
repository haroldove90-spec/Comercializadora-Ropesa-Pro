import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, MapPin, Phone, MessageSquare, Clock, CheckCircle2, Truck, AlertCircle, ShoppingCart, Tag, TagIcon, Store } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface Order {
  id: string;
  customer_name: string;
  address: string;
  items: string;
  total_price: number;
  status: string;
  created_at: string;
}

export default function ClientStatus() {
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const WHATSAPP_NUMBER = '525544771611';

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
  };

  const fetchLatestOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data[0]) {
      setOrder(data[0] as Order);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchLatestOrder(), fetchProducts()]);
      setLoading(false);
    };
    init();

    const orderSubscription = supabase
      .channel('client_order_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        if (order && payload.new.id === order.id) {
          setOrder(payload.new as Order);
        }
      })
      .subscribe();

    const productsSubscription = supabase
      .channel('products_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderSubscription);
      supabase.removeChannel(productsSubscription);
    };
  }, [order?.id]);

  const handleOrderWhatsApp = (productName?: string) => {
    const message = productName 
      ? `Hola QualityWater, me gustaría pedir: ${productName}`
      : 'Hola QualityWater, me gustaría realizar un pedido de agua.';
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="w-12 h-12 border-4 border-[#C32A2C] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-[10px] italic">Sincronizando con QualityWater...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-black text-slate-800 uppercase italic tracking-tight">Agua de <span className="text-[#C32A2C]">Calidad</span></h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 italic">Purificadora Iztapalapa - Servicio a Domicilio</p>
      </div>

      {/* active Order Status IF exists */}
      {order && order.status !== 'delivered' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[48px] shadow-2xl border border-rose-100/30 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden"
        >
          <div className="relative z-10 flex-1">
            <span className="text-[9px] font-black bg-[#C32A2C] text-white px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Pedido en Curso</span>
            <h3 className="text-2xl font-black text-slate-800 uppercase italic">Tu pedido está <span className="text-[#C32A2C]">{order.status === 'assigned' ? 'en camino' : 'siendo preparado'}</span></h3>
            <p className="text-sm font-bold text-slate-400 mt-2 italic">Fecha: {new Date(order.created_at).toLocaleDateString()}</p>
            
            <div className="mt-8 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.status === 'assigned' ? 'bg-[#C32A2C] text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                <Truck size={24} />
              </div>
              <div className="h-px flex-1 bg-slate-100" />
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.status === 'delivered' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 text-white p-8 rounded-[32px] w-full md:w-72 shrink-0">
             <div className="flex justify-between items-center mb-6">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                <p className="text-2xl font-black text-emerald-400">${order.total_price.toFixed(2)}</p>
             </div>
             <p className="text-[10px] font-bold text-slate-400 leading-relaxed mb-4">{order.items}</p>
             <button 
              onClick={() => handleOrderWhatsApp()}
              className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
             >
               Soporte Pedido
             </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/20 rounded-bl-full -z-0" />
        </motion.div>
      )}

      {/* Product Catalog */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
          <div className="h-px flex-1 bg-slate-200" />
          <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-widest flex items-center gap-3">
             <ShoppingCart size={20} className="text-[#C32A2C]" /> Productos Disponibles
          </h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {products.length === 0 ? (
          <div className="text-center p-20 bg-slate-50 rounded-[48px] border border-dashed border-slate-200">
             <Store size={48} className="mx-auto text-slate-300 mb-4" />
             <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Cargando catálogo...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            {products.map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all"
              >
                <div className="flex-1">
                  <span className="text-[9px] font-black text-[#C32A2C] uppercase tracking-[0.2em]">QualityWater</span>
                  <h4 className="text-lg font-black text-slate-800 uppercase italic mt-1">{product.name}</h4>
                  <p className="text-xs font-bold text-slate-400 mt-2 line-clamp-2 italic">{product.description}</p>
                  <p className="text-2xl font-black text-emerald-500 mt-4">${product.price.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => handleOrderWhatsApp(product.name)}
                  className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 active:scale-95 transition-all shrink-0"
                  title="Pedir por WhatsApp"
                >
                  <MessageSquare size={24} fill="currentColor" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Floating CTA for WhatsApp */}
      <motion.button 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        onClick={() => handleOrderWhatsApp()}
        className="fixed bottom-24 right-4 md:right-8 bg-emerald-500 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl shadow-emerald-500/40 flex items-center gap-3 z-50 group hover:pr-10 transition-all active:scale-95 border-b-4 border-emerald-700"
      >
        <MessageSquare size={20} className="group-hover:rotate-12 transition-transform" />
        Pedir ahora
      </motion.button>
    </div>
  );
}
