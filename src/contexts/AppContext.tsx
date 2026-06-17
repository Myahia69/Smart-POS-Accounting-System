import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Product, Customer, Supplier, Expense, Sale, AppSettings } from "../types";
import { Language, translations } from "../i18n/translations";

interface AppContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRtl: boolean;
  t: (key: keyof typeof translations["ar"]) => string;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  sales: Sale[];
  settings: AppSettings;
  loading: boolean;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  addProduct: (product: Omit<Product, "id">) => Promise<boolean>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  importProducts: (products: any[]) => Promise<boolean>;
  addCustomer: (customer: Omit<Customer, "id">) => Promise<boolean>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  addSupplier: (supplier: Omit<Supplier, "id">) => Promise<boolean>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<boolean>;
  deleteSupplier: (id: string) => Promise<boolean>;
  addExpense: (expense: Omit<Expense, "id">) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  checkout: (saleData: {
    customerId?: string;
    customerName?: string;
    total: number;
    tax: number;
    discount: number;
    paymentMethod: "cash" | "card" | "split";
    items: { productId: string; name: string; nameEn: string; price: number; quantity: number }[];
    received: number;
    change: number;
  }) => Promise<Sale | null>;
  deleteSale: (id: string) => Promise<boolean>;
  saveSettings: (settings: AppSettings) => Promise<boolean>;
  addUser: (userData: any) => Promise<boolean>;
  updateUser: (id: string, userData: any) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  users: any[];
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Local fallback items in case API is unavailable or static hosting is used
const LOCAL_MOCK_USERS = [
  { id: "u-1", username: "admin", name: "مدير النظام (Admin)", role: "admin" },
  { id: "u-2", username: "cashier", name: "كاشير (Ahmed)", role: "cashier" }
];

const LOCAL_PRODUCTS_SEED: Product[] = [
  { id: "p-1", name: "أرز بسمتي 5 كجم", nameEn: "Basmati Rice 5kg", sku: "628100112233", price: 45.0, cost: 32.5, quantity: 50, minQuantity: 10, category: "مواد غذائية" },
  { id: "p-2", name: "حليب طويل الأجل 1 لتر", nameEn: "Whole Milk 1L", sku: "628100114455", price: 7.5, cost: 5.0, quantity: 120, minQuantity: 15, category: "ألبان" },
  { id: "p-3", name: "زيت طبخ 1.5 لتر", nameEn: "Cooking Oil 1.5L", sku: "628100116677", price: 24.0, cost: 18.0, quantity: 8, minQuantity: 10, category: "مواد غذائية" },
  { id: "p-4", name: "مكرونة إسباجيتي 400 جرام", nameEn: "Spaghetti Pasta 400g", sku: "628100118899", price: 4.5, cost: 3.0, quantity: 200, minQuantity: 20, category: "مواد غذائية" },
  { id: "p-5", name: "شاي أحمر خشن 100 كيس", nameEn: "Red Tea 100 Bags", sku: "628100120011", price: 16.0, cost: 11.5, quantity: 80, minQuantity: 12, category: "مشروبات" }
];

const LOCAL_CUSTOMERS_SEED: Customer[] = [
  { id: "c-1", name: "محمد عبد الله", phone: "0551122334", email: "mohamed@example.com", address: "الرياض، المملكة العربية السعودية", balance: 150.0 },
  { id: "c-2", name: "سارة أحمد", phone: "0552233445", email: "sara@example.com", address: "جدة، المملكة العربية السعودية", balance: 0.0 }
];

const LOCAL_SUPPLIERS_SEED: Supplier[] = [
  { id: "s-1", name: "شركة المراعي الوطنية", phone: "0112233111", email: "info@almarai.com", address: "المنطقة الصناعية، الرياض", company: "المراعي" },
  { id: "s-2", name: "مجموعة الأغذية الموحدة", phone: "0114455222", email: "sales@unitedfoods.com", address: "بوابة الشرق، جدة", company: "الأغذية الموحدة" }
];

const LOCAL_EXPENSES_SEED: Expense[] = [
  { id: "e-1", title: "فاتورة كهرباء شهر مايو", amount: 450.0, date: "2026-05-30", category: "فواتير وطاقة", notes: "تم السداد إلكترونياً ويشمل غرامة تأخير" },
  { id: "e-2", title: "إيجار محل - الدفعة الثانية", amount: 5000.0, date: "2026-06-01", category: "إيجارات", notes: "دفعة النصف الثاني من العام الحالي" }
];

