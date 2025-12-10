// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/supabaseClient';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import StaffDashboard from './pages/StaffDashboard';
import GuestPage from './pages/GuestPage';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingAsRole, setViewingAsRole] = useState(null); // Admin viewing as different role

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.log('Not authenticated');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    await checkAuth();
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setViewingAsRole(null); // Reset viewing role
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-800">
        <div className="text-center">
          <div className="animate-spin inline-block">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-white rounded-full"></div>
          </div>
          <p className="text-white mt-4 text-lg">Loading SmartTask...</p>
        </div>
      </div>
    );
  }

  // Determine which dashboard to show
  const getDashboard = () => {
    if (!user) {
      return <Navigate to="/login" />;
    }

    // Admin can view any dashboard
    if (user.role === 'admin') {
      // If admin is viewing as a specific role, show that dashboard
      if (viewingAsRole === 'staff') {
        return <StaffDashboard user={user} onLogout={handleLogout} isAdminViewing={true} setViewingAsRole={setViewingAsRole} />;
      } else if (viewingAsRole === 'client') {
        return <ClientDashboard user={user} onLogout={handleLogout} isAdminViewing={true} setViewingAsRole={setViewingAsRole} />;
      }
      // Default: show admin dashboard
      return <AdminDashboard user={user} onLogout={handleLogout} setViewingAsRole={setViewingAsRole} viewingAsRole={viewingAsRole} />;
    }
    
    // Staff see staff dashboard
    if (user.role === 'staff') {
      return <StaffDashboard user={user} onLogout={handleLogout} />;
    }
    
    // Clients see client dashboard
    if (user.role === 'client') {
      return <ClientDashboard user={user} onLogout={handleLogout} />;
    }
    
    // Guests see guest page
    return <GuestPage />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <GuestPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        <Route path="/dashboard" element={getDashboard()} />
        
        {/* Admin view routes */}
        <Route
          path="/dashboard/staff"
          element={
            user && user.role === 'admin' ? (
              <StaffDashboard user={user} onLogout={handleLogout} isAdminViewing={true} setViewingAsRole={setViewingAsRole} />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route
          path="/dashboard/client"
          element={
            user && user.role === 'admin' ? (
              <ClientDashboard user={user} onLogout={handleLogout} isAdminViewing={true} setViewingAsRole={setViewingAsRole} />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
      </Routes>
    </Router>
  );
}