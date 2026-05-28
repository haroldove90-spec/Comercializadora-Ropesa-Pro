import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCheck, Smartphone, MoreVertical, Paperclip, Smile } from 'lucide-react';
import { Message } from '../types';

export default function WhatsAppChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola AquaControl, ¿aceptan pedidos por aquí?', sender: 'client', timestamp: new Date() },
    { id: '2', text: '¡Hola! Claro que sí. ¿En qué podemos ayudarte hoy?', sender: 'system', timestamp: new Date() },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateFlow = () => {
    if (isProcessing || messages.length > 3) return;
    
    setIsProcessing(true);
    
    // Client message
    setTimeout(() => {
      const msg: Message = { 
        id: Date.now().toString(), 
        text: 'Necesito 2 garrafones para hoy', 
        sender: 'client', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, msg]);
      
      // Auto-response
      setTimeout(() => {
        const reply: Message = { 
          id: (Date.now() + 1).toString(), 
          text: '¡Hola! Recibido. Tu repartidor asignado es Juan y llegará en 40 min aproximadamente. ✅', 
          sender: 'system', 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, reply]);
        setIsProcessing(false);
      }, 1800);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] rounded-xl overflow-hidden border border-slate-200 w-full shadow-lg relative">
      {/* Header */}
      <div className="bg-[#075E54] px-4 py-3 text-white flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-300 border border-white/20 overflow-hidden bg-gradient-to-tr from-sky-400 to-indigo-500" />
          <div className="leading-tight">
            <h3 className="font-bold text-sm">AquaControl Bot</h3>
            <p className="text-[10px] opacity-80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              En línea
            </p>
          </div>
        </div>
        <div className="flex gap-4 opacity-70">
          <Paperclip size={18} />
          <MoreVertical size={18} />
        </div>
      </div>

      {/* Chat Background SVG Pattern (Optional but nice) */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://w7.pngwing.com/pngs/303/481/png-transparent-whatsapp-background-illustration-whatsapp-world-background-whatsapp-green-whatsapp-pattern-thumbnail.png")', backgroundSize: '400px' }} />

      {/* Messages area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 relative z-0 custom-scrollbar">
        <div className="flex justify-center mb-4">
          <span className="bg-[#D1E9F6] text-[#1c2e36] text-[10px] px-3 py-1 rounded-lg uppercase font-bold tracking-wider shadow-sm">
            Hoy
          </span>
        </div>

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-2 px-3 rounded-xl text-[13px] shadow-sm relative ${
                  msg.sender === 'client' 
                    ? 'bg-[#DCF8C6] text-slate-800 rounded-tr-none' 
                    : 'bg-white text-slate-800 rounded-tl-none'
                }`}
              >
                {msg.text}
                <div className="flex justify-end items-center gap-1 mt-1">
                  <span className="text-[9px] text-slate-400 font-medium">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.sender === 'system' ? null : <CheckCheck size={12} className="text-sky-500" />}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white p-2 px-4 rounded-full flex gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* "New Order" Action Overlay (UX Touch) */}
      {messages.length === 2 && !isProcessing && (
        <div className="absolute bottom-16 left-0 right-0 px-4">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={simulateFlow}
            className="w-full bg-white border border-emerald-200 text-emerald-600 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-emerald-50 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Smartphone size={14} /> Simular Pedido Juan Pérez
          </motion.button>
        </div>
      )}

      {/* Input area */}
      <div className="bg-[#f0f0f0] p-2 flex gap-2 items-center relative z-10 border-t border-slate-200">
        <div className="p-1 text-slate-400">
          <Smile size={22} />
        </div>
        <div className="flex-1 bg-white rounded-full px-4 py-2 text-[13px] text-slate-400">
          Escribe un mensaje...
        </div>
        <button
          onClick={simulateFlow}
          disabled={isProcessing}
          className="w-10 h-10 bg-[#075E54] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform disabled:opacity-50 shadow-md"
        >
          <Send size={18} fill="white" />
        </button>
      </div>
    </div>
  );
}
