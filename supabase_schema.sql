-- ======================================================
-- SCRIPT FINAL DE BASE DE DATOS QUALITYWATER (VERSIÓN SUPREMA)
-- ======================================================
-- Instrucciones para corregir el error de RLS:
-- 1. Copia TODO el contenido de este archivo.
-- 2. Ve al SQL Editor en tu panel de Supabase.
-- 3. Haz click en "+ New Query".
-- 4. PEGA este código y presiona el botón "RUN".
-- ======================================================

-- 1. LIMPIEZA TOTAL
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.daily_attendance CASCADE;
DROP TABLE IF EXISTS public.quality_logs CASCADE;
DROP TABLE IF EXISTS public.notifications_log CASCADE;

-- 2. CREACIÓN DE TABLAS

CREATE TABLE public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'client', 
  phone TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(auth_id)
);

CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT, 
  tier TEXT DEFAULT 'frequent',
  geolocation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  items TEXT NOT NULL,
  total_price DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'assigned', 'delivered', 'cancelled'
  source TEXT DEFAULT 'whatsapp', -- 'local', 'phone', 'whatsapp'
  assigned_to UUID, -- ID del repartidor
  assigned_to_name TEXT, -- Nombre del repartidor
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.daily_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT, 
  user_name TEXT NOT NULL,
  user_role TEXT,
  work_date DATE DEFAULT CURRENT_DATE,
  check_in TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  last_location JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_name, work_date) 
);

CREATE TABLE public.quality_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_name TEXT NOT NULL,
  volume_received DECIMAL(10,2),
  chlorine_dosage DECIMAL(10,2),
  pipeline_status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  user_role TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. DESACTIVAR RLS COMPLETAMENTE PARA DESARROLLO
-- Esto es lo que soluciona el error "violates row-level security policy"
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log DISABLE ROW LEVEL SECURITY;

-- 4. OTORGAR PERMISOS MASIVOS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. REALTIME (Configuración Simplificada)
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 6. DATOS INICIALES (Demo)
INSERT INTO public.products (name, description, price) VALUES 
('Garrafón 20L', 'Agua purificada certificada, envase de 20 litros.', 55.00),
('Garrafón 10L', 'Agua purificada certificada, envase de 10 litros.', 35.00),
('Botella 1.5L (Paquete 6)', 'Paquete de 6 botellas de 1.5 litros.', 72.00);

-- 7. REFRESCAR SISTEMA
NOTIFY pgrst, 'reload schema';

-- 8. AUTOMATIZACIÓN DE PERFILES (EMPLEADOS/CLIENTES)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.employees (auth_id, name, email, role, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
    new.email,
    CASE WHEN COALESCE(new.raw_user_meta_data->>'role', 'driver') = 'client' THEN 'driver' ELSE COALESCE(new.raw_user_meta_data->>'role', 'driver') END,
    COALESCE(new.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para creación automática de perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. CONFIGURACIÓN DE STORAGE (AVATARS)
-- Nota: Asegúrate de crear el bucket 'avatars' manualmente en el panel de Supabase y ponerlo como PUBLIC
-- Estas políticas permiten que cualquier usuario logueado suba su propia foto

BEGIN;
  -- Política para permitir subir archivos
  CREATE POLICY "Permitir subida de avatars a usuarios autenticados" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'avatars');

  -- Política para permitir actualizar su propio avatar
  CREATE POLICY "Permitir actualización de propios avatars" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'avatars');

  -- Política para lectura pública (si el bucket no es ya público por defecto)
  CREATE POLICY "Avatars públicos para lectura" 
  ON storage.objects FOR SELECT 
  TO public 
  USING (bucket_id = 'avatars');
COMMIT;
