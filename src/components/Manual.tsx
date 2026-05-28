import React from 'react';
import { Book, Shield, TestTube, Truck, Clock, User, Lightbulb } from 'lucide-react';
import { motion } from 'motion/react';

interface ManualProps {
  role: 'admin' | 'operator' | 'driver' | string | null;
}

interface StepProps {
  title: string;
  steps: string[];
}

const StepList = ({ title, steps }: StepProps) => (
  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mb-4">
    <h4 className="font-black text-slate-800 text-xs uppercase mb-3 tracking-wider flex items-center gap-2">
      <div className="w-1.5 h-4 bg-[#C32A2C] rounded-full" />
      {title}
    </h4>
    <ol className="space-y-3">
      {steps.map((step, idx) => (
        <li key={idx} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
            {idx + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  </div>
);

export default function Manual({ role }: ManualProps) {
  const isSelected = (targetRole: string) => role === 'admin' || role === targetRole;

  return (
    <div className="space-y-10 pb-24 max-w-4xl mx-auto">
      <header className="flex items-center gap-5 mb-10 pt-4">
        <div className="w-14 h-14 bg-rose-50 rounded-[22px] flex items-center justify-center text-[#C32A2C] shadow-inner">
          <Book size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Manual Operativo</h1>
          <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest opacity-60">Centro de Capacitación Digital</p>
        </div>
      </header>

      {role === 'admin' && (
        <section className="space-y-6">
          <div className="bg-[#000000] text-white p-8 rounded-[40px] shadow-2xl border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md text-[#C32A2C]">
                  <Shield size={28} />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tight">Administrador Maestro</h2>
              </div>
              <p className="text-zinc-300 text-base leading-relaxed mb-8 opacity-80 font-medium">
                Gestión estratégica de la empresa: Finanzas, Capital Humano y Crecimiento.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StepList 
              title="Alta de Empleados"
              steps={[
                "Ve al módulo de 'Empleados' en el menú lateral.",
                "Pulsa el botón '+ Añadir Empleado'.",
                "Completa Nombre, Teléfono y selecciona el ROL (Chofer u Operador).",
                "Ingresa el correo electrónico con el que el empleado iniciará sesión.",
                "Pulsa 'Guardar'. El empleado ya puede entrar con su cuenta."
              ]}
            />
            <StepList 
              title="Gestión de Clientes"
              steps={[
                "Accede a 'Clientes'.",
                "Usa '+ Nuevo Registro' para capturar los datos del cliente.",
                "Define la 'Ubicación' exacta para que el chofer lo encuentre en el mapa.",
                "Registra el 'Tipo de Cliente' (Hogar/Negocio) para métricas precisas."
              ]}
            />
            <StepList 
              title="Alta de Productos"
              steps={[
                "Entra a 'Gestión de Productos'.",
                "Pulsa '+ Nuevo Producto'.",
                "Ingresa Nombre, Precio y una descripción breve.",
                "Pulsa 'Registrar Producto'. Ahora estará disponible para ventas y pedidos."
              ]}
            />
            <StepList 
              title="Cierre de Finanzas"
              steps={[
                "Entra a 'Métricas' para supervisar los ingresos del día y finanzas globales.",
                "En el mismo módulo, registra cualquier 'Egreso' (pago a proveedores, luz, etc).",
                "Compara el 'Balance Neto' contra el efectivo real en caja física."
              ]}
            />
            <StepList 
              title="Métricas y Decisiones"
              steps={[
                "Revisa 'Métricas' para ver el top de productos vendidos.",
                "Observa los horarios de mayor venta para optimizar personal.",
                "Exporta reportes si necesitas presentarlos a socios o contadores."
              ]}
            />
          </div>
        </section>
      )}

      {isSelected('operator') && (
        <section className="space-y-6">
          <div className="bg-emerald-600 text-white p-8 rounded-[40px] shadow-2xl shadow-emerald-900/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <TestTube size={28} />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight italic">Personal de Planta</h2>
            </div>
            <p className="text-emerald-50 text-base leading-relaxed opacity-80 font-medium">
              Control de Calidad (Norma 127) y Producción Diaria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StepList 
              title="Bitácora de Calidad"
              steps={[
                "Entra al módulo 'Calidad'.",
                "Pulsa '+ Registrar Prueba'.",
                "Realiza la medición física y anota: pH (6.5-8.5), Cloro (0.2-1.5), TDS (Sólidos).",
                "Marca 'Limpieza de Filtros' si fue realizada en el turno.",
                "Guarda. Tu reporte es visible para auditorías de salubridad."
              ]}
            />
            <StepList 
              title="Registro de Producción"
              steps={[
                "En 'Corte de Planta', selecciona el producto (Garrafón 20L).",
                "Ingresa la cantidad total de unidades llenadas al final del turno.",
                "El sistema descontará automáticamente tapas y sellos del stock global.",
                "Confirma el cierre para que el Admin vea la producción lista."
              ]}
            />
            <StepList 
              title="Alta de Nuevos Productos"
              steps={[
                "Accede a 'Gestión de Productos'.",
                "Pulsa '+ Nuevo Producto' si ha llegado una nueva presentación de agua.",
                "Define el precio de venta sugerido.",
                "Guarda los cambios."
              ]}
            />
          </div>
        </section>
      )}

      {isSelected('driver') && (
        <section className="space-y-6">
          <div className="bg-amber-500 text-white p-8 rounded-[40px] shadow-2xl shadow-amber-900/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Truck size={28} />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Repartidor / Chofer</h2>
            </div>
            <p className="text-amber-50 text-base leading-relaxed opacity-80 font-medium">
              Gestión de Ruta, Servicio al Cliente y Recolección de Pagos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StepList 
              title="Operación de Ruta"
              steps={[
                "Abre 'Mi Ruta'. Verás los pedidos asignados en orden de prioridad.",
                "Pulsa el botón de 'Navegar' para abrir Google Maps hacia el cliente.",
                "Al llegar, entrega el producto y pulsa 'Registrar Venta'.",
                "Selecciona si fue Pago en Efectivo y si te entregaron envases vacíos."
              ]}
            />
            <StepList 
              title="Registro de Clientes"
              steps={[
                "Accede a la pestaña 'Clientes' en el menú de navegación.",
                "Presiona el botón '+ Alta de Cliente' en la esquina superior.",
                "Captura el Nombre Completo, Dirección/Colonia y Teléfono del prospecto.",
                "Opcionalmente, pega un link de Google Maps para registrar la ubicación exacta del domicilio.",
                "Presiona 'Guardar Cliente'. Ya estará registrado y disponible para recibir pedidos."
              ]}
            />
            <StepList 
              title="Liquidación Final"
              steps={[
                "Al terminar tu jornada, ve a 'Perfil' -> 'Auto-Liquidación'.",
                "Verifica que el dinero en tu bolsillo coincida con el total de la app.",
                "Si hay discrepancias, revisa venta por venta en tu historial.",
                "Entrega el efectivo al administrador para cerrar tu turno."
              ]}
            />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <header className="flex items-center gap-3">
            <Clock className="text-[#C32A2C]" size={24} />
            <h3 className="font-black text-slate-800 uppercase tracking-tight italic">Control de Asistencia</h3>
          </header>
          <StepList 
            title="Uso Obligatorio"
            steps={[
              "Al llegar a la planta, abre 'Asistencia'.",
              "Pulsa 'Check-In'. Tu ubicación y hora se guardan permanentemente.",
              "Al salir a comer o finalizar el día, pulsa 'Check-Out'.",
              "El sistema calcula tus horas laboradas automáticamente para nómina."
            ]}
          />
        </div>

        <div className="space-y-6">
          <header className="flex items-center gap-3">
            <User className="text-[#C32A2C]" size={24} />
            <h3 className="font-black text-slate-800 uppercase tracking-tight italic">Perfil y Seguridad</h3>
          </header>
          <StepList 
            title="Configuración Personal"
            steps={[
              "Ve a 'Perfil' para subir tu foto de identificación; es necesaria para clientes.",
              "Asegúrate de que tu número de teléfono sea correcto para notificaciones.",
              "En caso de error en la app, usa el botón 'Cerrar Sesión' y vuelve a entrar."
            ]}
          />
        </div>
      </div>

      <footer className="mt-16 p-10 bg-slate-950 text-white rounded-[50px] border border-zinc-800 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#C32A2C]/10 rounded-full blur-3xl" />
        <div className="flex items-center gap-4 mb-6 text-rose-500">
          <Lightbulb size={28} />
          <h4 className="font-black uppercase italic text-lg tracking-wider">Misión de Calidad</h4>
        </div>
        <p className="text-zinc-300 text-sm font-medium leading-relaxed italic">
          "Cada dato registrado correctamente es un paso más hacia la excelencia de Quality Water. Tu precisión protege la salud de nuestras familias y la estabilidad del negocio."
        </p>
      </footer>
    </div>
  );
}
