import type { Budget, Expense, ExpenseCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";

const categoryColors: Record<ExpenseCategory, string> = {
  accommodation: "bg-purple-400", transport: "bg-blue-400", food: "bg-orange-400",
  activities: "bg-green-400", shopping: "bg-pink-400", health: "bg-red-400",
  communication: "bg-yellow-400", other: "bg-gray-400",
};

interface Props { budget: Budget; expenses: Expense[]; totalSpent: number; remaining: number; }

export function BudgetSummary({ budget, expenses, totalSpent, remaining }: Props) {
  const pct = Math.min(100, (totalSpent / budget.totalAmount) * 100);

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div><p className="text-xs text-gray-500 mb-1">Budget</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(budget.totalAmount, budget.currency)}</p></div>
        <div><p className="text-xs text-gray-500 mb-1">Spent</p><p className="text-2xl font-bold text-indigo-600">{formatCurrency(totalSpent, budget.currency)}</p></div>
        <div><p className="text-xs text-gray-500 mb-1">Left</p><p className={`text-2xl font-bold ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(remaining, budget.currency)}</p></div>
      </div>

      <div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          {Object.entries(byCategory).map(([cat, amt]) => (
            <div key={cat} title={`${cat}: ${formatCurrency(amt)}`} className={`h-full ${categoryColors[cat as ExpenseCategory]} opacity-80`} style={{ width: `${(amt / budget.totalAmount) * 100}%` }} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{Math.round(pct)}% of budget used</p>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
            <div key={cat} className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${categoryColors[cat as ExpenseCategory]}`} />
              <span className="text-gray-600 capitalize flex-1">{cat}</span>
              <span className="font-medium text-gray-900">{formatCurrency(amt, budget.currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
