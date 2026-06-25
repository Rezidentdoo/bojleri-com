export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  price_formatted: string;
}

export interface Order {
  id: string;
  created_at: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    note: string;
  };
  payment: string;
  items: OrderItem[];
  total: number;
  total_formatted: string;
}

export interface CreateOrderPayload {
  customer: Order["customer"];
  payment: string;
  items: OrderItem[];
  total: number;
}