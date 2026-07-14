import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Product, Order, Sale, SalesReport, Customer, PushNotification } from "./src/types";

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data-store.json");

// Default initial state
const DEFAULT_PRODUCTS: Product[] = [
  { id: "p1", name: "Frango Assado Clássico da Vila", price: 49.90, costPrice: 20.00, stock: 35, minStock: 8, category: "Grelhados" },
  { id: "p2", name: "Meio Frango Assado com Batatas", price: 29.90, costPrice: 12.00, stock: 25, minStock: 5, category: "Grelhados" },
  { id: "p3", name: "Balde de Frango Frito Crocante (G)", price: 45.00, costPrice: 18.00, stock: 40, minStock: 10, category: "Fritos" },
  { id: "p4", name: "Coxinha da Vila com Requeijão (6 un)", price: 22.00, costPrice: 9.00, stock: 60, minStock: 15, category: "Salgados" },
  { id: "p5", name: "Polenta Frita Crocante com Parmesão", price: 18.00, costPrice: 6.00, stock: 50, minStock: 12, category: "Acompanhamentos" },
  { id: "p6", name: "Batata Frita Rústica Especial", price: 16.00, costPrice: 5.50, stock: 75, minStock: 15, category: "Acompanhamentos" },
  { id: "p7", name: "Guaraná Antarctica Lata 350ml", price: 6.00, costPrice: 2.20, stock: 120, minStock: 30, category: "Bebidas" },
  { id: "p8", name: "Suco de Laranja Natural 500ml", price: 9.50, costPrice: 3.50, stock: 60, minStock: 12, category: "Bebidas" },
  { id: "p9", name: "Pudim Caseiro de Leite Condensado", price: 12.00, costPrice: 4.00, stock: 30, minStock: 8, category: "Sobremesas" }
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Carlos Silva",
    phone: "11987654321",
    email: "carlos@gmail.com",
    address: "Rua das Flores, 123 - Vila Leopoldina",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    notificationPreferences: { orderUpdates: true, specialOffers: true, newProducts: true }
  },
  {
    id: "c2",
    name: "Mariana Costa",
    phone: "11991234567",
    email: "mariana.costa@yahoo.com",
    address: "Av. Paulista, 1500 - Ap 142 - Bela Vista",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    notificationPreferences: { orderUpdates: true, specialOffers: false, newProducts: true }
  }
];

const DEFAULT_NOTIFICATIONS: PushNotification[] = [
  {
    id: "n1",
    title: "Seja bem-vindo!",
    body: "Obrigado por se cadastrar no Franguinho da Vila. Aproveite nosso cardápio!",
    type: "offer",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true
  },
  {
    id: "n2",
    title: "Frango Frito em Promoção!",
    body: "Hoje o Balde Grande de Frango Frito está com 15% de desconto. Aproveite!",
    type: "offer",
    createdAt: new Date().toISOString(),
    read: false
  }
];

const DEFAULT_SALES: Sale[] = [
  {
    id: "s1",
    items: [
      { productId: "p1", name: "Frango Assado Clássico da Vila", price: 49.90, costPrice: 20.00, quantity: 1 },
      { productId: "p7", name: "Guaraná Antarctica Lata 350ml", price: 6.00, costPrice: 2.20, quantity: 2 }
    ],
    total: 61.90,
    totalCost: 24.40,
    profit: 37.50,
    paymentMethod: "pix",
    discount: 0,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3).toISOString(), // 3 days ago
    type: "pdv"
  },
  {
    id: "s2",
    items: [
      { productId: "p3", name: "Balde de Frango Frito Crocante (G)", price: 45.00, costPrice: 18.00, quantity: 1 },
      { productId: "p8", name: "Suco de Laranja Natural 500ml", price: 9.50, costPrice: 3.50, quantity: 1 }
    ],
    total: 54.55,
    totalCost: 21.50,
    profit: 33.05,
    paymentMethod: "card",
    discount: 0,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2).toISOString(), // 2 days ago
    type: "delivery"
  }
];

