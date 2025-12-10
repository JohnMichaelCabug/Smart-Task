# Messaging System Documentation

## Overview

The SmartTask management system includes a comprehensive real-time messaging feature that allows users to communicate with each other based on their role permissions. The system includes role-based access control to ensure secure and appropriate communication channels.

## Features

### 1. **Role-Based Messaging Permissions**

The messaging system enforces strict role-based rules:

- **Admin & Staff**: Can message each other and clients
- **Staff**: Can message clients and other staff/admin
- **Clients**: Can only message staff members
- **Guests**: Cannot send or receive messages

### 2. **Real-Time Messaging**

- Instant message delivery using Supabase real-time subscriptions
- Live conversation updates
- Message read status tracking
- Automatic scrolling to latest messages

### 3. **Conversation Management**

- View all conversations at a glance
- Unread message counter
- Last message preview
- Search conversations by name or email
- Sort conversations by most recent

### 4. **Message Features**

- Send and receive text messages
- Timestamp for each message
- Message read indicators
- Message history between users
- Prevent users from messaging themselves

## Database Schema

### Messages Table

```sql
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text NOT NULL,
  message_type character varying(50) DEFAULT 'user_message'::character varying,
  read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT no_self_message CHECK ((sender_id <> recipient_id))
);
```

### Indexes

- `idx_messages_sender_id` - For querying messages sent by a user
- `idx_messages_recipient_id` - For querying messages received by a user
- `idx_messages_created_at` - For sorting messages by timestamp
- `idx_messages_sender_recipient` - For querying conversations between two users

### Validation Function

```sql
CREATE FUNCTION validate_message_permissions()
RETURNS TRIGGER AS $$
DECLARE
  sender_role varchar;
  recipient_role varchar;
BEGIN
  SELECT role INTO sender_role FROM public.users WHERE id = NEW.sender_id;
  SELECT role INTO recipient_role FROM public.users WHERE id = NEW.recipient_id;

  IF sender_role = 'guest' THEN
    RAISE EXCEPTION 'Guests cannot send messages';
  END IF;

  IF (sender_role IN ('admin', 'staff') AND recipient_role IN ('admin', 'staff')) THEN
    RETURN NEW;
  END IF;

  IF (sender_role = 'staff' AND recipient_role = 'client') THEN
    RETURN NEW;
  END IF;

  IF (sender_role = 'client' AND recipient_role = 'staff') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'User with role % cannot message user with role %', sender_role, recipient_role;
END;
$$ LANGUAGE plpgsql;
```

## Components

### 1. **ConversationsList Component**

Located at: `src/components/ConversationsList.jsx`

Display all user conversations with features:
- List of all active conversations
- Search functionality
- New conversation initiation
- Unread message badges
- Role-based user avatars

**Props:**
- `currentUserId` (string) - UUID of the current user
- `currentUserRole` (string) - Role of the current user (admin, staff, client, guest)
- `onSelectConversation` (function) - Callback when a conversation is selected

**Example Usage:**
```jsx
import ConversationsList from './components/ConversationsList';

<ConversationsList
  currentUserId={user.id}
  currentUserRole={user.role}
  onSelectConversation={(partnerId, partnerName) => {
    setSelectedPartner({ id: partnerId, name: partnerName });
  }}
/>
```

### 2. **MessagingComponent**

Located at: `src/components/MessagingComponent.jsx`

Display and manage individual conversations with:
- Message history between two users
- Real-time message updates
- Message input with send button
- Message timestamps
- Loading and error states

**Props:**
- `currentUserId` (string) - UUID of the current user
- `currentUserRole` (string) - Role of the current user
- `partnerUserId` (string) - UUID of the conversation partner
- `partnerName` (string) - Name of the conversation partner

**Example Usage:**
```jsx
import MessagingComponent from './components/MessagingComponent';

<MessagingComponent
  currentUserId={user.id}
  currentUserRole={user.role}
  partnerUserId={selectedPartner.id}
  partnerName={selectedPartner.name}
/>
```

## Services

### messagingService.js

Located at: `src/services/messagingService.js`

#### Core Functions

#### `getConversations(userId)`
Fetches all conversations for a user with unread counts and last message info.

```javascript
const conversations = await getConversations(userId);
// Returns: Array of conversation objects with partner info and unread count
```

#### `getMessages(userId, partnerId)`
Retrieves all messages between two users, sorted chronologically.

```javascript
const messages = await getMessages(userId, partnerId);
// Returns: Array of message objects
```

#### `sendMessage(senderId, recipientId, messageText)`
Sends a message from one user to another. Will throw error if role-based permissions are violated.

```javascript
try {
  await sendMessage(currentUserId, partnerId, 'Hello!');
} catch (error) {
  console.error('Cannot send message:', error.message);
  // May throw: "Guests cannot send messages"
  // May throw: "User with role X cannot message user with role Y"
}
```

#### `markMessagesAsRead(userId, senderId)`
Marks all messages from a sender as read for the current user.

