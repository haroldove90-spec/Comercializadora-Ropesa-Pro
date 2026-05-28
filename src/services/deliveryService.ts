
import { supabase } from '../lib/supabaseClient';
import { Order } from '../lib/types.supabase';

/**
 * handleCompleteDelivery
 * Actualiza el estado del pedido y genera el mensaje para el ticket de WhatsApp.
 */
export async function handleCompleteDelivery(orderId: string, customItems?: string, customTotalPrice?: number) {
  try {
    const updateBody: any = {
      status: 'delivered'
    };
    if (customItems !== undefined) {
      updateBody.items = customItems;
    }
    if (customTotalPrice !== undefined) {
      updateBody.total_price = customTotalPrice;
    }

    // 1. Actualizar estado en Supabase
    const { data, error } = await supabase
      .from('orders')
      .update(updateBody)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    const order = data as Order;

    // Automatically update seller's inventory in their active cash drawer session
    try {
      if (order && order.assigned_to_name) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: att } = await supabase
          .from('daily_attendance')
          .select('*')
          .eq('user_name', order.assigned_to_name)
          .eq('work_date', todayStr)
          .maybeSingle();

        if (att) {
          const lastLoc = att.last_location || {};
          const inventory = lastLoc.inventory || {};
          let updatedIn = false;

          Object.keys(inventory).forEach(prodId => {
            const prod = inventory[prodId];
            const regex = new RegExp(`(\\d+)\\s*x\\s*` + prod.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + `|` + prod.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + `\\s*\\(x(\\d+)\\)`, 'i');
            const match = String(order.items).match(regex);
            
            let qty = 0;
            if (match) {
              qty = Number(match[1] || match[2]) || 1;
            } else if (String(order.items).toLowerCase().includes(prod.name.toLowerCase())) {
              const simpleRegex = new RegExp(`(\\d+)\\s+` + prod.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
              const matchSimple = String(order.items).match(simpleRegex);
              qty = matchSimple ? (Number(matchSimple[1]) || 1) : 1;
            }

            if (qty > 0) {
              prod.sold = (Number(prod.sold) || 0) + qty;
              updatedIn = true;
            }
          });

          if (updatedIn) {
            await supabase
              .from('daily_attendance')
              .update({
                last_location: {
                  ...lastLoc,
                  inventory
                }
              })
              .eq('id', att.id);
          }
        }
      }
    } catch (invErr) {
      console.warn('Error decrementing inventory during complete delivery:', invErr);
    }

    // 2. Notificar a Admin y Planta que la venta/entrega se completó
    try {
      await supabase.from('notifications_log').insert([
        {
          title: 'Venta Completada (Ruta)',
          message: `${order.customer_name} recibió su pedido. Total: $${order.total_price.toFixed(2)}`,
          type: 'sale',
          user_role: 'admin'
        },
        {
          title: 'Venta Completada (Ruta)',
          message: `${order.customer_name} recibió su pedido. Total: $${order.total_price.toFixed(2)}`,
          type: 'sale',
          user_role: 'operator'
        }
      ]);
    } catch (notifError) {
      console.warn('Error sending delivery notifications:', notifError);
    }

    // 3. Generar texto para el Ticket Digital de WhatsApp
    const ticketText = `
*✅ TICKET DIGITAL - ROPESA*
----------------------------------
*Folio:* ${order.id.slice(0, 8)}
*Fecha:* ${new Date().toLocaleDateString()}
*Cliente:* ${order.customer_name}
*Producto:* ${order.items}
*Total:* $${order.total_price.toFixed(2)}
----------------------------------
*¡Gracias por su preferencia!*
Comercializadora Ropesa
    `.trim();

    return {
      success: true,
      ticketText,
      order
    };
  } catch (error: any) {
    console.error('Error al completar pedido:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * openWhatsAppTicket
 * Abre WhatsApp con el mensaje pre-llenado para el cliente
 */
export function openWhatsAppTicket(phone: string | undefined, message: string) {
  if (!phone) return;
  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
