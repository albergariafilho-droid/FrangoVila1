/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SalesReport, Sale } from "../types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, DollarSign, Receipt, ShoppingBag, Percent, ArrowDown, ArrowUp, Calendar, Eye, Printer, X } from "lucide-react";
import { playSynth } from "../utils/audio";

interface FinancialDashboardProps {
  sales: Sale[];
}

export function FinancialDashboard({ sales }: FinancialDashboardProps) {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSaleReceipt, setSelectedSaleReceipt] = useState<Sale | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const fetchReport = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error("Error fetching financial reports:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(report !== null);
  }, [sales]);

  if (loading || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold">Carregando balanço financeiro detalhado...</p>
      </div>
    );
  }

  // Calculate overall margins
  const netProfitMargin = report.totalRevenue > 0 
    ? (report.totalProfit / report.totalRevenue) * 100 
    : 0;

  const COLORS = ["#059669", "#2563eb", "#ea580c"]; // Emerald (Pix), Blue (Card), Orange (Cash)

  return (
    <div className="space-y-6" id="reports_container">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4" id="reports_metrics_row">
        {/* Faturamento */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1 col-span-1 lg:col-span-2">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Faturamento Bruto</span>
          <p className="text-xl lg:text-2xl font-black text-slate-800">R$ {report.totalRevenue.toFixed(2)}</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Vendas Totais</span>
          </div>
        </div>

        {/* Lucro Líquido */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1 col-span-1 lg:col-span-2">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Lucro Líquido</span>
          <p className="text-xl lg:text-2xl font-black text-emerald-700">R$ {report.totalProfit.toFixed(2)}</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Margem Média: {netProfitMargin.toFixed(1)}%</span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1 col-span-1">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Ticket Médio</span>
          <p className="text-lg lg:text-xl font-black text-slate-800">R$ {report.averageTicket.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400 block">Por transação</span>
        </div>

        {/* Transações */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1 col-span-1">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Transações</span>
          <p className="text-lg lg:text-xl font-black text-slate-800">{report.salesCount}</p>
          <span className="text-[10px] text-slate-400 block">Vendas efetuadas</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="reports_charts_grid">
        {/* Evolution Chart (Area) - Y: Revenue/Profit, X: Day */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[340px]">
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Evolução Diária</h3>
            <p className="text-sm font-bold text-slate-800">Faturamento vs Lucro Real</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.salesHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                  formatter={(val: number) => [`R$ ${val.toFixed(2)}`]}
                />
                <Area type="monotone" name="Faturamento" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" name="Lucro Líquido" dataKey="profit" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Chart (Pie) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[340px]">
          <div className="mb-2">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Meios de Recebimento</h3>
            <p className="text-sm font-bold text-slate-800">Faturamento por Tipo</p>
          </div>
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative">
            <div className="w-full h-[180px]">
              {report.salesByPayment.length === 0 || report.salesByPayment.every(p => p.value === 0) ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">Nenhum dado</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.salesByPayment}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {report.salesByPayment.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`R$ ${val.toFixed(2)}`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Customized Legends */}
            <div className="grid grid-cols-3 gap-1 w-full text-center mt-3 border-t border-slate-100 pt-3">
              {report.salesByPayment.map((entry, index) => (
                <div key={entry.name} className="space-y-0.5">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-[10px] font-bold text-slate-500">{entry.name}</span>
                  </div>
                  <p className="text-[11px] font-black text-slate-800">R$ {entry.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top products + Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="reports_ledger_row">
        {/* Top selling products list */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Desempenho Comercial</h3>
            <p className="text-sm font-bold text-slate-800">Top 5 Produtos Mais Vendidos</p>
          </div>
          
          <div className="space-y-4">
            {report.topProducts.length === 0 ? (
              <p className="text-center py-10 text-xs text-slate-400">Nenhuma venda registrada ainda.</p>
            ) : (
              report.topProducts.map((p, idx) => {
                // Calculate percentage width based on the first item (highest)
                const maxQty = report.topProducts[0]?.quantity || 1;
                const pct = (p.quantity / maxQty) * 100;

                return (
                  <div key={p.name} className="space-y-1.5" id={`top_prod_${idx}`}>
                    <div className="flex justify-between items-baseline text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-400">#{idx + 1}</span>
                        <span className="font-semibold text-slate-700">{p.name}</span>
                      </div>
                      <span className="font-black text-slate-800">{p.quantity} un <span className="text-[10px] text-slate-400 font-medium">(R$ {p.revenue.toFixed(0)})</span></span>
                    </div>
                    {/* Visual progress bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-600 rounded-full" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sales Ledger */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Histórico Financeiro</h3>
              <p className="text-sm font-bold text-slate-800">Livro-Caixa Geral (Ledger)</p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" id="ledger_table">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-4">Ref / Data</th>
                  <th className="py-3 px-3">Origem</th>
                  <th className="py-3 px-3">Pagamento</th>
                  <th className="py-3 px-3 text-right">Custo / Bruto</th>
                  <th className="py-3 px-3 text-right">Lucro Líquido</th>
                  <th className="py-3 px-4 text-right">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Nenhuma venda registrada no livro-caixa.
                    </td>
                  </tr>
                ) : (
                  sales.map(sale => {
                    const isExpanded = expandedSaleId === sale.id;

                    return (
                      <React.Fragment key={sale.id}>
                        <tr className="hover:bg-slate-50/50 transition-colors" id={`ledger_tr_${sale.id}`}>
                          {/* Ref & Date */}
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wide block">
                              {sale.id.replace("s_", "")}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(sale.createdAt).toLocaleDateString("pt-BR")} {new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>

                          {/* Source */}
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                              sale.type === "pdv" 
                                ? "bg-slate-100 text-slate-700" 
                                : "bg-blue-50 text-blue-700"
                            }`}>
                              {sale.type === "pdv" ? "PDV Caixa" : "App Pedido"}
                            </span>
                          </td>

                          {/* Payment Method */}
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-700 uppercase text-[10px]">
                              {sale.paymentMethod === "money" ? "Dinheiro" : sale.paymentMethod === "card" ? "Cartão" : "Pix"}
                            </span>
                          </td>

                          {/* Cost / Revenue */}
                          <td className="py-3 px-3 text-right">
                            <p className="font-bold text-slate-800">R$ {sale.total.toFixed(2)}</p>
                            <p className="text-[9px] text-slate-400 font-medium">Custo: R$ {sale.totalCost.toFixed(2)}</p>
                          </td>

                          {/* Net profit */}
                          <td className="py-3 px-3 text-right font-black text-emerald-700">
                            R$ {sale.profit.toFixed(2)}
                          </td>

                          {/* Action toggle */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {/* Toggle items drawer */}
                              <button
                                onClick={() => {
                                  playSynth.playClick();
                                  setExpandedSaleId(isExpanded ? null : sale.id);
                                }}
                                className={`p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors ${
                                  isExpanded ? "bg-slate-100 text-orange-700" : ""
                                }`}
                                id={`view_ledger_items_${sale.id}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {/* Thermal Receipt Print view */}
                              <button
                                onClick={() => {
                                  playSynth.playClick();
                                  setSelectedSaleReceipt(sale);
                                }}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible item details row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50" id={`ledger_items_tr_${sale.id}`}>
                            <td colSpan={6} className="px-5 py-3 border-t border-b border-slate-100">
                              <div className="space-y-1.5">
                                <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-1">Itens Adquiridos nesta Venda:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                                  {sale.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 bg-white border border-slate-200/80 rounded-lg">
                                      <span className="font-semibold text-slate-700">{item.name}</span>
                                      <span className="font-black text-slate-800">
                                        {item.quantity} x R$ {item.price.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receipt popup for past ledger records */}
      {selectedSaleReceipt && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider uppercase">Cupom de Venda Re-impresso</span>
              <button
                onClick={() => setSelectedSaleReceipt(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                  <p className="text-[10px] text-slate-500">CNPJ: 12.345.678/0001-90</p>
                  <p className="border-b border-dashed border-slate-300 py-1.5"></p>
                </div>

                <div className="space-y-0.5 mb-3">
                  <p><strong>CUPOM (CÓD):</strong> {selectedSaleReceipt.id.toUpperCase()}</p>
                  <p><strong>DATA:</strong> {new Date(selectedSaleReceipt.createdAt).toLocaleString("pt-BR")}</p>
                  <p><strong>OPERADOR:</strong> Caixa Principal</p>
                  <p><strong>RE-IMPRESSÃO:</strong> SIM</p>
                  <p className="border-b border-dashed border-slate-300 py-1.5"></p>
                </div>

                <div className="grid grid-cols-12 font-bold mb-1 pb-1 border-b border-dotted border-slate-300">
                  <span className="col-span-6">ITEM</span>
                  <span className="col-span-2 text-center">QTD</span>
                  <span className="col-span-4 text-right">VALOR</span>
                </div>

                <div className="space-y-1">
                  {selectedSaleReceipt.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12">
                      <span className="col-span-6 truncate">{item.name}</span>
                      <span className="col-span-2 text-center">{item.quantity}</span>
                      <span className="col-span-4 text-right">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <p className="border-b border-dashed border-slate-300 py-2"></p>

                <div className="space-y-0.5 mt-2 text-right">
                  <p>Subtotal: R$ {(selectedSaleReceipt.total + selectedSaleReceipt.discount).toFixed(2)}</p>
                  {selectedSaleReceipt.discount > 0 && <p className="text-rose-600">Desconto: - R$ {selectedSaleReceipt.discount.toFixed(2)}</p>}
                  <p className="font-extrabold text-[12px] pt-1">
                    TOTAL RECEBIDO: R$ {selectedSaleReceipt.total.toFixed(2)}
                  </p>
                </div>

                <p className="border-b border-dashed border-slate-300 py-1.5"></p>

                <div className="text-center mt-3 bg-slate-50 p-2 rounded border border-slate-200">
                  <p className="uppercase font-bold">PAGO EM: {
                    selectedSaleReceipt.paymentMethod === "money" ? "Dinheiro" : selectedSaleReceipt.paymentMethod === "card" ? "Cartão" : "Pix"
                  }</p>
                  <p className="text-[9px] text-slate-500 mt-1">Lançamento fiscal consolidado</p>
                </div>
              </div>
            </div>

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
                onClick={() => setSelectedSaleReceipt(null)}
                className="flex-1 bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-orange-700 transition-all shadow-sm text-center"
              >
                Fechar (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
