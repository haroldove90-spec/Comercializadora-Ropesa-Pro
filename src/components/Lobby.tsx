import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Waves, 
  Truck, 
  MessageCircle, 
  ArrowRight,
  Droplets,
  Mail,
  Lock,
  User,
  Phone,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LobbyProps {
  onSelectRole: (role: 'admin' | 'operator' | 'driver' | 'client') => void;
}

export default function Lobby({ onSelectRole }: LobbyProps) {
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'operator' | 'driver'>('driver');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const roles = [
    {
      id: 'admin',
      title: 'Administrador',
      desc: 'Gestión de finanzas, registro de ventas y métricas globales.',
      icon: ShieldCheck,
      color: 'bg-indigo-500',
      shadow: 'shadow-indigo-500/20',
      disabled: false
    },
    {
      id: 'operator',
      title: 'Personal de Planta (Desactivado)',
      desc: 'Gestión de inventarios, producción y control de calidad.',
      icon: Waves,
      color: 'bg-slate-300',
      shadow: 'shadow-slate-300/20',
      disabled: true
    },
    {
      id: 'driver',
      title: 'Vendedor',
      desc: 'Seguimiento de rutas, navegación y confirmación de entregas.',
      icon: Truck,
      color: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/20',
      disabled: false
    }
  ];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) {
          if (signInError.message.toLowerCase().includes('rate limit')) {
            throw new Error('Exceso de intentos. Por favor, espera unos minutos o contacta al administrador.');
          }
          throw signInError;
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phoneNumber,
              role: 'driver'
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('rate limit')) {
            throw new Error('Límite de registros alcanzado en Supabase. Intenta entrar con una cuenta existente o consulta al soporte.');
          }
          throw signUpError;
        }

        if (data.user) {
          setMessage({ type: 'success', text: '¡Cuenta creada con éxito! Iniciando sesión...' });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 select-none">
      <AnimatePresence mode="wait">
        <motion.div 
          key="auth-form"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-zinc-950 p-10 rounded-[32px] shadow-2xl border border-zinc-900 relative text-white"
        >
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <img 
                src="https://cossma.com.mx/ropesa.png" 
                alt="Ropesa Logo" 
                className="h-20 w-20 object-contain rounded-2xl shadow-lg ring-4 ring-zinc-900 bg-black p-1"
              />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">
              {authMode === 'login' ? 'Acceso al Sistema' : 'Registro de Cuenta'}
            </h2>
            <p className="text-xs text-[#C32A2C] font-black uppercase tracking-widest mt-2">
              Ropesa Management Platform
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Perfil Autocreado</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-bold leading-normal">
                    La plataforma registrará tu cuenta automáticamente con el perfil de <strong className="text-emerald-400 font-black">VENDEDOR</strong> para facilitar el inicio de ventas y rutas.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-4">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-white placeholder-zinc-600 focus:ring-4 focus:ring-[#C32A2C]/10 focus:border-[#C32A2C] transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-4">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="tel" 
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+52 ..."
                      className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-white placeholder-zinc-600 focus:ring-4 focus:ring-[#C32A2C]/10 focus:border-[#C32A2C] transition-all outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-4">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                   type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-white placeholder-zinc-600 focus:ring-4 focus:ring-[#C32A2C]/10 focus:border-[#C32A2C] transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-4">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-white placeholder-zinc-600 focus:ring-4 focus:ring-[#C32A2C]/10 focus:border-[#C32A2C] transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#C32A2C] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-950/50 border border-rose-900 text-rose-300 rounded-2xl flex items-center gap-3 text-xs font-bold animate-shake">
                <AlertCircle size={16} className="text-rose-400" />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-[#C32A2C] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-[#C32A2C]/20 hover:bg-[#a12022] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin text-white" size={20} /> : (authMode === 'login' ? 'Entrar' : 'Registrarme')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs font-black text-zinc-500 uppercase tracking-widest hover:text-[#C32A2C] transition-all cursor-pointer"
            >
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <footer className="mt-16 text-zinc-700 text-[10px] font-black uppercase tracking-[0.2em] italic">
        &copy; 2026 Ropesa System &bull; Mission Control Center
      </footer>
    </div>
  );
}
