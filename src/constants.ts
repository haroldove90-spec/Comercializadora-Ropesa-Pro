import { Order, CustomerBalance } from './types';

export const MOCK_ORDERS: Order[] = [
  {
    id: '1',
    client: 'Abarrotes Doña Mari',
    neighborhood: 'Polanco',
    address: 'Av. Horacio 450',
    items: [
      { name: 'Garrafón 20L (Llenado)', quantity: 5 },
      { name: 'Sello de Garantía', quantity: 5 }
    ],
    jugsDelivered: 5,
    jugsReceived: 3,
    status: 'en_ruta',
    time: '09:00 AM'
  },
  {
    id: '2',
    client: 'Residencial Latitud',
    neighborhood: 'Santa Fe',
    address: 'Carr. México-Toluca 5420',
    items: [
      { name: 'Garrafón 20L (Llenado)', quantity: 12 },
      { name: 'Envase Nuevo', quantity: 2 }
    ],
    jugsDelivered: 12,
    jugsReceived: 10,
    status: 'pendiente',
    time: '10:15 AM'
  },
  {
    id: '3',
    client: 'Gimnasio Sport City',
    neighborhood: 'Roma Norte',
    address: 'Calle Colima 124',
    items: [
      { name: 'Garrafón 20L (Llenado)', quantity: 8 }
    ],
    jugsDelivered: 8,
    jugsReceived: 8,
    status: 'entregado',
    time: '08:30 AM'
  },
  {
    id: '4',
    client: 'Cafetería El Jarocho',
    neighborhood: 'Coyoacán',
    address: 'Calle Cuauhtémoc 134',
    items: [
      { name: 'Garrafón 20L (Llenado)', quantity: 4 },
      { name: 'Sello de Garantía', quantity: 4 }
    ],
    jugsDelivered: 4,
    jugsReceived: 4,
    status: 'en_ruta',
    time: '11:00 AM'
  },
  {
    id: '5',
    client: 'Oficinas BBVA',
    neighborhood: 'Juarez',
    address: 'Paseo de la Reforma 506',
    items: [
      { name: 'Garrafón 20L (Llenado)', quantity: 20 },
      { name: 'Envase Nuevo', quantity: 5 }
    ],
    jugsDelivered: 20,
    jugsReceived: 15,
    status: 'pendiente',
    time: '11:45 AM'
  }
];

export const MOCK_CUSTOMER_BALANCES: CustomerBalance[] = [
  { id: 'c1', name: 'Abarrotes Doña Mari', neighborhood: 'Polanco', jugBalance: 2 },
  { id: 'c2', name: 'Residencial Latitud', neighborhood: 'Santa Fe', jugBalance: 5 },
  { id: 'c3', name: 'Gimnasio Sport City', neighborhood: 'Roma Norte', jugBalance: 0 },
  { id: 'c4', name: 'Cafetería El Jarocho', neighborhood: 'Coyoacán', jugBalance: 0 },
  { id: 'c5', name: 'Oficinas BBVA', neighborhood: 'Juarez', jugBalance: 5 },
];
