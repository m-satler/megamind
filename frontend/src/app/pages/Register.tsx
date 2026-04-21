import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Activity, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/auth';

// Quick client-side password strength score (0–4).
// This is intentionally a hint, not a security boundary — the server enforces
// the 8-char minimum. The point is to steer users away from weak/common
// passwords so Chrome's Password Checkup breach warning doesn't fire.
function scorePassword(pw: string): { score: number; label: string; hint: string } {
  if (!pw) return { score: 0, label: '', hint: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;

  // Obvious-weak overrides
  const lower = pw.toLowerCase();
  const common = [
    'password',
    '12345678',
    'qwerty',
    'letmein',
    'iloveyou',
    'admin',
    'welcome',
    'monkey',
    'dragon',
  ];
  if (common.some((c) => lower.includes(c))) s = Math.min(s, 1);

  const labels = ['Very weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
  const hints = [
    '',
    'Add length and mix of character types.',
    'Add a symbol or more length for a stronger password.',
    'Looks good.',
    'Excellent.',
  ];
  return { score: s, label: labels[s], hint: hints[s] };
}

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [startingBalance, setStartingBalance] = useState('10000');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');

    setLoading(true);
    try {
      await register(email.trim(), password, Number(startingBalance) || 0);
      navigate('/survey', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
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
          className="bg-[#0f1420] border border-[#1e2538] rounded p-6 space-y-4"
        >
          <h2 className="text-xl text-[#e4e8f0] font-mono font-bold mb-2 flex items-center gap-2">
            <UserPlus size={18} className="text-[#00d4ff]" />
            CREATE ACCOUNT
          </h2>

          {error && (
            <div className="p-3 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded text-[#ff4757] font-mono text-xs">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="reg-email" className="block text-[#7d8aa3] text-xs font-mono mb-2">
              EMAIL
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono focus:outline-none focus:border-[#00d4ff]"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-[#7d8aa3] text-xs font-mono mb-2">
              PASSWORD (min 8)
            </label>
            <input
              id="reg-password"
              name="new-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono focus:outline-none focus:border-[#00d4ff]"
            />
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded transition-colors ${
                        i < strength.score
                          ? strength.score <= 1
                            ? 'bg-[#ff4757]'
                            : strength.score === 2
                              ? 'bg-[#ffa502]'
                              : strength.score === 3
                                ? 'bg-[#2ed573]'
                                : 'bg-[#00d4ff]'
                          : 'bg-[#1e2538]'
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-[10px] font-mono ${
                    strength.score <= 1
                      ? 'text-[#ff4757]'
                      : strength.score === 2
                        ? 'text-[#ffa502]'
                        : 'text-[#7d8aa3]'
                  }`}
                >
                  {strength.label}
                  {strength.hint && ` — ${strength.hint}`}
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="reg-confirm" className="block text-[#7d8aa3] text-xs font-mono mb-2">
              CONFIRM PASSWORD
            </label>
            <input
              id="reg-confirm"
              name="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono focus:outline-none focus:border-[#00d4ff]"
            />
          </div>


          <div>
            <label className="block text-[#7d8aa3] text-xs font-mono mb-2">
              STARTING BALANCE (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono focus:outline-none focus:border-[#00d4ff]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#00d4ff] text-[#0a0e1a] rounded font-bold font-mono hover:bg-[#00b8e6] disabled:opacity-50 transition-colors"
          >
            {loading ? 'CREATING…' : 'CREATE ACCOUNT'}
          </button>

          <p className="text-center text-xs font-mono text-[#7d8aa3]">
            Already have one?{' '}
            <Link to="/login" className="text-[#00d4ff] hover:underline">
              LOG IN
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
