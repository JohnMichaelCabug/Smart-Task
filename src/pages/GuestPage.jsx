// src/pages/GuestPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Users, FileText, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function GuestPage() {
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const features = [
    {
      id: 1,
      icon: Users,
      title: 'Role-Based Access',
      description: 'Admin, Staff, and Client roles with custom permissions',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 2,
      icon: Sparkles,
      title: 'AI Assistant',
      description: 'Get intelligent suggestions and insights for your tasks',
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 3,
      icon: FileText,
      title: 'PDF Reports',
      description: 'Generate and export professional reports instantly',
      color: 'from-orange-500 to-orange-600',
    },
    {
      id: 4,
      icon: CheckCircle,
      title: 'Task Management',
      description: 'Create, track, and manage tasks efficiently',
      color: 'from-green-500 to-green-600',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-lg backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-600/50 transition-all">
                <Zap size={24} className="text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white hidden sm:inline">SmartTask</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="px-6 py-2 text-gray-900 dark:text-white font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 py-20 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 animate-slide-in-left">
            Welcome to SmartTask <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">Management System</span>
          </h1>
          <p className="text-xl text-blue-100 mb-8 animate-slide-in-right">
            Organize your work with AI-powered insights and automation
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 group"
            >
              Get Started
              <ArrowRight size={20} className="group-hover:translate-x-1 transition" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition inline-flex items-center justify-center gap-2"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Everything you need to manage tasks efficiently</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className={`relative p-8 rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-pointer group animate-fade-in`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                  onMouseEnter={() => setHoveredFeature(feature.id)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition shadow-lg`}>
                    <Icon size={32} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands of users managing tasks efficiently with SmartTask</p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition shadow-lg hover:shadow-xl"
          >
            Register Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p>&copy; 2025 SmartTask Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}