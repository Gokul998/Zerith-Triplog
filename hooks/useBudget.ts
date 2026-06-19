"use client";
import { useCallback, useEffect, useState } from "react";
import { useStorage } from "@/contexts/StorageContext";
import type { Budget, Expense } from "@/types";
import { generateId } from "@/lib/utils";

export function useBudget(tripId: string) {
  const storage = useStorage();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [b, e] = await Promise.all([storage.getBudget(tripId), storage.getExpenses(tripId)]);
    setBudget(b);
    setExpenses(e.sort((a, b) => b.date.localeCompare(a.date)));
    setLoading(false);
  }, [storage, tripId]);

  useEffect(() => { load(); }, [load]);

  const saveBudget = useCallback(async (data: Omit<Budget, "id" | "tripId">) => {
    const b: Budget = { id: budget?.id ?? generateId(), tripId, ...data };
    await storage.saveBudget(b);
    setBudget(b);
  }, [storage, budget, tripId]);

  const addExpense = useCallback(async (input: Omit<Expense, "id" | "tripId" | "budgetId" | "createdAt">) => {
    const expense: Expense = { ...input, id: generateId(), tripId, budgetId: budget?.id ?? "", createdAt: new Date().toISOString() };
    await storage.saveExpense(expense);
    setExpenses(prev => [expense, ...prev]);
  }, [storage, budget, tripId]);

  const deleteExpense = useCallback(async (id: string) => {
    await storage.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, [storage]);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = (budget?.totalAmount ?? 0) - totalSpent;

  return { budget, expenses, loading, saveBudget, addExpense, deleteExpense, totalSpent, remaining };
}