const DEFAULT_ORDERS: Order[] = [
  {
    id: "o1",
    items: [
      { productId: "p1", name: "Frango Assado Clássico da Vila", price: 49.90, quantity: 1 },
      { productId: "p5", name: "Polenta Frita Crocante com Parmesão", price: 18.00, quantity: 1 }
    ],
    total: 67.90,
    customerName: "Carlos Silva",
    customerPhone: "11987654321",
    paymentMethod: "pix",
    status: "delivered",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    table: "Mesa 4",
    customerId: "c1"
  },
  {
    id: "o2",
    items: [
      { productId: "p3", name: "Balde de Frango Frito Crocante (G)", price: 45.00, quantity: 1 },
      { productId: "p7", name: "Guaraná Antarctica Lata 350ml", price: 6.00, quantity: 2 }
    ],
    total: 57.00,
    customerName: "Mariana Costa",
    customerPhone: "11991234567",
    paymentMethod: "card",
    status: "preparing",
    createdAt: new Date().toISOString(),
    table: "Delivery",
    customerId: "c2"
  }
];

interface DBState {
  products: Product[];
  orders: Order[];
  sales: Sale[];
  customers: Customer[];
  notifications: PushNotification[];
}

// Read/Write storage helper
function loadDB(): DBState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const db = JSON.parse(raw);
      
      // Auto-migrate if structure is older format
      if (!db.customers) db.customers = DEFAULT_CUSTOMERS;
      if (!db.notifications) db.notifications = DEFAULT_NOTIFICATIONS;
      // Filter out any older hamburger/pizza default products if any, but let's keep user customization.
      // If we need to force products upgrade to Franguinho da Vila, we can ensure they have our IDs.
      if (!db.products || db.products.some((p: any) => p.name.includes("Burger") || p.name.includes("Pizza"))) {
        db.products = DEFAULT_PRODUCTS;
      }
      return db;
    }
  } catch (err) {
    console.error("Error reading database file, resetting to defaults", err);
  }
  const defaultState = { 
    products: DEFAULT_PRODUCTS, 
    orders: DEFAULT_ORDERS, 
    sales: DEFAULT_SALES,
    customers: DEFAULT_CUSTOMERS,
    notifications: DEFAULT_NOTIFICATIONS
  };
  saveDB(defaultState);
  return defaultState;
}

