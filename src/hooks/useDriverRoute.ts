
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../lib/types.supabase';

/**
 * useDriverRoute
 * Lógica de tiempo real para que los repartidores escuchen nuevas asignaciones
 * y manejen la navegación GPS.
 */
export function useDriverRoute(driverId: string | undefined) {
  const [activeAssignment, setActiveAssignment] = useState<Order | null>(null);

  useEffect(() => {
    if (!driverId) return;

    // Escuchar cambios en la tabla 'orders' en tiempo real
    const channel = supabase
      .channel(`driver_assignments_${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `driver_id=eq.${driverId}`
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          
          // Si el estado cambia a 'assigned', notificamos al repartidor localmente
          if (updatedOrder.status === 'assigned') {
            setActiveAssignment(updatedOrder);
            console.log('--- Nueva asignación detectada en tiempo real ---');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  /**
   * Abre la ubicación del pedido en Google Maps
   */
  const openNavigation = (order: Order) => {
    // Extraemos coordenadas si están en el campo metadata o campos específicos
    // @ts-ignore - metadata es dinámico
    const { lat, lng } = order.metadata || {};
    
    if (lat && lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      window.open(url, '_blank');
    } else {
      // Si no hay coordenadas, buscamos por dirección de texto
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
      window.open(url, '_blank');
    }
  };

  return { activeAssignment, openNavigation, setActiveAssignment };
}
