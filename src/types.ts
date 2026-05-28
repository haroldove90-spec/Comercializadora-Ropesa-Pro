export interface Product {
  name: 'Garrafón 20L (Llenado)' | 'Envase Nuevo' | 'Sello de Garantía';
  quantity: number;
}

export interface Order {
  id: string;
  client: string;
  neighborhood: string;
  address: string;
  items: Product[];
  jugsDelivered: number;
  jugsReceived: number;
  status: 'pendiente' | 'en_ruta' | 'entregado';
  time: string;
}

export interface CustomerBalance {
  id: string;
  name: string;
  neighborhood: string;
  jugBalance: number;
}

export interface Message {
  id: string;
  text: string;
  sender: 'client' | 'system';
  timestamp: Date;
}
