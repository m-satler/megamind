import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Activity, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-6">
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
            <LogIn size={18} className="text-[#00d4ff]" />
            LOG IN
          </h2>

          {error && (
            <div className="p-3 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded text-[#ff4757] font-mono text-xs">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-[#7d8aa3] text-xs font-mono mb-2">
              EMAIL
            </label>
            <input
              id="login-email"
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
            <label htmlFor="login-password" className="block text-[#7d8aa3] text-xs font-mono mb-2">
              PASSWORD
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono focus:outline-none focus:border-[#00d4ff]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#00d4ff] text-[#0a0e1a] rounded font-bold font-mono hover:bg-[#00b8e6] disabled:opacity-50 transition-colors"
          >
            {loading ? 'AUTHENTICATING…' : 'LOG IN'}
          </button>

          <p className="text-center text-xs font-mono text-[#7d8aa3]">
            No account?{' '}
            <Link to="/register" className="text-[#00d4ff] hover:underline">
              REGISTER
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
