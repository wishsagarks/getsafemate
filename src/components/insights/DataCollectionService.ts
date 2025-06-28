import { supabase } from '../../lib/supabase';

export interface MoodEntry {
  mood: 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy';
  energy_level: number;
  stress_level: number;
  notes?: string;
}

export interface ActivityLog {
  activity_type: 'breathing' | 'meditation' | 'movement' | 'mindfulness';
  activity_name: string;
  duration_seconds?: number;
  completed: boolean;
  mood_before?: string;
  mood_after?: string;
  notes?: string;
}

export interface SessionAnalytics {
  session_type: 'safewalk' | 'heartmate';
  duration_seconds: number;
  messages_exchanged?: number;
  voice_interactions?: number;
  video_calls?: number;
  emergency_triggers?: number;
  mood_improvement_score?: number;
  user_satisfaction?: number;
  location_shared?: boolean;
  safety_score?: number;
}

export interface SafetyEvent {
  event_type: 'sos_triggered' | 'emergency_contact_notified' | 'location_shared' | 'safe_arrival' | 'route_deviation' | 'panic_button';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location_lat?: number;
  location_lng?: number;
  location_accuracy?: number;
  emergency_contacts_notified?: number;
  response_time_seconds?: number;
  resolution_status?: 'resolved' | 'ongoing' | 'false_alarm' | 'escalated';
  notes?: string;
}

export class DataCollectionService {
  static async saveMoodEntry(userId: string, moodData: MoodEntry) {
    try {
      // Use insert instead of upsert to avoid constraint issues
      // First, check if an entry exists for today
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingEntry, error: checkError } = await supabase
        .from('mood_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('entry_date', today)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let result;
      if (existingEntry) {
        // Update existing entry
        const { data, error } = await supabase
          .from('mood_entries')
          .update({
            ...moodData,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('entry_date', today)
          .select();

        if (error) throw error;
        result = data;
      } else {
        // Insert new entry
        const { data, error } = await supabase
          .from('mood_entries')
          .insert({
            user_id: userId,
            ...moodData,
            entry_date: today
          })
          .select();

        if (error) throw error;
        result = data;
      }

      console.log('✅ Mood entry saved:', result);
      return result;
    } catch (error) {
      console.error('❌ Error saving mood entry:', error);
      throw error;
    }
  }

  static async logActivity(userId: string, activityData: ActivityLog) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          ...activityData
        });

      if (error) throw error;
      console.log('✅ Activity logged:', data);
      return data;
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      throw error;
    }
  }

  static async saveSessionAnalytics(userId: string, sessionId: string, analyticsData: SessionAnalytics) {
    try {
      // Use insert instead of upsert to avoid constraint issues
      // Generate a unique session ID if not provided
      const uniqueSessionId = sessionId || `session_${userId}_${Date.now()}`;
      
      const { data, error } = await supabase
        .from('session_analytics')
        .insert({
          user_id: userId,
          session_id: uniqueSessionId,
          ...analyticsData
        });

      if (error) throw error;
      console.log('✅ Session analytics saved:', data);
      return data;
    } catch (error) {
      console.error('❌ Error saving session analytics:', error);
      throw error;
    }
  }

  static async logSafetyEvent(userId: string, sessionId: string | null, eventData: SafetyEvent) {
    try {
      const { data, error } = await supabase
        .from('safety_events')
        .insert({
          user_id: userId,
          session_id: sessionId,
          ...eventData
        });

      if (error) throw error;
      console.log('✅ Safety event logged:', data);
      return data;
    } catch (error) {
      console.error('❌ Error logging safety event:', error);
      throw error;
    }
  }

  static async awardAchievement(userId: string, achievement: {
    achievement_type: 'streak' | 'milestone' | 'safety' | 'wellness' | 'social';
    achievement_name: string;
    achievement_description: string;
    badge_icon?: string;
    points_earned?: number;
  }) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          ...achievement
        });

      if (error) throw error;
      console.log('✅ Achievement awarded:', data);
      return data;
    } catch (error) {
      console.error('❌ Error awarding achievement:', error);
      throw error;
    }
  }

  static async getMoodHistory(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .order('entry_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching mood history:', error);
      return [];
    }
  }

  static async getActivityLogs(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching activity logs:', error);
      return [];
    }
  }

  static async getSessionAnalytics(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('session_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching session analytics:', error);
      return [];
    }
  }

  static async getUserAchievements(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching achievements:', error);
      return [];
    }
  }
}