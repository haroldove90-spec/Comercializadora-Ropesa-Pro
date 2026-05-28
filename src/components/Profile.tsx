import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  ChevronRight, 
  LogOut,
  MapPin,
  Mail,
  Phone,
  Building,
  Camera,
  Loader2,
  Save,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;

      if (session?.user) {
        // Timeout para la consulta de perfil
        const profilePromise = supabase
          .from('employees')
          .select('*')
          .eq('auth_id', session.user.id)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('La conexión con la base de datos ha expirado.')), 6000)
        );

        const { data, error }: any = await Promise.race([profilePromise, timeoutPromise]);
        
        if (error) {
          console.error('Error buscando perfil:', error);
          setMessage({ type: 'error', text: 'Error al cargar datos: ' + error.message });
        } else if (data) {
          setUser(data);
          setName(data.name || '');
          setPhone(data.phone || '');
          setEmail(data.email || session.user.email || '');
        } else {
          // Autocreate logic for missing records
          const newRecord = {
            auth_id: session.user.id,
            name: session.user.user_metadata?.full_name || 'Nuevo Usuario',
            email: session.user.email,
            role: session.user.user_metadata?.role || 'client'
          };
          
          const { data: created } = await supabase
            .from('employees')
            .insert([newRecord])
            .select()
            .single();
            
          if (created) {
            setUser(created);
            setName(created.name);
            setPhone(created.phone || '');
            setEmail(created.email || '');
          }
        }
      }
    } catch (err: any) {
      console.error('Excepción en Profile:', err);
      setMessage({ type: 'error', text: 'No se pudo conectar con el servidor: ' + (err.message || 'Error desconocido') });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.auth_id) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('employees')
        .update({ name, phone, email })
        .eq('auth_id', user.auth_id);

      if (error) {
        setMessage({ type: 'error', text: 'Error al actualizar: ' + error.message });
      } else {
        setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
        setEditMode(false);
        await fetchProfile();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Ocurrió un error inesperado' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.auth_id) {
      setMessage({ type: 'error', text: 'Error: Perfil no identificado.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentAuthId = session?.user?.id || user?.auth_id;

      if (!currentAuthId) {
        throw new Error('Sesión no encontrada. Por favor, vuelve a iniciar sesión.');
      }

      console.log('Iniciando subida de foto para:', currentAuthId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentAuthId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Subida al Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Error detallado Storage:', uploadError);
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
          throw new Error('ERROR DE SEGURIDAD (Storage): No tienes permiso para subir archivos al bucket "avatars". Activa las políticas RLS en Supabase Storage.');
        }
        throw new Error('Error al subir a Storage: ' + uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Foto subida con éxito, actualizando tabla con URL:', publicUrl);

      // 2. Actualización en la tabla
      const { error: updateError } = await supabase
        .from('employees')
        .update({ avatar_url: publicUrl })
        .eq('auth_id', currentAuthId);

      if (updateError) {
        console.error('Error detallado Tabla:', updateError);
        if (updateError.message.includes('row-level security') || updateError.message.includes('policy')) {
          throw new Error('ERROR DE SEGURIDAD (Tabla): No tienes permiso para actualizar tu perfil en la tabla "employees". Revisa las políticas RLS de la tabla.');
        }
        throw new Error('Error al actualizar registro: ' + updateError.message);
      }

      setMessage({ type: 'success', text: '¡Foto de perfil actualizada!' });
      await fetchProfile();
    } catch (err: any) {
      console.error('Error crítico en perfil:', err);
      setMessage({ type: 'error', text: err.message || 'Error inesperado al procesar la foto' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Contraseña actualizada' });
      setShowPasswordModal(false);
      setNewPassword('');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-black uppercase tracking-widest text-xs">Cargando Perfil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12">
        {/* Left Side: Avatar & Basic Info */}
        <div className="flex flex-col items-center text-center space-y-6 lg:w-1/3">
          <div className="relative group">
            <div className="w-40 h-40 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-[56px] flex items-center justify-center text-white text-5xl font-black shadow-2xl overflow-hidden ring-8 ring-white">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.slice(0, 2).toUpperCase() || 'QW'
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-12 h-12 bg-sky-500 text-white border-4 border-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
            >
              <Camera size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              className="hidden" 
              accept="image/*" 
            />
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none italic uppercase">
              {user?.name || 'Usuario'}
            </h1>
            <p className="text-sky-500 font-bold italic mt-2 uppercase text-xs tracking-widest">
              {user?.role === 'admin' ? 'Administrador Maestro' : 
               user?.role === 'operator' ? 'Operador de Planta' : 
               user?.role === 'driver' ? 'Experto en Logística (Chofer)' : 'Cliente Distinguido'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Shield size={12} /> Cuenta Verificada
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Config */}
        <div className="flex-1 space-y-8 w-full">
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </motion.div>
          )}

          <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Información General</h3>
              <button 
                onClick={() => setEditMode(!editMode)}
                className="text-xs font-black text-sky-500 uppercase tracking-widest hover:underline"
              >
                {editMode ? 'Cancelar' : 'Editar Perfil'}
              </button>
            </div>

            <div className="p-8">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Nombre Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text"
                        disabled={!editMode}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all disabled:opacity-70"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Teléfono Móvil</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="tel"
                        disabled={!editMode}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all disabled:opacity-70"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Correo Electrónico (Contacto)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="email"
                      disabled={!editMode}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all disabled:opacity-70"
                    />
                  </div>
                </div>

                {editMode && (
                  <button 
                    type="submit"
                    disabled={saving}
                    className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Guardar Cambios
                  </button>
                )}
              </form>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Seguridad y Accesos</h3>
            </div>
            <div className="p-8 space-y-4">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-sky-50 hover:border-sky-100 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-sky-500 shadow-sm transition-colors">
                    <Lock size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Seguridad</p>
                    <p className="text-sm font-black text-slate-800 uppercase italic">Cambiar Contraseña</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-sky-500 transition-all" />
              </button>

              <div className="flex items-center gap-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Building size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Sucursal / Planta</p>
                  <p className="text-sm font-black text-indigo-900 uppercase italic">Planta Iztapalapa I - Zona Oriente</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="w-full bg-rose-50 text-rose-600 p-6 rounded-[32px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border border-rose-100 hover:bg-rose-100 transition-colors active:scale-95 text-xs"
            >
              <LogOut size={18} />
              Cerrar Sesión Global en todos los dispositivos
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[48px] p-10 shadow-2xl border border-slate-100"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-sky-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/20">
                  <Lock size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nueva Contraseña</h3>
                <p className="text-xs text-slate-400 font-bold italic">Ingresa tu clave de acceso segura</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Contraseña Nueva</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Salir
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-4 bg-sky-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
                  >
                    {saving ? 'Cargando...' : 'Cambiar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
