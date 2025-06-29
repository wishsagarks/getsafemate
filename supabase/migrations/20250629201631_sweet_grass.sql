/*
  # Add Telegram Bot Token to API Keys Table

  1. Changes
    - Add telegram_bot_token field to user_api_keys table
    - Maintain existing RLS policies
    - Support storing user-specific Telegram bot tokens

  2. Security
    - Maintain existing RLS policies
    - Ensure secure storage of API keys
*/

-- Add telegram_bot_token column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'telegram_bot_token'
  ) THEN
    ALTER TABLE user_api_keys ADD COLUMN telegram_bot_token text;
  END IF;
END $$;