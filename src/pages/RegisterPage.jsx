// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/supabaseClient';
import { Mail, Lock, User, AlertCircle, CheckCircle, Loader, Shield } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('client');
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Admin registration code (you can change this to something else)
  const ADMIN_REGISTRATION_CODE = 'ADMIN2024';

  const validateForm = () => {
    if (!email || !password || !confirmPassword || !fullName) {
      setError('All fields are required');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (!email.includes('@')) {
      setError('Invalid email format');
      return false;
    }
    // Validate admin code if role is admin
    if (role === 'admin' && adminCode !== ADMIN_REGISTRATION_CODE) {
      setError('Invalid admin registration code');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { data, error: registerError } = await authService.register(
        email,
        password,
        fullName,
        role
      );

      if (registerError) {
        setError(registerError.message || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully! Logging you in...');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  const roles = [
    { value: 'client', label: '👤 Client', description: 'View personal tasks and insights', icon: User },
    { value: 'staff', label: '👨‍💼 Staff', description: 'Manage tasks and team collaboration', icon: User },
    { value: 'admin', label: '🔐 Admin', description: 'Full system access and administration', icon: Shield },
    { value: 'guest', label: '👁️ Guest', description: 'Browse before registering fully', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-slide-in-right">
        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create Account</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Join SmartTask Management System</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-start gap-3 animate-pulse">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg flex items-start gap-3 animate-fade-in">
              <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-green-700 dark:text-green-300 text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm">Full Name</label>
              <div className="flex items-center border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/20 transition-all">
                <User size={20} className="text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1 outline-none bg-transparent dark:text-white"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm">Email Address</label>
              <div className="flex items-center border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/20 transition-all">
                <Mail size={20} className="text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1 outline-none bg-transparent dark:text-white"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm">Password</label>
              <div className="flex items-center border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/20 transition-all">
                <Lock size={20} className="text-gray-400 dark:text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-1 outline-none bg-transparent dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm">Confirm Password</label>
              <div className="flex items-center border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/20 transition-all">
                <Lock size={20} className="text-gray-400 dark:text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-1 outline-none bg-transparent dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-3 text-sm">Select Your Role</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {roles.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      role === r.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{r.label}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Admin Code (shown only if admin role is selected) */}
            {role === 'admin' && (
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm">
                  🔐 Admin Registration Code
                </label>
                <div className="flex items-center border-2 border-orange-300 dark:border-orange-600 rounded-lg px-4 py-3 focus-within:border-orange-500 focus-within:shadow-lg focus-within:shadow-orange-500/20 transition-all bg-orange-50 dark:bg-orange-900/10">
                  <Shield size={20} className="text-orange-500" />
                  <input
                    type={showAdminCode ? 'text' : 'password'}
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="w-full px-3 py-1 outline-none bg-transparent dark:text-white"
                    placeholder="Enter admin code"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminCode(!showAdminCode)}
                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                  >
                    {showAdminCode ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  Enter the admin registration code provided by the system administrator.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-blue-600/50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Login here
            </Link>
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-white/20 dark:border-gray-700/50 text-white text-sm text-center">
          <p>🔒 Your data is secure and encrypted</p>
        </div>
      </div>
    </div>
  );
}