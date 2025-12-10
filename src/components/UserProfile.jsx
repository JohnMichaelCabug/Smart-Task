import React, { useEffect, useState } from 'react';
import supabase, { taskService, notificationService } from '../services/supabaseClient';
import aiService from '../services/aiService';
import { pdfService } from '../services/pdfService';

export default function UserProfile({ userId, currentUser, onClose }) {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) throw error;
        if (!mounted) return;
        setUser(data);

        // fetch tasks for user (for reports/insights)
        const t = await taskService.getTasks(userId);
        if (!mounted) return;
        setTasks(t || []);
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [userId]);

  const handleGenerateInsights = async () => {
    setAiLoading(true);
    try {
      const result = await aiService.generateInsights(tasks || []);
      setInsights(result);
    } catch (err) {
      console.error('AI insights error:', err);
      setError(err.message || String(err));
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadSummary = async () => {
    try {
      if (!user) {
        throw new Error('No user loaded to generate summary');
      }
      const doc = pdfService.generateCustomReportPDF(`${user.full_name} - Personal Summary`, [
        { title: 'Profile', content: `Name: ${user.full_name}\nEmail: ${user.email}\nRole: ${user.role}\nStatus: ${user.status}` },
        { title: 'Bio', content: user.bio || 'No bio provided' },
        { title: 'Recent Tasks', content: tasks.slice(0, 10).map(t => `${t.title} — ${t.status} — ${t.priority}`) },
        { title: 'AI Insights', content: insights ? JSON.stringify(insights, null, 2) : 'No insights generated' }
      ]);

      // Render & download using react-pdf's PDFDownloadLink is left to the caller (component) or you can integrate PDF rendering in place.
      // For now, return the doc object so a parent component can render it.
      return doc;
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(err.message || String(err));
    }
  };

  if (!userId) return null;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold">User Profile</h3>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-gray-100 rounded" onClick={onClose}>Close</button>
        </div>
      </div>

      {loading ? (
        <p className="mt-4">Loading profile...</p>
      ) : error ? (
        <p className="mt-4 text-red-600">{error}</p>
      ) : user ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-4">
            <img src={user.avatar_url || '/default-avatar.png'} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
            <div>
              <div className="font-bold text-lg">{user.full_name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
              <div className="text-sm text-gray-500">Role: {user.role} • Status: {user.status}</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Bio</h4>
            <p className="text-sm text-gray-600">{user.bio || 'No bio provided'}</p>
          </div>

          <div>
            <h4 className="font-semibold">Recent Tasks</h4>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-600">No tasks</p>
            ) : (
              <ul className="text-sm text-gray-700 list-disc ml-5">
                {tasks.slice(0, 6).map(t => (
                  <li key={t.id}>{t.title} — {t.status} — {t.priority}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleGenerateInsights}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={aiLoading}
            >
              {aiLoading ? 'Generating...' : 'Generate AI Insights'}
            </button>

            <button
              onClick={async () => {
                const doc = await handleDownloadSummary();
                // Caller should render the PDF; store on window for dev convenience
                window.__lastGeneratedPDF = doc;
                alert('PDF document object created. Use react-pdf to render/download.');
              }}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Download Summary (PDF)
            </button>

            {/* Admin-only helper actions */}
            {currentUser && currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => {
                    // Signal parent to open stalk/conversations — parent should implement
                    const e = new CustomEvent('open-stalk', { detail: { userId } });
                    window.dispatchEvent(e);
                  }}
                  className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Stalk Conversations
                </button>

                <button
                  onClick={async () => {
                    setApproving(true);
                    try {
                      const { data, error } = await supabase.from('users').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', userId).select().single();
                      if (error) throw error;
                      // Update local state
                      setUser(prev => prev ? { ...prev, status: 'approved' } : prev);

                      // Create notification (use notificationService which is non-blocking)
                      try {
                        await notificationService.createNotification(userId, 'approval', 'Your account has been approved', userId);
                      } catch (nerr) {
                        console.warn('Notification creation failed (non-critical):', nerr);
                      }

                      alert('User approved and notified');
                    } catch (err) {
                      console.error('Approve user error:', err);
                      alert('Failed to approve user: ' + (err.message || String(err)));
                    } finally {
                      setApproving(false);
                    }
                  }}
                  className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  {approving ? 'Approving...' : 'Approve User'}
                </button>
              </>
            )}
          </div>

          {insights && (
            <div className="mt-4 bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <h4 className="font-semibold">AI Insights</h4>
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(insights, null, 2)}</pre>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
