import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('admin@dispatch.local');
  const [password, setPassword] = useState('Admin@1234');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-dispatch-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚑</div>
          <h1 className="text-2xl font-bold text-white">Emergency Dispatch System</h1>
          <p className="text-gray-400 text-sm mt-1">AI-Powered Ambulance Coordination</p>
        </div>

        {/* Card */}
        <div className="bg-dispatch-card border border-dispatch-border rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Admin Login</h2>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dispatch.local"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-600 text-center mt-4">
          Default: admin@dispatch.local / Admin@1234
        </p>
      </div>
    </div>
  );
}
