// src/pages/ClientDashboard.jsx
import { useState, useEffect } from 'react';
import { authService, taskService } from '../services/supabaseClient';
import aiService from '../services/aiService';
import Sidebar from '../components/Sidebar';
import { MessageCircle, TrendingUp, CheckCircle2, Clock, Send } from 'lucide-react';

export default function ClientDashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const userTasks = await taskService.getTasks(user.id);
      setTasks(userTasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const getInsights = async () => {
    try {
      setLoading(true);
      const data = await aiService.generateInsights(tasks);
      setInsights(data);
    } catch (err) {
      console.error('Error getting insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const askAssistant = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory([...chatHistory, { role: 'user', message: userMessage }]);

    try {
      setLoading(true);
      // Pass tasks data to AI for context-aware responses
      const systemPrompt = `You are a helpful task management assistant. Here are the user's current tasks:
${tasks.map(t => `- ${t.title}: ${t.description} (Status: ${t.status})`).join('\n')}

Use this context to provide relevant and personalized responses about their tasks. Be concise and helpful.`;
      
      const response = await aiService.chatAssistant(userMessage, systemPrompt);
      setChatHistory(prev => [...prev, { role: 'assistant', message: response }]);
      setChatResponse(response);
    } catch (err) {
      console.error('Error:', err);
      setChatHistory(prev => [...prev, { role: 'assistant', message: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await onLogout();
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} userRole="client" />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-lg z-20">
          <div className="flex items-center justify-between">
            <div className="ml-16 md:ml-0">
              <h1 className="text-3xl font-bold">Welcome, {user?.full_name}!</h1>
              <p className="text-blue-100 mt-1">Track your tasks and get AI-powered insights</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Total Tasks', value: tasks.length, icon: Clock, color: 'from-blue-500 to-blue-600' },
                  { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'from-green-500 to-green-600' },
                  { label: 'In Progress', value: pendingCount, icon: TrendingUp, color: 'from-orange-500 to-orange-600' },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in cursor-pointer group`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm font-medium">{stat.label}</p>
                          <p className="text-4xl font-bold mt-2 group-hover:scale-110 transition-transform">{stat.value}</p>
                        </div>
                        <Icon size={40} className="opacity-30 group-hover:opacity-50 transition-opacity" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tasks List */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Tasks</h2>
                {tasks.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                    <CheckCircle2 size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No tasks yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {tasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-xl transition-all hover:translate-x-2 hover:-translate-y-1 animate-fade-in border-l-4 border-blue-500"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{task.title}</h4>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">{task.description}</p>
                            <div className="flex gap-2 mt-4">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Insights Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp size={28} className="text-blue-500" />
                    AI Insights
                  </h2>
                  <button
                    onClick={getInsights}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/50"
                  >
                    {loading ? 'Generating...' : 'Get Insights'}
                  </button>
                </div>

                {insights && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-in-right">
                    {/* Performance Score */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all md:col-span-2">
                      <p className="text-purple-100 text-sm font-medium mb-2">Overall Performance Score</p>
                      <div className="flex items-center justify-between">
                        <p className="text-5xl font-bold">{insights.performance_score || 85}<span className="text-2xl">/100</span></p>
                        <div className="text-right">
                          <p className="text-purple-100 text-sm">Keep it up! 🎉</p>
                        </div>
                      </div>
                      <div className="mt-4 w-full bg-purple-700 rounded-full h-3">
                        <div className="bg-purple-300 h-3 rounded-full transition-all duration-500" style={{ width: `${insights.performance_score || 85}%` }} />
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg md:col-span-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recommendations</h3>
                      <ul className="space-y-2">
                        {insights.recommendations?.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                            <span className="text-green-500 font-bold mt-1">✓</span>
                            <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Chat Assistant */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle size={28} className="text-blue-500" />
                  AI Assistant Chat
                </h2>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  {/* Chat History */}
                  <div className="h-80 overflow-y-auto mb-4 space-y-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    {chatHistory.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">Start a conversation with the AI assistant!</p>
                    ) : (
                      chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.role === 'user' 
                              ? 'bg-blue-500 text-white rounded-br-none' 
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-bl-none'
                          }`}>
                            {msg.message}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && askAssistant()}
                      placeholder="Ask me about your tasks, insights, performance..."
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={askAssistant}
                      disabled={loading || !chatMessage.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/50"
                    >
                      <Send size={20} />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6 animate-slide-in-right">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">All Tasks</h2>
              {tasks.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                  <CheckCircle2 size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No tasks yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-xl transition-all hover:translate-x-2 hover:-translate-y-1 animate-fade-in border-l-4 border-blue-500"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">{task.title}</h4>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">{task.description}</p>
                      <div className="flex gap-2 mt-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}