import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  PieChart, 
  Activity,
  Heart,
  Shield,
  Award,
  MapPin,
  Clock,
  Users,
  Zap,
  Target,
  Star,
  Brain,
  Smile,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';

interface InsightData {
  totalSessions: number;
  totalDuration: number;
  averageMood: number;
  averageEnergy: number;
  averageStress: number;
  safetyScore: number;
  streakDays: number;
  achievements: number;
  moodTrend: 'improving' | 'stable' | 'declining';
  energyTrend: 'improving' | 'stable' | 'declining';
  stressTrend: 'improving' | 'stable' | 'declining';
}

interface MoodEntry {
  id: string;
  mood: string;
  energy_level: number;
  stress_level: number;
  entry_date: string;
  notes?: string;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  activity_name: string;
  duration_seconds: number;
  completed: boolean;
  created_at: string;
}

interface SessionAnalytics {
  id: string;
  session_type: string;
  duration_seconds: number;
  messages_exchanged: number;
  voice_interactions: number;
  video_calls: number;
  safety_score: number;
  created_at: string;
}

export function InsightsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (user) {
      loadInsightsData();
    }
  }, [user, timeRange]);

  const loadInsightsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Load mood entries
      const { data: moods, error: moodError } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .order('entry_date', { ascending: false });

      if (moodError) throw moodError;
      setMoodHistory(moods || []);

      // Load activity logs
      const { data: activities, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;
      setActivityLogs(activities || []);

      // Load session analytics
      const { data: sessions, error: sessionError } = await supabase
        .from('session_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (sessionError) throw sessionError;
      setSessionAnalytics(sessions || []);

      // Calculate insights
      calculateInsights(moods || [], activities || [], sessions || []);

    } catch (error) {
      console.error('Error loading insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateInsights = (
    moods: MoodEntry[], 
    activities: ActivityLog[], 
    sessions: SessionAnalytics[]
  ) => {
    // Calculate averages
    const moodScores = moods.map(m => getMoodScore(m.mood));
    const averageMood = moodScores.length > 0 ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : 0;
    
    const energyLevels = moods.map(m => m.energy_level);
    const averageEnergy = energyLevels.length > 0 ? energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length : 0;
    
    const stressLevels = moods.map(m => m.stress_level);
    const averageStress = stressLevels.length > 0 ? stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length : 0;

    // Calculate trends
    const moodTrend = calculateTrend(moodScores);
    const energyTrend = calculateTrend(energyLevels);
    const stressTrend = calculateTrend(stressLevels.map(s => 10 - s)); // Invert stress (lower is better)

    // Calculate other metrics
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
    const safetyScores = sessions.map(s => s.safety_score).filter(s => s > 0);
    const averageSafetyScore = safetyScores.length > 0 ? safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length : 0;

    // Calculate streak (consecutive days with mood entries)
    const streakDays = calculateMoodStreak(moods);

    setInsights({
      totalSessions: sessions.length,
      totalDuration,
      averageMood,
      averageEnergy,
      averageStress,
      safetyScore: averageSafetyScore,
      streakDays,
      achievements: activities.filter(a => a.completed).length,
      moodTrend,
      energyTrend,
      stressTrend
    });
  };

  const getMoodScore = (mood: string): number => {
    const scores = {
      'very-sad': 1,
      'sad': 2,
      'neutral': 3,
      'happy': 4,
      'very-happy': 5
    };
    return scores[mood as keyof typeof scores] || 3;
  };

  const calculateTrend = (values: number[]): 'improving' | 'stable' | 'declining' => {
    if (values.length < 4) return 'stable';
    
    const recent = values.slice(0, Math.floor(values.length / 2));
    const older = values.slice(Math.floor(values.length / 2));
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 0.3) return 'improving';
    if (diff < -0.3) return 'declining';
    return 'stable';
  };

  const calculateMoodStreak = (moods: MoodEntry[]): number => {
    if (moods.length === 0) return 0;
    
    const sortedMoods = [...moods].sort((a, b) => 
      new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < sortedMoods.length; i++) {
      const entryDate = new Date(sortedMoods[i].entry_date);
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'declining': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading your insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center space-x-3 mb-4"
          >
            <BarChart3 className="h-8 w-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Your SafeMate Insights</h1>
          </motion.div>
          <p className="text-neutral-400 mb-6">
            Comprehensive analytics of your safety and wellness journey
          </p>
          
          {/* Time Range Selector */}
          <div className="flex justify-center space-x-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-neutral-400 hover:bg-white/20'
                }`}
              >
                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>

        {insights && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
                <div className="p-6 text-center">
                  <Shield className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {insights.totalSessions}
                  </div>
                  <div className="text-sm text-blue-300">Total Sessions</div>
                </div>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
                <div className="p-6 text-center">
                  <Clock className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {formatDuration(insights.totalDuration)}
                  </div>
                  <div className="text-sm text-purple-300">Total Time</div>
                </div>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
                <div className="p-6 text-center">
                  <Target className="h-8 w-8 text-green-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {insights.streakDays}
                  </div>
                  <div className="text-sm text-green-300">Day Streak</div>
                </div>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
                <div className="p-6 text-center">
                  <Award className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {insights.achievements}
                  </div>
                  <div className="text-sm text-yellow-300">Activities Done</div>
                </div>
              </Card>
            </div>

            {/* Wellness Trends */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-black border-white/[0.2]">
                <div className="p-6">
                  <CardTitle className="text-white mb-4 flex items-center space-x-2">
                    <Smile className="h-5 w-5 text-pink-400" />
                    <span>Mood Trend</span>
                    {getTrendIcon(insights.moodTrend)}
                  </CardTitle>
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">
                      {insights.averageMood.toFixed(1)}
                    </div>
                    <div className="text-sm text-neutral-400 mb-4">Average Mood (out of 5)</div>
                    
                    <div className="w-full bg-white/20 rounded-full h-3 mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(insights.averageMood / 5) * 100}%` }}
                        transition={{ duration: 1 }}
                        className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
                      />
                    </div>
                    
                    <div className={`text-sm font-medium ${getTrendColor(insights.moodTrend)}`}>
                      {insights.moodTrend === 'improving' ? 'Improving' : 
                       insights.moodTrend === 'declining' ? 'Needs attention' : 'Stable'}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-black border-white/[0.2]">
                <div className="p-6">
                  <CardTitle className="text-white mb-4 flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <span>Energy Trend</span>
                    {getTrendIcon(insights.energyTrend)}
                  </CardTitle>
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">
                      {insights.averageEnergy.toFixed(1)}
                    </div>
                    <div className="text-sm text-neutral-400 mb-4">Average Energy (out of 10)</div>
                    
                    <div className="w-full bg-white/20 rounded-full h-3 mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(insights.averageEnergy / 10) * 100}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
                      />
                    </div>
                    
                    <div className={`text-sm font-medium ${getTrendColor(insights.energyTrend)}`}>
                      {insights.energyTrend === 'improving' ? 'Increasing' : 
                       insights.energyTrend === 'declining' ? 'Decreasing' : 'Stable'}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-black border-white/[0.2]">
                <div className="p-6">
                  <CardTitle className="text-white mb-4 flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-red-400" />
                    <span>Stress Trend</span>
                    {getTrendIcon(insights.stressTrend)}
                  </CardTitle>
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">
                      {insights.averageStress.toFixed(1)}
                    </div>
                    <div className="text-sm text-neutral-400 mb-4">Average Stress (out of 10)</div>
                    
                    <div className="w-full bg-white/20 rounded-full h-3 mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(insights.averageStress / 10) * 100}%` }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-3 rounded-full"
                      />
                    </div>
                    
                    <div className={`text-sm font-medium ${getTrendColor(insights.stressTrend)}`}>
                      {insights.stressTrend === 'improving' ? 'Reducing' : 
                       insights.stressTrend === 'declining' ? 'Increasing' : 'Stable'}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Activity Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mood History Chart */}
              <Card className="bg-black border-white/[0.2]">
                <div className="p-6">
                  <CardTitle className="text-white mb-6 flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    <span>Recent Mood History</span>
                  </CardTitle>
                  
                  {moodHistory.length > 0 ? (
                    <div className="space-y-3">
                      {moodHistory.slice(0, 7).map((entry, index) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              entry.mood === 'very-happy' ? 'bg-green-400' :
                              entry.mood === 'happy' ? 'bg-blue-400' :
                              entry.mood === 'neutral' ? 'bg-yellow-400' :
                              entry.mood === 'sad' ? 'bg-orange-400' : 'bg-red-400'
                            }`} />
                            <div>
                              <span className="text-white font-medium capitalize">
                                {entry.mood.replace('-', ' ')}
                              </span>
                              <div className="text-xs text-neutral-400">
                                {new Date(entry.entry_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-neutral-400">
                            E:{entry.energy_level} S:{entry.stress_level}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Smile className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
                      <p className="text-neutral-400">No mood data yet</p>
                      <p className="text-sm text-neutral-500">Start tracking your mood to see insights here</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Session Types Breakdown */}
              <Card className="bg-black border-white/[0.2]">
                <div className="p-6">
                  <CardTitle className="text-white mb-6 flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-purple-400" />
                    <span>Session Breakdown</span>
                  </CardTitle>
                  
                  {sessionAnalytics.length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(
                        sessionAnalytics.reduce((acc, session) => {
                          acc[session.session_type] = (acc[session.session_type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {type === 'safewalk' ? (
                              <Shield className="h-5 w-5 text-blue-400" />
                            ) : (
                              <Heart className="h-5 w-5 text-pink-400" />
                            )}
                            <span className="text-white capitalize">{type}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{count}</span>
                            <span className="text-xs text-neutral-400">sessions</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
                      <p className="text-neutral-400">No session data yet</p>
                      <p className="text-sm text-neutral-500">Start using SafeMate to see your activity</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Data Status */}
            <Card className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30">
              <div className="p-6">
                <CardTitle className="text-white mb-4 flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-blue-400" />
                  <span>Data Collection Status</span>
                </CardTitle>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="text-white font-medium">Mood Tracking</div>
                      <div className="text-xs text-neutral-400">{moodHistory.length} entries</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="text-white font-medium">Session Analytics</div>
                      <div className="text-xs text-neutral-400">{sessionAnalytics.length} sessions</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="text-white font-medium">Activity Logs</div>
                      <div className="text-xs text-neutral-400">{activityLogs.length} activities</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}