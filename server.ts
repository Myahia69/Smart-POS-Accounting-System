import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

// Interfaces for our database
interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "cashier";
  name: string;
}

interface Product {
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

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  company: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
}

interface SaleItem {
  productId: string;
  name: string;
  nameEn: string;
  price: number;
  quantity: number;
}

interface Sale {
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

interface AppSettings {
  storeName: string;
  storeNameEn: string;
  currency: string;
  taxRate: number;
  logoUrl?: string;
  printType: "A4" | "thermal";
}

interface DBStructure {
  users: User[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  sales: Sale[];
  settings: AppSettings;
}

const DB_FILE = path.join(process.cwd(), "database.json");

// Helper to hash passwords using native node crypto
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "pos_salt_123!").digest("hex");
}

// Initial seed data
const initialDB: DBStructure = {
  users: [
    {
      id: "u-1",
      username: "admin",
      passwordHash: hashPassword("password"),
      role: "admin",
      name: "مدير النظام (Admin)",
    },
    {
      id: "u-2",
      username: "cashier",
      passwordHash: hashPassword("1234"),
      role: "cashier",
      name: "كاشير (Ahmed)",
    }
  ],
  products: [
    {
      id: "p-1",
      name: "أرز بسمتي 5 كجم",
      nameEn: "Basmati Rice 5kg",
      sku: "628100112233",
      price: 45.0,
      cost: 32.5,
      quantity: 50,
      minQuantity: 10,
      category: "مواد غذائية",
    },
    {
      id: "p-2",
      name: "حليب طويل الأجل 1 لتر",
      nameEn: "Whole Milk 1L",
      sku: "628100114455",
      price: 7.5,
      cost: 5.0,
      quantity: 120,
      minQuantity: 15,
      category: "ألبان",
    },
    {
      id: "p-3",
      name: "زيت طبخ 1.5 لتر",
      nameEn: "Cooking Oil 1.5L",
      sku: "628100116677",
      price: 24.0,
      cost: 18.0,
      quantity: 8,
      minQuantity: 10, // low quantity alert
      category: "مواد غذائية",
    },
    {
      id: "p-4",
      name: "مكرونة إسباجيتي 400 جرام",
      nameEn: "Spaghetti Pasta 400g",
      sku: "628100118899",
      price: 4.5,
      cost: 3.0,
      quantity: 200,
      minQuantity: 20,
      category: "مواد غذائية",
    },
    {
      id: "p-5",
      name: "شاي أحمر خشن 100 كيس",
      nameEn: "Red Tea 100 Bags",
      sku: "628100120011",
      price: 16.0,
      cost: 11.5,
      quantity: 80,
      minQuantity: 12,
      category: "مشروبات",
    }
  ],
  customers: [
    {
      id: "c-1",
      name: "محمد عبد الله",
      phone: "0551122334",
      email: "mohamed@example.com",
      address: "الرياض، المملكة العربية السعودية",
      balance: 150.0,
    },
    {
      id: "c-2",
      name: "سارة أحمد",
      phone: "0552233445",
      email: "sara@example.com",
      address: "جدة، المملكة العربية السعودية",
      balance: 0.0,
    }
  ],
  suppliers: [
    {
      id: "s-1",
      name: "شركة المراعي الوطنية",
      phone: "0112233111",
      email: "info@almarai.com",
      address: "المنطقة الصناعية، الرياض",
      company: "المراعي",
    },
    {
      id: "s-2",
      name: "مجموعة الأغذية الموحدة",
      phone: "0114455222",
      email: "sales@unitedfoods.com",
      address: "بوابة الشرق، جدة",
      company: "الأغذية الموحدة",
    }
  ],
  expenses: [
    {
      id: "e-1",
      title: "فاتورة كهرباء شهر مايو",
      amount: 450.0,
      date: "2026-05-30",
      category: "فواتير وطاقة",
      notes: "تم السداد إلكترونياً ويشمل غرامة تأخير",
    },
    {
      id: "e-2",
      title: "إيجار محل - الدفعة الثانية",
      amount: 5000.0,
      date: "2026-06-01",
      category: "إيجارات",
      notes: "دفعة النصف الثاني من العام الحالي",
    }
  ],
  sales: [
    {
      id: "sale-1",
      invoiceNumber: "INV-2026-0001",
      date: "2026-06-15T14:30:00Z",
      customerId: "c-1",
      customerName: "محمد عبد الله",
      cashierId: "u-1",
      cashierName: "مدير النظام (Admin)",
      total: 106.5,
      tax: 13.5,
      discount: 5.0,
      paymentMethod: "cash",
      items: [
        {
          productId: "p-1",
          name: "أرز بسمتي 5 كجم",
          nameEn: "Basmati Rice 5kg",
          price: 45.0,
          quantity: 2,
        },
        {
          productId: "p-2",
          name: "حليب طويل الأجل 1 لتر",
          nameEn: "Whole Milk 1L",
          price: 7.5,
          quantity: 2,
        }
      ],
      received: 110,
      change: 3.5,
    }
  ],
  settings: {
    storeName: "متجر الأنوار الذكي",
    storeNameEn: "Al-Anwar Smart Mart",
    currency: "SAR",
    taxRate: 15,
    logoUrl: "",
    printType: "thermal",
  },
};

