import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { getPortfolio, getTradeHistory, type PortfolioItem } from '../lib/api';

export function Portfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<
    { ticker: string; type: 'BUY' | 'SELL'; shares: number; price_per_share: number; total_amount: number; executed_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPortfolio(), getTradeHistory()])
      .then(([p, h]) => {
        if (cancelled) return;
        setItems(p.portfolio);
        setBalance(p.balance);
        setHistory(h.history);
      })
      .catch((e: any) => !cancelled && setError(e?.message ?? 'Failed to load portfolio'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const totalInvested = items.reduce((acc, it) => acc + it.shares_held * it.purchase_price, 0);

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-6 border-b border-[#1e2538] pb-6">
          <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
            <BarChart3 size={28} className="text-[#00d4ff]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#e4e8f0] tracking-tight">PORTFOLIO</h1>
            <p className="text-[#7d8aa3] text-sm mt-1 font-mono">Holdings & transaction history</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded text-[#ff4757] font-mono text-sm">
            ERROR: {error}
          </div>
        )}
        {loading && (
          <p className="text-[#7d8aa3] font-mono animate-pulse">LOADING PORTFOLIO…</p>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <StatCard label="CASH BALANCE" value={`$${balance.toFixed(2)}`} accent="#00d4ff" />
              <StatCard label="INVESTED" value={`$${totalInvested.toFixed(2)}`} accent="#a29bfe" />
              <StatCard label="POSITIONS" value={String(items.length)} accent="#2ed573" />
            </div>

            <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6 mb-6">
              <h2 className="text-lg font-bold text-[#e4e8f0] font-mono mb-4 border-b border-[#1e2538] pb-3">
                HOLDINGS
              </h2>
              {items.length === 0 ? (
                <p className="text-[#7d8aa3] font-mono text-sm">
                  No positions yet. Buy shares from a stock detail page.
                </p>
              ) : (
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="text-[#7d8aa3] text-xs border-b border-[#1e2538]">
                      <th className="text-left py-2">TICKER</th>
                      <th className="text-left">NAME</th>
                      <th className="text-right">SHARES</th>
                      <th className="text-right">COST/SHARE</th>
                      <th className="text-right">TOTAL COST</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#e4e8f0]">
                    {items.map((it) => (
                      <tr key={it.ticker} className="border-b border-[#1e2538]/50">
                        <td className="py-3 font-bold text-[#00d4ff]">{it.ticker}</td>
                        <td className="text-[#7d8aa3]">{it.company_name ?? '—'}</td>
                        <td className="text-right">{it.shares_held.toFixed(4)}</td>
                        <td className="text-right">${it.purchase_price.toFixed(2)}</td>
                        <td className="text-right">
                          ${(it.shares_held * it.purchase_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6">
              <h2 className="text-lg font-bold text-[#e4e8f0] font-mono mb-4 border-b border-[#1e2538] pb-3">
                TRANSACTION HISTORY
              </h2>
              {history.length === 0 ? (
                <p className="text-[#7d8aa3] font-mono text-sm">No transactions yet.</p>
              ) : (
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="text-[#7d8aa3] text-xs border-b border-[#1e2538]">
                      <th className="text-left py-2">DATE</th>
                      <th className="text-left">TICKER</th>
                      <th className="text-left">TYPE</th>
                      <th className="text-right">SHARES</th>
                      <th className="text-right">PRICE</th>
                      <th className="text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#e4e8f0]">
                    {history.map((h, i) => (
                      <tr key={i} className="border-b border-[#1e2538]/50">
                        <td className="py-3 text-[#7d8aa3]">
                          {new Date(h.executed_at).toLocaleString()}
                        </td>
                        <td className="font-bold text-[#00d4ff]">{h.ticker}</td>
                        <td
                          className={
                            h.type === 'BUY' ? 'text-[#2ed573] font-bold' : 'text-[#ff4757] font-bold'
                          }
                        >
                          <span className="inline-flex items-center gap-1">
                            {h.type === 'BUY' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {h.type}
                          </span>
                        </td>
                        <td className="text-right">{h.shares.toFixed(4)}</td>
                        <td className="text-right">${h.price_per_share.toFixed(2)}</td>
                        <td className="text-right">${h.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="bg-[#0f1420] border border-[#1e2538] rounded p-4"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <p className="text-[#7d8aa3] text-xs font-mono mb-2">{label}</p>
      <p className="text-2xl font-bold font-mono" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
