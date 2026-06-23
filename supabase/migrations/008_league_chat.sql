-- Make match_id nullable in chat_nachrichten to support league-wide chat
ALTER TABLE chat_nachrichten ALTER COLUMN match_id DROP NOT NULL;