const DEFAULT_SETTINGS: AppSettings = {
  storeName: "متجر الأنوار المحاسبي",
  storeNameEn: "Al-Anwar Accounting Store",
  currency: "SAR",
  taxRate: 15,
  logoUrl: "",
  printType: "thermal",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ar");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<any[]>(LOCAL_MOCK_USERS);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isRtl = language === "ar";

  // Translate function
  const t = (key: keyof typeof translations["ar"]): string => {
    const dict = translations[language] || translations["ar"];
    return dict[key] || (translations["ar"][key] as string) || String(key);
  };

  // Helper to load language from storage
  useEffect(() => {
    const savedLang = localStorage.getItem("pos_lang");
    if (savedLang === "en" || savedLang === "ar") {
      setLanguage(savedLang);
    }
    
    // Load logged in user if stored
    const storedUser = localStorage.getItem("pos_user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        // clear corrupted data
        localStorage.removeItem("pos_user");
      }
    }
  }, []);

  // Fetch initial data from local API, fall back to localStorage if API is not responding
  const loadAllData = async () => {
    setLoading(true);
    try {
      const fetchWithTimeout = async (url: string, options = {}, timeout = 3000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      };

      // Query settings
      const settingsRes = await fetchWithTimeout("/api/settings");
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      } else {
        throw new Error("API Offline");
      }

      // Query products
      const prodRes = await fetchWithTimeout("/api/products");
      if (prodRes.ok) setProducts(await prodRes.json());

      // Query customers
      const custRes = await fetchWithTimeout("/api/customers");
      if (custRes.ok) setCustomers(await custRes.json());

      // Query suppliers
      const supRes = await fetchWithTimeout("/api/suppliers");
      if (supRes.ok) setSuppliers(await supRes.json());

      // Query expenses
      const expRes = await fetchWithTimeout("/api/expenses");
      if (expRes.ok) setExpenses(await expRes.json());

      // Query sales
      const saleRes = await fetchWithTimeout("/api/sales");
      if (saleRes.ok) {
        setSales(await saleRes.json());
      }

      // Query system users
      const userRes = await fetchWithTimeout("/api/users");
      if (userRes.ok) {
        setUsers(await userRes.json());
      }

    } catch (e) {
      console.warn("Backend API unavailable. Using persistent localStorage data engine.", e);
      // Fallback local storage loadings
      const getStored = (key: string, seed: any) => {
        const stored = localStorage.getItem("db_" + key);
        if (stored) {
          try { return JSON.parse(stored); } catch { return seed; }
        }
        localStorage.setItem("db_" + key, JSON.stringify(seed));
        return seed;
      };

      setSettings(getStored("settings", DEFAULT_SETTINGS));
      setProducts(getStored("products", LOCAL_PRODUCTS_SEED));
      setCustomers(getStored("customers", LOCAL_CUSTOMERS_SEED));
      setSuppliers(getStored("suppliers", LOCAL_SUPPLIERS_SEED));
      setExpenses(getStored("expenses", LOCAL_EXPENSES_SEED));
      setSales(getStored("sales", []));
      setUsers(getStored("users", LOCAL_MOCK_USERS));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync back to localstorage whenever state is fallback modified
  const updateOfflineState = (key: string, data: any) => {
    localStorage.setItem("db_" + key, JSON.stringify(data));
  };

  // Actions implementations

  // 1. LOGIN
  const login = async (username: string, password: string): Promise<boolean> => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const userData = await res.json();
        setCurrentUser(userData);
        localStorage.setItem("pos_user", JSON.stringify(userData));
        return true;
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "خطأ تسجيل دخول غير معروف");
        return false;
      }
    } catch (e) {
      // Local check offline fallback
      const match = users.find(
        (u) =>
          u.username.toLowerCase() === username.toLowerCase() &&
          password === (u.username === "admin" ? "password" : "1234")
      );
      if (match) {
        const loggedUser: User = {
          id: match.id,
          username: match.username,
          role: match.role as "admin" | "cashier",
          name: match.name,
        };
        setCurrentUser(loggedUser);
        localStorage.setItem("pos_user", JSON.stringify(loggedUser));
        return true;
      }
      setErrorMsg("البيانات المدخلة خاطئة أو تعذر الاتصال بالخادم");
      return false;
    }
  };

  // 2. LOGOUT
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("pos_user");
  };

  // 3. PRODUCTS
  const addProduct = async (product: Omit<Product, "id">): Promise<boolean> => {
    const completeProd = {
      ...product,
      id: "p-" + Date.now(),
    };
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeProd),
      });
      if (res.ok) {
        const saved = await res.json();
        setProducts((prev) => [...prev, saved]);
        return true;
      }
    } catch (e) {}
    
    // Offline local fallback
    const updated = [...products, completeProd];
    setProducts(updated);
    updateOfflineState("products", updated);
    return true;
  };

  const updateProduct = async (id: string, product: Partial<Product>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      if (res.ok) {
        const saved = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === id ? saved : p)));
        return true;
      }
    } catch (e) {}

    // Offline local fallback
    const updated = products.map((p) => (p.id === id ? { ...p, ...product } : p));
    setProducts(updated);
    updateOfflineState("products", updated);
    return true;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        return true;
      }
    } catch (e) {}

    // Offline local fallback
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    updateOfflineState("products", updated);
    return true;
  };

  const importProducts = async (newProds: any[]): Promise<boolean> => {
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProds),
      });
      if (res.ok) {
        loadAllData();
        return true;
      }
    } catch (e) {}

    const builtProds = newProds.map((p) => ({
      id: p.id || "p-" + Math.random().toString(36).substring(2, 9),
      name: p.name || "",
      nameEn: p.nameEn || p.name_en || "",
      sku: p.sku || "",
      price: Number(p.price) || 0,
      cost: Number(p.cost) || 0,
      quantity: Number(p.quantity) || 0,
      minQuantity: Number(p.minQuantity) || 0,
      category: p.category || "عام",
    }));

    const updated = [...products, ...builtProds];
    setProducts(updated);
    updateOfflineState("products", updated);
    return true;
  };

  // 4. CUSTOMERS
  const addCustomer = async (cust: Omit<Customer, "id">): Promise<boolean> => {
    const completeCust = { ...cust, id: "c-" + Date.now() };
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeCust),
      });
      if (res.ok) {
        const saved = await res.json();
        setCustomers((prev) => [...prev, saved]);
        return true;
      }
    } catch (e) {}

    const updated = [...customers, completeCust];
    setCustomers(updated);
    updateOfflineState("customers", updated);
    return true;
  };

  const updateCustomer = async (id: string, cust: Partial<Customer>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cust),
      });
      if (res.ok) {
        const saved = await res.json();
        setCustomers((prev) => prev.map((c) => (c.id === id ? saved : c)));
        return true;
      }
    } catch (e) {}

    const updated = customers.map((c) => (c.id === id ? { ...c, ...cust } : c));
    setCustomers(updated);
    updateOfflineState("customers", updated);
    return true;
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        return true;
      }
    } catch (e) {}

    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    updateOfflineState("customers", updated);
    return true;
  };

  // 5. SUPPLIERS
  const addSupplier = async (sup: Omit<Supplier, "id">): Promise<boolean> => {
    const complete = { ...sup, id: "s-" + Date.now() };
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(complete),
      });
      if (res.ok) {
        const saved = await res.json();
        setSuppliers((prev) => [...prev, saved]);
        return true;
      }
    } catch (e) {}

    const updated = [...suppliers, complete];
    setSuppliers(updated);
    updateOfflineState("suppliers", updated);
    return true;
  };

  const updateSupplier = async (id: string, sup: Partial<Supplier>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sup),
      });
      if (res.ok) {
        const saved = await res.json();
        setSuppliers((prev) => prev.map((s) => (s.id === id ? saved : s)));
        return true;
      }
    } catch (e) {}

    const updated = suppliers.map((s) => (s.id === id ? { ...s, ...sup } : s));
    setSuppliers(updated);
    updateOfflineState("suppliers", updated);
    return true;
  };

  const deleteSupplier = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
    } catch (e) {}

    const updated = suppliers.filter((s) => s.id !== id);
    setSuppliers(updated);
    updateOfflineState("suppliers", updated);
    return true;
  };

  // 6. EXPENSES
  const addExpense = async (exp: Omit<Expense, "id">): Promise<boolean> => {
    const complete = { ...exp, id: "e-" + Date.now() };
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(complete),
      });
      if (res.ok) {
        const saved = await res.json();
        setExpenses((prev) => [...prev, saved]);
        return true;
      }
    } catch (e) {}

    const updated = [...expenses, complete];
    setExpenses(updated);
    updateOfflineState("expenses", updated);
    return true;
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        return true;
      }
    } catch (e) {}

    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    updateOfflineState("expenses", updated);
    return true;
  };

  // 7. CHECKOUT POS SALE
  const checkout = async (saleData: {
    customerId?: string;
    customerName?: string;
    total: number;
    tax: number;
    discount: number;
    paymentMethod: "cash" | "card" | "split";
    items: { productId: string; name: string; nameEn: string; price: number; quantity: number }[];
    received: number;
    change: number;
  }): Promise<Sale | null> => {
    const invoiceNum = "INV-2026-" + String(sales.length + 1).padStart(4, "0");
    const activeSale: Sale = {
      id: "sale-" + Date.now(),
      invoiceNumber: invoiceNum,
      date: new Date().toISOString(),
      customerId: saleData.customerId,
      customerName: saleData.customerName || "",
      cashierId: currentUser?.id || "u-1",
      cashierName: currentUser?.name || "مدير النظام (Admin)",
      total: saleData.total,
      tax: saleData.tax,
      discount: saleData.discount,
      paymentMethod: saleData.paymentMethod,
      items: saleData.items,
      received: saleData.received,
      change: saleData.change,
    };

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeSale),
      });
      if (res.ok) {
        const saved = await res.json();
        setSales((prev) => [...prev, saved]);
        // Also reload products to pull decreased quantities
        fetch("/api/products")
          .then((r) => r.json())
          .then((p) => setProducts(p));
        return saved;
      }
    } catch (e) {}

    // Offline local fallback
    // 1. Decrease quantities in current memory product states
    setProducts((currentProds) => {
      const copyProds = [...currentProds];
      saleData.items.forEach((item) => {
        const prod = copyProds.find((p) => p.id === item.productId);
        if (prod) {
          prod.quantity = Math.max(0, prod.quantity - item.quantity);
        }
      });
      updateOfflineState("products", copyProds);
      return copyProds;
    });

    // 2. Adjust customer balance if split (on debit)
    if (saleData.customerId && saleData.paymentMethod === "split") {
      setCustomers((currentCusts) => {
        const copy = currentCusts.map((c) => {
          if (c.id === saleData.customerId) {
            const due = saleData.total - saleData.received;
            return { ...c, balance: c.balance + (due > 0 ? due : 0) };
          }
          return c;
        });
        updateOfflineState("customers", copy);
        return copy;
      });
    }

    const updatedSales = [...sales, activeSale];
    setSales(updatedSales);
    updateOfflineState("sales", updatedSales);
    return activeSale;
  };

  const deleteSale = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSales((prev) => prev.filter((s) => s.id !== id));
        fetch("/api/products")
          .then((r) => r.json())
          .then((p) => setProducts(p));
        return true;
      }
    } catch (e) {}

    // Offline fallback
    const record = sales.find((s) => s.id === id);
    if (record) {
      setProducts((curr) => {
        const copy = [...curr];
        record.items.forEach((item) => {
          const p = copy.find((prod) => prod.id === item.productId);
          if (p) p.quantity += item.quantity;
        });
        updateOfflineState("products", copy);
        return copy;
      });
    }

    const updated = sales.filter((s) => s.id !== id);
    setSales(updated);
    updateOfflineState("sales", updated);
    return true;
  };

  // 8. SETTINGS SAVE
  const saveSettings = async (newSettings: AppSettings): Promise<boolean> => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const saved = await res.json();
        setSettings(saved);
        return true;
      }
    } catch (e) {}

    setSettings(newSettings);
    updateOfflineState("settings", newSettings);
    return true;
  };

  // 9. USERS ADD/DELETE
  const addUser = async (userData: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (res.ok) {
        const saved = await res.json();
        setUsers((prev) => [...prev, saved]);
        return true;
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "تعذر إضافة الموظف");
        return false;
      }
    } catch (e) {}

    const fakeUser = {
      id: "u-" + Date.now(),
      username: userData.username,
      name: userData.name,
      role: userData.role,
    };
    const updated = [...users, fakeUser];
    setUsers(updated);
    updateOfflineState("users", updated);
    return true;
  };

  const updateUser = async (id: string, userData: any): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (res.ok) {
        const saved = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === id ? saved : u)));
        if (currentUser && currentUser.id === id) {
          const updatedUser = {
            ...currentUser,
            username: saved.username,
            name: saved.name,
            role: saved.role,
          };
          setCurrentUser(updatedUser);
          localStorage.setItem("pos_user", JSON.stringify(updatedUser));
        }
        return true;
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "تعذر تعديل بيانات الموظف");
        return false;
      }
    } catch (e) {}

    const updated = users.map((u) =>
      u.id === id
        ? {
            ...u,
            username: userData.username || u.username,
            name: userData.name || u.name,
            role: userData.role || u.role,
          }
        : u
    );
    setUsers(updated);
    updateOfflineState("users", updated);
    if (currentUser && currentUser.id === id) {
      const updatedUser = {
        ...currentUser,
        username: userData.username || currentUser.username,
        name: userData.name || currentUser.name,
        role: userData.role || currentUser.role,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem("pos_user", JSON.stringify(updatedUser));
    }
    return true;
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        return true;
      }
    } catch (e) {}

    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    updateOfflineState("users", updated);
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage: (lang) => {
          setLanguage(lang);
          localStorage.setItem("pos_lang", lang);
        },
        isRtl,
        t,
        currentUser,
        setCurrentUser,
        products,
        customers,
        suppliers,
        expenses,
        sales,
        settings,
        loading,
        errorMsg,
        setErrorMsg,
        
        login,
        logout,
        addProduct,
        updateProduct,
        deleteProduct,
        importProducts,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addExpense,
        deleteExpense,
        checkout,
        deleteSale,
        saveSettings,
        addUser,
        updateUser,
        deleteUser,
        users,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
