/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Product } from "../types";
import { Plus, Package, Edit, BarChart3, TrendingUp, AlertTriangle, ArrowUpRight, DollarSign, Check, X } from "lucide-react";
import { playSynth } from "../utils/audio";

interface InventoryManagerProps {
  products: Product[];
  refreshProducts: () => void;
}

export function InventoryManager({ products, refreshProducts }: InventoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Restock state
  const [quickRestockAmount, setQuickRestockAmount] = useState<Record<string, number>>({});

  // Product Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Grelhados");
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(5);

  const categories = ["Grelhados", "Fritos", "Salgados", "Acompanhamentos", "Bebidas", "Sobremesas"];

  // Calculate high-level stock statistics
  const totalItemsInStock = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockItems = products.filter(p => p.stock <= p.minStock);
  const totalCostValue = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  const totalSaleValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const potentialProfit = totalSaleValue - totalCostValue;

  const handleOpenAddForm = () => {
    playSynth.playClick();
    setFormName("");
    setFormCategory("Grelhados");
    setFormPrice(0);
    setFormCostPrice(0);
    setFormStock(0);
    setFormMinStock(5);
    setIsEditingId(null);
    setIsAdding(true);
    setErrorMessage(null);
  };

  const handleOpenEditForm = (prod: Product) => {
    playSynth.playClick();
    setIsAdding(false);
    setIsEditingId(prod.id);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormPrice(prod.price);
    setFormCostPrice(prod.costPrice);
    setFormStock(prod.stock);
    setFormMinStock(prod.minStock);
    setErrorMessage(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPrice <= 0 || formCostPrice < 0) {
      setErrorMessage("Por favor, preencha os campos corretamente. O preço deve ser maior que zero.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const payload: Product = {
      id: isEditingId || undefined as any,
      name: formName,
      category: formCategory,
      price: Number(formPrice),
      costPrice: Number(formCostPrice),
      stock: Number(formStock),
      minStock: Number(formMinStock)
    };

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar o produto.");
      }

      playSynth.playNotification();
      setIsAdding(false);
      setIsEditingId(null);
      refreshProducts();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro de conexão com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickRestock = async (productId: string) => {
    const amount = quickRestockAmount[productId];
    if (!amount || amount <= 0) return;

    try {
      const response = await fetch("/api/products/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, amount })
      });

      if (!response.ok) throw new Error("Erro ao abastecer estoque.");

      playSynth.playNotification();
      setQuickRestockAmount(prev => ({ ...prev, [productId]: 0 }));
      refreshProducts();
    } catch (err) {
      console.error(err);
      alert("Erro ao abastecer o produto");
    }
  };

  return (
    <div className="space-y-6" id="inventory_container">
      {/* High-Level Stock Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="inventory_stats_row">
        {/* Total em Estoque */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Estoque Total</span>
            <p className="text-2xl font-black text-slate-800">{totalItemsInStock} un</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
            <Package className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* Custo de Investimento */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Custo do Estoque</span>
            <p className="text-2xl font-black text-slate-800">R$ {totalCostValue.toFixed(2)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
            <DollarSign className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* Valor de Venda Potencial */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Valor de Venda</span>
            <p className="text-2xl font-black text-emerald-700">R$ {totalSaleValue.toFixed(2)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Itens com Alerta de Estoque Baixo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Alertas Críticos</span>
            <p className={`text-2xl font-black ${lowStockItems.length > 0 ? "text-rose-600 animate-pulse" : "text-slate-800"}`}>
              {lowStockItems.length} {lowStockItems.length === 1 ? "produto" : "produtos"}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            lowStockItems.length > 0 
              ? "bg-rose-50 border-rose-100 text-rose-600" 
              : "bg-slate-50 border-slate-100 text-slate-500"
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Products Table + Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table Column */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              Balanço Geral de Estoque
            </h2>
            <button
              onClick={handleOpenAddForm}
              className="px-3.5 py-1.5 bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm hover:bg-orange-700 hover:-translate-y-0.5 active:translate-y-0 transition-all"
              id="add_new_product_btn"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="inventory_table">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-5">Produto</th>
                  <th className="py-3.5 px-3">Preços (Custo/Venda)</th>
                  <th className="py-3.5 px-3">Margem Lucro</th>
                  <th className="py-3.5 px-3">Estoque</th>
                  <th className="py-3.5 px-3 text-center">Rápido Abastecer</th>
                  <th className="py-3.5 px-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Nenhum produto cadastrado no estoque.
                    </td>
                  </tr>
                ) : (
                  products.map(product => {
                    const margin = product.price > 0 
                      ? ((product.price - product.costPrice) / product.price) * 100 
                      : 0;
                    const isLow = product.stock <= product.minStock;
                    const isOut = product.stock <= 0;

                    return (
                      <tr 
                        key={product.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isOut ? "bg-rose-50/30" : isLow ? "bg-amber-50/20" : ""
                        }`}
                        id={`tr_prod_${product.id}`}
                      >
                        {/* Name and category */}
                        <td className="py-3 px-5">
                          <p className="font-semibold text-slate-800">{product.name}</p>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">{product.category}</span>
                        </td>

                        {/* Prices */}
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-800">Venda: R$ {product.price.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Custo: R$ {product.costPrice.toFixed(2)}</p>
                        </td>

                        {/* Margin */}
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded ${
                            margin >= 50 
                              ? "bg-orange-50 text-orange-700" 
                              : margin >= 30 
                                ? "bg-blue-50 text-blue-700" 
                                : "bg-slate-50 text-slate-600"
                          }`}>
                            <TrendingUp className="w-3 h-3" />
                            {margin.toFixed(0)}%
                          </span>
                        </td>

                        {/* Stock status */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              isOut 
                                ? "bg-rose-600 animate-ping" 
                                : isLow 
                                  ? "bg-amber-500" 
                                  : "bg-emerald-500"
                            }`} />
                            <span className="font-bold text-slate-800">{product.stock} un</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Mín: {product.minStock} un</span>
                        </td>

                        {/* Quick restock input */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                            <input
                              type="number"
                              min="1"
                              placeholder="+ Qtd"
                              value={quickRestockAmount[product.id] || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setQuickRestockAmount(prev => ({ ...prev, [product.id]: val }));
                              }}
                              className="w-14 bg-transparent border-none text-center font-bold text-slate-800 text-xs py-1 focus:outline-none placeholder-slate-400"
                              id={`restock_input_${product.id}`}
                            />
                            <button
                              onClick={() => handleQuickRestock(product.id)}
                              className="bg-indigo-600 text-white p-1 rounded-r-lg hover:bg-indigo-700 font-bold transition-all h-full flex items-center justify-center border-l border-slate-200"
                              id={`restock_btn_${product.id}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Edit actions */}
                        <td className="py-3 px-5 text-right">
                          <button
                            onClick={() => handleOpenEditForm(product)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                            id={`edit_prod_btn_${product.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Column (Side Form for Adding/Editing) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          {!(isAdding || isEditingId) ? (
            <div className="py-16 text-center text-slate-400">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-sm mb-1">Editor de Produtos</h3>
              <p className="text-xs text-slate-400 max-w-[220px] mx-auto">
                Clique em "Novo Produto" ou selecione o ícone de edição na tabela para ajustar dados ou registrar novos itens.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveProduct} className="space-y-4" id="product_form">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-orange-600" />
                  {isEditingId ? "Editar Produto" : "Novo Produto"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    playSynth.playClick();
                    setIsAdding(false);
                    setIsEditingId(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 text-rose-800 p-2.5 rounded-lg border-l-4 border-rose-500 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Hambúrguer de Costela"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                  id="form_prod_name"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Categoria</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                  id="form_prod_cat"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Cost and Sale Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formCostPrice || ""}
                    onChange={(e) => setFormCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                    id="form_prod_cost"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formPrice || ""}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                    id="form_prod_price"
                  />
                </div>
              </div>

              {/* Stock and Min Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={formStock}
                    onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                    id="form_prod_stock"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Mínimo Alerta</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="5"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                    id="form_prod_min"
                  />
                </div>
              </div>

              {/* Save button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:bg-orange-700 transition-colors"
                id="save_product_btn"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
