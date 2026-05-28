import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://zzsbqrwmppvpvtajkuva.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6c2JxcndtcHB2cHZ0YWprdXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQ2NjQsImV4cCI6MjA5NDczMDY2NH0.VQyx8HLHn8kjVX9rgY2xoPejBKGffWTQaTolXiToAjE';

// Forzar el uso de las credenciales proporcionadas por el usuario para asegurar que el preview funcione correctamente
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Función global auxiliar de auto-recuperación para evitar bloqueos por tokens corruptos de Supabase
const clearAllSupabaseTokens = () => {
  console.warn('Iniciando limpieza de emergencia para sesión corrupta de Supabase...');
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
    // Limpiar sessionStorage también por seguridad
    try {
      sessionStorage.clear();
    } catch (_) {}
  } catch (e) {
    console.error('Error al limpiar el almacenamiento local:', e);
  }
};

// Interceptor global para unhandled rejections (promesas caídas de Supabase)
if (typeof window !== 'undefined') {
  const handleAuthErrorText = (errMsg: string) => {
    const lower = errMsg.toLowerCase();
    if (
      lower.includes('refresh token') ||
      lower.includes('refresh_token') ||
      lower.includes('invalid_grant') ||
      lower.includes('invalid refresh token') ||
      lower.includes('grant') ||
      lower.includes('token not found')
    ) {
      console.error('Interceptada sesión de Supabase inválida o expirada. Forzando cierre seguro e inmediato.');
      clearAllSupabaseTokens();
      supabase.auth.signOut().catch(() => {});
      
      // Forzar redirección limpia del usuario tras la limpieza
      setTimeout(() => {
        window.location.reload();
      }, 300);
      return true;
    }
    return false;
  };

  // Interceptar window.alert para capturar errores de refresco que se disparan en try/catch locales
  const originalAlert = window.alert;
  window.alert = function (message) {
    const msgStr = String(message || '');
    if (handleAuthErrorText(msgStr)) {
      // Si era error de refresh token, silenciamos la alerta y auto-limpiamos
      return;
    }
    originalAlert.apply(window, arguments as any);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || reason?.error_description || String(reason || '');
    if (handleAuthErrorText(msg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (handleAuthErrorText(msg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

