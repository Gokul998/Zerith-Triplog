"use client";
import { useState, useEffect } from "react";
import { ArrowLeftRight, TrendingUp } from "lucide-react";

const CURRENCIES = ["USD","EUR","GBP","JPY","INR","AUD","CAD","SGD","THB","MXN","AED","CHF","HKD","SEK","NOK","DKK","NZD","ZAR","BRL","KRW"];

export function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [rate, setRate] = useState<number | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [chartData, setChartData] = useState<{ date: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    async function fetchRates() {
      setLoading(true);
      try {
        const r = await fetch(`https://api.frankfurter.app/latest?from=${from}`);
        const data = await r.json();
        setRates(data.rates ?? {});
        setRate(data.rates?.[to] ?? null);
      } catch {
        setRate(null);
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
  }, [from]);

  useEffect(() => {
    if (rates[to] !== undefined) setRate(rates[to]);
  }, [to, rates]);

  useEffect(() => {
    if (from === to) { setChartData([]); return; }
    async function fetchChart() {
      setChartLoading(true);
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const r = await fetch(`https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=${from}&to=${to}`);
        const data = await r.json();
        if (data.rates) {
          const entries = Object.entries(data.rates).map(([date, r]: [string, any]) => ({
            date,
            rate: r[to] ?? 0,
          }));
          setChartData(entries);
        }
      } catch {
        setChartData([]);
      } finally {
        setChartLoading(false);
      }
    }
    fetchChart();
  }, [from, to]);

  const converted = rate && amount ? (parseFloat(amount) * rate).toFixed(2) : null;

  // Mini sparkline
  const min = Math.min(...chartData.map(d => d.rate));
  const max = Math.max(...chartData.map(d => d.rate));
  const range = max - min || 1;
  const W = 240, H = 48;
  const points = chartData.map((d, i) => {
    const x = (i / Math.max(chartData.length - 1, 1)) * W;
    const y = H - ((d.rate - min) / range) * H * 0.8 - H * 0.1;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="glass rounded-2xl p-5 border border-white/5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-xl flex items-center justify-center">
          <ArrowLeftRight size={14} className="text-green-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Currency Converter</h3>
          <p className="text-xs text-white/40">Live rates via Frankfurter</p>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-green-500"
          placeholder="Amount"
          min="0"
        />
        <select value={from} onChange={e => setFrom(e.target.value)} className="rounded-xl bg-white/5 border border-white/10 px-2 py-2 text-sm text-white focus:outline-none">
          {CURRENCIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
        </select>
        <button onClick={() => { setFrom(to); setTo(from); }} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
          <ArrowLeftRight size={14} />
        </button>
        <select value={to} onChange={e => setTo(e.target.value)} className="rounded-xl bg-white/5 border border-white/10 px-2 py-2 text-sm text-white focus:outline-none">
          {CURRENCIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="h-16 flex items-center justify-center text-white/30 text-sm">Loading rates…</div>
      ) : converted !== null ? (
        <div className="rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-500/20 p-4 text-center">
          <p className="text-xs text-white/40 mb-1">{amount} {from} =</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            {converted} {to}
          </p>
          {rate && <p className="text-xs text-white/30 mt-1">1 {from} = {rate.toFixed(4)} {to}</p>}
        </div>
      ) : null}

      {chartData.length > 1 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} className="text-white/30" />
            <p className="text-xs text-white/30">Last 7 days — {from} / {to}</p>
          </div>
          {chartLoading ? (
            <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
              <polyline
                fill="none"
                stroke="url(#chartGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>
          )}
          <div className="flex justify-between text-xs text-white/20 mt-1">
            <span>{chartData[0]?.date}</span>
            <span>{chartData[chartData.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}
