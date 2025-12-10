// src/pages/StaffDashboard.jsx
import { useState, useEffect } from 'react';
import { authService, taskService } from '../services/supabaseClient';
import { PDFDownloadLink } from '@react-pdf/renderer';
import aiService from '../services/aiService';
import { pdfService } from '../services/pdfService';
import Sidebar from '../components/Sidebar';
import AIChatAssistant from '../components/AIChatAssistant';
import { Plus, CheckCircle2, Sparkles, Download } from 'lucide-react';

export default function StaffDashboard({ user, onLogout, isAdminViewing = false, setViewingAsRole = null }) {
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [user.id]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const userTasks = await taskService.getTasks(user.id);
      console.log('✅ Staff tasks loaded:', userTasks);
      setTasks(Array.isArray(userTasks) ? userTasks : []);
    } catch (err) {
      console.error('❌ Error loading tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      alert('❌ Please enter a task title');
      return;
    }

    try {
      setLoading(true);
      const newTask = await taskService.createTask({
        user_id: user.id,
        title: newTaskTitle,
        description: newTaskDesc,
        status: 'pending',
        priority: 'medium',
        due_date: new Date().toISOString(),
      });

      console.log('✅ Task created:', newTask);
      setTasks([newTask, ...tasks]);
      setNewTaskTitle('');
      setNewTaskDesc('');
      alert('✅ Task created successfully!');
    } catch (err) {
      console.error('❌ Error creating task:', err);
      alert('Error creating task: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAISuggestions = async () => {
    if (!newTaskDesc.trim()) {
      alert('❌ Please describe a task first');
      return;
    }

    try {
      setLoading(true);
      const suggestions = await aiService.generateTaskSuggestions(newTaskDesc);
      console.log('✅ AI suggestions:', suggestions);
      setAiSuggestions(suggestions);
    } catch (err) {
      console.error('❌ Error getting AI suggestions:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await taskService.updateTask(taskId, { 
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      console.log('✅ Task updated:', taskId);
      await loadTasks();
    } catch (err) {
      console.error('❌ Error updating task:', err);
      alert('Error updating task: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await onLogout();
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} userRole="staff" />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-lg z-20">
          <div className="flex items-center justify-between">
            <div className="ml-16 md:ml-0">
              <h1 className="text-3xl font-bold">Staff Dashboard</h1>
              <p className="text-blue-100 mt-1">Welcome, {user?.full_name} | Manage your tasks efficiently</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Admin Viewing Banner */}
          {isAdminViewing && (
            <div className="absolute top-6 right-6 bg-yellow-500/20 border border-yellow-400 px-4 py-2 rounded-lg z-30">
              <p className="text-yellow-300 text-sm font-semibold">👁️ Admin Viewing - You are viewing as {user.role.toUpperCase()}</p>
              <button
                onClick={() => {
                  setViewingAsRole(null);
                  window.location.href = '/dashboard';
                }}
                className="mt-2 px-3 py-1 bg-yellow-500 text-gray-900 rounded text-xs font-semibold hover:bg-yellow-400 transition-all"
              >
                ← Back to Admin
              </button>
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Total Tasks', value: tasks.length, color: 'from-blue-500 to-blue-600' },
                  { label: 'Completed', value: completedCount, color: 'from-green-500 to-green-600' },
                  { label: 'In Progress', value: inProgressCount, color: 'from-orange-500 to-orange-600' },
                ].map((stat, idx) => (
                  <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white shadow-lg`}>
                    <p className="text-blue-100 text-sm font-medium">{stat.label}</p>
                    <p className="text-4xl font-bold mt-2">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Create Task Form */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-blue-200 dark:border-blue-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Plus size={24} className="text-blue-500" />
                  Create New Task
                </h2>
                <div className="mb-4">
                  <button onClick={() => setShowAIChat(true)} className="px-3 py-2 bg-indigo-600 text-white rounded">Open AI Assistant</button>
                </div>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Task Title *</label>
                    <input
                      type="text"
                      placeholder="Enter task title"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Description</label>
                    <textarea
                      placeholder="Describe your task (helpful for AI suggestions)"
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      {loading ? 'Creating...' : 'Create Task'}
                    </button>
                    <button
                      type="button"
                      onClick={getAISuggestions}
                      disabled={loading || !newTaskDesc.trim()}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles size={20} />
                      {loading ? 'Getting Help...' : 'Get AI Help'}
                    </button>
                  </div>
                </form>
              </div>

              {/* AI Suggestions */}
              {aiSuggestions && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40 rounded-lg p-6 border-2 border-purple-300 dark:border-purple-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles size={24} className="text-purple-500" />
                    AI Suggestions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Time</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{aiSuggestions.estimated_time || 'N/A'}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Priority Level</p>
                      <p className="text-lg font-bold text-red-500">{aiSuggestions.priority_level || 'Medium'}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Subtasks</p>
                      <p className="text-lg font-bold text-blue-500">{aiSuggestions.subtasks?.length || 0}</p>
                    </div>
                  </div>
                  {aiSuggestions.subtasks && aiSuggestions.subtasks.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">Suggested Subtasks:</h4>
                      <ul className="space-y-2">
                        {aiSuggestions.subtasks.map((subtask, idx) => (
                          <li key={idx} className="flex items-start gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg">
                            <span className="text-purple-500 font-bold">✓</span>
                            <span className="text-gray-700 dark:text-gray-300">{subtask}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {showAIChat && (
                <AIChatAssistant onClose={() => setShowAIChat(false)} />
              )}

              {/* Tasks List */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h2>
                {tasks.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                    <CheckCircle2 size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No tasks yet. Create one above!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {tasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-xl transition-all border-l-4 border-blue-500 animate-fade-in"
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
                                {task.status || 'pending'}
                              </span>
                              {task.priority && (
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority}
                                </span>
                              )}
                            </div>
                          </div>
                          <select
                            value={task.status || 'pending'}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                            className="ml-4 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-slide-in-right max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg text-center">
                <Download size={48} className="mx-auto text-blue-500 mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Generate Reports</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Download your task reports in PDF format.</p>
                {tasks.length > 0 ? (
                  <PDFDownloadLink
                    document={pdfService.generateTaskReportPDF(tasks, user.full_name)}
                    fileName={`${user.full_name}-tasks-report.pdf`}
                    className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    📄 Download My Tasks Report
                  </PDFDownloadLink>
                ) : (
                  <button disabled className="inline-block px-8 py-3 bg-gray-400 text-white font-semibold rounded-lg cursor-not-allowed">
                    No tasks to download
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}