```javascript
await markMessagesAsRead(currentUserId, partnerId);
```

#### `deleteMessage(messageId)`
Deletes a specific message permanently.

```javascript
await deleteMessage(messageId);
```

#### `getEligibleRecipients(userId, userRole)`
Fetches list of users the current user can message based on their role.

```javascript
const recipients = await getEligibleRecipients(userId, userRole);
// Returns: Array of eligible recipient users
```

#### `subscribeToMessages(userId, recipientId, callback)`
Subscribes to real-time message updates between two users.

```javascript
const channel = subscribeToMessages(userId, partnerId, (newMessage) => {
  console.log('New message received:', newMessage);
});

// Clean up when done
unsubscribeFromChannel(channel);
```

#### `subscribeToConversations(userId, callback)`
Subscribes to real-time updates for all conversations.

```javascript
const channel = subscribeToConversations(userId, (newMessage) => {
  console.log('New message in any conversation:', newMessage);
});
```

## Styling

### messaging.css
Styles for the MessagingComponent including:
- Message bubbles (sent/received)
- Input field styling
- Header and footer
- Real-time scroll behavior
- Dark theme with gradient backgrounds

### conversations.css
Styles for the ConversationsList including:
- Conversation items with avatars
- Search bar styling
- New conversation panel
- Unread badges
- Empty and loading states
- Dark theme with gradient backgrounds

## Implementation Guide

### Step 1: Add to Your Dashboard

```jsx
import { useState, useEffect } from 'react';
import ConversationsList from './components/ConversationsList';
import MessagingComponent from './components/MessagingComponent';
import { getCurrentUser } from './services/supabaseClient';

export default function MessagingPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
  }, []);

  if (!currentUser) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '300px', borderRight: '1px solid #ccc' }}>
        <ConversationsList
          currentUserId={currentUser.id}
          currentUserRole={currentUser.role}
          onSelectConversation={(partnerId, partnerName) => {
            setSelectedPartner({ id: partnerId, name: partnerName });
          }}
        />
      </div>
      <div style={{ flex: 1 }}>
        {selectedPartner ? (
          <MessagingComponent
            currentUserId={currentUser.id}
            currentUserRole={currentUser.role}
            partnerUserId={selectedPartner.id}
            partnerName={selectedPartner.name}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 2: Enable Row Level Security (RLS)

Create RLS policies for the messages table:

```sql
-- Policy: Users can only select messages they're involved in
CREATE POLICY messages_select_policy ON messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Policy: Users can only insert messages where they are the sender
CREATE POLICY messages_insert_policy ON messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can only update messages they received
CREATE POLICY messages_update_policy ON messages
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Policy: Users can only delete their own messages
CREATE POLICY messages_delete_policy ON messages
FOR DELETE
USING (auth.uid() = sender_id);
```

### Step 3: Error Handling

The system will raise database errors for invalid messaging attempts:

```javascript
try {
  await sendMessage(guestUserId, staffUserId, 'Hello');
} catch (error) {
  if (error.message.includes('Guests cannot send messages')) {
    // Show guest-specific error message
  } else if (error.message.includes('cannot message user')) {
    // Show permission denied message
  }
}
```

## Message Flow Diagram

```
User Initiates Message
       ↓
Check User Role → Guest? → Block (Return error)
       ↓ No
Check Recipient Role → Validate Permissions
       ↓
Valid Combination? → No → Block (Return error)
       ↓ Yes
Insert into messages table
       ↓
Trigger validate_message_permissions() → Double-check
       ↓ Valid
Insert succeeds
       ↓
Real-time subscription notifies recipient
       ↓
MessagingComponent updates with new message
       ↓
Message displays in conversation
```

## Security Considerations

1. **Role-Based Access Control**: Enforced at database level via triggers
2. **User Authentication**: Only authenticated users can access messaging
3. **Row Level Security**: Users can only see/modify their own messages
4. **Input Validation**: Message validation at service layer
5. **Foreign Key Constraints**: Users cannot message non-existent users
6. **Self-Message Prevention**: Database constraint prevents users from messaging themselves

## Troubleshooting

### Messages not appearing

1. Check that user roles are correctly set in the database
2. Verify real-time subscriptions are active
3. Ensure RLS policies are correctly configured
4. Check browser console for errors

### Permission errors

1. Verify user roles in the users table
2. Review `validate_message_permissions()` function
3. Check the message permission rules match your requirements
4. Ensure sender_id and recipient_id are valid UUIDs

### Performance issues

1. Indexes are in place on sender_id and recipient_id
2. Limit initial message fetch with pagination
3. Use real-time subscriptions instead of polling
4. Archive old messages periodically

## Future Enhancements

- Message encryption
- Media/file sharing in messages
- Group messaging
- Message reactions (emoji)
- Message editing/deletion history
- Read receipts (currently just read boolean)
- Message forwarding
- Message pinning
- Typing indicators
- Voice/video call integration
