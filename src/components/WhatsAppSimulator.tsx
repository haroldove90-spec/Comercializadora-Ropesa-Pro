
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

export default function WhatsAppSimulator() {
  const [loading, setLoading] = useState(false);

  const simulateIncomingOrder = async () => {
    setLoading(true);
    
    // Simulating a payload from a Webhook
    const mockOrder = {
      customer_name: 'Cliente WhatsApp ' + Math.floor(Math.random() * 1000),
      address: 'Calle Ficticia ' + Math.floor(Math.random() * 100),
      items: (Math.floor(Math.random() * 3) + 1) + ' Garrafones 20L',
      status: 'pending',
      total_price: 50 * (Math.floor(Math.random() * 3) + 1),
      payment_method: 'cash',
      whatsapp_number: '+52 55 ' + Math.floor(Math.random() * 90000000 + 10000000),
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('orders').insert([mockOrder]);
      if (error) throw error;
      console.log('Order simulated successfully');
    } catch (err) {
      console.error('Error simulating order:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-emerald-600 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-600/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest italic">WhatsApp <span className="text-emerald-200">Simulator</span></h3>
          <p className="text-[10px] font-bold opacity-70 uppercase">Modo Desarrollador • Webhook Mock</p>
        </div>
      </div>
      
      <p className="text-xs font-medium italic opacity-90 mb-6 leading-relaxed">
        Presiona el botón para simular una entrada de pedido vía API de WhatsApp Business.
      </p>

      <button 
        onClick={simulateIncomingOrder}
        disabled={loading}
        className="w-full bg-white text-emerald-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            <Send size={14} />
            Inyectar Pedido Mock
          </>
        )}
      </button>
    </div>
  );
}
