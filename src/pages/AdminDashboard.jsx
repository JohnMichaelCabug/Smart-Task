// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { authService, taskService, notificationService, messageService, activityService } from '../services/supabaseClient';
import aiService from '../services/aiService';
import { pdfService } from '../services/pdfService';
import Sidebar from '../components/Sidebar';
import UserProfile from '../components/UserProfile';
import { 
  TrendingUp, CheckCircle, Clock, AlertCircle, Zap, Users, FileText, 
  Settings, Download, Edit2, Trash2, Plus, Search, Filter, X,
  Activity, Shield, BarChart3, MessageSquare, Mail, Send, Eye
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';

export default function AdminDashboard({ user, onLogout, setViewingAsRole, viewingAsRole }) {
  // Core States
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Admin-specific states
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  // Messaging States
  const [showMessagingModal, setShowMessagingModal] = useState(false);
  const [messagingUser, setMessagingUser] = useState(null);
  const [userMessages, setUserMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  
  // Task Messaging States
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskMessages, setTaskMessages] = useState([]);
  const [taskMessageInput, setTaskMessageInput] = useState('');
  
  // Task Creation States
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    status: 'pending',
    due_date: ''
  });

  // Stalk/Conversations states
  const [showStalkModal, setShowStalkModal] = useState(false);
  const [stalkUser, setStalkUser] = useState(null);
  const [stalkConversations, setStalkConversations] = useState([]);
  const [selectedConversationPartner, setSelectedConversationPartner] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [stalkMessageInput, setStalkMessageInput] = useState('');

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [allTasks, allNotifications, allUsers] = await Promise.all([
        taskService.getAllTasks(),
        notificationService.getNotifications(user.id),
        authService.getAllUsers() // This will fetch all users from the table
      ]);
      
      console.log('📊 Loaded Tasks:', allTasks);
      console.log('📊 Loaded Users:', allUsers);
      console.log('📊 Loaded Notifications:', allNotifications);
      
      // Ensure we have arrays
      const tasksArray = Array.isArray(allTasks) ? allTasks : [];
      const usersArray = Array.isArray(allUsers) ? allUsers : [];
      const notificationsArray = Array.isArray(allNotifications) ? allNotifications : [];
      
      setTasks(tasksArray);
      setNotifications(notificationsArray);
      setUsers(usersArray); // Set all users here
      
      // Calculate system metrics
      if (tasksArray.length > 0) {
        const metrics = calculateSystemMetrics(tasksArray, usersArray);
        setSystemMetrics(metrics);
      }
      
      // Get pending approvals
      const pending = usersArray.filter(u => u.status === 'pending') || [];
      setPendingApprovals(pending);
      
      console.log('✅ All data loaded successfully');
    } catch (err) {
      console.error('❌ Error loading data:', err);
      alert('Error loading data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateSystemMetrics = (allTasks, allUsers) => {
    const completedCount = allTasks.filter(t => t.status === 'completed').length;
    const inProgressCount = allTasks.filter(t => t.status === 'in_progress').length;
    const pendingCount = allTasks.filter(t => t.status === 'pending').length;
    
    const totalUsers = allUsers?.length || 0;
    const staffCount = allUsers?.filter(u => u.role === 'staff').length || 0;
    const clientCount = allUsers?.filter(u => u.role === 'client').length || 0;
    
    const completionRate = allTasks.length > 0 
      ? Math.round((completedCount / allTasks.length) * 100) 
      : 0;

    return {
      totalTasks: allTasks.length,
      completedCount,
      inProgressCount,
      pendingCount,
      completionRate,
      totalUsers,
      staffCount,
      clientCount,
      averageTasksPerUser: totalUsers > 0 ? Math.round(allTasks.length / totalUsers) : 0,
    };
  };

  const getAssigneeName = (task) => {
    if (!task) return 'Unassigned';
    const assigneeId = task.user_id || task.assigned_to;
    if (!assigneeId) return 'Unassigned';
    const u = users.find(us => us.id === assigneeId);
    return u ? u.full_name : assigneeId;
  };

  const generateInsights = async () => {
    try {
      setLoading(true);
      const insightsData = await aiService.generateInsights(tasks);
      setInsights(insightsData);
    } catch (err) {
      console.error('Error generating insights:', err);
      alert('Error generating insights: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Report download handlers ---
  const downloadTasksReport = async () => {
    try {
      setLoading(true);
      const doc = pdfService.generateTaskReportPDF(tasks, 'All Tasks Report');
      await pdfService.downloadDocument(doc, 'tasks-report.pdf');
    } catch (err) {
      console.error('Error downloading tasks report:', err);
      alert('Error downloading tasks report: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const downloadUsersReport = async () => {
    try {
      setLoading(true);
      const doc = pdfService.generateAllUsersPDF(users, 'User Report - All Registered Users');
      await pdfService.downloadDocument(doc, 'users-report.pdf');
    } catch (err) {
      console.error('Error downloading users report:', err);
      alert('Error downloading users report: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const downloadAnalyticsReport = async () => {
    try {
      setLoading(true);
      const metrics = systemMetrics || calculateSystemMetrics(tasks, users);
      const doc = pdfService.generateAnalyticsReportPDF(metrics, 'Analytics Report - Performance Metrics');
      await pdfService.downloadDocument(doc, 'analytics-report.pdf');
    } catch (err) {
      console.error('Error downloading analytics report:', err);
      alert('Error downloading analytics report: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const downloadActivityReport = async () => {
    try {
      setLoading(true);
      // Fetch fuller system activity via activityService for a complete activity log
      const activity = await activityService.getSystemActivity({ limit: 500 });
      const doc = pdfService.generateActivityReportPDF({ tasks: activity.tasks, notifications: activity.notifications }, 'Activity Report - System Activity Log');
      await pdfService.downloadDocument(doc, 'activity-report.pdf');
    } catch (err) {
      console.error('Error downloading activity report:', err);
      alert('Error downloading activity report: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const generateSystemReport = async () => {
    try {
      setLoading(true);
      if (systemMetrics && tasks.length > 0) {
        const reportData = {
          ...systemMetrics,
          tasks: tasks.slice(0, 20),
          generatedAt: new Date().toLocaleDateString(),
          generatedBy: user?.full_name || 'Admin'
        };
        console.log('Report generated:', reportData);
        alert('Report generated successfully! Check the console.');
        return reportData;
      }
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskFormData.title.trim()) {
      alert('❌ Please enter a task title');
      return;
    }

    if (!taskFormData.assigned_to) {
      alert('❌ Please select a user to assign this task');
      return;
    }

    try {
      setLoading(true);
      
      // Find the user to get their ID
      const assignedUser = users.find(u => u.id === taskFormData.assigned_to);
      
      if (!assignedUser) {
        alert('❌ Selected user not found');
        return;
      }

      const newTask = {
        title: taskFormData.title,
        description: taskFormData.description || '',
        priority: taskFormData.priority,
        status: taskFormData.status,
        user_id: taskFormData.assigned_to, // This is the foreign key that links to users table
        due_date: taskFormData.due_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Creating task:', newTask);
      
      const createdTask = await taskService.createTask(newTask);
      console.log('✅ Task created successfully:', createdTask);

      // Notify the user
      await notificationService.createNotification(
        assignedUser.id,
        'task_assigned',
        `📋 New task assigned to you: "${taskFormData.title}"`,
        createdTask.id
      );

      alert('✅ Task created and assigned successfully!');
      setShowCreateTaskModal(false);
      
      // Reset form
      setTaskFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        assigned_to: '',
      });
      
      // Reload data
      await loadAllData();
    } catch (err) {
      console.error('❌ Error creating task:', err);
      alert('Error creating task: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      setLoading(true);
      const updated = await authService.approveUser(userId, 'staff');
      console.log('User approved:', updated);

      // Optimistically update local state to reflect approval
      setUsers(prev => prev.map(u => u.id === userId ? ({ ...u, role: updated?.role || 'staff', status: 'approved' }) : u));
      setPendingApprovals(prev => prev.filter(u => u.id !== userId));

      alert('User approved successfully!');
      // Refresh data in background
      loadAllData();
    } catch (err) {
      console.error('Error approving user:', err);
      alert('Error approving user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      setLoading(true);
      await authService.rejectUser(userId);
      console.log('User rejected:', userId);
      alert('User rejected and removed!');
      loadAllData();
    } catch (err) {
      console.error('Error rejecting user:', err);
      alert('Error rejecting user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin 'stalk' function: fetch conversations for a user (admin-only visibility)
  const handleStalkUser = async (userId) => {
    try {
      setLoading(true);
      const convos = await messageService.getConversations(userId);
      setStalkConversations(convos || []);
      const u = users.find(x => x.id === userId) || { id: userId, full_name: userId };
      setStalkUser(u);
      setSelectedConversationPartner(convos && convos.length > 0 ? convos[0].partnerId : null);
      // load first conversation messages if exists
      if (convos && convos.length > 0) {
        await openConversationMessages(userId, convos[0].partnerId);
      }
      setShowStalkModal(true);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      alert('Error fetching conversations: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const openConversationMessages = async (userId, partnerId) => {
    try {
      setConversationLoading(true);
      setSelectedConversationPartner(partnerId);
      const msgs = await messageService.getMessages(userId, partnerId);
      setConversationMessages(msgs || []);
    } catch (err) {
      console.error('Error loading messages for conversation:', err);
      setConversationMessages([]);
      alert('Error loading messages: ' + (err.message || err));
    } finally {
      setConversationLoading(false);
    }
  };

  const sendStalkMessage = async (recipientId) => {
    if (!stalkMessageInput.trim()) return;
    try {
      setConversationLoading(true);
      // send as admin (current user)
      const sent = await messageService.sendMessage(user.id, recipientId, stalkMessageInput, 'admin_message');
      // append locally
      setConversationMessages(prev => [...prev, sent]);
      setStalkMessageInput('');
    } catch (err) {
      console.error('Error sending stalk message:', err);
      const details = err && err.message ? err.message : JSON.stringify(err, Object.getOwnPropertyNames(err));
      alert('Error sending message: ' + details);
    } finally {
      setConversationLoading(false);
    }
  };

  // User Messaging Functions
  const openUserMessaging = (targetUser) => {
    setMessagingUser(targetUser);
    setUserMessages([
      { id: 1, sender: 'Admin', text: 'Hello! How can I help you?', timestamp: new Date().toLocaleTimeString() }
    ]);
    setShowMessagingModal(true);
  };

  const sendUserMessage = async () => {
    if (!messageInput.trim()) return;

    // Prevent sending to self
    if (messagingUser.id === user.id) {
      alert('❌ You cannot send messages to yourself');
      return;
    }

    // Check if recipient is guest (non-admins cannot message guests)
    if (messagingUser.role === 'guest' && user.role !== 'admin') {
      alert('❌ Cannot send messages to guest accounts');
      return;
    }

    try {
      const newMessage = {
        id: userMessages.length + 1,
        sender: 'Admin',
        senderRole: 'admin',
        text: messageInput,
        timestamp: new Date().toLocaleTimeString()
      };

      setUserMessages(prev => [...prev, newMessage]);

      // Use the messageService to save the message
      await messageService.sendMessage(user.id, messagingUser.id, messageInput, 'admin_message');

      // Update users state if needed (no-op for messages but keep UI in sync)
      setUsers(prev => prev.map(u => u.id === messagingUser.id ? { ...u } : u));

      // Auto-response simulation
      setTimeout(() => {
        const responses = [
          `Thanks for the update! I'll get back to you soon.`,
          `Got it, I'll look into that.`,
          `Understood! I appreciate the feedback.`,
          `Thanks for letting me know!`
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        setUserMessages(prev => [...prev, {
          id: prev.length + 1,
          sender: messagingUser.full_name,
          senderRole: messagingUser.role,
          text: randomResponse,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }, 1000);

      setMessageInput('');
    } catch (err) {
      console.error('❌ Error sending message:', err);
      // Show full error details to help debugging
      const details = err && err.message ? err.message : JSON.stringify(err, Object.getOwnPropertyNames(err));
      alert('Error sending message: ' + details);
    }
  };

  // Task Messaging Functions
  const openTaskMessaging = (task) => {
    setSelectedTask(task);
    setTaskMessages([
      { id: 1, sender: 'System', text: `Task created: ${task.title}`, timestamp: new Date().toLocaleTimeString() }
    ]);
    setShowTaskModal(true);
  };

  const sendTaskMessage = () => {
    if (!taskMessageInput.trim()) return;

    // Check if task assignee is guest
    const assignedUser = users.find(u => u.id === selectedTask.user_id);
    if (assignedUser && assignedUser.role === 'guest') {
      alert('❌ Cannot send messages about tasks assigned to guests');
      return;
    }

    const newMessage = {
      id: taskMessages.length + 1,
      sender: 'Admin',
      senderRole: 'admin',
      text: taskMessageInput,
      timestamp: new Date().toLocaleTimeString()
    };

    setTaskMessages(prev => [...prev, newMessage]);

    try {
      // Create notification for task assignee
      if (selectedTask.user_id) {
        notificationService.createNotification(
          selectedTask.user_id,
          'task_update',
          `Comment on task "${selectedTask.title}": ${taskMessageInput}`,
          selectedTask.id
        );
      }

      setTimeout(() => {
        setTaskMessages(prev => [...prev, {
          id: prev.length + 1,
          sender: 'System',
          senderRole: 'system',
          text: '✅ Comment recorded in task history',
          timestamp: new Date().toLocaleTimeString()
        }]);
      }, 500);

      setTaskMessageInput('');
    } catch (err) {
      console.error('❌ Error sending task message:', err);
    }
  };

  const handleAIChat = async () => {
    if (!chatInput.trim()) return;
    
    try {
      setChatMessages(prev => [...prev, { role: 'user', content: chatInput }]);
      const userMessage = chatInput;
      setChatInput('');
      
      const response = await aiService.chatAssistant(userMessage, 
        `You are an admin assistant helping manage a task management system. System metrics: ${systemMetrics ? JSON.stringify(systemMetrics) : 'No metrics available'}`
      );
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      console.error('Error in AI chat:', err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error processing request. Please try again.' }]);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleLogout = async () => {
    await onLogout();
  };

  const stats = systemMetrics || {
    totalTasks: tasks.length,
    completedCount: tasks.filter(t => t.status === 'completed').length,
    inProgressCount: tasks.filter(t => t.status === 'in_progress').length,
    pendingCount: tasks.filter(t => t.status === 'pending').length,
    totalUsers: users.length,
    staffCount: users.filter(u => u.role === 'staff').length,
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} userRole="admin" />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-lg z-20">
          <div className="flex items-center justify-between">
            <div className="ml-16 md:ml-0">
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-blue-100 mt-1">Welcome back, {user?.full_name} | Full System Access Enabled</p>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={24} className="text-yellow-300" />
              <span className="text-sm font-semibold">ADMIN</span>
            </div>
          </div>
        </div>

        {/* Admin View Toggle Buttons */}
        {user?.role === 'admin' && (
          <div className="bg-gray-800 border-b border-gray-700 px-6 md:px-8 py-3 flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 text-sm font-medium">View As:</span>
            <button
              onClick={() => setViewingAsRole && setViewingAsRole(null)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-blue-600 text-white"
            >
              👨‍💼 Admin Dashboard
            </button>
            <button
              onClick={() => setViewingAsRole && setViewingAsRole('staff')}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all"
            >
              👷 Staff View
            </button>
            <button
              onClick={() => setViewingAsRole && setViewingAsRole('client')}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all"
            >
              👤 Client View
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Admin View Toggle Buttons */}
          {user?.role === 'admin' && (
            <div className="bg-gray-800 border-b border-gray-700 px-6 md:px-8 py-3 flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 text-sm font-medium">View As:</span>
              <button
                onClick={() => setViewingAsRole && setViewingAsRole(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-blue-600 text-white"
              >
                👨‍💼 Admin Dashboard
              </button>
              <button
                onClick={() => setViewingAsRole && setViewingAsRole('staff')}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all"
              >
                👷 Staff View
              </button>
              <button
                onClick={() => setViewingAsRole && setViewingAsRole('client')}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all"
              >
                👤 Client View
              </button>
            </div>
          )}

          {/* ===== DASHBOARD TAB ===== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* System Overview Stats */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">System Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Tasks', value: stats.totalTasks, icon: Zap, color: 'from-blue-500 to-blue-600' },
                    { label: 'Completed', value: stats.completedCount, icon: CheckCircle, color: 'from-green-500 to-green-600' },
                    { label: 'In Progress', value: stats.inProgressCount, icon: Clock, color: 'from-orange-500 to-orange-600' },
                    { label: 'Pending', value: stats.pendingCount, icon: AlertCircle, color: 'from-red-500 to-red-600' },
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
              </div>

              {/* User Statistics */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">User Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-purple-500 to-purple-600' },
                    { label: 'Staff Members', value: stats.staffCount, icon: Activity, color: 'from-indigo-500 to-indigo-600' },
                    { label: 'Clients', value: stats.clientCount || 0, icon: Mail, color: 'from-cyan-500 to-cyan-600' },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={idx}
                        className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-100 text-sm font-medium">{stat.label}</p>
                            <p className="text-4xl font-bold mt-2">{stat.value}</p>
                          </div>
                          <Icon size={40} className="opacity-30" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Approvals Alert */}
              {pendingApprovals.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-yellow-600" size={24} />
                    <div>
                      <h3 className="font-bold text-yellow-800 dark:text-yellow-300">{pendingApprovals.length} Pending User Approvals</h3>
                      <p className="text-yellow-700 dark:text-yellow-400 text-sm">Review and approve/reject new accounts</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Tasks */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp size={24} />
                    Recent Tasks (All Users)
                  </h2>
                  <button
                    onClick={() => setShowCreateTaskModal(true)}
                    className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Create Task
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {tasks.slice(0, 10).map((task, idx) => (
                        <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{task.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{getAssigneeName(task)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => openTaskMessaging(task)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                              title="Message about task"
                            >
                              <MessageSquare size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== AI INSIGHTS TAB ===== */}
          {activeTab === 'insights' && (
            <div className="space-y-6 animate-slide-in-right">
              <div className="flex gap-4 mb-6 flex-wrap">
                <button
                  onClick={generateInsights}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/50 flex items-center gap-2"
                >
                  <BarChart3 size={20} />
                  {loading ? 'Generating AI Insights...' : 'Generate AI Insights'}
                </button>
                <button
                  onClick={generateSystemReport}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/50 flex items-center gap-2"
                >
                  <FileText size={20} />
                  Generate Report
                </button>
              </div>

              {insights && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Performance Score */}
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all">
                    <p className="text-purple-100 text-sm font-medium mb-2">System Performance Score</p>
                    <p className="text-5xl font-bold">{insights.performance_score || 85}<span className="text-2xl">/100</span></p>
                    <div className="mt-4 w-full bg-purple-700 rounded-full h-2">
                      <div className="bg-purple-300 h-2 rounded-full transition-all duration-500" style={{ width: `${insights.performance_score || 85}%` }} />
                    </div>
                  </div>

                  {/* Trends */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">System Trends</h3>
                    <ul className="space-y-2">
                      {insights.trends?.map((trend, idx) => (
                        <li key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
                          <span className="text-blue-500 font-bold mt-1">→</span>
                          <span className="text-gray-700 dark:text-gray-300">{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Patterns */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Detected Patterns</h3>
                    <ul className="space-y-2">
                      {insights.patterns?.map((pattern, idx) => (
                        <li key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
                          <span className="text-orange-500 font-bold mt-1">◆</span>
                          <span className="text-gray-700 dark:text-gray-300">{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg md:col-span-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">AI Recommendations</h3>
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

              {/* AI Chat Assistant */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MessageSquare size={24} />
                  AI Chat Assistant
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 h-64 overflow-y-auto mb-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 h-full flex items-center justify-center">
                      <p>Start a conversation with the AI assistant</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAIChat()}
                    placeholder="Ask AI for assistance..."
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAIChat}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send size={18} />
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== USER MANAGEMENT TAB ===== */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-slide-in-right">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h2>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="client">Client</option>
                  <option value="guest">Guest</option>
                </select>
                {/* ADD THIS REFRESH BUTTON */}
                <button
                  onClick={async () => {
                    const allUsers = await authService.getAllUsers();
                    setUsers(allUsers);
                    console.log('📊 All Users Refreshed:', allUsers);
                    alert(`✅ Loaded ${allUsers?.length || 0} users. Check console for details.`);
                  }}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-semibold transition-all"
                >
                  🔄 Refresh Users
                </button>
              </div>

              {/* Pending Approvals Section */}
              {pendingApprovals.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-300 mb-4 flex items-center gap-2">
                    <AlertCircle size={20} />
                    Pending User Approvals ({pendingApprovals.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingApprovals.map((pendingUser) => (
                      <div key={pendingUser.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{pendingUser.full_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{pendingUser.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveUser(pendingUser.id)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all text-sm font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(pendingUser.id)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all text-sm font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Users List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Users size={24} />
                    All Users ({filteredUsers.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredUsers.map((usr, idx) => (
                        <tr key={usr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{usr.full_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{usr.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              {usr.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              usr.status === 'approved' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                            }`}>
                              {usr.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                                        <button
                                          onClick={() => openUserMessaging(usr)}
                                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                          title="Message user"
                                        >
                                          <MessageSquare size={18} />
                                        </button>
                                        <button
                                          onClick={() => handleStalkUser(usr.id)}
                                          className="text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                                          title="Inspect conversations"
                                        >
                                          <Eye size={18} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            // open create task modal pre-filled for this user
                                            setTaskFormData(prev => ({ ...prev, assigned_to: usr.id, title: '' }));
                                            setShowCreateTaskModal(true);
                                          }}
                                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                          title="Create task for user"
                                        >
                                          <Plus size={18} />
                                        </button>
                            <button
                                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                          title="View profile"
                                        >
                                          <Eye size={18} />
                                        </button>
                                        {/* Hide destructive admin actions when viewing as another role */}
                                        {(!viewingAsRole || viewingAsRole === null) && (
                                          <>
                                            <button
                                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                              title="Delete user"
                                            >
                                              <Trash2 size={18} />
                                            </button>
                                          </>
                                        )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== REPORTS TAB ===== */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-slide-in-right">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">System Reports</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Report Cards */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FileText className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Task Report</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">All tasks and assignments</p>
                    </div>
                  </div>
                  <button onClick={downloadTasksReport} className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center justify-center gap-2">
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Users className="text-green-600 dark:text-green-400" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">User Report</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">All registered users</p>
                    </div>
                  </div>
                  <button onClick={downloadUsersReport} className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex items-center justify-center gap-2">
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <BarChart3 className="text-purple-600 dark:text-purple-400" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Analytics Report</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Performance metrics</p>
                    </div>
                  </div>
                  <button onClick={downloadAnalyticsReport} className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all flex items-center justify-center gap-2">
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Activity className="text-orange-600 dark:text-orange-400" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Activity Report</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">System activity log</p>
                    </div>
                  </div>
                  <button onClick={downloadActivityReport} className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all flex items-center justify-center gap-2">
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="bg-gradient-to-r from-slate-600 to-slate-800 p-8 rounded-lg text-white">
                <h3 className="text-2xl font-bold mb-6">Report Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-slate-300 text-sm">Total Tasks</p>
                    <p className="text-4xl font-bold">{stats.totalTasks}</p>
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm">Completion Rate</p>
                    <p className="text-4xl font-bold">{stats.completionRate || 0}%</p>
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm">Total Users</p>
                    <p className="text-4xl font-bold">{stats.totalUsers}</p>
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm">Avg Tasks/User</p>
                    <p className="text-4xl font-bold">{stats.averageTasksPerUser || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== STALK / CONVERSATIONS MODAL ===== */}
      {showStalkModal && stalkUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex">
            {/* Left: conversation list */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Conversations for {stalkUser.full_name}</h3>
                <button onClick={() => setShowStalkModal(false)} className="text-gray-500">Close</button>
              </div>
              {stalkConversations.length === 0 ? (
                <p className="text-sm text-gray-500">No conversations found.</p>
              ) : (
                stalkConversations.map((c) => {
                  const partner = users.find(u => u.id === c.partnerId) || { full_name: c.partnerId };
                  return (
                    <button
                      key={c.partnerId}
                      onClick={() => openConversationMessages(stalkUser.id, c.partnerId)}
                      className={`w-full text-left p-3 rounded-lg mb-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedConversationPartner === c.partnerId ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{partner.full_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{c.lastMessage?.message?.slice(0, 60) || 'No messages yet'}</p>
                        </div>
                        <div className="text-xs text-gray-400">{c.messageCount}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right: messages */}
            <div className="w-2/3 flex flex-col">
              {/* Inline profile card for the stalked user */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <UserProfile userId={stalkUser.id} currentUser={user} onClose={() => {}} />
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h4 className="font-semibold">{selectedConversationPartner ? (users.find(u => u.id === selectedConversationPartner)?.full_name || selectedConversationPartner) : 'Select a conversation'}</h4>
                <div className="text-sm text-gray-500">{conversationLoading ? 'Loading...' : ''}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                {conversationMessages.length === 0 ? (
                  <p className="text-sm text-gray-500">No messages in this conversation.</p>
                ) : (
                  conversationMessages.map((m, idx) => (
                    <div key={m.id || idx} className={`max-w-xl px-4 py-2 rounded-lg ${m.sender_id === user.id ? 'ml-auto bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                      <p className="text-sm">{m.message || m.text}</p>
                      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{new Date(m.created_at || m.timestamp || Date.now()).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input
                  type="text"
                  value={stalkMessageInput}
                  onChange={(e) => setStalkMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && selectedConversationPartner && sendStalkMessage(selectedConversationPartner)}
                  placeholder="Send message as admin..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none"
                />
                <button
                  onClick={() => selectedConversationPartner && sendStalkMessage(selectedConversationPartner)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CREATE TASK MODAL ===== */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Task</h2>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Task Title *</label>
                <input
                  type="text"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})}
                  placeholder="Enter task title"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Description</label>
                <textarea
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                  placeholder="Enter task description"
                  rows="3"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Priority</label>
                <select
                  value={taskFormData.priority}
                  onChange={(e) => setTaskFormData({...taskFormData, priority: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Status</label>
                <select
                  value={taskFormData.status}
                  onChange={(e) => setTaskFormData({...taskFormData, status: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Assign To */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Assign To * ({users.length} available)
                </label>
                <select
                  value={taskFormData.assigned_to}
                  onChange={(e) => setTaskFormData({...taskFormData, assigned_to: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a user...</option>
                  {users && users.length > 0 ? (
                    users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role}) - {u.status}
                      </option>
                    ))
                  ) : (
                    <option disabled>No users available</option>
                  )}
                </select>
                {users.length === 0 && (
                  <p className="text-red-500 text-sm mt-2">⚠️ No users found. Load data first.</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Due Date</label>
                <input
                  type="date"
                  value={taskFormData.due_date}
                  onChange={(e) => setTaskFormData({...taskFormData, due_date: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-semibold disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== USER MESSAGING MODAL ===== */}
      {showMessagingModal && messagingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-96 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Message: {messagingUser.full_name}
              </h2>
              <button
                onClick={() => setShowMessagingModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {userMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'Admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender === 'Admin'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'Admin' ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendUserMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendUserMessage}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2 font-semibold"
              >
                <Send size={18} />
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TASK MESSAGING MODAL ===== */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-96 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Task: {selectedTask.title}
              </h2>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            {/* Task Details */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Status</p>
                  <p className="font-semibold text-gray-900 dark:text-white mt-1">{selectedTask.status}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Priority</p>
                  <p className="font-semibold text-gray-900 dark:text-white mt-1">{selectedTask.priority}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Assigned To</p>
                  <p className="font-semibold text-gray-900 dark:text-white mt-1">{getAssigneeName(selectedTask)}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {taskMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'Admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender === 'Admin'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    <p className="text-xs font-semibold mb-1">{msg.sender}</p>
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'Admin' ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex gap-2">
              <input
                type="text"
                value={taskMessageInput}
                onChange={(e) => setTaskMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendTaskMessage()}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendTaskMessage}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2 font-semibold"
              >
                <Send size={18} />
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}