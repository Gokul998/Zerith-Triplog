"use client";
import { Trash2 } from "lucide-react";
import type { Expense, ExpenseCategory } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const categoryColors: Record<ExpenseCategory, string> = {
  accommodation: "bg-purple-100 text-purple-700", transport: "bg-blue-100 text-blue-700",
  food: "bg-orange-100 text-orange-700", activities: "bg-green-100 text-green-700",
  shopping: "bg-pink-100 text-pink-700", health: "bg-red-100 text-red-700",
  communication: "bg-yellow-100 text-yellow-700", other: "bg-gray-100 text-gray-700",
};

interface Props { expenses: Expense[]; currency: string; onDelete: (id: string) => void; }

export function ExpenseList({ expenses, currency, onDelete }: Props) {
  if (expenses.length === 0) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">No expenses recorded yet</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <h3 className="font-medium text-gray-900 px-4 py-3 border-b border-gray-100">Expenses</h3>
      <div className="divide-y divide-gray-50">
        {expenses.map(e => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[e.category]}`}>{e.category}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
              <p className="text-xs text-gray-400">{formatDate(e.date)}{e.notes && ` · ${e.notes}`}</p>
            </div>
            <p className="font-semibold text-gray-900 shrink-0">{formatCurrency(e.amount, currency)}</p>
            <button onClick={() => onDelete(e.id)} className="p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
