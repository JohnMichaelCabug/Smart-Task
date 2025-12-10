import { supabase } from './supabaseClient';

// Get all conversations for the current user
export const getConversations = async (userId) => {
  try {
    // Get unique conversation partners (both senders and recipients)
    const { data, error } = await supabase
      .from('messages')
      .select('sender_id, recipient_id, created_at, read')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get unique user IDs from conversations
    const conversationUsers = new Set();
    data.forEach((msg) => {
      if (msg.sender_id !== userId) conversationUsers.add(msg.sender_id);
      if (msg.recipient_id !== userId) conversationUsers.add(msg.recipient_id);
    });

    // Fetch user details for conversation partners
    const userIds = Array.from(conversationUsers);
    if (userIds.length === 0) return [];

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, role, avatar_url')
      .in('id', userIds);

    if (userError) throw userError;

    // Map messages to conversation objects with last message and unread count
    const conversations = users.map((user) => {
      const userMessages = data.filter(
        (msg) =>
          (msg.sender_id === userId && msg.recipient_id === user.id) ||
          (msg.sender_id === user.id && msg.recipient_id === userId)
      );

      const lastMessage = userMessages[0];
      const unreadCount = userMessages.filter(
        (msg) => msg.recipient_id === userId && !msg.read
      ).length;

      return {
        partnerId: user.id,
        partnerName: user.full_name,
        partnerEmail: user.email,
        partnerRole: user.role,
        partnerAvatar: user.avatar_url,
        lastMessage: lastMessage,
        unreadCount,
      };
    });

    return conversations.sort(
      (a, b) =>
        new Date(b.lastMessage?.created_at || 0) -
        new Date(a.lastMessage?.created_at || 0)
    );
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

// Get messages between two users
export const getMessages = async (userId, partnerId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (senderId, recipientId, messageText) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: senderId,
          recipient_id: recipientId,
          message: messageText,
          message_type: 'user_message',
          read: false,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (userId, senderId) => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('recipient_id', userId)
      .eq('sender_id', senderId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Delete a message
export const deleteMessage = async (messageId) => {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Get eligible recipients based on user role
export const getEligibleRecipients = async (userId, userRole) => {
  try {
    let query = supabase.from('users').select('id, full_name, email, role, avatar_url');

    // Filter based on sender's role
    if (userRole === 'admin' || userRole === 'staff') {
      // Can message other admin/staff and clients
      query = query.or(`role.eq.admin,role.eq.staff,role.eq.client`);
    } else if (userRole === 'client') {
      // Can only message staff
      query = query.eq('role', 'staff');
    } else {
      // Guests cannot message anyone
      return [];
    }

    // Exclude the user themselves
    const { data, error } = await query.neq('id', userId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching eligible recipients:', error);
    throw error;
  }
};

// Subscribe to new messages in real-time
export const subscribeToMessages = (userId, recipientId, callback) => {
  const channel = supabase
    .channel(`messages_${userId}_${recipientId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(and(sender_id=eq.${userId},recipient_id=eq.${recipientId}),and(sender_id=eq.${recipientId},recipient_id=eq.${userId}))`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
};

// Subscribe to conversation updates in real-time
export const subscribeToConversations = (userId, callback) => {
  const channel = supabase
    .channel(`conversations_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(sender_id=eq.${userId},recipient_id=eq.${userId})`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
};

// Unsubscribe from a channel
export const unsubscribeFromChannel = (channel) => {
  return supabase.removeChannel(channel);
};
