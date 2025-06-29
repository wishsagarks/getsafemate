-- This migration adds default achievements for users who have already met the criteria

-- Add Streak Master achievement for users with 7+ day streaks
DO $$
DECLARE
  user_record RECORD;
  streak_days INTEGER;
  today DATE := CURRENT_DATE;
  entry_date DATE;
  last_date DATE;
BEGIN
  -- For each user
  FOR user_record IN SELECT DISTINCT user_id FROM mood_entries
  LOOP
    streak_days := 0;
    last_date := NULL;
    
    -- Calculate streak for this user
    FOR entry_date IN 
      SELECT DISTINCT mood_entries.entry_date 
      FROM mood_entries 
      WHERE mood_entries.user_id = user_record.user_id
      ORDER BY mood_entries.entry_date DESC
    LOOP
      IF last_date IS NULL THEN
        -- First entry
        last_date := entry_date;
        streak_days := 1;
      ELSIF last_date - entry_date = 1 THEN
        -- Consecutive day
        last_date := entry_date;
        streak_days := streak_days + 1;
      ELSE
        -- Break in streak
        EXIT;
      END IF;
    END LOOP;
    
    -- If streak is 7+ days and user doesn't already have the achievement
    IF streak_days >= 7 AND NOT EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_achievements.user_id = user_record.user_id 
      AND achievement_name = 'Streak Master'
    ) THEN
      -- Award Streak Master achievement
      INSERT INTO user_achievements (
        user_id, 
        achievement_type, 
        achievement_name, 
        achievement_description, 
        badge_icon, 
        points_earned,
        is_featured
      ) VALUES (
        user_record.user_id,
        'streak',
        'Streak Master',
        'Maintained a 7-day streak',
        'calendar',
        300,
        true
      );
    END IF;
  END LOOP;
END $$;

-- Add Safety Guardian achievement for users who have completed SafeWalk sessions
DO $$
DECLARE
  user_record RECORD;
  session_count INTEGER;
BEGIN
  -- For each user with SafeWalk sessions
  FOR user_record IN 
    SELECT user_id, COUNT(*) as session_count 
    FROM ai_sessions 
    WHERE session_type = 'safewalk' AND status = 'completed'
    GROUP BY user_id
    HAVING COUNT(*) >= 1
  LOOP
    -- If user doesn't already have the achievement
    IF NOT EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_achievements.user_id = user_record.user_id 
      AND achievement_name = 'Safety Guardian'
    ) THEN
      -- Award Safety Guardian achievement
      INSERT INTO user_achievements (
        user_id, 
        achievement_type, 
        achievement_name, 
        achievement_description, 
        badge_icon, 
        points_earned,
        is_featured
      ) VALUES (
        user_record.user_id,
        'safety',
        'Safety Guardian',
        'Completed your first SafeWalk journey',
        'shield',
        200,
        true
      );
    END IF;
    
    -- If user has 10+ sessions and doesn't have Journey Master achievement
    IF user_record.session_count >= 10 AND NOT EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_achievements.user_id = user_record.user_id 
      AND achievement_name = 'Journey Master'
    ) THEN
      -- Award Journey Master achievement
      INSERT INTO user_achievements (
        user_id, 
        achievement_type, 
        achievement_name, 
        achievement_description, 
        badge_icon, 
        points_earned,
        is_featured
      ) VALUES (
        user_record.user_id,
        'safety',
        'Journey Master',
        'Completed 10 SafeWalk journeys',
        'star',
        500,
        true
      );
    END IF;
  END LOOP;
END $$;

-- Add Heart Helper achievement for users who have completed HeartMate sessions
DO $$
DECLARE
  user_record RECORD;
  session_count INTEGER;
BEGIN
  -- For each user with HeartMate sessions
  FOR user_record IN 
    SELECT user_id, COUNT(*) as session_count 
    FROM ai_sessions 
    WHERE session_type = 'heartmate' AND status = 'completed'
    GROUP BY user_id
    HAVING COUNT(*) >= 1
  LOOP
    -- If user doesn't already have the achievement
    IF NOT EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_achievements.user_id = user_record.user_id 
      AND achievement_name = 'Heart Helper'
    ) THEN
      -- Award Heart Helper achievement
      INSERT INTO user_achievements (
        user_id, 
        achievement_type, 
        achievement_name, 
        achievement_description, 
        badge_icon, 
        points_earned,
        is_featured
      ) VALUES (
        user_record.user_id,
        'wellness',
        'Heart Helper',
        'Used HeartMate mode for the first time',
        'heart',
        200,
        false
      );
    END IF;
    
    -- If user has 10+ sessions and doesn't have Wellness Warrior achievement
    IF user_record.session_count >= 10 AND NOT EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_achievements.user_id = user_record.user_id 
      AND achievement_name = 'Wellness Warrior'
    ) THEN
      -- Award Wellness Warrior achievement
      INSERT INTO user_achievements (
        user_id, 
        achievement_type, 
        achievement_name, 
        achievement_description, 
        badge_icon, 
        points_earned,
        is_featured
      ) VALUES (
        user_record.user_id,
        'wellness',
        'Wellness Warrior',
        'Completed 10 HeartMate sessions',
        'heart',
        400,
        true
      );
    END IF;
  END LOOP;
END $$;

-- Add Mindfulness Beginner achievement for users who have completed activities
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- For each user with completed activities
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM activity_logs 
    WHERE completed = true
  LOOP
    -- If user doesn't already have the achievement
    IF NOT EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_achievements.user_id = user_record.user_id 
      AND achievement_name = 'Mindfulness Beginner'
    ) THEN
      -- Award Mindfulness Beginner achievement
      INSERT INTO user_achievements (
        user_id, 
        achievement_type, 
        achievement_name, 
        achievement_description, 
        badge_icon, 
        points_earned
      ) VALUES (
        user_record.user_id,
        'wellness',
        'Mindfulness Beginner',
        'Completed your first wellness activity',
        'sparkles',
        100
      );
    END IF;
  END LOOP;
END $$;

-- Add Mood Tracker achievement for users who have tracked their mood
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- For each user with mood entries
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM mood_entries
  LOOP
    -- If user doesn't already have the achievement
    IF NOT EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_achievements.user_id = user_record.user_id 
      AND achievement_name = 'Mood Tracker'
    ) THEN
      -- Award Mood Tracker achievement
      INSERT INTO user_achievements (
        user_id, 
        achievement_type, 
        achievement_name, 
        achievement_description, 
        badge_icon, 
        points_earned
      ) VALUES (
        user_record.user_id,
        'wellness',
        'Mood Tracker',
        'Tracked your mood for the first time',
        'smile',
        100
      );
    END IF;
  END LOOP;
END $$;