// Database utility class (JSON-file database)
class FileDB {
  private data: DBStructure;

  constructor() {
    this.data = { ...initialDB };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
        // Migrations or ensuring properties exist
        if (!this.data.users || this.data.users.length === 0) {
          this.data.users = [...initialDB.users];
        }
        if (!this.data.settings) {
          this.data.settings = { ...initialDB.settings };
        }
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Failed to load DB file, using in-memory state:", e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save DB file:", e);
    }
  }

  // Getters
  get users() { return this.data.users; }
  get products() { return this.data.products; }
  get customers() { return this.data.customers; }
  get suppliers() { return this.data.suppliers; }
  get expenses() { return this.data.expenses; }
  get sales() { return this.data.sales; }
  get settings() { return this.data.settings; }

  set settings(newSettings: AppSettings) {
    this.data.settings = newSettings;
    this.save();
  }
}

const db = new FileDB();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API REST routes

  // 1. AUTH LOGIN
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const hashed = hashPassword(password);
    const user = db.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hashed
    );

    if (!user) {
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    // Return user info
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });
  });

  // 2. PRODUCTS
  app.get("/api/products", (req, res) => {
    res.json(db.products);
  });

  app.post("/api/products", (req, res) => {
    const productData = req.body;
    const newProduct: Product = {
      ...productData,
      id: productData.id || "p-" + Date.now(),
      price: Number(productData.price) || 0,
      cost: Number(productData.cost) || 0,
      quantity: Number(productData.quantity) || 0,
      minQuantity: Number(productData.minQuantity) || 0,
    };
    db.products.push(newProduct);
    db.save();
    res.status(201).json(newProduct);
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const index = db.products.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }

    db.products[index] = {
      ...db.products[index],
      ...updateData,
      price: (updateData.price !== undefined && updateData.price !== null) ? Number(updateData.price) : db.products[index].price,
      cost: (updateData.cost !== undefined && updateData.cost !== null) ? Number(updateData.cost) : db.products[index].cost,
      quantity: (updateData.quantity !== undefined && updateData.quantity !== null) ? Number(updateData.quantity) : db.products[index].quantity,
      minQuantity: (updateData.minQuantity !== undefined && updateData.minQuantity !== null) ? Number(updateData.minQuantity) : db.products[index].minQuantity,
    };
    db.save();
    res.json(db.products[index]);
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }
    const deleted = db.products.splice(index, 1);
    db.save();
    res.json(deleted[0]);
  });

  app.post("/api/products/import", (req, res) => {
    const productsArray = req.body;
    if (Array.isArray(productsArray)) {
      productsArray.forEach((p) => {
        const newProduct: Product = {
          id: p.id || "p-" + Math.random().toString(36).substring(2, 9),
          name: p.name || "",
          nameEn: p.nameEn || p.name_en || "",
          sku: p.sku || "",
          price: Number(p.price) || 0,
          cost: Number(p.cost) || 0,
          quantity: Number(p.quantity) || 0,
          minQuantity: Number(p.minQuantity) || 0,
          category: p.category || "عام",
          image: p.image || "",
        };
        db.products.push(newProduct);
      });
      db.save();
    }
    res.json({ success: true, count: productsArray.length });
  });

  // 3. CUSTOMERS
  app.get("/api/customers", (req, res) => {
    res.json(db.customers);
  });

  app.post("/api/customers", (req, res) => {
    const customerData = req.body;
    const newCustomer: Customer = {
      ...customerData,
      id: customerData.id || "c-" + Date.now(),
      balance: Number(customerData.balance) || 0,
    };
    db.customers.push(newCustomer);
    db.save();
    res.status(201).json(newCustomer);
  });

  app.put("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const index = db.customers.findIndex((c) => c.id === id);
    if (index === -1) return res.status(404).json({ error: "العميل غير موجود" });

    db.customers[index] = {
      ...db.customers[index],
      ...updateData,
      balance: (updateData.balance !== undefined && updateData.balance !== null) ? Number(updateData.balance) : db.customers[index].balance,
    };
    db.save();
    res.json(db.customers[index]);
  });

  app.delete("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const index = db.customers.findIndex((c) => c.id === id);
    if (index === -1) return res.status(404).json({ error: "العميل غير موجود" });
    const deleted = db.customers.splice(index, 1);
    db.save();
    res.json(deleted[0]);
  });

  // 4. SUPPLIERS
  app.get("/api/suppliers", (req, res) => {
    res.json(db.suppliers);
  });

  app.post("/api/suppliers", (req, res) => {
    const supData = req.body;
    const newSup: Supplier = {
      ...supData,
      id: supData.id || "s-" + Date.now(),
    };
    db.suppliers.push(newSup);
    db.save();
    res.status(201).json(newSup);
  });

  app.put("/api/suppliers/:id", (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const index = db.suppliers.findIndex((s) => s.id === id);
    if (index === -1) return res.status(404).json({ error: "المورد غير موجود" });

    db.suppliers[index] = { ...db.suppliers[index], ...updateData };
    db.save();
    res.json(db.suppliers[index]);
  });

  app.delete("/api/suppliers/:id", (req, res) => {
    const { id } = req.params;
    const index = db.suppliers.findIndex((s) => s.id === id);
    if (index === -1) return res.status(404).json({ error: "المورد غير موجود" });
    const deleted = db.suppliers.splice(index, 1);
    db.save();
    res.json(deleted[0]);
  });

  // 5. EXPENSES
  app.get("/api/expenses", (req, res) => {
    res.json(db.expenses);
  });

  app.post("/api/expenses", (req, res) => {
    const expData = req.body;
    const newExpense: Expense = {
      ...expData,
      id: expData.id || "e-" + Date.now(),
      amount: Number(expData.amount) || 0,
      date: expData.date || new Date().toISOString().split("T")[0],
    };
    db.expenses.push(newExpense);
    db.save();
    res.status(201).json(newExpense);
  });

  app.delete("/api/expenses/:id", (req, res) => {
    const { id } = req.params;
    const index = db.expenses.findIndex((e) => e.id === id);
    if (index === -1) return res.status(404).json({ error: "المصروف غير موجود" });
    const deleted = db.expenses.splice(index, 1);
    db.save();
    res.json(deleted[0]);
  });

  // 6. SALES
  app.get("/api/sales", (req, res) => {
    res.json(db.sales);
  });

  app.post("/api/sales", (req, res) => {
    const saleData = req.body;
    const nextNum = db.sales.length + 1;
    const invoiceNum = "INV-2026-" + String(nextNum).padStart(4, "0");

    const newSale: Sale = {
      id: "sale-" + Date.now(),
      invoiceNumber: invoiceNum,
      date: saleData.date || new Date().toISOString(),
      customerId: saleData.customerId,
      customerName: saleData.customerName,
      cashierId: saleData.cashierId || "u-1",
      cashierName: saleData.cashierName || "مدير النظام (Admin)",
      total: Number(saleData.total) || 0,
      tax: Number(saleData.tax) || 0,
      discount: Number(saleData.discount) || 0,
      paymentMethod: saleData.paymentMethod || "cash",
      items: saleData.items || [],
      received: Number(saleData.received) || 0,
      change: Number(saleData.change) || 0,
    };

    // 1. Deduct Product quantity
    newSale.items.forEach((item) => {
      const product = db.products.find((p) => p.id === item.productId);
      if (product) {
        product.quantity = Math.max(0, product.quantity - item.quantity);
      }
    });

    // 2. If modern balance customer, adjust balance if debt / split payment
    if (newSale.customerId && newSale.paymentMethod === "split") {
      const customer = db.customers.find((c) => c.id === newSale.customerId);
      if (customer) {
        // Simple mock: if received is less than total, add to customer balance
        const balanceDue = newSale.total - newSale.received;
        if (balanceDue > 0) {
          customer.balance += balanceDue;
        }
      }
    }

    db.sales.push(newSale);
    db.save();
    res.status(201).json(newSale);
  });

  app.delete("/api/sales/:id", (req, res) => {
    const { id } = req.params;
    const index = db.sales.findIndex((s) => s.id === id);
    if (index === -1) return res.status(404).json({ error: "الفاتورة غير موجودة" });

    // Restock quantities
    const sale = db.sales[index];
    sale.items.forEach((item) => {
      const product = db.products.find((p) => p.id === item.productId);
      if (product) {
        product.quantity += item.quantity;
      }
    });

    const deleted = db.sales.splice(index, 1);
    db.save();
    res.json(deleted[0]);
  });

  // 7. SETTINGS
  app.get("/api/settings", (req, res) => {
    res.json(db.settings);
  });

  app.post("/api/settings", (req, res) => {
    db.settings = {
      ...db.settings,
      ...req.body,
    };
    res.json(db.settings);
  });

  // 8. USERS MANAGEMENT
  app.get("/api/users", (req, res) => {
    res.json(db.users.map(({ id, username, role, name }) => ({ id, username, role, name })));
  });

  app.post("/api/users", (req, res) => {
    const { username, password, role, name } = req.body;
    if (!username || !password || !role || !name) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة للمستخدم" });
    }

    // Check if user exists
    const exists = db.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "اسم المستخدم موجود بالفعل" });
    }

    const newUser: User = {
      id: "u-" + Date.now(),
      username: username,
      passwordHash: hashPassword(password),
      role: role,
      name: name,
    };

    db.users.push(newUser);
    db.save();

    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      name: newUser.name,
    });
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { username, password, role, name } = req.body;

    if (!username || !role || !name) {
      return res.status(400).json({ error: "اسم المستخدم والاسم والنوع حقول مطلوبة" });
    }

    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    // Check if user exists with another id
    const exists = db.users.some((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== id);
    if (exists) {
      return res.status(400).json({ error: "اسم المستخدم موجود بالفعل لموظف آخر" });
    }

    const user = db.users[index];
    user.username = username;
    user.name = name;
    
    // Default admin constraint
    if (id === "u-1") {
      user.role = "admin";
    } else {
      user.role = role;
    }

    if (password && password.trim() !== "") {
      user.passwordHash = hashPassword(password);
    }

    db.users[index] = user;
    db.save();

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    if (id === "u-1") {
      return res.status(400).json({ error: "لا يمكن حذف حساب المسؤول الافتراضي" });
    }
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return res.status(404).json({ error: "المستخدم غير موجود" });
    const deleted = db.users.splice(index, 1);
    db.save();
    res.json({ id });
  });

  // Vite Integration for Hot Middleware / Serving Build Assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart POS system server starts at http://0.0.0.0:${PORT}`);
  });
}

startServer();
