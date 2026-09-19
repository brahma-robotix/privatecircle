CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Circle Member',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  avatar_bg TEXT NOT NULL DEFAULT '#6366f1',
  bio TEXT DEFAULT '',
  partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  relationship_start_date DATE,
  location_settings JSONB NOT NULL DEFAULT '{"enabled": false, "audience": "off", "duration": "always"}'::jsonb,
  privacy_settings JSONB NOT NULL DEFAULT '{"whoCanContact": "circle", "profileVisibility": "circle", "onlineStatusVisibility": "circle", "lastSeenVisibility": "circle", "exactLocationEnabled": false, "approximateLocationEnabled": true, "allowedLocationUserIds": [], "externalTranslationConsent": false, "automaticTranslationEnabled": false, "discreetNotificationPreviews": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_partner ON public.profiles(partner_id);
