/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Order, OrderStatus } from "../types";
import { Clock, Check, CookingPot, CheckCircle, XCircle, AlertCircle, ShoppingBag, ShieldAlert, ArrowRight, Table } from "lucide-react";
import { playSynth } from "../utils/audio";

interface RealTimeOrdersListProps {
  orders: Order[];
  onOrderStatusChanged: () => void;
}

export function RealTimeOrdersList({ orders, onOrderStatusChanged }: RealTimeOrdersListProps) {
  
  // Filter active (incomplete) orders
  const activeOrders = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");
  const completedOrders = orders.filter(o => o.status === "delivered" || o.status === "cancelled");

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar o status do pedido");
      }

      // Play soft chime alert
      playSynth.playNotification();
      
      // Notify parent to fetch fresh data
      onOrderStatusChanged();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar o status do pedido.");
    }
  };

  // Helper translations
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] uppercase rounded-full animate-pulse border border-amber-200">Pendente</span>;
      case "preparing":
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold text-[10px] uppercase rounded-full border border-blue-200">Em Preparo</span>;
      case "ready":
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase rounded-full border border-emerald-200">Pronto</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" id="realtime_orders_container">
      {/* Active Orders Section */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <CookingPot className="w-5 h-5 text-orange-600 animate-bounce" />
            <h2 className="text-md font-bold text-slate-800">Cozinha & Pedidos em Tempo Real 🍳</h2>
          </div>
          <span className="text-xs bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full border border-orange-200">
            {activeOrders.length} {activeOrders.length === 1 ? "Ativo" : "Ativos"}
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold">Nenhum pedido ativo no momento.</p>
            <p className="text-xs text-slate-400">Quando clientes fizerem pedidos pelo App do Celular, eles aparecerão aqui instantaneamente!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="active_orders_grid">
            {activeOrders.map(order => {
              const orderTime = new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

              return (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                  id={`order_card_${order.id}`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                      <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wide flex items-center gap-1">
                          <Table className="w-3.5 h-3.5 text-slate-400" />
                          {order.table || "Mesa Digital"}
                        </h3>
                        <p className="text-sm font-black text-slate-800 truncate max-w-[130px]">{order.customerName}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {orderTime}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>

                    {/* Order items list */}
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <span>{item.name}</span>
                          <span className="font-bold text-slate-800">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="border-t border-slate-100 pt-3.5 space-y-3.5 mt-auto">
                    {/* Sum */}
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Total do Pedido:</span>
                      <span className="text-md font-black text-slate-900">R$ {order.total.toFixed(2)}</span>
                    </div>

                    {/* Interactive Button steps depending on state */}
                    <div className="flex gap-2" id={`actions_group_${order.id}`}>
                      {order.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStatus(order.id, "preparing")}
                            className="flex-1 py-2 bg-orange-600 text-white hover:bg-orange-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all shadow-sm"
                            id={`accept_btn_${order.id}`}
                          >
                            <CookingPot className="w-4 h-4" />
                            <span>Aceitar / Preparar</span>
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, "cancelled")}
                            className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center transition-all"
                            id={`cancel_btn_${order.id}`}
                          >
                            <XCircle className="w-4.5 h-4.5" />
                          </button>
                        </>
                      )}

                      {order.status === "preparing" && (
                        <>
                          <button
                            onClick={() => updateStatus(order.id, "ready")}
                            className="flex-1 py-2 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all shadow-sm"
                            id={`ready_btn_${order.id}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Pronto p/ Entrega</span>
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, "cancelled")}
                            className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center transition-all"
                          >
                            <XCircle className="w-4.5 h-4.5" />
                          </button>
                        </>
                      )}

                      {order.status === "ready" && (
                        <>
                          <button
                            onClick={() => updateStatus(order.id, "delivered")}
                            className="flex-1 py-2 bg-orange-600 text-white hover:bg-orange-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all shadow-sm"
                            id={`deliver_btn_${order.id}`}
                          >
                            <Check className="w-4 h-4" />
                            <span>Confirmar Entrega</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Orders List */}
      {completedOrders.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Histórico de Pedidos Recebidos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" id="completed_orders_table">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-2 px-4">Pedido / Data</th>
                  <th className="py-2 px-3">Cliente</th>
                  <th className="py-2 px-3">Origem</th>
                  <th className="py-2 px-3">Meio Pgto</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {completedOrders.slice(0, 10).map(order => {
                  const dateStr = new Date(order.createdAt).toLocaleDateString("pt-BR") + " " + new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-400 uppercase tracking-wider">
                        {order.id.replace("o_", "")}
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{dateStr}</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{order.customerName}</td>
                      <td className="py-2.5 px-3 font-semibold">{order.table}</td>
                      <td className="py-2.5 px-3 text-[10px] uppercase font-bold text-slate-500">{order.paymentMethod}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">R$ {order.total.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                          order.status === "delivered" 
                            ? "bg-slate-100 text-slate-600" 
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}>
                          {order.status === "delivered" ? "Entregue" : "Cancelado"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
