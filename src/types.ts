export interface User {
  id: string;
  username: string;
  role: "admin" | "cashier";
  name: string;
}

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  sku: string;
  price: number;
  cost: number;
  quantity: number;
  minQuantity: number;
  category: string;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  company: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  nameEn: string;
  price: number;
  quantity: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId?: string;
  customerName?: string;
  cashierId: string;
  cashierName: string;
  total: number;
  tax: number;
  discount: number;
  paymentMethod: "cash" | "card" | "split";
  items: SaleItem[];
  received: number;
  change: number;
}

export interface AppSettings {
  storeName: string;
  storeNameEn: string;
  currency: string;
  taxRate: number;
  logoUrl?: string;
  printType: "A4" | "thermal";
  theme?: "light" | "dark";
}
