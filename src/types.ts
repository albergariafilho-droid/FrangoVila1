/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  category: string;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  total: number;
  customerName: string;
  customerPhone?: string;
  paymentMethod: 'money' | 'card' | 'pix';
  status: OrderStatus;
  createdAt: string;
  table?: string;
  customerId?: string; // Reference to registered customer
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  createdAt: string;
  notificationPreferences: NotificationPreference;
}

export interface NotificationPreference {
  orderUpdates: boolean;
  specialOffers: boolean;
  newProducts: boolean;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  type: 'order_status' | 'offer' | 'new_product';
  createdAt: string;
  read: boolean;
  orderId?: string;
  customerId?: string; // Targeted customer
}

export interface Sale {
  id: string;
  items: {
    productId: string;
    name: string;
    price: number;
    costPrice: number;
    quantity: number;
  }[];
  total: number;
  totalCost: number;
  profit: number;
  paymentMethod: 'money' | 'card' | 'pix';
  discount: number;
  createdAt: string;
  type: 'pdv' | 'delivery';
  orderId?: string;
  customerId?: string;
  cpf?: string;
}

export interface SalesReport {
  totalRevenue: number;
  totalProfit: number;
  salesCount: number;
  averageTicket: number;
  salesByPayment: { name: string; value: number }[];
  salesByCategory: { name: string; value: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  salesHistory: { date: string; revenue: number; profit: number; count: number }[];
}
