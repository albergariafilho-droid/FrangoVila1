/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Product, Order, Sale } from "./types";
import { CashierPDV } from "./components/CashierPDV";
import { InventoryManager } from "./components/InventoryManager";
import { FinancialDashboard } from "./components/FinancialDashboard";
import { CustomerMobileApp } from "./components/CustomerMobileApp";
import { RealTimeOrdersList } from "./components/RealTimeOrdersList";
import { playSynth } from "./utils/audio";
import { 
  Monitor, 
  Package, 
  ClipboardList, 
  BarChart3, 
  Smartphone, 
  RefreshCw, 
  Database,
  Volume2,
  VolumeX,
  Sparkles,
  Download,
  X
} from "lucide-react";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeTab, setActiveTab] = useState<"pdv" | "estoque" | "pedidos" | "relatorios" | "app">("pdv");
  
  // System control states
  const [isMuted, setIsMuted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [showInstallModal, setShowInstallModal] = useState(false);

  const ordersCountRef = useRef(0);
  const initialLoadRef = useRef(true);

  // Fetch full data state from Express API
  const fetchData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      // Parallel resilient fetchesfetchesfetchesfetches
      const fetchProducts = async () => {
        try {
          const res = await fetch("/api/products");
          if (res.ok) {
            const data = await res.json();
            setProducts(data);
          } else {
            console.error("Failed to fetch products:", res.statusText);
          }
        } catch (e) {
          console.error("Error fetching products:", e);
        }
      };

      const fetchSales = async () => {
        try {
          const res = await fetch("/api/sales");
          if (res.ok) {
            const data = await res.json();
            setSales(data);
          } else {
            console.error("Failed to fetch sales:", res.statusText);
          }
        } catch (e) {
          console.error("Error fetching sales:", e);
        }
      };

      const fetchOrders = async () => {
        try {
          const res = await fetch("/api/orders");
          if (res.ok) {
            const ordersData: Order[] = await res.json();
            
            // Detect new incoming orders for play synth notification
            if (!initialLoadRef.current && ordersData.length > ordersCountRef.current) {
              if (!isMuted) {
                playSynth.playNotification();
              }
              const newestOrder = ordersData[0];
              if (newestOrder) {
                setNotificationMsg(`Novo pedido recebido de ${newestOrder.customerName} - ${newestOrder.table || "Mesa"}`);
                setShowNotification(true);
                setTimeout(() => setShowNotification(false), 5000);
              }
            }

            ordersCountRef.current = ordersData.length;
            setOrders(ordersData);
            initialLoadRef.current = false;
          } else {
            console.error("Failed to fetch orders:", res.statusText);
          }
        } catch (e) {
          console.error("Error fetching orders:", e);
        }
      };

      await Promise.all([fetchProducts(), fetchSales(), fetchOrders()]);
    } catch (err) {
      console.error("Error synchronizing PDV data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Run initial fetch on mount
  useEffect(() => {
    fetchData();

    // Setup active polling every 2 seconds for ultra-responsive real-time updates
    const interval = setInterval(() => {
      fetchData(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [isMuted]);

  const handleResetDatabase = async () => {
    if (confirm("Deseja realmente redefinir o banco de dados para os valores de demonstração originais? Isso limpará todas as vendas criadas.")) {
      try {
        const res = await fetch("/api/reset", { method: "POST" });
        if (res.ok) {
          playSynth.playNotification();
          fetchData();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const activePendingOrdersCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-950">
      
      {/* Top Professional Admin Bar */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 shadow-md">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
            <span className="text-xl">🍗</span>
          </div>
          <div>
            <h1 className="text-md font-black tracking-tight uppercase flex items-center gap-1.5">
              Franguinho da Vila <span className="text-[10px] bg-orange-600 text-orange-100 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-normal font-black">restaurante da vila</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Balcão & Delivery, Estoque da Cozinha e Pedidos do Celular</p>
          </div>
        </div>

        {/* Global Toolbar Options */}
        <div className="flex items-center gap-3">
          {/* Mute toggle button */}
          <button
            onClick={() => {
              playSynth.playClick();
              setIsMuted(!isMuted);
            }}
            className={`p-2 rounded-xl border transition-all ${
              isMuted 
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20" 
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title={isMuted ? "Ativar som de alertas" : "Mutar som de alertas"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Sync Trigger */}
          <button
            onClick={() => {
              playSynth.playClick();
              fetchData();
            }}
            disabled={isRefreshing}
            className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-orange-400" : ""}`} />
            <span>{isRefreshing ? "Sincronizando..." : "Sincronizar"}</span>
          </button>

          {/* Database Reset */}
          <button
            onClick={handleResetDatabase}
            className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Redefinir Dados de Demo"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Resetar Demo</span>
          </button>

          {/* APK / PWA Mobile Install Guide */}
          <button
            onClick={() => {
              playSynth.playClick();
              setShowInstallModal(true);
            }}
            className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md animate-pulse shrink-0"
            title="Instalar App no Celular (Android APK / PWA)"
            id="install_app_header_btn"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Instalar no Celular (APK)</span>
          </button>
        </div>
      </header>

      {/* Navigation Tab Rail */}
      <nav className="bg-white border-b border-gray-200 px-6 py-2 shadow-xs sticky top-0 z-30 flex gap-2 overflow-x-auto scrollbar-none">
        {/* Tab: POS */}
        <button
          onClick={() => {
            playSynth.playClick();
            setActiveTab("pdv");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "pdv"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
          id="tab_pdv"
        >
          <Monitor className="w-4 h-4" />
          <span>Balcão / Caixa</span>
        </button>

        {/* Tab: Realtime Customer Orders Panel */}
        <button
          onClick={() => {
            playSynth.playClick();
            setActiveTab("pedidos");
          }}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "pedidos"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
          id="tab_pedidos"
        >
          <ClipboardList className="w-4 h-4" />
          <span>Cozinha & Pedidos</span>
          {activePendingOrdersCount > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-rose-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
              {activePendingOrdersCount}
            </span>
          )}
        </button>

        {/* Tab: Inventory manager */}
        <button
          onClick={() => {
            playSynth.playClick();
            setActiveTab("estoque");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "estoque"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
          id="tab_estoque"
        >
          <Package className="w-4 h-4" />
          <span>Ingredientes / Estoque</span>
        </button>

        {/* Tab: Reports & Balance */}
        <button
          onClick={() => {
            playSynth.playClick();
            setActiveTab("relatorios");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "relatorios"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
          id="tab_relatorios"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Balanço / Relatórios</span>
        </button>

        {/* Tab: Customer Phone Simulation */}
        <button
          onClick={() => {
            playSynth.playClick();
            setActiveTab("app");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ml-auto ${
            activeTab === "app"
              ? "bg-orange-600 text-white border-orange-700 shadow-sm"
              : "bg-orange-50/50 text-orange-700 border-orange-100 hover:bg-orange-50"
          }`}
          id="tab_app_simulation"
        >
          <Smartphone className="w-4 h-4 animate-bounce text-orange-200" />
          <span>Aplicativo do Cliente</span>
        </button>
      </nav>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto" id="main_pane">
        
        {/* Floating toast notification for real-time order detections */}
        {showNotification && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border-l-4 border-orange-500 py-3.5 px-5 rounded-r-xl shadow-2xl animate-slide-in flex items-center gap-3 max-w-sm">
            <div className="w-7 h-7 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center animate-pulse">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-orange-400 font-extrabold uppercase tracking-wider">Aviso de Pedido</p>
              <p className="text-xs font-bold leading-normal">{notificationMsg}</p>
            </div>
          </div>
        )}

        {/* Dynamic renders */}
        {activeTab === "pdv" && (
          <CashierPDV 
            products={products} 
            onSaleCompleted={fetchData} 
            refreshProducts={fetchData} 
          />
        )}

        {activeTab === "pedidos" && (
          <RealTimeOrdersList 
            orders={orders} 
            onOrderStatusChanged={fetchData} 
          />
        )}

        {activeTab === "estoque" && (
          <InventoryManager 
            products={products} 
            refreshProducts={fetchData} 
          />
        )}

        {activeTab === "relatorios" && (
          <FinancialDashboard 
            sales={sales} 
          />
        )}

        {activeTab === "app" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Explanatory Banner Left */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-[10px] bg-orange-100 text-orange-700 font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-orange-200">Integração em Duas Telas</span>
              <h2 className="text-2xl font-black text-slate-800 leading-tight">Simulação de Pedido Mobile Integrada ao Caixa</h2>
              <p className="text-slate-600 text-xs leading-relaxed">
                Este simulador de smartphone funciona como o aplicativo do **Franguinho da Vila** instalado no celular do cliente final. Com ele, os clientes podem:
              </p>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <div className="w-4.5 h-4.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center font-bold text-[9px] mt-0.5">1</div>
                  <span><strong>Cadastrar Conta & Login:</strong> Salvar nome, telefone, e-mail e endereço para facilitar e agilizar compras futuras.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-4.5 h-4.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center font-bold text-[9px] mt-0.5">2</div>
                  <span><strong>Notificações em Tempo Real:</strong> Receber alertas instantâneos de status (Preparando, Pronto, Entregue) e promoções, com controle de preferências de notificação!</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-4.5 h-4.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center font-bold text-[9px] mt-0.5">3</div>
                  <span><strong>Reordenar Histórico:</strong> Visualizar histórico de pedidos passados e realizar novos pedidos de forma instantânea com apenas 1 clique.</span>
                </li>
              </ul>
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 text-[11px] text-orange-900 leading-relaxed font-medium">
                <strong>💡 Dica de Negócio:</strong> O estoque correspondente é descontado no servidor Express em tempo real e o painel **Pedidos Recebidos** apita instantaneamente na tela de administração assim que o pedido é efetuado!
              </div>
            </div>

            {/* Simulated Device Frame Right */}
            <div className="lg:col-span-5 flex justify-center">
              <CustomerMobileApp 
                products={products} 
                refreshProducts={fetchData} 
                onOrderPlaced={fetchData} 
              />
            </div>
          </div>
        )}
      </main>

      {/* Modern Compact Footer */}
      <footer className="bg-white border-t border-slate-200/80 px-6 py-4 text-center text-[11px] text-slate-500 font-semibold mt-auto flex flex-col md:flex-row items-center justify-between gap-2 select-none">
        <p>© 2026 Franguinho da Vila • Sistema de Gestão e Frente de Caixa Integrado.</p>
        <div className="flex gap-4">
          <span>Porta de Serviço: 3000</span>
          <span>Sincronização Ativa (Intervalo: 2s)</span>
        </div>
      </footer>

      {/* APK / PWA Mobile Install Guide Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in" id="install_modal_overlay">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden animate-scale-up" id="install_modal_container">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">Instalar no Celular (Android APK / PWA)</h3>
                  <p className="text-[10px] text-emerald-400 font-bold">Rode em Tela Cheia, offline, com Ícone de Lançador Nativo!</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  playSynth.playClick();
                  setShowInstallModal(false);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                id="close_install_modal_btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs">
              
              {/* Option 1: PWA (Instant APK Experience) */}
              <div className="border border-emerald-100 bg-emerald-50/40 rounded-2xl p-5 space-y-3.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Recomendado / Pronto!
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-black">1</div>
                  <h4 className="text-slate-900 font-extrabold text-xs uppercase tracking-wide">Método PWA (Sem compilar, em 1 minuto)</h4>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Nosso sistema já está totalmente configurado como um <strong>Progressive Web App (PWA)</strong>. Ele funciona exatamente como um APK instalado, sem ocupar memória desnecessária e com sincronização instantânea!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1.5">
                  <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-1.5">
                    <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>🤖</span> No Android (Google Chrome):
                    </p>
                    <ol className="list-decimal pl-4 text-[11px] text-slate-600 space-y-1 font-medium">
                      <li>Abra o link compartilhado/produção no Chrome do celular.</li>
                      <li>Toque no aviso flutuante <strong>"Adicionar à tela inicial"</strong> que aparece na tela.</li>
                      <li>Ou clique nos <strong className="text-slate-800">3 pontinhos</strong> do canto superior e selecione <strong className="text-emerald-700">"Instalar aplicativo"</strong>.</li>
                    </ol>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-1.5">
                    <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>🍏</span> No iOS (Safari - iPhone):
                    </p>
                    <ol className="list-decimal pl-4 text-[11px] text-slate-600 space-y-1 font-medium">
                      <li>Abra o link compartilhado no navegador Safari.</li>
                      <li>Toque no botão <strong className="text-slate-800">Compartilhar</strong> (ícone de quadrado com seta para cima).</li>
                      <li>Role a lista de opções e toque em <strong className="text-orange-700">"Adicionar à Tela de Início"</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Option 2: Build Native APK (Android Studio / Capacitor) */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-3.5 bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-200 text-slate-800 rounded-full flex items-center justify-center font-black">2</div>
                  <h4 className="text-slate-900 font-extrabold text-xs uppercase tracking-wide">Compilar Arquivo .APK Nativo (Para Desenvolvedor)</h4>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Se você precisa publicar na Google Play Store ou deseja gerar um arquivo físico <strong>.APK</strong> para instalar diretamente por pendrive ou link de download, você pode empacotar este código fonte usando o <strong className="text-slate-800">Capacitor da Ionic</strong>:
                </p>

                <div className="bg-slate-950 text-slate-300 rounded-xl p-4 font-mono text-[10px] space-y-3 leading-relaxed relative border border-slate-800 shadow-inner">
                  <div className="absolute top-2 right-2 text-[8px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded">
                    Terminal Bash
                  </div>
                  <p className="text-emerald-400 font-bold border-b border-slate-800 pb-1.5"># Passos para compilar o APK no seu computador:</p>
                  
                  <div className="space-y-2">
                    <p><span className="text-slate-500">// 1. Baixe o código fonte ZIP do projeto (Configurações &gt; Exportar ZIP)</span><br />
                    cd franguinho-da-vila-app</p>
                    
                    <p><span className="text-slate-500">// 2. Instale as ferramentas do Capacitor Android</span><br />
                    npm install @capacitor/core @capacitor/android<br />
                    npx cap init "Franguinho da Vila" "com.franguinho.app" --web-dir=dist</p>

                    <p><span className="text-slate-500">// 3. Compile a aplicação Web</span><br />
                    npm run build</p>

                    <p><span className="text-slate-500">// 4. Crie o projeto do Android Studio e sincronize os arquivos</span><br />
                    npx cap add android<br />
                    npx cap sync</p>

                    <p><span className="text-slate-500">// 5. Abra o Android Studio para compilar e gerar o arquivo APK final</span><br />
                    npx cap open android</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-relaxed font-medium">
                  <strong>💡 Dica:</strong> No Android Studio, basta ir em <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> para gerar o arquivo físico pronto para distribuição!
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => {
                  playSynth.playClick();
                  setShowInstallModal(false);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                id="install_modal_confirm_btn"
              >
                Entendi, Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
