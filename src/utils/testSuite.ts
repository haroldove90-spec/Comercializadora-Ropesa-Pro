import { supabase } from '../lib/supabaseClient';
import { handleCompleteDelivery } from '../services/deliveryService';

/**
 * 1. Simulación de Pedido de WhatsApp
 * Dispara una petición al endpoint del webhook para simular la entrada de un mensaje.
 */
export async function simularPedidoWhatsApp() {
  console.log('%c🚀 Iniciando Simulación de Pedido WhatsApp...', 'color: #0ea5e9; font-weight: bold');
  
  const mockPayload = {
    from: '5512345678',
    body: 'Pedido de 3 Garrafones de 20L y 1 Paquete de Botellas 500ml',
    customer_name: 'Prueba Realtime',
    address: 'Av. Insurgentes Sur 1234, CDMX',
    lat: 19.36,
    lng: -99.18
  };

  try {
    console.log('Payload enviado:', mockPayload);
    
    // Tip: En entorno local/dev, asegúrate que el server esté corriendo
    const response = await fetch('/api/webhook-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPayload)
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const result = await response.json();
    console.log('%c✅ Webhook procesado con éxito:', 'color: #10b981', result);
    return result;
  } catch (error: any) {
    console.error('❌ Error en Simulación Webhook:', error.message);
  }
}

/**
 * 2. Simulación de Flujo de Asistencia (Los 4 Estados)
 * Ejecuta la secuencia completa de marcajes de un empleado.
 */
export async function simularFlujoAsistencia() {
  const session = {
    user_id: 'tester-uuid-999',
    user_name: 'Robot de Pruebas',
    user_role: 'repartidor'
  };

  const steps = [
    { action: 'check_in', label: 'Llegada' },
    { action: 'break_start', label: 'Salida a Comer' },
    { action: 'break_end', label: 'Regreso de Comer' },
    { action: 'check_out', label: 'Salida Final' }
  ];

  console.log('%c🕒 Iniciando Ciclo de Asistencia...', 'color: #f59e0b; font-weight: bold');

  for (const step of steps) {
    console.log(`Intentando: ${step.label}...`);
    
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
      .from('daily_attendance')
      .upsert({
        user_id: session.user_id,
        user_name: session.user_name,
        user_role: session.user_role,
        work_date: today,
        [step.action]: timestamp
      }, { onConflict: 'user_id, work_date' })
      .select('id, user_id, user_name, work_date, check_in, break_start, break_end, check_out')
      .single();

    if (error) {
       console.error(`Error en marcaje ${step.action}:`, error.message);
    } else {
      console.log(`[SUPABASE] Registro persistido: ${step.label}`, data);
      
      // Emitir Broadcast para Admin
      const channel = supabase.channel('asistencias_en_vivo');
      await channel.send({
        type: 'broadcast',
        event: 'attendance_event',
        payload: {
          usuario_id: session.user_id,
          nombre_empleado: session.user_name,
          rol_empleado: session.user_role,
          tipo_evento: step.label,
          timestamp
        }
      });
      console.log(`[REALTIME] Broadcast enviado: ${step.label}`);
    }

    // Esperar 2 segundos entre acciones para notar el cambio en el dashboard
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('%c✅ Ciclo de Asistencia Finalizado', 'color: #10b981; font-weight: bold');
}

/**
 * 3. Simulación de Cierre de Entrega
 * Cierra un pedido y genera el ticket digital.
 */
export async function simularEntregaChofer(orderId?: string) {
  let targetId = orderId;

  if (!targetId) {
    console.log('Buscando pedido pendiente para simular...');
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'pending')
      .limit(1)
      .single();
    
    if (!data) {
      console.error('No hay pedidos pendientes para simular cierre.');
      return;
    }
    targetId = data.id;
  }

  console.log(`%c📦 Cerrando Entrega para Pedido: ${targetId}`, 'color: #6366f1; font-weight: bold');
  
  const result = await handleCompleteDelivery(targetId);

  if (result.success) {
    console.log('%c📄 TICKET POS PARA CLIENTE:', 'color: #0ea5e9; font-weight: bold; border: 1px solid #0ea5e9; padding: 5px;');
    console.log(result.ticketText);
    console.log('%cEvento transmitido por Supabase CDC', 'color: #94a3b8; font-size: 10px;');
  } else {
    console.error('Error en simulación de cierre:', result.error);
  }
}

// Inyección Global para acceso desde Consola del Navegador
if (typeof window !== 'undefined') {
  (window as any).debugAPI = {
    whatsapp: simularPedidoWhatsApp,
    asistencia: simularFlujoAsistencia,
    entrega: simularEntregaChofer,
    ayuda: () => {
      console.log('Quality Water Debug API:');
      console.log('- debugAPI.whatsapp(): Simula pedido entrante');
      console.log('- debugAPI.asistencia(): Simula ciclo de entrada/salida');
      console.log('- debugAPI.entrega(id): Cierra un pedido y genera ticket');
    }
  };
  console.log('%c🛠️ Debug API cargada. Escribe "debugAPI.ayuda()" para ver comandos.', 'color: #8b5cf6; font-weight: bold');
}
