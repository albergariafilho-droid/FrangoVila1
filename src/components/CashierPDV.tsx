/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Product, CartItem, Sale } from "../types";
import { 
  Search, ShoppingCart, Percent, User, Trash2, CheckCircle2, Ticket, Printer, X, 
  ArrowDownRight, ArrowUpRight, Lock, Unlock, Database, Keyboard, Zap, QrCode, 
  AlertCircle, PiggyBank, CreditCard, Coins, Clock, Table 
} from "lucide-react";
import { playSynth } from "../utils/audio";

interface CashierPDVProps {
  products: Product[];
  onSaleCompleted: () => void;
  refreshProducts: () => void;
}

export function CashierPDV({ products, onSaleCompleted, refreshProducts }: CashierPDVProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"money" | "card" | "pix">("pix");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // CPF na Nota
  const [cpfInput, setCpfInput] = useState("");

  // Order Mode / Table Assignment states for launching customer/table orders
  const [posMode, setPosMode] = useState<"venda" | "pedido">("venda");
  const [orderTable, setOrderTable] = useState("Mesa 1");
  const [orderCustomerName, setOrderCustomerName] = useState("");

  // Receipt State
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // TopMaster Cashier Shift States
  const [cashierOpen, setCashierOpen] = useState(() => {
    return localStorage.getItem("topmaster_cashier_open") === "true";
  });
  const [operatorName, setOperatorName] = useState(() => {
    return localStorage.getItem("topmaster_operator_name") || "Caixa Principal";
  });
  const [initialFloat, setInitialFloat] = useState(() => {
    return parseFloat(localStorage.getItem("topmaster_initial_float") || "150.00");
  });
  const [openingTime, setOpeningTime] = useState(() => {
    return localStorage.getItem("topmaster_opening_time") || new Date().toISOString();
  });
  const [sangrias, setSangrias] = useState<{ amount: number; reason: string; time: string }[]>(() => {
    const raw = localStorage.getItem("topmaster_sangrias");
    return raw ? JSON.parse(raw) : [];
  });
  const [suprimentos, setSuprimentos] = useState<{ amount: number; reason: string; time: string }[]>(() => {
    const raw = localStorage.getItem("topmaster_suprimentos");
    return raw ? JSON.parse(raw) : [];
  });
  const [sessionSalesCash, setSessionSalesCash] = useState(() => {
    return parseFloat(localStorage.getItem("topmaster_session_sales_cash") || "0");
  });
  const [sessionSalesCard, setSessionSalesCard] = useState(() => {
    return parseFloat(localStorage.getItem("topmaster_session_sales_card") || "0");
  });
  const [sessionSalesPix, setSessionSalesPix] = useState(() => {
    return parseFloat(localStorage.getItem("topmaster_session_sales_pix") || "0");
  });
  const [sessionSalesCount, setSessionSalesCount] = useState(() => {
    return parseInt(localStorage.getItem("topmaster_session_sales_count") || "0");
  });

  // Dialog / Modal Visibility States
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [showSuprimentoModal, setShowSuprimentoModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);

  // Pix countdown states
  const [pixCountdown, setPixCountdown] = useState(4);
  const [pixApproved, setPixApproved] = useState(false);

  // Fields for temporary Sangria / Suprimento inputs
  const [opAmount, setOpAmount] = useState<string>("");
  const [opReason, setOpReason] = useState<string>("");

  // Fields for operator sign-in (Abertura de Caixa)
  const [openOperatorInput, setOpenOperatorInput] = useState("Operador 01");
  const [openFloatInput, setOpenFloatInput] = useState("150.00");

  const categories = ["Todos", "Grelhados", "Fritos", "Salgados", "Acompanhamentos", "Bebidas", "Sobremesas"];

  // Save to localStorage whenever critical session state changes
  useEffect(() => {
    localStorage.setItem("topmaster_cashier_open", String(cashierOpen));
    localStorage.setItem("topmaster_operator_name", operatorName);
    localStorage.setItem("topmaster_initial_float", String(initialFloat));
    localStorage.setItem("topmaster_opening_time", openingTime);
    localStorage.setItem("topmaster_sangrias", JSON.stringify(sangrias));
    localStorage.setItem("topmaster_suprimentos", JSON.stringify(suprimentos));
    localStorage.setItem("topmaster_session_sales_cash", String(sessionSalesCash));
    localStorage.setItem("topmaster_session_sales_card", String(sessionSalesCard));
    localStorage.setItem("topmaster_session_sales_pix", String(sessionSalesPix));
    localStorage.setItem("topmaster_session_sales_count", String(sessionSalesCount));
  }, [cashierOpen, operatorName, initialFloat, openingTime, sangrias, suprimentos, sessionSalesCash, sessionSalesCard, sessionSalesPix, sessionSalesCount]);

  // Keyboard shortcut listeners (TopMaster Fast Keys!)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focus Search Product
      if (e.key === "F2" || e.key === "f2") {
        e.preventDefault();
        playSynth.playClick();
        document.getElementById("pos_search_input")?.focus();
      }

      // F4: Sangria Modal (only if cashier is open)
      if (e.key === "F4" || e.key === "f4") {
        e.preventDefault();
        if (cashierOpen) {
          playSynth.playClick();
          setOpAmount("");
          setOpReason("");
          setShowSangriaModal(true);
        }
      }

      // F5: Suprimento Modal (only if cashier is open)
      if (e.key === "F5" || e.key === "f5") {
        e.preventDefault();
        if (cashierOpen) {
          playSynth.playClick();
          setOpAmount("");
          setOpReason("");
          setShowSuprimentoModal(true);
        }
      }

      // F7: Finalize checkout
      if (e.key === "F7" || e.key === "f7") {
        e.preventDefault();
        if (cashierOpen && cart.length > 0 && !isProcessing) {
          triggerCheckout();
        }
      }

      // F8: Clear entire cart
      if (e.key === "F8" || e.key === "f8") {
        e.preventDefault();
        if (cart.length > 0) {
          playSynth.playClick();
          setCart([]);
          setDiscount(0);
          setErrorMessage("Carrinho esvaziado pelo atalho (F8)!");
        }
      }

      // F9: Toggle Payment Methods
      if (e.key === "F9" || e.key === "f9") {
        e.preventDefault();
        if (cart.length > 0) {
          playSynth.playClick();
          setPaymentMethod(prev => {
            if (prev === "pix") return "card";
            if (prev === "card") return "money";
            return "pix";
          });
        }
      }

      // F12: Close cashier shift modal
      if (e.key === "F12" || e.key === "f12") {
        e.preventDefault();
        if (cashierOpen) {
          playSynth.playClick();
          setShowCloseShiftModal(true);
        }
      }

      // Escape: Close active modals
      if (e.key === "Escape") {
        setShowReceipt(false);
        setShowSangriaModal(false);
        setShowSuprimentoModal(false);
        setShowCloseShiftModal(false);
        setShowPixModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, cashierOpen, paymentMethod, discount, isProcessing, cpfInput]);

  // Simulation of Pix Real-Time Payment Hook
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPixModal && !pixApproved) {
      if (pixCountdown > 0) {
        timer = setTimeout(() => {
          setPixCountdown(prev => prev - 1);
        }, 1000);
      } else {
        // Countdown completed, auto-approve Pix!
        setPixApproved(true);
        playSynth.playNotification(); // beautiful chime
        // Automatically close modal and finalize sale in 1.2 seconds
        timer = setTimeout(() => {
          setShowPixModal(false);
          handleCheckout();
        }, 1200);
      }
    }
    return () => clearTimeout(timer);
  }, [showPixModal, pixCountdown, pixApproved]);

  // Filter products based on search and category safely
  const filteredProducts = (products || []).filter(p => {
    if (!p) return false;
    const name = p.name || "";
    const category = p.category || "";
    const matchesSearch = name.toLowerCase().includes((searchTerm || "").toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    if (!cashierOpen) {
      // Auto-open cashier shift with default values for a frictionless experience
      setOperatorName("Operador de Caixa");
      setInitialFloat(150.00);
      setOpeningTime(new Date().toISOString());
      setSangrias([]);
      setSuprimentos([]);
      setSessionSalesCash(0);
      setSessionSalesCard(0);
      setSessionSalesPix(0);
      setSessionSalesCount(0);
      setCashierOpen(true);
      setErrorMessage("Caixa aberto automaticamente para iniciar sua venda com sucesso!");
      playSynth.playNotification();
    }

    if (product.stock <= 0) {
      setErrorMessage(`O produto ${product.name} está sem estoque!`);
      return;
    }
    
    // Clear error message except if we just auto-opened the cashier
    if (cashierOpen) {
      setErrorMessage(null);
    }
    playSynth.playClick();
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setErrorMessage(`Estoque máximo atingido para ${product.name} (${product.stock} disponíveis)`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    playSynth.playClick();
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) {
            setErrorMessage(`Estoque máximo atingido para ${item.product.name} (${item.product.stock} disponíveis)`);
            return item;
          }
          setErrorMessage(null);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    playSynth.playClick();
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const triggerCheckout = () => {
    if (cart.length === 0) return;
    if (posMode === "pedido") {
      handleCreateOrder();
    } else {
      if (paymentMethod === "pix") {
        setPixCountdown(4);
        setPixApproved(false);
        setShowPixModal(true);
      } else {
        handleCheckout();
      }
    }
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const orderPayload = {
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      customerName: orderCustomerName.trim() || `Cliente ${orderTable}`,
      customerPhone: "",
      paymentMethod,
      table: orderTable
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro ao registrar o pedido de mesa.");
      }

      playSynth.playNotification();

      setErrorMessage(`Pedido lançado com sucesso para ${orderTable}! Enviado para a cozinha.`);
      
      // Clear cart
      setCart([]);
      setDiscount(0);
      setOrderCustomerName("");
      
      refreshProducts();
      onSaleCompleted();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Falha ao enviar o pedido para a cozinha.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const salePayload = {
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity
      })),
      paymentMethod,
      discount,
      cpf: cpfInput || undefined
    };

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salePayload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro ao processar venda no PDV.");
      }

      const result = await response.json();
      
      // Play Kaching Sound!
      playSynth.playKaching();

      // Show thermal receipt
      setLastSale(result.sale);
      setShowReceipt(true);

      // Update session statistics
      if (paymentMethod === "money") {
        setSessionSalesCash(prev => prev + total);
      } else if (paymentMethod === "card") {
        setSessionSalesCard(prev => prev + total);
      } else if (paymentMethod === "pix") {
        setSessionSalesPix(prev => prev + total);
      }
      setSessionSalesCount(prev => prev + 1);

      // Clear PDV Cart
      setCart([]);
      setDiscount(0);
      setPaymentMethod("pix");
      setCpfInput("");
      
      // Update inventory and reports
      refreshProducts();
      onSaleCompleted();

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculations for cashier shift
  const totalSangrias = sangrias.reduce((acc, s) => acc + s.amount, 0);
  const totalSuprimentos = suprimentos.reduce((acc, s) => acc + s.amount, 0);
  const currentCashInDrawer = initialFloat + sessionSalesCash + totalSuprimentos - totalSangrias;
  const totalShiftRevenue = sessionSalesCash + sessionSalesCard + sessionSalesPix;

  // Handle opening the cashier shift
  const handleOpenCashier = (e: React.FormEvent) => {
    e.preventDefault();
    const floatVal = parseFloat(openFloatInput) || 0;
    setOperatorName(openOperatorInput);
    setInitialFloat(floatVal);
    setOpeningTime(new Date().toISOString());
    setSangrias([]);
    setSuprimentos([]);
    setSessionSalesCash(0);
    setSessionSalesCard(0);
    setSessionSalesPix(0);
    setSessionSalesCount(0);
    setCashierOpen(true);
    playSynth.playNotification();
  };

  // Handle Sangria (Cash-out)
  const handleAddSangria = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(opAmount) || 0;
    if (amountVal <= 0) return;
    if (amountVal > currentCashInDrawer) {
      setErrorMessage("Erro: Valor da sangria excede o dinheiro em caixa!");
      return;
    }
    const newS = {
      amount: amountVal,
      reason: opReason || "Retirada de caixa",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };
    setSangrias(prev => [...prev, newS]);
    setShowSangriaModal(false);
    setErrorMessage(null);
    playSynth.playNotification();
  };

  // Handle Suprimento (Cash-in)
  const handleAddSuprimento = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(opAmount) || 0;
    if (amountVal <= 0) return;
    const newS = {
      amount: amountVal,
      reason: opReason || "Troco inicial / Suprimento",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };
    setSuprimentos(prev => [...prev, newS]);
    setShowSuprimentoModal(false);
    setErrorMessage(null);
    playSynth.playNotification();
  };

  // Handle closing cashier shift
  const handleCloseShift = () => {
    setCashierOpen(false);
    setShowCloseShiftModal(false);
    setCart([]);
    setDiscount(0);
    setCpfInput("");
    setErrorMessage("Turno fechado com sucesso!");
    playSynth.playNotification();
  };



  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)]" id="pos_container">
      {/* Dynamic TopMaster Live Balance Bar */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800/80 p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        {!cashierOpen ? (
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs w-full">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 text-rose-400 rounded-lg border border-rose-500/30">
                <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
                <span className="font-bold tracking-wide uppercase">CAIXA FECHADO</span>
              </div>
              <span className="text-slate-300 font-medium">Frente de Caixa inativo. Inicie o turno de trabalho no formulário à direita para liberar o caixa.</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">SISTEMA FRENTE DE CAIXA FRANGUINHO DA VILA</div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                <span className="font-bold tracking-wide uppercase">CAIXA ABERTO</span>
              </div>
              <div className="text-slate-300 font-medium flex items-center gap-1">
                <User className="w-4 h-4 text-orange-400" />
                <span>Operador: <strong className="text-white">{operatorName}</strong></span>
              </div>
              <div className="text-slate-300 font-medium flex items-center gap-1">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Abertura: <strong className="text-white">{new Date(openingTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong></span>
              </div>
              <div className="text-slate-300 font-medium flex items-center gap-1">
                <Coins className="w-4 h-4 text-orange-400" />
                <span>Fundo: <strong className="text-white">R$ {initialFloat.toFixed(2)}</strong></span>
              </div>
              <div className="text-slate-300 font-medium flex items-center gap-1">
                <ShoppingCart className="w-4 h-4 text-orange-400" />
                <span>Vendas: <strong className="text-white">{sessionSalesCount} (R$ {totalShiftRevenue.toFixed(2)})</strong></span>
              </div>
            </div>

            {/* Real-time Drawer balance indicator & Drawer Operations */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700/60 flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-orange-400" />
                <span className="text-[11px] text-slate-400 font-bold uppercase">Saldo em Dinheiro:</span>
                <span className="text-xs font-black text-emerald-400">R$ {currentCashInDrawer.toFixed(2)}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    playSynth.playClick();
                    setOpAmount("");
                    setOpReason("");
                    setShowSangriaModal(true);
                  }}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border border-rose-800/40 rounded-xl text-[10px] font-black flex items-center gap-1 uppercase transition-all"
                  id="bar_sangria_btn"
                >
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sangria (F4)</span>
                </button>
                <button
                  onClick={() => {
                    playSynth.playClick();
                    setOpAmount("");
                    setOpReason("");
                    setShowSuprimentoModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 rounded-xl text-[10px] font-black flex items-center gap-1 uppercase transition-all"
                  id="bar_suprimento_btn"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Suprimento (F5)</span>
                </button>
                <button
                  onClick={() => {
                    playSynth.playClick();
                    setShowCloseShiftModal(true);
                  }}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black flex items-center gap-1 uppercase transition-all shadow-sm"
                  id="bar_close_shift_btn"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Fechar Caixa (F12)</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Product Catalog Column */}
        <div className="lg:col-span-8 flex flex-col h-full bg-slate-50 rounded-2xl border border-slate-200/80 p-5 shadow-sm min-h-0">
          {/* Search & Categories Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar produto pelo nome... [Atalho F2]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                id="pos_search_input"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    playSynth.playClick();
                    setSelectedCategory(cat);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-orange-600 text-white shadow-sm font-bold"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                  id={`cat_btn_${cat.toLowerCase()}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Error Notification Alert */}
          {errorMessage && (
            <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-3.5 rounded-r-xl flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Aviso:</span> {errorMessage}
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 min-h-0" id="pos_product_grid">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-slate-400 py-16">
                <Search className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm">Nenhum produto encontrado nesta categoria.</p>
              </div>
            ) : (
              filteredProducts.map(product => {
                const isLowStock = product.stock <= product.minStock;
                const isOutOfStock = product.stock <= 0;

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`group relative text-left bg-white border rounded-xl p-3.5 flex flex-col justify-between h-40 transition-all shadow-sm duration-200 ${
                      isOutOfStock
                        ? "opacity-50 border-slate-200 bg-slate-100 cursor-not-allowed"
                        : "border-slate-200/80 hover:border-orange-500 hover:shadow-md hover:-translate-y-0.5"
                    }`}
                    id={`prod_card_${product.id}`}
                  >
                    {/* Category Accent Stripe */}
                    <div className="absolute top-0 left-3 right-3 h-[3px] bg-slate-100 rounded-b" />

                    <div className="mt-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        {product.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-orange-700 transition-colors">
                        {product.name}
                      </h3>
                    </div>

                    <div className="mt-3">
                      {/* Stock indicator badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-400">Estoque:</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                          isOutOfStock 
                            ? "bg-rose-100 text-rose-700 font-extrabold"
                            : isLowStock 
                              ? "bg-amber-100 text-amber-700 animate-pulse"
                              : "bg-slate-100 text-slate-600"
                        }`}>
                          {isOutOfStock ? "Esgotado" : `${product.stock} un`}
                        </span>
                      </div>

                      {/* Price and Add label */}
                      <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
                        <span className="text-sm font-bold text-slate-900">
                          R$ {product.price.toFixed(2)}
                        </span>
                        {!isOutOfStock && (
                          <span className="text-[10px] text-orange-600 font-extrabold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                            + Adicionar
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* TopMaster Keyboard Shortcuts Helper Bar */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap gap-2 text-[10px] font-mono text-slate-400 shrink-0">
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
              <kbd className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-300 font-bold">F2</kbd>
              <span>Buscar Produto</span>
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
              <kbd className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-300 font-bold">F4</kbd>
              <span>Sangria</span>
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
              <kbd className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-300 font-bold">F5</kbd>
              <span>Suprimento</span>
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
              <kbd className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-300 font-bold">F7</kbd>
              <span>Finalizar Venda</span>
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
              <kbd className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-300 font-bold">F8</kbd>
              <span>Limpar Carrinho</span>
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
              <kbd className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-300 font-bold">F9</kbd>
              <span>Alternar Pgto.</span>
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
              <kbd className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-300 font-bold">F12</kbd>
              <span>Fechar Caixa</span>
            </div>
          </div>
        </div>

        {/* Cart & Billing Sidebar Column */}
        <div className="lg:col-span-4 flex flex-col h-full bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-h-0 animate-fade-in">
          {!cashierOpen ? (
            <div className="flex flex-col h-full justify-between" id="cashier_sidebar_login">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100/50">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Turno de Trabalho Fechado</h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Para registrar novas vendas no balcão e gerenciar o carrinho de compras, abra o caixa abaixo.
                  </p>
                </div>
                
                <form onSubmit={handleOpenCashier} className="space-y-4 text-left border-t border-slate-100 pt-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Nome do Operador</label>
                    <input
                      type="text"
                      required
                      value={openOperatorInput}
                      onChange={(e) => setOpenOperatorInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all"
                      id="open_operator_input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Fundo de Caixa Inicial (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={openFloatInput}
                      onChange={(e) => setOpenFloatInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all"
                      id="open_float_input"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all uppercase tracking-wider"
                    id="open_cashier_btn"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Iniciar Turno (Abrir Caixa)</span>
                  </button>
                </form>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <span>FRENTE DE CAIXA TOPMASTER v2026</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="text-orange-600 w-5 h-5" />
                  <h2 className="text-md font-bold text-slate-800">Carrinho de Compras</h2>
                </div>
                <span className="text-xs bg-orange-50 text-orange-700 font-bold px-2.5 py-1 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} itens
                </span>
              </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0" id="pos_cart_items">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-3">
                  <ShoppingCart className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium">Frente de Caixa Vazio</p>
                <p className="text-xs text-slate-400 mt-1 text-center max-w-[200px]">
                  Selecione os produtos ao lado para iniciar a venda.
                </p>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors"
                  id={`cart_item_${item.product.id}`}
                >
                  <div className="flex-1 pr-2">
                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {item.product.name}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      R$ {item.product.price.toFixed(2)} / un
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quantity adjustments */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-sm font-bold transition-colors rounded-l-lg"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-sm font-bold transition-colors rounded-r-lg"
                      >
                        +
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals & Discounts Form */}
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-3 shrink-0">
            {/* POS Mode Toggle */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                Destino do Pedido / Tipo de Operação
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playSynth.playClick();
                    setPosMode("venda");
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                    posMode === "venda"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  id="mode_toggle_venda"
                >
                  Venda Direta (Balcão)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSynth.playClick();
                    setPosMode("pedido");
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                    posMode === "pedido"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-orange-600"
                  }`}
                  id="mode_toggle_pedido"
                >
                  Lançar p/ Mesa/Cliente
                </button>
              </div>
            </div>

            {posMode === "pedido" ? (
              <div className="space-y-3 animate-fade-in" id="order_mode_fields">
                {/* Table selector field */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
                    <Table className="w-3.5 h-3.5 text-orange-600" />
                    Mesa / Localização
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Balcão", "Delivery"].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          playSynth.playClick();
                          setOrderTable(t);
                        }}
                        className={`py-1 text-[9px] font-extrabold rounded border transition-all ${
                          orderTable === t
                            ? "bg-orange-50 text-orange-800 border-orange-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {t === "Delivery" ? "Deliv." : t.replace("Mesa ", "M.")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer name field */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-orange-600" />
                    Nome do Cliente / Consumidor
                  </label>
                  <input
                    type="text"
                    value={orderCustomerName}
                    onChange={(e) => setOrderCustomerName(e.target.value)}
                    placeholder="Ex: Carlos Albuquerque"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                    id="pos_order_customer_name"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in" id="venda_mode_fields">
                {/* CPF na Nota Field */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-orange-600" />
                    CPF ou CNPJ do Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    value={cpfInput}
                    onChange={(e) => setCpfInput(e.target.value)}
                    placeholder="Ex: 123.456.789-00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                    id="pos_cpf_input"
                  />
                </div>

                {/* Discount Field */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-orange-600" />
                    Desconto Especial (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      max={subtotal}
                      value={discount || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setDiscount(Math.min(subtotal, val));
                      }}
                      disabled={cart.length === 0}
                      placeholder="0,00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-1.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                      id="pos_discount_input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">
                Meio de Pagamento / Preferencial [Atalho F9]
              </label>
              <div className="grid grid-cols-3 gap-2" id="payment_selector">
                {(["pix", "card", "money"] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      playSynth.playClick();
                      setPaymentMethod(method);
                    }}
                    disabled={cart.length === 0}
                    className={`py-2 px-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      cart.length === 0
                        ? "opacity-50 cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                        : paymentMethod === method
                          ? "border-orange-600 bg-orange-50 text-orange-800 font-black shadow-sm"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold"
                    }`}
                    id={`pay_btn_${method}`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                      {method === "money" ? "Dinheiro" : method === "card" ? "Cartão" : "Pix"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sum details */}
            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-800">R$ {subtotal.toFixed(2)}</span>
              </div>
              {posMode === "venda" && discount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Desconto aplicado:</span>
                  <span>- R$ {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200/80 pt-2 mt-1">
                <span>{posMode === "pedido" ? "Total do Pedido:" : "Total a Pagar:"}</span>
                <span className="text-orange-700 font-black">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Finalize button */}
            <button
              onClick={triggerCheckout}
              disabled={cart.length === 0 || isProcessing}
              className={`w-full py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all uppercase tracking-wider ${
                cart.length === 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none hover:shadow-none"
                  : posMode === "pedido"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 shadow-emerald-600/15"
                    : "bg-orange-600 text-white hover:bg-orange-700 hover:-translate-y-0.5 active:translate-y-0"
              }`}
              id="finalize_sale_btn"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{posMode === "pedido" ? `Enviar p/ ${orderTable} (F7)` : "Finalizar Venda (F7)"}</span>
                </>
              )}
            </button>
          </div>
            </>
          )}
        </div>
      </div>

      {/* Sangria Dialog Modal */}
      {showSangriaModal && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" id="sangria_modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <ArrowDownRight className="w-5 h-5" />
                <span>Sangria (Retirada de Caixa)</span>
              </div>
              <button onClick={() => setShowSangriaModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSangria} className="space-y-4">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-[11px] text-rose-800">
                Disponível em espécie no caixa: <strong className="font-extrabold text-xs">R$ {currentCashInDrawer.toFixed(2)}</strong>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Valor da Retirada (R$)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={currentCashInDrawer}
                  required
                  value={opAmount}
                  onChange={(e) => setOpAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Motivo / Destinação</label>
                <input
                  type="text"
                  required
                  value={opReason}
                  onChange={(e) => setOpReason(e.target.value)}
                  placeholder="Ex: Depósito no cofre / Pagamento fornecedor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 shadow-md transition-all uppercase"
              >
                Confirmar Sangria (F4)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Suprimento Dialog Modal */}
      {showSuprimentoModal && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" id="suprimento_modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <ArrowUpRight className="w-5 h-5" />
                <span>Suprimento (Reforço de Caixa)</span>
              </div>
              <button onClick={() => setShowSuprimentoModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSuprimento} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Valor do Reforço (R$)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={opAmount}
                  onChange={(e) => setOpAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Motivo / Origem</label>
                <input
                  type="text"
                  required
                  value={opReason}
                  onChange={(e) => setOpReason(e.target.value)}
                  placeholder="Ex: Reforço de moedas para troco"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-md transition-all uppercase"
              >
                Confirmar Suprimento (F5)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Close Cashier / Shift Summary Dialog Modal */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" id="close_shift_modal">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm uppercase">
                <Lock className="w-5 h-5 text-orange-600" />
                <span>Fechamento de Turno do Caixa</span>
              </div>
              <button onClick={() => setShowCloseShiftModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-slate-700 text-xs leading-relaxed">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Operador:</span>
                  <span className="font-bold text-slate-800">{operatorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hora de Abertura:</span>
                  <span className="font-semibold">{new Date(openingTime).toLocaleTimeString("pt-BR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hora de Fechamento:</span>
                  <span className="font-semibold">{new Date().toLocaleTimeString("pt-BR")}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wide text-orange-600">Movimentação em Dinheiro (Espécie)</h4>
                <div className="space-y-1.5 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                  <div className="flex justify-between">
                    <span>Fundo de Caixa Inicial:</span>
                    <span className="font-bold">R$ {initialFloat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendas em Dinheiro:</span>
                    <span className="font-bold text-emerald-600">+ R$ {sessionSalesCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Suprimentos adicionados:</span>
                    <span className="font-bold text-emerald-600">+ R$ {totalSuprimentos.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sangrias realizadas:</span>
                    <span className="font-bold text-rose-600">- R$ {totalSangrias.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 mt-1">
                    <span>Saldo Esperado na Gaveta:</span>
                    <span className="text-emerald-700">R$ {currentCashInDrawer.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wide text-orange-600">Outros Meios de Pagamento</h4>
                <div className="space-y-1.5 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                  <div className="flex justify-between">
                    <span>Cartão de Crédito/Débito:</span>
                    <span className="font-bold">R$ {sessionSalesCard.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pix Recebidos:</span>
                    <span className="font-bold">R$ {sessionSalesPix.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 mt-1">
                    <span>Faturamento Total do Turno:</span>
                    <span className="text-orange-700">R$ {totalShiftRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Sangrias logs if any */}
              {sangrias.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-1.5 uppercase text-[10px] tracking-wide">Registro de Sangrias ({sangrias.length})</h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {sangrias.map((s, idx) => (
                      <div key={idx} className="flex justify-between bg-rose-50 text-rose-800 p-2 rounded-lg text-[10px]">
                        <span>{s.time} - {s.reason}</span>
                        <span className="font-bold">- R$ {s.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={() => setShowCloseShiftModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl uppercase transition-colors"
              >
                Voltar ao Caixa
              </button>
              <button
                onClick={handleCloseShift}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md uppercase transition-all"
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Integrated Pix Terminal Modal */}
      {showPixModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" id="pix_modal">
          <div className="bg-slate-900 text-white rounded-3xl max-w-sm w-full shadow-2xl p-6 border border-slate-800 text-center relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  playSynth.playClick();
                  setShowPixModal(false);
                }}
                className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-md font-extrabold uppercase tracking-wider text-orange-400">TopMaster Pix Fast 2026</h3>
            <p className="text-slate-400 text-[11px] mt-1 mb-5">Integração Bancária Instantânea Ativa</p>

            {/* Dynamic Visual Mock QR Code */}
            <div className="bg-white p-4 rounded-2xl w-44 h-44 mx-auto flex items-center justify-center shadow-lg relative overflow-hidden mb-5">
              {pixApproved ? (
                <div className="absolute inset-0 bg-emerald-500 flex flex-col items-center justify-center text-white p-4 animate-scale-up">
                  <CheckCircle2 className="w-12 h-12 mb-2 animate-bounce" />
                  <span className="text-xs font-black uppercase tracking-wider">PAGAMENTO APROVADO!</span>
                </div>
              ) : (
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Decorative QR Pattern */}
                  <rect x="5" y="5" width="25" height="25" stroke="currentColor" strokeWidth="6" />
                  <rect x="12" y="12" width="11" height="11" fill="currentColor" />
                  <rect x="70" y="5" width="25" height="25" stroke="currentColor" strokeWidth="6" />
                  <rect x="77" y="12" width="11" height="11" fill="currentColor" />
                  <rect x="5" y="70" width="25" height="25" stroke="currentColor" strokeWidth="6" />
                  <rect x="12" y="77" width="11" height="11" fill="currentColor" />
                  <path d="M40 10 H50 V20 H40 Z M55 10 H60 V15 H55 Z M45 30 H60 V35 H45 Z M40 45 H45 V55 H40 Z M50 50 H60 V65 H50 Z M70 45 H85 V50 H70 Z M80 60 H90 V70 H80 Z" fill="currentColor" />
                  <path d="M40 70 H55 V75 H40 Z M60 80 H70 V90 H60 Z M75 80 H85 V85 H75 Z M45 85 H55 V95 H45 Z M85 90 H95 V95 H85 Z" fill="currentColor" />
                  {/* Glowing central orange target */}
                  <rect x="42" y="42" width="16" height="16" rx="3" fill="#ea580c" />
                  <rect x="47" y="47" width="6" height="6" fill="white" className="animate-pulse" />
                </svg>
              )}
            </div>

            <div className="space-y-1 mb-5">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-widest">Valor do Pix</span>
              <span className="text-lg font-black text-white">R$ {total.toFixed(2)}</span>
            </div>

            {/* Waiting Chime countdown */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-3.5 mb-5 text-[11px] leading-relaxed">
              {pixApproved ? (
                <p className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  Emissão de Cupom Fiscal ativa...
                </p>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-slate-300 font-medium animate-pulse">Aguardando transferência bancária do cliente...</p>
                  <p className="text-[10px] text-slate-500 mt-1">Status webhook simulado: <span className="font-bold text-orange-400">Verificando banco em {pixCountdown}s</span></p>
                </div>
              )}
            </div>

            {/* Manual actions */}
            {!pixApproved && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    playSynth.playClick();
                    setPixApproved(true);
                    playSynth.playNotification();
                    setTimeout(() => {
                      setShowPixModal(false);
                      handleCheckout();
                    }, 1200);
                  }}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase"
                >
                  Confirmar Recebimento Manual
                </button>
                <span className="text-[9px] text-slate-500 font-mono">Chave Pix de Cópia: franguinhodavila@pix.com.br</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Beautiful High-Fidelity Printed Thermal Receipt Overlay */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" id="receipt_modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold tracking-wider uppercase">Pedido do Franguinho da Vila 🍗</span>
              </div>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal Receipt Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              <div className="bg-white text-slate-800 p-5 shadow-inner w-[320px] font-mono text-[11px] leading-relaxed border-t-8 border-slate-300 relative">
                {/* Simulated thermal cut top */}
                <div className="absolute top-0 left-0 right-0 h-1.5 flex justify-between overflow-hidden">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="w-3 h-3 bg-slate-100 rotate-45 transform origin-top-left -translate-y-1.5" />
                  ))}
                </div>

                {/* Company details */}
                <div className="text-center mb-4 mt-2">
                  <h3 className="font-extrabold text-[13px] uppercase tracking-wider">FRANGUINHO DA VILA 🍗</h3>
                  <p className="text-[10px] text-slate-500">Rua da Vila, 450 - Assados na Brasa</p>
                  <p className="text-[10px] text-slate-500">O Sabor Que Conquista a Família</p>
                  <p className="border-b border-dashed border-slate-300 py-1.5"></p>
                </div>

                {/* Meta details */}
                <div className="space-y-0.5 mb-3">
                  <p><strong>CUPOM:</strong> {lastSale.id.toUpperCase()}</p>
                  <p><strong>DATA:</strong> {new Date(lastSale.createdAt).toLocaleString("pt-BR")}</p>
                  <p><strong>OPERADOR:</strong> {operatorName}</p>
                  <p><strong>TIPO:</strong> {lastSale.type === "pdv" ? "FRENTE DE CAIXA" : "PEDIDO ONLINE"}</p>
                  {lastSale.cpf && <p><strong>CPF/CNPJ CLIENTE:</strong> {lastSale.cpf}</p>}
                  <p className="border-b border-dashed border-slate-300 py-1.5"></p>
                </div>

                {/* Items headers */}
                <div className="grid grid-cols-12 font-bold mb-1 pb-1 border-b border-dotted border-slate-300">
                  <span className="col-span-6">ITEM</span>
                  <span className="col-span-2 text-center">QTD</span>
                  <span className="col-span-4 text-right">VALOR</span>
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {lastSale.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12">
                      <span className="col-span-6 truncate">{item.name}</span>
                      <span className="col-span-2 text-center">{item.quantity}</span>
                      <span className="col-span-4 text-right">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <p className="border-b border-dashed border-slate-300 py-2"></p>

                {/* Totals */}
                <div className="space-y-0.5 mt-2 text-right">
                  <p>Subtotal: R$ {(lastSale.total + lastSale.discount).toFixed(2)}</p>
                  {lastSale.discount > 0 && <p className="text-rose-600">Desconto: - R$ {lastSale.discount.toFixed(2)}</p>}
                  <p className="font-extrabold text-[12px] pt-1">
                    TOTAL PAGO: R$ {lastSale.total.toFixed(2)}
                  </p>
                </div>

                <p className="border-b border-dashed border-slate-300 py-1.5"></p>

                {/* Payment info */}
                <div className="text-center mt-3 bg-slate-50 p-2 rounded border border-slate-200">
                  <p className="uppercase font-bold">PAGO EM: {
                    lastSale.paymentMethod === "money" ? "Dinheiro" : lastSale.paymentMethod === "card" ? "Cartão" : "Pix"
                  }</p>
                  <p className="text-[9px] text-slate-500 mt-1">Transação confirmada via terminal PDV</p>
                </div>

                {/* Footer memo */}
                <div className="text-center mt-4 text-[9px] text-slate-400 border-t border-dotted border-slate-300 pt-3">
                  <p>Obrigado pela preferência!</p>
                  <p>Apoie o comércio local da nossa Vila ♥</p>
                </div>
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex gap-3">
              <button
                onClick={() => {
                  playSynth.playClick();
                  window.print();
                }}
                className="flex-1 bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Via (Ctrl+P)</span>
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-orange-700 transition-all shadow-sm text-center"
              >
                Nova Venda (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
