# PrivateCircle: Supabase Setup Guide

This guide walks you through applying the database schema, configuring storage buckets, and verifying the setup for your PrivateCircle backend.

---

## 1. Apply the Database Schema in Supabase

1. Open your **[Supabase Project Dashboard](https://supabase.com/dashboard/project/bbbkznpyrxkrpbpeqkpg)**.
2. In the left navigation menu, click **SQL Editor** (icon looking like `>_` or SQL terminal).
3. Click **"+ New query"** (or use an empty query editor window).
4. Open [`supabase/schema.sql`](./schema.sql) in this repository, copy the entire content, and paste it into the Supabase SQL Editor.
5. Click **"Run"** (or press `Ctrl + Enter` / `Cmd + Enter`).
6. You will see `Success. No rows returned` in the output pane.

---

## 2. Verify Your Tables & Row-Level Security (RLS)

1. In the left navigation menu, click **Table Editor**.
2. Confirm that the following tables appear with an active green shield icon (indicating **RLS is enabled**):
   - `profiles`
   - `invitations`
   - `conversations`
   - `conversation_participants`
   - `messages`
   - `message_attachments`
   - `message_reactions`
   - `love_notes`
   - `relationship_milestones`
   - `memories`
   - `memory_comments`
   - `memory_reactions`
   - `calendar_events`
   - `call_logs`
   - `user_device_sessions`
   - `location_audit_logs`

---

## 3. Create Storage Buckets (Optional for Media)

To support photos, voice notes, and videos shorter than 60 seconds:

1. In the Supabase Dashboard, click **Storage** in the left menu.
2. Click **"New bucket"**:
   - **Bucket 1**: Name it `avatars` (Public bucket: **ON** or authenticated read).
   - **Bucket 2**: Name it `chat_media` (Public bucket: **OFF** - private).
   - **Bucket 3**: Name it `memories_vault` (Public bucket: **OFF** - private).
3. File size limit: 50 MB (ample for photos, voice notes, and <60s compressed videos).

---

## 4. Safety & Rollback Guarantee

- The SQL script uses `CREATE TABLE IF NOT EXISTS` and is fully idempotent (safe to run multiple times without deleting data).
- The existing frontend continues to run in mock mode until you explicitly choose to authenticate and sync live data.
