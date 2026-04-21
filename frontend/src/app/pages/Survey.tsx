import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Activity, ClipboardList } from 'lucide-react';
import { updateProfile, me as fetchMe } from '../lib/api';
import { useAuth } from '../lib/auth';

const EXP = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
const RISK = [
  { value: 'low', label: 'Low — protect capital' },
  { value: 'medium', label: 'Medium — balanced' },
  { value: 'high', label: 'High — maximize return' },
];
const HORIZON = [
  { value: 'short', label: '< 1 year' },
  { value: 'medium', label: '1–5 years' },
  { value: 'long', label: '5+ years' },
];

export function Survey() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [annualIncome, setAnnualIncome] = useState('');
  const [creditScore, setCreditScore] = useState('');
  const [experience, setExperience] = useState('beginner');
  const [risk, setRisk] = useState('medium');
  const [horizon, setHorizon] = useState('medium');
  const [holdings, setHoldings] = useState(''); // comma-separated tickers
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updateProfile({
        annual_income: annualIncome ? Number(annualIncome) : null,
        credit_score: creditScore ? Number(creditScore) : null,
        experience_level: experience,
        risk_tolerance: risk,
        investment_horizon: horizon,
        existing_holdings: holdings
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean),
      });
      // Verify the write actually stuck before navigating — avoids the
      // React state race where setUser hasn't flushed before ProtectedRoute
      // reads it, and surfaces any backend write-failure loudly.
      const fresh = await fetchMe();
      if (!fresh.profile_complete) {
        setError(
          `Profile saved but server still reports it incomplete ` +
            `(experience=${fresh.profile?.experience_level ?? 'null'}, ` +
            `risk=${fresh.profile?.risk_tolerance ?? 'null'}). ` +
            `Check backend logs.`,
        );
        return;
      }
      await refresh();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
            <Activity size={28} className="text-[#00d4ff]" />
          </div>
          <h1 className="text-3xl font-bold text-[#e4e8f0] font-mono tracking-tight">
            STOCK TERMINAL
          </h1>
        </div>

        <form
          onSubmit={submit}
          className="bg-[#0f1420] border border-[#1e2538] rounded p-6 space-y-5"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-[#1e2538] mb-2">
            <ClipboardList size={20} className="text-[#00d4ff]" />
            <h2 className="text-xl text-[#e4e8f0] font-mono font-bold">ACCOUNT SETUP</h2>
          </div>
          <p className="text-xs text-[#7d8aa3] font-mono -mt-2">
            Tell us about yourself so we can tune recommendations. All fields optional.
          </p>

          {error && (
            <div className="p-3 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded text-[#ff4757] font-mono text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#7d8aa3] text-xs font-mono mb-2">
                ANNUAL INCOME (USD)
              </label>
              <input
                type="number"
                min="0"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(e.target.value)}
                placeholder="75000"
                className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono focus:outline-none focus:border-[#00d4ff]"
              />
            </div>
            <div>
              <label className="block text-[#7d8aa3] text-xs font-mono mb-2">CREDIT SCORE</label>
              <input
                type="number"
                min="300"
                max="850"
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
                placeholder="700"
                className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono focus:outline-none focus:border-[#00d4ff]"
              />
            </div>
          </div>

          <RadioGroup
            label="EXPERIENCE LEVEL"
            options={EXP}
            value={experience}
            onChange={setExperience}
          />
          <RadioGroup label="RISK TOLERANCE" options={RISK} value={risk} onChange={setRisk} />
          <RadioGroup
            label="INVESTMENT HORIZON"
            options={HORIZON}
            value={horizon}
            onChange={setHorizon}
          />

          <div>
            <label className="block text-[#7d8aa3] text-xs font-mono mb-2">
              EXISTING HOLDINGS (comma-separated tickers)
            </label>
            <input
              type="text"
              value={holdings}
              onChange={(e) => setHoldings(e.target.value)}
              placeholder="AAPL, MSFT, VOO"
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono focus:outline-none focus:border-[#00d4ff]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-3 bg-transparent border border-[#1e2538] text-[#7d8aa3] rounded font-mono hover:border-[#7d8aa3] transition-colors"
            >
              SKIP FOR NOW
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#00d4ff] text-[#0a0e1a] rounded font-bold font-mono hover:bg-[#00b8e6] disabled:opacity-50 transition-colors"
            >
              {loading ? 'SAVING…' : 'SAVE & CONTINUE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[#7d8aa3] text-xs font-mono mb-2">{label}</label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-2.5 rounded font-mono text-sm border transition-all ${
              value === o.value
                ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/50'
                : 'bg-[#0a0e1a] text-[#7d8aa3] border-[#1e2538] hover:border-[#7d8aa3]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