function saveDB(state: DBState) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Endpoints

  // Reset database state
  app.post("/api/reset", (req, res) => {
    const defaultState: DBState = { 
      products: DEFAULT_PRODUCTS, 
      orders: DEFAULT_ORDERS, 
      sales: DEFAULT_SALES,
      customers: DEFAULT_CUSTOMERS,
      notifications: DEFAULT_NOTIFICATIONS
    };
    saveDB(defaultState);
    res.json({ message: "Database reset to initial seeds", ...defaultState });
  });

  // GET products
  app.get("/api/products", (req, res) => {
    const db = loadDB();
    res.json(db.products);
  });

  // POST create or update product
  app.post("/api/products", (req, res) => {
    const db = loadDB();
    const prod: Product = req.body;
    
    if (!prod.id) {
      prod.id = "p_" + Date.now();
    }

    const index = db.products.findIndex(p => p.id === prod.id);
    if (index >= 0) {
      db.products[index] = { ...db.products[index], ...prod };
    } else {
      db.products.push(prod);
    }
    
    saveDB(db);
    res.json({ success: true, product: prod, products: db.products });
  });

  // POST restock a product
  app.post("/api/products/restock", (req, res) => {
    const db = loadDB();
    const { productId, amount } = req.body;
    const prod = db.products.find(p => p.id === productId);
    if (!prod) {
      return res.status(404).json({ error: "Product not found" });
    }
    prod.stock += Number(amount) || 0;
    saveDB(db);
    res.json({ success: true, product: prod, products: db.products });
  });

  // GET orders
  app.get("/api/orders", (req, res) => {
    const db = loadDB();
    res.json(db.orders);
  });

  // POST create a client order (mobile app)
  app.post("/api/orders", (req, res) => {
    const db = loadDB();
    const { items, customerName, customerPhone, paymentMethod, table, customerId } = req.body;

    if (!items || !items.length || !customerName) {
      return res.status(400).json({ error: "Dados incompletos para criação de pedido." });
    }

    // Double check and update stock levels
    const orderItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const prod = db.products.find(p => p.id === item.productId);
      if (!prod) {
        return res.status(404).json({ error: `Produto ${item.name} não encontrado.` });
      }
      if (prod.stock < item.quantity) {
        return res.status(400).json({ error: `Estoque insuficiente para ${prod.name}. Disponível: ${prod.stock}` });
      }
      prod.stock -= item.quantity; // Decrement stock immediately on reservation
      calculatedTotal += prod.price * item.quantity;
      orderItems.push({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: item.quantity
      });
    }

    const newOrder: Order = {
      id: "o_" + Date.now(),
      items: orderItems,
      total: Number(calculatedTotal.toFixed(2)),
      customerName,
      customerPhone,
      paymentMethod,
      status: "pending",
      createdAt: new Date().toISOString(),
      table: table || "Mesa Digital",
      customerId: customerId || undefined
    };

    db.orders.unshift(newOrder);

    // Auto-trigger push notification if placed by a registered customer
    if (newOrder.customerId) {
      const confirmNotification: PushNotification = {
        id: "n_" + Date.now(),
        title: "Pedido Confirmado! 🍗",
        body: `Seu pedido no Franguinho da Vila (Total: R$ ${newOrder.total.toFixed(2)}) foi recebido com sucesso.`,
        type: "order_status",
        createdAt: new Date().toISOString(),
        read: false,
        orderId: newOrder.id,
        customerId: newOrder.customerId
      };
      db.notifications.unshift(confirmNotification);
    }

    saveDB(db);
    res.json({ success: true, order: newOrder });
  });

  // PATCH order status
  app.patch("/api/orders/:id/status", (req, res) => {
    const db = loadDB();
    const { id } = req.params;
    const { status } = req.body;

    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const oldStatus = order.status;
    order.status = status;

    // Handle cancellation: return reserved stock
    if (status === "cancelled" && oldStatus !== "cancelled") {
      for (const item of order.items) {
        const prod = db.products.find(p => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
        }
      }
    } 
    // Handle fulfillment: convert to completed sale if it just became 'delivered' and wasn't delivered already
    else if (status === "delivered" && oldStatus !== "delivered") {
      // Create a sale entry
      const saleItems = order.items.map(item => {
        const prod = db.products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          name: item.name,
          price: item.price,
          costPrice: prod ? prod.costPrice : item.price * 0.5, // fallback cost
          quantity: item.quantity
        };
      });

      const totalCost = saleItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
      const total = order.total;

      const newSale: Sale = {
        id: "s_" + Date.now(),
        items: saleItems,
        total: total,
        totalCost: Number(totalCost.toFixed(2)),
        profit: Number((total - totalCost).toFixed(2)),
        paymentMethod: order.paymentMethod,
        discount: 0,
        createdAt: new Date().toISOString(),
        type: "delivery",
        orderId: order.id,
        customerId: order.customerId
      };

      db.sales.unshift(newSale);
    }

    // Trigger push notification on status transition
    if (oldStatus !== status && order.customerId) {
      // Look up customer to see if orderUpdates is enabled
      const customer = db.customers.find(c => c.id === order.customerId);
      if (!customer || customer.notificationPreferences.orderUpdates) {
        let notifTitle = "Status do Pedido";
        let notifBody = `Seu pedido #${order.id.slice(-4)} foi atualizado para ${status}.`;

        if (status === "preparing") {
          notifTitle = "Preparando seu Franguinho! 🔥";
          notifBody = "Seu pedido entrou em preparação na brasa! Logo estará bem suculento e pronto.";
        } else if (status === "ready") {
          notifTitle = "Pronto para Retirada / Envio! 📦";
          notifBody = "Seu pedido no Franguinho da Vila já está pronto e embalado!";
        } else if (status === "delivered") {
          notifTitle = "Pedido Entregue! Bom Apetite! 😋";
          notifBody = "Seu pedido foi entregue. Agradecemos a preferência pelo Franguinho da Vila!";
        } else if (status === "cancelled") {
          notifTitle = "Pedido Cancelado ⚠️";
          notifBody = "Houve um imprevisto e seu pedido foi cancelado. Desculpe-nos pelo transtorno.";
        }

        const statusNotification: PushNotification = {
          id: "n_" + Date.now() + "_status",
          title: notifTitle,
          body: notifBody,
          type: "order_status",
          createdAt: new Date().toISOString(),
          read: false,
          orderId: order.id,
          customerId: order.customerId
        };
        db.notifications.unshift(statusNotification);
      }
    }

    saveDB(db);
    res.json({ success: true, order });
  });

  // GET sales
  app.get("/api/sales", (req, res) => {
    const db = loadDB();
    res.json(db.sales);
  });

  // POST create a direct cashier sale (PDV)
  app.post("/api/sales", (req, res) => {
    const db = loadDB();
    const { items, paymentMethod, discount, cpf } = req.body;

    if (!items || !items.length || !paymentMethod) {
      return res.status(400).json({ error: "Dados inválidos para registrar venda" });
    }

    const saleItems = [];
    let totalCost = 0;
    let totalRevenue = 0;

    for (const item of items) {
      const prod = db.products.find(p => p.id === item.productId);
      if (!prod) {
        return res.status(404).json({ error: `Produto ${item.name} não encontrado` });
      }
      if (prod.stock < item.quantity) {
        return res.status(400).json({ error: `Estoque insuficiente para ${prod.name}. Disponível: ${prod.stock}` });
      }

      // Decrement stock
      prod.stock -= item.quantity;

      totalCost += prod.costPrice * item.quantity;
      totalRevenue += prod.price * item.quantity;

      saleItems.push({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        costPrice: prod.costPrice,
        quantity: item.quantity
      });
    }

    const finalDiscount = Number(discount) || 0;
    const finalTotal = Math.max(0, Number((totalRevenue - finalDiscount).toFixed(2)));
    const profit = Number((finalTotal - totalCost).toFixed(2));

    const newSale: Sale = {
      id: "s_" + Date.now(),
      items: saleItems,
      total: finalTotal,
      totalCost: Number(totalCost.toFixed(2)),
      profit: profit,
      paymentMethod,
      discount: finalDiscount,
      createdAt: new Date().toISOString(),
      type: "pdv",
      cpf: cpf || undefined
    };

    db.sales.unshift(newSale);
    saveDB(db);

    res.json({ success: true, sale: newSale, products: db.products });
  });

  // GET detailed financial reports
  app.get("/api/reports", (req, res) => {
    const db = loadDB();
    const { sales, products } = db;

    let totalRevenue = 0;
    let totalProfit = 0;
    const salesCount = sales.length;

    // Payment method breakdown
    const paymentMap: Record<string, { total: number; count: number }> = {
      money: { total: 0, count: 0 },
      card: { total: 0, count: 0 },
      pix: { total: 0, count: 0 }
    };

    // Category breakdown
    const categoryMap: Record<string, number> = {};

    // Product breakdown for Top Products
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    // Date-wise breakdown (last 7 days or all history grouped by date)
    const historyMap: Record<string, { revenue: number; profit: number; count: number }> = {};

    for (const sale of sales) {
      totalRevenue += sale.total;
      totalProfit += sale.profit;

      // Payment method
      if (paymentMap[sale.paymentMethod]) {
        paymentMap[sale.paymentMethod].total += sale.total;
        paymentMap[sale.paymentMethod].count += 1;
      } else {
        paymentMap[sale.paymentMethod] = { total: sale.total, count: 1 };
      }

      // Group items
      for (const item of sale.items) {
        // Top selling products
        if (productSalesMap[item.productId]) {
          productSalesMap[item.productId].quantity += item.quantity;
          productSalesMap[item.productId].revenue += item.price * item.quantity;
        } else {
          productSalesMap[item.productId] = {
            name: item.name,
            quantity: item.quantity,
            revenue: item.price * item.quantity
          };
        }

        // Category breakdown
        const productDetails = products.find(p => p.id === item.productId);
        const cat = productDetails ? productDetails.category : "Outros";
        categoryMap[cat] = (categoryMap[cat] || 0) + (item.price * item.quantity);
      }

      // History
      const dateStr = new Date(sale.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit"
      });
      if (historyMap[dateStr]) {
        historyMap[dateStr].revenue += sale.total;
        historyMap[dateStr].profit += sale.profit;
        historyMap[dateStr].count += 1;
      } else {
        historyMap[dateStr] = {
          revenue: sale.total,
          profit: sale.profit,
          count: 1
        };
      }
    }

    const averageTicket = salesCount > 0 ? Number((totalRevenue / salesCount).toFixed(2)) : 0;

    // Convert payment map to array
    const salesByPayment = Object.keys(paymentMap).map(method => ({
      name: method === "money" ? "Dinheiro" : method === "card" ? "Cartão" : "Pix",
      value: Number(paymentMap[method].total.toFixed(2))
    }));

    // Convert category map to array
    const salesByCategory = Object.keys(categoryMap).map(cat => ({
      name: cat,
      value: Number(categoryMap[cat].toFixed(2))
    }));

    // Convert product sales map to array & sort
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        quantity: p.quantity,
        revenue: Number(p.revenue.toFixed(2))
      }));

    // Convert history map to sorted array (limit to last 10 records)
    const salesHistory = Object.keys(historyMap).map(date => ({
      date,
      revenue: Number(historyMap[date].revenue.toFixed(2)),
      profit: Number(historyMap[date].profit.toFixed(2)),
      count: historyMap[date].count
    })).reverse().slice(0, 7).reverse(); // last 7 days

    const report: SalesReport = {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      salesCount,
      averageTicket,
      salesByPayment,
      salesByCategory,
      topProducts,
      salesHistory
    };

    res.json(report);
  });

  // GET customers list
  app.get("/api/customers", (req, res) => {
    const db = loadDB();
    res.json(db.customers || []);
  });

  // POST create or update customer
  app.post("/api/customers", (req, res) => {
    const db = loadDB();
    const { id, name, phone, email, address, notificationPreferences } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Nome e telefone são obrigatórios." });
    }

    let customer = db.customers.find(c => c.phone === phone || (id && c.id === id));
    if (customer) {
      customer.name = name;
      customer.email = email || customer.email || "";
      customer.address = address !== undefined ? address : customer.address;
      if (notificationPreferences) {
        customer.notificationPreferences = { ...customer.notificationPreferences, ...notificationPreferences };
      }
    } else {
      customer = {
        id: id || "c_" + Date.now(),
        name,
        phone,
        email: email || "",
        address: address || "",
        createdAt: new Date().toISOString(),
        notificationPreferences: notificationPreferences || { orderUpdates: true, specialOffers: true, newProducts: true }
      };
      db.customers.push(customer);

      // Create welcome notification
      const welcomeNotification: PushNotification = {
        id: "n_" + Date.now(),
        title: "Bem-vindo ao Franguinho da Vila! 🐔",
        body: `Olá, ${name}! Seu cadastro foi concluído com sucesso. Aproveite o melhor frango assado e frito da região!`,
        type: "offer",
        createdAt: new Date().toISOString(),
        read: false,
        customerId: customer.id
      };
      db.notifications.unshift(welcomeNotification);
    }

    saveDB(db);
    res.json({ success: true, customer, customers: db.customers });
  });

  // POST customer login / signup trigger
  app.post("/api/customers/login", (req, res) => {
    const db = loadDB();
    const { phone, name, email, address } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Número de telefone é obrigatório." });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    let customer = db.customers.find(c => c.phone.replace(/\D/g, "") === cleanPhone);

    if (customer) {
      if (name) customer.name = name;
      if (email) customer.email = email;
      if (address) customer.address = address;
      saveDB(db);
      return res.json({ success: true, customer, isNew: false });
    }

    if (name) {
      const newCustomer: Customer = {
        id: "c_" + Date.now(),
        name,
        phone,
        email: email || "",
        address: address || "",
        createdAt: new Date().toISOString(),
        notificationPreferences: { orderUpdates: true, specialOffers: true, newProducts: true }
      };
      db.customers.push(newCustomer);

      // Create welcome notification
      const welcomeNotification: PushNotification = {
        id: "n_" + Date.now(),
        title: "Bem-vindo ao Franguinho da Vila! 🐔",
        body: `Olá, ${name}! Seu cadastro foi concluído com sucesso. Aproveite o melhor frango assado da região!`,
        type: "offer",
        createdAt: new Date().toISOString(),
        read: false,
        customerId: newCustomer.id
      };
      db.notifications.unshift(welcomeNotification);

      saveDB(db);
      return res.json({ success: true, customer: newCustomer, isNew: true });
    }

    return res.json({ success: false, error: "customer_not_found" });
  });

  // GET orders for specific customer
  app.get("/api/orders/customer/:phoneOrId", (req, res) => {
    const db = loadDB();
    const { phoneOrId } = req.params;

    const cleanPhone = phoneOrId.replace(/\D/g, "");
    const customerOrders = db.orders.filter(o => 
      o.customerId === phoneOrId || 
      (o.customerPhone && o.customerPhone.replace(/\D/g, "") === cleanPhone)
    );

    res.json(customerOrders);
  });

  // GET notifications (optionally filtered by customerId)
  app.get("/api/notifications", (req, res) => {
    const db = loadDB();
    const { customerId } = req.query;
    if (customerId) {
      const filtered = db.notifications.filter(n => !n.customerId || n.customerId === customerId);
      return res.json(filtered);
    }
    res.json(db.notifications || []);
  });

  // POST create a promotional notification
  app.post("/api/notifications", (req, res) => {
    const db = loadDB();
    const { title, body, type, customerId } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: "Título e mensagem são obrigatórios." });
    }

    const newNotification: PushNotification = {
      id: "n_" + Date.now(),
      title,
      body,
      type: type || "offer",
      createdAt: new Date().toISOString(),
      read: false,
      customerId: customerId || undefined
    };

    db.notifications.unshift(newNotification);
    saveDB(db);
    res.json({ success: true, notification: newNotification, notifications: db.notifications });
  });

  // Serve static UI assets in production, otherwise mount Vite server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 POS full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
