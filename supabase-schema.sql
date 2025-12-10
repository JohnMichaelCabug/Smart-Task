-- Supabase schema for core tables (users, tasks, reports, notifications, messages)
-- Run this in your Supabase project's SQL editor as the project owner.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
create table public.users (
  id uuid not null,
  email character varying(255) not null,
  full_name character varying(255) not null,
  role character varying(50) not null default 'guest'::character varying,
  status character varying(50) not null default 'pending'::character varying,
  bio text null,
  avatar_url text null,
  metadata jsonb null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Protect role/status changes (trigger function must exist in your policies SQL)
create trigger trg_protect_user_role_status BEFORE
update on users for EACH row
execute FUNCTION protect_user_role_status ();

-- Tasks table
create table public.tasks (
  id uuid not null default uuid_generate_v4(),
  user_id uuid not null,
  title character varying(255) not null,
  description text null,
  status character varying(50) null default 'pending'::character varying,
  priority character varying(50) null default 'medium'::character varying,
  due_date timestamp without time zone null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint tasks_pkey primary key (id),
  constraint tasks_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_tasks_user_id on public.tasks using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_tasks_status on public.tasks using btree (status) TABLESPACE pg_default;

-- Reports table
create table public.reports (
  id uuid not null default uuid_generate_v4(),
  user_id uuid not null,
  title character varying(255) not null,
  content text not null,
  report_type character varying(50) null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint reports_pkey primary key (id),
  constraint reports_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_reports_user_id on public.reports using btree (user_id) TABLESPACE pg_default;

-- Notifications table
create table public.notifications (
  id uuid not null default uuid_generate_v4(),
  user_id uuid not null,
  type character varying(50) not null,
  message text not null,
  related_id uuid null,
  read boolean null default false,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_notifications_user_id on public.notifications using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_notifications_read on public.notifications using btree (read) TABLESPACE pg_default;

-- Messages table
create table public.messages (
  id uuid not null default gen_random_uuid(),
  sender_id uuid not null,
  recipient_id uuid not null,
  message text not null,
  message_type character varying(50) null default 'user_message'::character varying,
  read boolean null default false,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint messages_pkey primary key (id),
  constraint messages_recipient_id_fkey foreign KEY (recipient_id) references users (id) on delete CASCADE,
  constraint messages_sender_id_fkey foreign KEY (sender_id) references users (id) on delete CASCADE,
  constraint no_self_message check ((sender_id <> recipient_id))
) TABLESPACE pg_default;

create index IF not exists idx_messages_sender_id on public.messages using btree (sender_id) TABLESPACE pg_default;
create index IF not exists idx_messages_recipient_id on public.messages using btree (recipient_id) TABLESPACE pg_default;
create index IF not exists idx_messages_created_at on public.messages using btree (created_at desc) TABLESPACE pg_default;
create index IF not exists idx_messages_sender_recipient on public.messages using btree (sender_id, recipient_id) TABLESPACE pg_default;

-- Function to validate message permissions based on roles
-- Rules: 
--   - Guests cannot send messages
--   - Admin & Staff can message each other
--   - Staff can message Clients
--   - Clients can message Staff
--   - Clients cannot message Admin or other Clients
CREATE OR REPLACE FUNCTION validate_message_permissions ()
RETURNS TRIGGER AS $$
DECLARE
  sender_role varchar;
  recipient_role varchar;
BEGIN
  -- Get sender and recipient roles
  SELECT role INTO sender_role FROM public.users WHERE id = NEW.sender_id;
  SELECT role INTO recipient_role FROM public.users WHERE id = NEW.recipient_id;

  -- Guests cannot send messages
  IF sender_role = 'guest' THEN
    RAISE EXCEPTION 'Guests cannot send messages';
  END IF;

  -- Admin & Staff can message each other
  IF (sender_role IN ('admin', 'staff') AND recipient_role IN ('admin', 'staff')) THEN
    RETURN NEW;
  END IF;

  -- Staff can message Clients
  IF (sender_role = 'staff' AND recipient_role = 'client') THEN
    RETURN NEW;
  END IF;

  -- Clients can message Staff
  IF (sender_role = 'client' AND recipient_role = 'staff') THEN
    RETURN NEW;
  END IF;

  -- All other combinations are not allowed
  RAISE EXCEPTION 'User with role % cannot message user with role %', sender_role, recipient_role;
END;
$$ LANGUAGE plpgsql;

-- Before insert trigger for messages with role-based validation
CREATE TRIGGER before_message_insert BEFORE INSERT on messages FOR EACH ROW
EXECUTE FUNCTION validate_message_permissions ();
