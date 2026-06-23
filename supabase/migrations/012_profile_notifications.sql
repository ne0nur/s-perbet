-- Notification-Toggles Spalten zu profiles hinzufügen
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_anpfiff BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_chat BOOLEAN DEFAULT false;
