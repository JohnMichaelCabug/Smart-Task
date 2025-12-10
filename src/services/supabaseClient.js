// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const authService = {
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (userError) throw userError;
      return { data: user, error: null };
    } catch (error) {
      console.error('❌ Login error:', error.message);
      return { data: null, error };
    }
  },

  async register(email, password, fullName, role = 'guest') {
    let authUserId = null;
    
    try {
      console.log('🔐 Starting registration for:', email);
      console.log('📋 User data:', { email, fullName, role });

      // Step 1: Sign up user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (authError) {
        console.error('❌ Auth signup error:', authError);
        throw new Error(authError.message || 'Failed to create auth account');
      }

      if (!authData.user) {
        throw new Error('Auth user creation failed - no user ID returned');
      }

      authUserId = authData.user.id;
      console.log('✅ Auth user created with ID:', authUserId);
      console.log('🔑 Auth data:', JSON.stringify(authData, null, 2));

      // Step 2: Retry logic with longer delays for RLS policy sync
      let lastError = null;
      
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          // Exponential backoff: 2s, 4s, 6s, 8s
          const delay = attempt * 2000;
          console.log(`\n⏳ Waiting ${delay}ms before attempt ${attempt}/4...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          console.log(`\n📝 Attempt ${attempt}: Creating user record...`);
          
          const userData = {
            id: authUserId,
            email: email,
            full_name: fullName,
            role: role,
            status: 'approved', // All users are approved automatically
          };

          console.log('📤 Inserting data:', JSON.stringify(userData, null, 2));

          const { data: user, error: insertError } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
          
          if (insertError) {
            lastError = insertError;
            console.error(`\n❌ Attempt ${attempt} FAILED:`);
            console.error('Error Code:', insertError.code);
            console.error('Error Message:', insertError.message);
            console.error('Full Error:', JSON.stringify(insertError, null, 2));
            
            // Handle specific errors
            if (insertError.code === '23505') {
              console.error('🔴 UNIQUE CONSTRAINT VIOLATION - Email already exists');
              throw new Error('Email already registered. Please use a different email.');
            }
            
            if (insertError.code === '42501') {
              console.error('🔴 PERMISSION DENIED (RLS) - Check policies');
              throw new Error('Database access denied. RLS policy issue. Contact admin.');
            }
            
            if (insertError.message.includes('permission') || insertError.message.includes('deny')) {
              console.error('🔴 PERMISSION DENIED - RLS blocking operation');
              throw new Error('RLS policy is blocking this operation.');
            }
            
            // For other errors, retry
            if (attempt < 4) {
              console.warn(`⚠️ Will retry... (${4 - attempt} attempts remaining)`);
              continue;
            } else {
              throw insertError;
            }
          }

          console.log('\n✅ User record created successfully!');
          console.log('📊 Created user:', JSON.stringify(user, null, 2));

          // Step 3: Create notification (non-critical)
          try {
            console.log('\n📬 Creating notification...');
            const { data: adminUsers } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'admin')
              .limit(1);

            if (adminUsers && adminUsers.length > 0) {
              await notificationService.createNotification(
                adminUsers[0].id,
                'registration',
                `New ${role} registration: ${fullName} (${email})`,
                authUserId
              );
              console.log('✅ Notification created');
            } else {
              console.log('ℹ️ No admin found for notification');
            }
          } catch (notifErr) {
            console.warn('⚠️ Notification failed (non-critical):', notifErr.message);
          }

          return { data: user, error: null };

        } catch (err) {
          lastError = err;
          if (attempt === 4 || 
              err.message.includes('already registered') || 
              err.message.includes('Database access denied') ||
              err.code === '23505' ||
              err.code === '42501') {
            throw err;
          }
        }
      }

      throw lastError || new Error('Failed to create user record after 4 attempts');

    } catch (error) {
      console.error('\n🔴 REGISTRATION FAILED');
      console.error('Error Message:', error.message);
      console.error('Error Code:', error.code);
      console.error('Full Error:', error);
      
      // Cleanup
      if (authUserId) {
        try {
          console.log('\n🧹 Cleaning up auth user...');
          await supabase.auth.signOut();
          console.log('✅ Auth cleanup complete');
        } catch (cleanupErr) {
          console.warn('⚠️ Cleanup failed:', cleanupErr.message);
        }
      }

      return { 
        data: null, 
        error: {
          message: error.message,
          code: error.code,
        }
      };
    }
  },

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ Logout error:', error);
      return { error };
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('ℹ️ No authenticated user');
        return null;
      }
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('❌ Error fetching user data:', userError.message);
        return null;
      }
      
      return userData;
    } catch (error) {
      console.error('❌ Get current user error:', error);
      return null;
    }
  },

  async updateUserRole(userId, newRole) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          role: newRole, 
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select(); // Remove .single() - just get the array
    
      if (error) throw error;
    
      // Get the first updated user record
      const updatedUser = Array.isArray(data) && data.length > 0 ? data[0] : data;
    
      console.log('✅ User role updated:', updatedUser);
    
      // Create notification
      await notificationService.createNotification(
        userId,
        'role_update',
        `Your role has been updated to ${newRole}`,
        userId
      );

      return updatedUser;
    } catch (error) {
      console.error('❌ Update role error:', error);
      throw error;
    }
  },

  async approveUser(userId, newRole = 'staff') {
    return authService.updateUserRole(userId, newRole);
  },

  async rejectUser(userId) {
    try {
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (deleteError) throw deleteError;
      
      console.log('✅ User rejected and deleted:', userId);
    } catch (error) {
      console.error('❌ Reject user error:', error);
      throw error;
    }
  },

  async getPendingUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get pending users error:', error);
      return [];
    }
  },

  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
    
      if (error) {
        console.error('❌ Get all users error:', error);
        throw error;
      }
    
      console.log('✅ All users fetched:', data);
      return data || [];
    } catch (error) {
      console.error('❌ Error in getAllUsers:', error.message);
      return [];
    }
  },

  async getUsersByRole(role) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false });
    
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get users by role error:', error);
      return [];
    }
  },

  async getAssignableUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, status')
        .neq('role', 'admin') // Exclude admin users from assignment
        .eq('status', 'approved') // Only approved users
        .order('full_name', { ascending: true });
    
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get assignable users error:', error);
      return [];
    }
  },
};

export const taskService = {
  async getTasks(userId, filters = {}) {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);
      
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.priority) query = query.eq('priority', filters.priority);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get tasks error:', error);
      return [];
    }
  },

  async createTask(taskData) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Create task error:', error);
      throw error;
    }
  },

  async updateTask(taskId, updates) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Update task error:', error);
      throw error;
    }
  },

  async deleteTask(taskId) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    } catch (error) {
      console.error('❌ Delete task error:', error);
      throw error;
    }
  },

  async getAllTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get all tasks error:', error);
      return [];
    }
  },
};

export const reportService = {
  async createReport(reportData) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert([reportData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Create report error:', error);
      throw error;
    }
  },

  async getReports(userId) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get reports error:', error);
      return [];
    }
  },

  async getAllReports() {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get all reports error:', error);
      return [];
    }
  },
};

export const notificationService = {
  async getNotifications(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      return [];
    }
  },

  async markNotificationAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    } catch (error) {
      console.error('❌ Mark notification error:', error);
      throw error;
    }
  },

  async createNotification(userId, type, message, relatedId = null) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type,
          message,
          related_id: relatedId,
          read: false,
        }]);
      
      if (error) throw error;
    } catch (error) {
      console.error('⚠️ Create notification error:', error);
      // Don't throw - notifications are non-critical
    }
  },
};

export const messageService = {
  async sendMessage(senderId, recipientId, message, messageType = 'user_message') {
    try {
      // Prevent sending messages to self before hitting DB constraint
      if (senderId === recipientId) {
        throw new Error('Cannot send a message to yourself');
      }
      // Check sender role - only allow non-guests
      const { data: sender, error: senderError } = await supabase
        .from('users')
        .select('role')
        .eq('id', senderId)
        .single();
      
      if (senderError || !sender) {
        throw new Error('Sender not found or invalid');
      }

      // Guests cannot send messages
      if (sender.role === 'guest') {
        throw new Error('❌ Guests are not allowed to send messages');
      }

      // Recipients: if recipient is a guest, only allow admin senders to message them
      const { data: recipient, error: recipientError } = await supabase
        .from('users')
        .select('role')
        .eq('id', recipientId)
        .single();
      
      if (recipientError || !recipient) {
        throw new Error('Recipient not found or invalid');
      }

      if (recipient.role === 'guest' && sender.role !== 'admin') {
        throw new Error('❌ Cannot send messages to guest accounts unless you are an admin');
      }

      // Create message record (if you have a messages table)
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: senderId,
          recipient_id: recipientId,
          message: message,
          message_type: messageType,
          read: false,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      // Create notification for recipient
      await notificationService.createNotification(
        recipientId,
        'new_message',
        `New message from: ${message.substring(0, 50)}...`,
        data.id
      );

      return data;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      // If Supabase returned a structured error object, include its details in the thrown Error
      const msg = (error && (error.message || error.error_description || error.details)) ?
        (error.message || error.error_description || JSON.stringify(error)) : String(error);
      throw new Error(msg);
    }
  },

  async getMessages(userId, recipientId) {
    try {
      // Check user role - only non-guests can access messages
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (userError || !user || user.role === 'guest') {
        throw new Error('❌ Guests cannot access messages');
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      return [];
    }
  },

  async markMessageAsRead(messageId) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('⚠️ Mark message read error:', error);
    }
  },

  async getConversations(userId) {
    try {
      // Check user role first
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (userError || !user || user.role === 'guest') {
        throw new Error('❌ Guests cannot access conversations');
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversations = new Map();
      data.forEach(msg => {
        const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, []);
        }
        conversations.get(partnerId).push(msg);
      });

      return Array.from(conversations.entries()).map(([partnerId, messages]) => ({
        partnerId,
        lastMessage: messages[messages.length - 1],
        messageCount: messages.length,
      }));
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      return [];
    }
  },
};

export const activityService = {
  async getSystemActivity({ limit = 200 } = {}) {
    try {
      // Fetch recent tasks, notifications and messages in parallel
      const [tasksRes, notifsRes, msgsRes] = await Promise.all([
        supabase.from('tasks').select('*').order('updated_at', { ascending: false }).limit(limit),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit),
        supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(limit),
      ]);

      const tasks = tasksRes.data || [];
      const notifications = notifsRes.data || [];
      const messages = msgsRes.data || [];

      // Simple merged timeline: combine and sort by timestamp (created_at/updated_at)
      const timeline = [];

      tasks.forEach(t => timeline.push({ type: 'task', id: t.id, title: t.title, status: t.status, priority: t.priority, timestamp: t.updated_at || t.created_at }));
      notifications.forEach(n => timeline.push({ type: 'notification', id: n.id, message: n.message, notifType: n.type, timestamp: n.created_at }));
      messages.forEach(m => timeline.push({ type: 'message', id: m.id, sender_id: m.sender_id, recipient_id: m.recipient_id, message: m.message, timestamp: m.created_at }));

      timeline.sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      });

      return { tasks, notifications, messages, timeline };
    } catch (error) {
      console.error('❌ Get system activity error:', error);
      return { tasks: [], notifications: [], messages: [], timeline: [] };
    }
  }
};

export default supabase;
