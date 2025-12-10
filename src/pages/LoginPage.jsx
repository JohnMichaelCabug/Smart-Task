import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { Activity } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity size={40} className="text-white" />
            <h1 className="text-4xl font-bold text-white">SmartTask</h1>
          </div>
          <p className="text-blue-100">Management System</p>
        </div>
        
        <LoginForm onLoginSuccess={onLoginSuccess} />
        
        <p className="text-center text-blue-100 mt-4">
          Don't have an account? <Link to="/register" className="text-white font-semibold hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}