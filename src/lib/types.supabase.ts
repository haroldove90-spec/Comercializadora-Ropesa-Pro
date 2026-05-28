
export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  tier: 'frequent' | 'vip' | 'company';
  created_at: string;
}

export interface Order {
  id: string;
  customer_id?: string;
  customer_name: string;
  address: string;
  items: string; // e.g. "2 Garrafones"
  status: 'pending' | 'assigned' | 'delivered' | 'cancelled';
  driver_id?: string;
  assigned_to_name?: string;
  total_price: number;
  payment_method: 'cash' | 'card' | 'transfer';
  created_at: string;
  whatsapp_number?: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  type: 'clock_in' | 'clock_out';
  timestamp: string;
  photo_url?: string;
  location?: { lat: number; lng: number };
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'attendance' | 'quality' | 'system' | 'sale';
  read: boolean;
  created_at: string;
  payload?: any;
}
