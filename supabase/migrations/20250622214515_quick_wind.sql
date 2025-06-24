/*
  # Update user_api_keys table for Tavus integration

  1. Changes
    - Add livekit_ws_url field for WebSocket connection
    - Remove openai_api_key (using Gemini instead)
    - Keep gemini_api_key for LLM conversations
    - Update table structure for Tavus integration

  2. Security
    - Maintain existing RLS policies
    - Ensure secure storage of API keys
*/

-- Add livekit_ws_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'livekit_ws_url'
  ) THEN
    ALTER TABLE user_api_keys ADD COLUMN livekit_ws_url text;
  END IF;
END $$;

-- Remove openai_api_key column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'openai_api_key'
  ) THEN
    ALTER TABLE user_api_keys DROP COLUMN openai_api_key;
  END IF;
END $$;