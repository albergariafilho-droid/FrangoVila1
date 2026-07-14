/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Product, Order, PushNotification, Customer } from "../types";
import { 
  ShoppingBag, 
  ChevronRight, 
  Check, 
  ShieldCheck, 
  CreditCard, 
  Compass, 
  Clock, 
  MapPin, 
  X, 
  RotateCcw, 
  AlertCircle,
  Bell,
  User,
  Settings,
  LogOut,
  Sliders,
  History,
  Phone,
  Mail,
  Search
} from "lucide-react";
import { playSynth } from "../utils/audio";

interface CustomerMobileAppProps {
  products: Product[];
  refreshProducts: () => void;
  onOrderPlaced: () => void;
}

export function CustomerMobileApp({ products, refreshProducts, onOrderPlaced }: CustomerMobileAppProps) {
  // Navigation / View state: "menu" | "cart" | "payment" | "status" | "notifs" | "profile"
  const [mobileView, setMobileView] = useState<"menu" | "cart" | "payment" | "status" | "notifs" | "profile">("menu");
  
  // Search & Category states for mobile menu view
  const [mobileSearchTerm, setMobileSearchTerm] = useState("");
  const [mobileSelectedCategory, setMobileSelectedCategory] = useState("Todos");
  
  // Cart state
  const [cart, setCart] = useState<{ productId: string; name: string; price: number; quantity: number }[]>([]);
  
  // Checkout details (defaults to form inputs, but prefilled by customer profile if logged)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  
  const [table, setTable] = useState("Mesa 3");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "money">("pix");
  
  // Current active order state
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Customer account state (persisted in local storage)
  const [loggedCustomer, setLoggedCustomer] = useState<Customer | null>(() => {
    const saved = localStorage.getItem("franguinho_customer");
    return saved ? JSON.parse(saved) : null;
  });

  // Login form state
  const [inputPhone, setInputPhone] = useState("");
  const [inputName, setInputName] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputAddress, setInputAddress] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Customer dynamic history & notifications
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  
  // Notification preference state
  const [notificationPreferences, setNotificationPreferences] = useState({
    orderUpdates: true,
    specialOffers: true,
    newProducts: true
  });
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);

  // Sync state values with logged customer info
  useEffect(() => {
    if (loggedCustomer) {
      setCustomerName(loggedCustomer.name);
      setCustomerPhone(loggedCustomer.phone);
      setCustomerEmail(loggedCustomer.email || "");
      setCustomerAddress(loggedCustomer.address || "");
      if (loggedCustomer.notificationPreferences) {
        setNotificationPreferences(loggedCustomer.notificationPreferences);
      }
    } else {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerAddress("");
    }
  }, [loggedCustomer]);

  // Fetch past orders and targeted notifications if customer is logged in
  useEffect(() => {
    if (!loggedCustomer) return;

    const fetchCustomerData = async () => {
      try {
        const phoneOrId = loggedCustomer.id;
        const [ordersRes, notifRes] = await Promise.all([
          fetch(`/api/orders/customer/${phoneOrId}`),
          fetch(`/api/notifications?customerId=${loggedCustomer.id}`)
        ]);

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setPastOrders(ordersData);
        }
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData);
        }
      } catch (err) {
        console.error("Erro ao sincronizar dados do cliente:", err);
      }
    };

    fetchCustomerData();
    const interval = setInterval(fetchCustomerData, 2500);
    return () => clearInterval(interval);
  }, [loggedCustomer]);

  // Poll for active order status updates if an order exists
  useEffect(() => {
    if (!activeOrder) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const ordersList: Order[] = await res.json();
          const updated = ordersList.find(o => o.id === activeOrder.id);
          if (updated) {
            if (updated.status !== activeOrder.status) {
              playSynth.playNotification();
              setActiveOrder(updated);
            }
          }
        }
      } catch (e) {
        console.error("Error polling order status:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeOrder]);

  // Handle Login & Auto-signup
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!inputPhone) {
      setLoginError("Por favor, preencha o número de telefone.");
      return;
    }

    try {
      const payload = isSigningUp 
        ? { phone: inputPhone, name: inputName, email: inputEmail, address: inputAddress }
        : { phone: inputPhone };

      const res = await fetch("/api/customers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        playSynth.playNotification();
        setLoggedCustomer(data.customer);
        localStorage.setItem("franguinho_customer", JSON.stringify(data.customer));
        // reset forms
        setInputPhone("");
        setInputName("");
        setInputEmail("");
        setInputAddress("");
        setIsSigningUp(false);
      } else {
        if (data.error === "customer_not_found") {
          setIsSigningUp(true);
          setLoginError("Número não cadastrado. Preencha seus dados para criar sua conta!");
        } else {
          setLoginError(data.error || "Erro ao realizar login.");
        }
      }
    } catch (err) {
      setLoginError("Falha na conexão com o servidor.");
    }
  };

  // Handle Preferences Save
  const handleTogglePreference = async (key: "orderUpdates" | "specialOffers" | "newProducts") => {
    const updatedPrefs = {
      ...notificationPreferences,
      [key]: !notificationPreferences[key]
    };
    setNotificationPreferences(updatedPrefs);

    if (loggedCustomer) {
      try {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: loggedCustomer.id,
            name: loggedCustomer.name,
            phone: loggedCustomer.phone,
            notificationPreferences: updatedPrefs
          })
        });
        if (res.ok) {
          const data = await res.json();
          setLoggedCustomer(data.customer);
          localStorage.setItem("franguinho_customer", JSON.stringify(data.customer));
        }
      } catch (e) {
        console.error("Erro ao salvar preferências no servidor:", e);
      }
    }
  };

  const handleLogout = () => {
    playSynth.playClick();
    setLoggedCustomer(null);
    localStorage.removeItem("franguinho_customer");
    setMobileView("menu");
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    playSynth.playClick();
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Estoque máximo atingido para ${product.name} (${product.stock} un disponíveis).`);
          return prev;
        }
        return prev.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    playSynth.playClick();
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const prodObj = products.find(p => p.id === productId);
          const limit = prodObj ? prodObj.stock : 99;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > limit) {
            alert(`Estoque máximo atingido para ${item.name} (${limit} un disponíveis).`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as any[];
    });
  };

  const removeFromCart = (productId: string) => {
    playSynth.playClick();
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Reordering function: Populates cart with items from a past order
  const handleReorder = (pastOrder: Order) => {
    playSynth.playClick();
    const itemsToReorder = pastOrder.items.map(item => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));
    setCart(itemsToReorder);
    setMobileView("cart");
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    const finalName = loggedCustomer ? loggedCustomer.name : customerName;
    const finalPhone = loggedCustomer ? loggedCustomer.phone : customerPhone;

    if (!finalName.trim()) {
      setErrorMessage("Por favor, digite seu nome.");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    const payload = {
      items: cart,
      customerName: finalName,
      customerPhone: finalPhone,
      paymentMethod,
      table,
      customerId: loggedCustomer ? loggedCustomer.id : undefined
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao registrar o pedido.");
      }

      const result = await response.json();
      
      playSynth.playKaching();
      setActiveOrder(result.order);
      setCart([]);
      setMobileView("status");
      
      refreshProducts();
      onOrderPlaced();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro de rede.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return { label: "Pendente", desc: "Aguardando aprovação do caixa", color: "text-amber-600 bg-amber-50 border-amber-200" };
      case "preparing": return { label: "Na Brasa! 🔥", desc: "Seu frango está assando e dourando na churrasqueira", color: "text-orange-600 bg-orange-50 border-orange-200 animate-pulse" };
      case "ready": return { label: "Pronto para Retirada", desc: "Seu pedido está pronto e embalado na Vila!", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
      case "delivered": return { label: "Entregue / Concluído", desc: "Pedido entregue. Aproveite o melhor frango!", color: "text-slate-600 bg-slate-50 border-slate-200" };
      case "cancelled": return { label: "Cancelado", desc: "Seu pedido foi cancelado pelo Franguinho da Vila", color: "text-rose-600 bg-rose-50 border-rose-200" };
      default: return { label: "Desconhecido", desc: "", color: "text-slate-400 bg-slate-50 border-slate-200" };
    }
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex justify-center py-2 animate-fade-in" id="customer_mobile_container">
      {/* Physical iPhone Device Frame Mockup */}
      <div className="relative w-[345px] h-[680px] bg-slate-900 rounded-[44px] shadow-2xl p-3 border-4 border-slate-800 flex flex-col overflow-hidden ring-12 ring-slate-900/10">
        
        {/* Notch/Dynamic Island Speaker */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-10 h-1 bg-neutral-900 rounded-full" />
        </div>

        {/* Home/Time Top status bar inside screen */}
        <div className="px-5 pt-3 pb-1 flex justify-between items-center text-[11px] text-slate-800 font-bold bg-white z-20 select-none">
          <span>12:30</span>
          <div className="flex items-center gap-1">
            <span className="text-[9px]">5G</span>
            <div className="w-4 h-2.5 bg-slate-800 rounded-sm flex items-center p-0.5">
              <div className="w-full h-full bg-white rounded-xs" />
            </div>
          </div>
        </div>

        {/* Phone screen workspace */}
        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden rounded-[32px] relative text-slate-800">
          
          {/* HEADER of client App */}
          <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🍗</span>
              <h1 className="text-xs font-black tracking-tight text-slate-800 uppercase">Franguinho da Vila</h1>
            </div>

            {/* Notifications & Cart Buttons on Top header */}
            <div className="flex items-center gap-2">
              {/* Notif Bell Icon */}
              <button
                onClick={() => {
                  playSynth.playClick();
                  setMobileView("notifs");
                }}
                className={`relative p-1 rounded-full transition-colors ${
                  mobileView === "notifs" ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"
                }`}
                title="Notificações"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white font-bold text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* Shopping Cart Icon */}
              {mobileView !== "cart" && (
                <button
                  onClick={() => {
                    playSynth.playClick();
                    setMobileView("cart");
                  }}
                  className={`relative p-1 rounded-full transition-colors ${
                    mobileView === "cart" ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  {cart.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-orange-600 text-white font-bold text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center animate-bounce">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)}
                    </span>
                  )}
                </button>
              )}
            </div>
          </header>

          {/* SCREEN CONTENT */}
          <div className="flex-1 overflow-y-auto" id="phone_content">
            
            {/* VIEW 1: MENU SCREEN */}
            {mobileView === "menu" && (
              <div className="p-4 space-y-4 animate-fade-in">
                {/* Hero Banner */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-sm space-y-1">
                  <span className="text-[9px] bg-white/20 text-white font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">O Sabor da Brasa</span>
                  <h2 className="text-sm font-black leading-tight">Franguinho da Vila 🍗</h2>
                  <p className="text-[10px] text-orange-50 font-medium">Frango assado suculento, porções crocantes e acompanhamentos especiais!</p>
                </div>

                {/* Account quick greeting */}
                {loggedCustomer ? (
                  <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 flex items-center justify-between text-xs font-semibold text-orange-950">
                    <div>
                      <p className="text-[9px] text-orange-700 uppercase font-bold">Cliente Cadastrado</p>
                      <p>Olá, <span className="font-extrabold">{loggedCustomer.name}</span>! 🐔</p>
                    </div>
                    <button 
                      onClick={() => setMobileView("profile")}
                      className="text-[10px] text-orange-700 font-extrabold underline flex items-center gap-1"
                    >
                      Ver Histórico
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs text-slate-700">
                    <p className="font-medium text-[11px]">Faça **Login** para salvar dados e reordenar rápido!</p>
                    <button 
                      onClick={() => setMobileView("profile")}
                      className="text-[10px] bg-slate-800 text-white font-bold px-2 py-1 rounded-md"
                    >
                      Acessar
                    </button>
                  </div>
                )}

                {/* Table Setup Banner */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sua Localização / Mesa:</span>
                    <span className="text-xs font-black text-slate-800">{table === "Delivery" ? "Entrega em Domicílio 🏠" : table}</span>
                  </div>
                  <div className="flex gap-1.5" id="mobile_table_picker">
                    {["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Delivery"].map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          playSynth.playClick();
                          setTable(t);
                        }}
                        className={`flex-1 py-1 text-[9px] font-bold rounded border transition-all ${
                          table === t
                            ? "bg-orange-50 text-orange-800 border-orange-600"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        {t === "Delivery" ? "Entrega" : t.replace("Mesa ", "M. ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search & Categories Bar */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Buscar pratos ou bebidas..."
                      value={mobileSearchTerm}
                      onChange={(e) => setMobileSearchTerm(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-xs"
                      id="mobile_search_input"
                    />
                  </div>

                  {/* Categories Horiz Rail */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none" id="mobile_categories_rail">
                    {["Todos", "Grelhados", "Fritos", "Salgados", "Acompanhamentos", "Bebidas", "Sobremesas"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          playSynth.playClick();
                          setMobileSelectedCategory(cat);
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                          mobileSelectedCategory === cat
                            ? "bg-orange-600 text-white shadow-xs"
                            : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products List Title */}
                <div>
                  <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">
                    {mobileSelectedCategory === "Todos" ? "Nosso Cardápio" : mobileSelectedCategory}
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      const filtered = (products || []).filter(product => {
                        if (!product) return false;
                        const name = product.name || "";
                        const category = product.category || "";
                        const matchesSearch = name.toLowerCase().includes(mobileSearchTerm.toLowerCase());
                        const matchesCategory = mobileSelectedCategory === "Todos" || category === mobileSelectedCategory;
                        return matchesSearch && matchesCategory;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl text-slate-400 space-y-1">
                            <Search className="w-6 h-6 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold">Nenhum item encontrado.</p>
                          </div>
                        );
                      }

                      return filtered.map(product => {
                        const isOutOfStock = product.stock <= 0;

                        return (
                          <div
                            key={product.id}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs hover:border-orange-200 transition-colors"
                            id={`mob_prod_${product.id}`}
                          >
                            <div className="flex-1 space-y-0.5">
                              <span className="text-[9px] text-orange-500 font-bold uppercase tracking-wider">{product.category}</span>
                              <h4 className="text-xs font-extrabold text-slate-800">{product.name}</h4>
                              <p className="text-xs font-black text-slate-900">R$ {product.price.toFixed(2)}</p>
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                isOutOfStock 
                                  ? "bg-rose-100 text-rose-700" 
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                                {isOutOfStock ? "Esgotado" : `Estoque: ${product.stock}`}
                              </span>

                              <button
                                onClick={() => addToCart(product)}
                                disabled={isOutOfStock}
                                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                  isOutOfStock
                                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    : "bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
                                }`}
                                id={`mob_add_btn_${product.id}`}
                              >
                                Adicionar
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: CART SCREEN */}
            {mobileView === "cart" && (
              <div className="p-4 space-y-4 animate-fade-in">
                <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Seu Carrinho</h3>

                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold">Seu carrinho está vazio.</p>
                    <button
                      onClick={() => setMobileView("menu")}
                      className="text-xs text-orange-600 font-bold underline"
                    >
                      Voltar ao cardápio
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3" id="mobile_cart_items">
                    {cart.map(item => (
                      <div
                        key={item.productId}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-xs"
                      >
                        <div className="flex-1 pr-1.5">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                          <span className="text-[10px] text-slate-500">R$ {item.price.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md">
                            <button
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-[11px] font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-xs font-bold"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-slate-200 pt-3 space-y-3">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-semibold text-slate-500">Total do Pedido:</span>
                        <span className="font-black text-sm text-slate-800">R$ {cartSubtotal.toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => {
                          playSynth.playClick();
                          setMobileView("payment");
                        }}
                        className="w-full py-2.5 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-sm text-center flex items-center justify-center gap-1 hover:bg-orange-700 transition-all"
                        id="mob_continue_btn"
                      >
                        <span>Avançar para Checkout</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: PAYMENT / CHECKOUT FORM */}
            {mobileView === "payment" && (
              <div className="p-4 space-y-4 animate-fade-in">
                <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Identificação e Pagamento</h3>

                {errorMessage && (
                  <div className="bg-rose-50 text-rose-800 p-2.5 rounded-lg border-l-4 border-rose-500 text-[10px] font-medium leading-normal animate-pulse">
                    {errorMessage}
                  </div>
                )}

                {/* Form Inputs */}
                <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                  {loggedCustomer ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-orange-600 font-extrabold text-[10px] uppercase">
                        <Check className="w-4 h-4" /> Conta Autenticada
                      </div>
                      <p><strong>Nome:</strong> {loggedCustomer.name}</p>
                      <p><strong>Telefone:</strong> {loggedCustomer.phone}</p>
                      {loggedCustomer.address && (
                        <p><strong>Endereço de Entrega:</strong> {loggedCustomer.address}</p>
                      )}
                      <p className="text-[9px] text-slate-400 font-medium">As informações foram preenchidas automaticamente a partir de sua conta.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Seu Nome para Identificação</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: João da Silva"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                          id="mob_cust_name"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Telefone para Contato</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: (11) 98765-4321"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                          id="mob_cust_phone"
                        />
                      </div>

                      {table === "Delivery" && (
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Endereço de Entrega</label>
                          <input
                            type="text"
                            required
                            placeholder="Rua, Número, Bairro, Cidade"
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Destino do Pedido</label>
                    <div className="text-xs font-bold text-slate-700 bg-slate-100 p-2 rounded-lg flex items-center justify-between">
                      <span>{table === "Delivery" ? "Entrega em Casa" : table}</span>
                      <button 
                        onClick={() => setMobileView("menu")}
                        className="text-[10px] text-orange-600 font-extrabold"
                      >
                        Alterar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase block">Escolha como quer Pagar</label>
                  <div className="grid grid-cols-3 gap-2" id="mob_pay_selector">
                    {(["pix", "card", "money"] as const).map(method => (
                      <button
                        key={method}
                        onClick={() => {
                          playSynth.playClick();
                          setPaymentMethod(method);
                        }}
                        className={`py-2 px-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === method
                            ? "border-orange-600 bg-orange-50 text-orange-800 font-bold shadow-xs"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                          {method === "money" ? "Dinheiro" : method === "card" ? "Cartão" : "Pix"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Payment Screen depending on choice */}
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-center space-y-2">
                  {paymentMethod === "pix" && (
                    <div className="space-y-1">
                      <div className="w-14 h-14 bg-white mx-auto flex items-center justify-center border border-slate-200 rounded-lg">
                        <div className="grid grid-cols-4 gap-0.5 p-1 w-12 h-12 bg-neutral-900">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 ${i % 3 === 0 ? "bg-white" : "bg-neutral-900"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-[9px] font-bold text-slate-500">Escaneie o QR Code ou Pague na Entrega</p>
                      <p className="text-[9px] text-orange-600 font-extrabold">Pix do Franguinho da Vila</p>
                    </div>
                  )}

                  {paymentMethod === "card" && (
                    <div className="flex items-center justify-center gap-1.5 text-slate-500 py-2">
                      <CreditCard className="w-5 h-5 text-orange-600" />
                      <span className="text-[10px] font-bold">Levar Maquininha na Entrega</span>
                    </div>
                  )}

                  {paymentMethod === "money" && (
                    <p className="text-[9px] text-slate-500 font-bold py-2">
                      Pagamento presencial ao receber.
                    </p>
                  )}
                </div>

                {/* Checkout Summary */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-600 font-medium shadow-xs">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-800">R$ {cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-black border-t border-slate-100 pt-2 mt-1">
                    <span>Total do Pedido:</span>
                    <span className="text-orange-700">R$ {cartSubtotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Final Submit order button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md text-center flex items-center justify-center gap-1.5 hover:bg-orange-700 transition-all"
                  id="submit_mob_order_btn"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirmar e Enviar Pedido</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* VIEW 4: LIVE ORDER STATUS TRACKER */}
            {mobileView === "status" && activeOrder && (
              <div className="p-4 space-y-5 flex flex-col justify-between h-full animate-fade-in">
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center mx-auto animate-bounce">
                      <Clock className="w-5 h-5" />
                    </div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Acompanhamento</h3>
                    <p className="text-xs font-black text-slate-800">Pedido #{activeOrder.id.replace("o_", "")}</p>
                  </div>

                  {/* Dynamic Alert status block */}
                  {(() => {
                    const statusObj = getStatusLabel(activeOrder.status);
                    return (
                      <div className={`p-3.5 rounded-xl border text-center space-y-1 ${statusObj.color}`} id="order_status_alert_box">
                        <p className="text-xs font-black uppercase tracking-wide">{statusObj.label}</p>
                        <p className="text-[10px] font-medium leading-relaxed">{statusObj.desc}</p>
                      </div>
                    );
                  })()}

                  {/* Step progress line */}
                  <div className="space-y-3 bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
                    {/* Step 1: Pending */}
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        activeOrder.status !== "cancelled" ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-400"
                      }`}>
                        {activeOrder.status !== "cancelled" ? <Check className="w-3 h-3" /> : "1"}
                      </div>
                      <span className={`text-[11px] font-bold ${activeOrder.status !== "cancelled" ? "text-slate-800" : "text-slate-400"}`}>Pedido Confirmado</span>
                    </div>

                    {/* Step 2: Preparing */}
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        ["preparing", "ready", "delivered"].includes(activeOrder.status)
                          ? "bg-orange-600 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}>
                        {["ready", "delivered"].includes(activeOrder.status) ? <Check className="w-3 h-3" /> : "2"}
                      </div>
                      <span className={`text-[11px] font-bold ${
                        ["preparing", "ready", "delivered"].includes(activeOrder.status) ? "text-slate-800" : "text-slate-400"
                      }`}>Na Brasa / Preparando</span>
                    </div>

                    {/* Step 3: Ready */}
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        ["ready", "delivered"].includes(activeOrder.status)
                          ? "bg-orange-600 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}>
                        {activeOrder.status === "delivered" ? <Check className="w-3 h-3" /> : "3"}
                      </div>
                      <span className={`text-[11px] font-bold ${
                        ["ready", "delivered"].includes(activeOrder.status) ? "text-slate-800" : "text-slate-400"
                      }`}>Pronto para Entrega/Retirada!</span>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        activeOrder.status === "delivered" ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-400"
                      }`}>
                        4
                      </div>
                      <span className={`text-[11px] font-bold ${
                        activeOrder.status === "delivered" ? "text-slate-800 font-extrabold" : "text-slate-400"
                      }`}>Entregue / Saboreado!</span>
                    </div>
                  </div>

                  {/* Summary of items */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-1 shadow-xs text-[10px] max-h-36 overflow-y-auto">
                    <p className="font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Resumo do Pedido:</p>
                    {activeOrder.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between font-semibold">
                        <span>{i.name} x {i.quantity}</span>
                        <span className="font-bold text-slate-700">R$ {(i.price * i.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 pt-1.5 mt-2 flex justify-between font-black text-slate-800 text-[11px]">
                      <span>Total do Pedido:</span>
                      <span className="text-orange-700">R$ {activeOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      playSynth.playClick();
                      setActiveOrder(null);
                      setCart([]);
                      setMobileView("menu");
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    id="new_mobile_order_btn"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Voltar ao Cardápio</span>
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 5: PUSH NOTIFICATION TRAY & PREFERENCES */}
            {mobileView === "notifs" && (
              <div className="p-4 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Notificações Push</h3>
                  <button
                    onClick={() => {
                      playSynth.playClick();
                      setShowPreferenceModal(!showPreferenceModal);
                    }}
                    className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-orange-600 flex items-center gap-1 text-[10px] font-bold transition-all"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Preferências</span>
                  </button>
                </div>

                {/* Preference Quick manager panel */}
                {showPreferenceModal && (
                  <div className="bg-white border border-orange-200 rounded-xl p-3 shadow-sm space-y-2.5 animate-slide-in">
                    <p className="text-[10px] font-black text-orange-800 uppercase tracking-wider">Preferências de Push</p>
                    <div className="space-y-2 text-[11px] font-semibold text-slate-700">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Avisos de Pedidos</span>
                        <input
                          type="checkbox"
                          checked={notificationPreferences.orderUpdates}
                          onChange={() => handleTogglePreference("orderUpdates")}
                          className="accent-orange-600 h-3.5 w-3.5 rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Ofertas e Descontos</span>
                        <input
                          type="checkbox"
                          checked={notificationPreferences.specialOffers}
                          onChange={() => handleTogglePreference("specialOffers")}
                          className="accent-orange-600 h-3.5 w-3.5"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Novidades e Lançamentos</span>
                        <input
                          type="checkbox"
                          checked={notificationPreferences.newProducts}
                          onChange={() => handleTogglePreference("newProducts")}
                          className="accent-orange-600 h-3.5 w-3.5"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Notifications List */}
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 space-y-1">
                      <Bell className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold">Nenhuma notificação recebida.</p>
                      <p className="text-[10px]">Realize um cadastro ou altere o status de um pedido no caixa para simular!</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border flex gap-2.5 transition-all bg-white hover:border-slate-300 ${
                          !n.read ? "border-l-4 border-l-orange-500 border-slate-200" : "border-slate-200"
                        }`}
                      >
                        <div className="w-7 h-7 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {n.type === "order_status" ? "🍗" : n.type === "offer" ? "🎁" : "✨"}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-extrabold text-slate-800 leading-tight">{n.title}</h4>
                            <span className="text-[8px] text-slate-400 shrink-0 font-bold">
                              {new Date(n.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-[10px] font-medium text-slate-600 leading-normal">{n.body}</p>
                          {n.orderId && (
                            <button
                              onClick={async () => {
                                playSynth.playClick();
                                try {
                                  const res = await fetch("/api/orders");
                                  if (res.ok) {
                                    const ordersList: Order[] = await res.json();
                                    const matched = ordersList.find(o => o.id === n.orderId);
                                    if (matched) {
                                      setActiveOrder(matched);
                                      setMobileView("status");
                                    } else {
                                      alert("Pedido não encontrado ou arquivado.");
                                    }
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="text-[9px] text-orange-600 font-extrabold underline block pt-1 hover:text-orange-700"
                            >
                              Acompanhar Pedido #{n.orderId.slice(-4)}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VIEW 6: CUSTOMER ACCOUNT PROFILE & PAST HISTORY */}
            {mobileView === "profile" && (
              <div className="p-4 space-y-4 animate-fade-in">
                {!loggedCustomer ? (
                  /* Login / Signup Flow */
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center mx-auto">
                        <User className="w-5 h-5" />
                      </div>
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Acesse sua Conta</h3>
                      <p className="text-xs text-slate-500 font-semibold leading-normal">Salve seus dados, visualize seus pedidos passados e peça novamente com 1 clique!</p>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                      {loginError && (
                        <div className="bg-rose-50 text-rose-800 p-2.5 rounded-lg border-l-4 border-rose-500 text-[10px] font-bold">
                          {loginError}
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Telefone Celular</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: 11987654321"
                          value={inputPhone}
                          onChange={(e) => setInputPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                        />
                      </div>

                      {isSigningUp && (
                        <>
                          <div className="animate-slide-in">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Seu Nome Completo</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: João Silva"
                              value={inputName}
                              onChange={(e) => setInputName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                            />
                          </div>

                          <div className="animate-slide-in">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Seu E-mail (opcional)</label>
                            <input
                              type="email"
                              placeholder="Ex: joao@email.com"
                              value={inputEmail}
                              onChange={(e) => setInputEmail(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                            />
                          </div>

                          <div className="animate-slide-in">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Endereço para Entrega (opcional)</label>
                            <input
                              type="text"
                              placeholder="Ex: Rua das Flores, 123"
                              value={inputAddress}
                              onChange={(e) => setInputAddress(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                            />
                          </div>
                        </>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-orange-700 transition-all text-center flex items-center justify-center"
                      >
                        {isSigningUp ? "Criar Minha Conta" : "Entrar com meu Telefone"}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Profile Details & Past Orders list */
                  <div className="space-y-4">
                    {/* Logged Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 relative">
                      <button 
                        onClick={handleLogout}
                        className="absolute top-4 right-4 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
                        title="Desconectar"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-lg uppercase select-none">
                          {loggedCustomer.name[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">{loggedCustomer.name}</h4>
                          <p className="text-[9px] text-slate-400 font-extrabold flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" /> {loggedCustomer.phone}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-2.5 text-[10px] space-y-1.5 font-semibold text-slate-600">
                        {loggedCustomer.email && (
                          <p className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> {loggedCustomer.email}
                          </p>
                        )}
                        <p className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span>{loggedCustomer.address || "Nenhum endereço de entrega cadastrado."}</span>
                        </p>
                      </div>
                    </div>

                    {/* Past Order History list */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" /> Seus Pedidos Anteriores
                      </h4>

                      {pastOrders.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-[11px] font-semibold">
                          Nenhum pedido anterior encontrado para esta conta.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                          {pastOrders.map(o => (
                            <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-xs">
                              <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-400">Pedido #{o.id.slice(-4)}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  o.status === "delivered" 
                                    ? "bg-slate-100 text-slate-600" 
                                    : o.status === "cancelled" 
                                    ? "bg-rose-50 text-rose-600" 
                                    : "bg-orange-50 text-orange-600 animate-pulse"
                                }`}>
                                  {o.status === "delivered" ? "Entregue" : o.status === "cancelled" ? "Cancelado" : "Ativo"}
                                </span>
                              </div>

                              <p className="text-[10px] font-semibold text-slate-600 truncate">
                                {o.items.map(it => `${it.name} (${it.quantity})`).join(", ")}
                              </p>

                              <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-1">
                                <span className="text-xs font-black text-slate-800">R$ {o.total.toFixed(2)}</span>
                                <button
                                  onClick={() => handleReorder(o)}
                                  className="text-[9px] bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-2.5 py-1 rounded shadow-xs transition-colors flex items-center gap-1"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Pedir Novamente</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Bottom simulated navigation bar inside screen */}
          <footer className="bg-white border-t border-slate-100 py-2.5 px-3 grid grid-cols-5 gap-1 text-center text-[8px] text-slate-400 font-bold sticky bottom-0 z-10 select-none">
            {/* Tab: Cardapio */}
            <button 
              onClick={() => {
                playSynth.playClick();
                setMobileView("menu");
              }}
              className={`flex flex-col items-center gap-0.5 ${mobileView === "menu" ? "text-orange-600 font-extrabold" : "hover:text-slate-600"}`}
            >
              <Compass className="w-4 h-4" />
              <span>Cardápio</span>
            </button>

            {/* Tab: Carrinho */}
            <button 
              onClick={() => {
                playSynth.playClick();
                setMobileView("cart");
              }}
              className={`flex flex-col items-center gap-0.5 relative ${mobileView === "cart" ? "text-orange-600 font-extrabold" : "hover:text-slate-600"}`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Carrinho</span>
              {cart.length > 0 && (
                <span className="absolute top-0 right-3 bg-orange-600 text-white rounded-full w-2.5 h-2.5 flex items-center justify-center text-[7px]" />
              )}
            </button>

            {/* Tab: Notificacoes */}
            <button 
              onClick={() => {
                playSynth.playClick();
                setMobileView("notifs");
              }}
              className={`flex flex-col items-center gap-0.5 relative ${mobileView === "notifs" ? "text-orange-600 font-extrabold" : "hover:text-slate-600"}`}
            >
              <Bell className="w-4 h-4" />
              <span>Notificações</span>
              {unreadNotifsCount > 0 && (
                <span className="absolute top-0 right-3 bg-rose-500 text-white rounded-full w-2.5 h-2.5 flex items-center justify-center text-[7px]" />
              )}
            </button>

            {/* Tab: Perfil */}
            <button 
              onClick={() => {
                playSynth.playClick();
                setMobileView("profile");
              }}
              className={`flex flex-col items-center gap-0.5 ${mobileView === "profile" ? "text-orange-600 font-extrabold" : "hover:text-slate-600"}`}
            >
              <User className="w-4 h-4" />
              <span>Meu Perfil</span>
            </button>

            {/* Tab: Acompanhar */}
            <button 
              onClick={() => {
                playSynth.playClick();
                if (activeOrder) {
                  setMobileView("status");
                } else {
                  alert("Você não possui um pedido ativo no momento. Realize um pedido para acompanhar!");
                }
              }}
              className={`flex flex-col items-center gap-0.5 ${
                !activeOrder ? "opacity-40 cursor-not-allowed" : mobileView === "status" ? "text-orange-600 font-extrabold" : "hover:text-slate-600"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Rastrear</span>
            </button>
          </footer>

        </div>

        {/* iPhone screen bottom bar home-indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full" />
      </div>
    </div>
  );
}
