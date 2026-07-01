-- Migration: Add app_settings to realtime publication for heartbeat sync
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
