// src/components/LoginForm.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/supabaseClient';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: loginError } = await authService.login(email, password);
    
    if (loginError) {
      setError(loginError.message || 'Login failed');
      setLoading(false);
      return;
    }

    await onLoginSuccess();
    navigate('/');
  };

  return (
    <div className="w-full max-w-md animate-slide-in-right">
      <form onSubmit={handleLogin} className="bg-white dark:bg-gray-800 shadow-2xl rounded-xl p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-3xl font-bold mb-2 text-center text-gray-900 dark:text-white">SmartTask Login</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Access your dashboard</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-start gap-3 animate-shake">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </div>
        )}
        
        <div className="mb-5">
          <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm uppercase tracking-wider">Email</label>
          <div className="flex items-center border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/20 transition-all">
            <Mail size={20} className="text-gray-400 dark:text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full py-1 px-3 outline-none bg-transparent dark:text-white"
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm uppercase tracking-wider">Password</label>
          <div className="flex items-center border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/20 transition-all">
            <Lock size={20} className="text-gray-400 dark:text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full py-1 px-3 outline-none bg-transparent dark:text-white"
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-blue-600/50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging in...
            </span>
          ) : 'Login'}
        </button>
      </form>
    </div>
  );
}