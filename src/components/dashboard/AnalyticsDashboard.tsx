import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Shield, 
  Heart, 
  Award, 
  Star,
  Clock,
  MapPin,
  Activity,
  Target,
  Zap,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { Button } from '../ui/aceternity-button';
import { MoodChart } from './MoodChart';
import { SafetyScoreChart } from './SafetyScoreChart';
import { ActivityCalendar } from './ActivityCalendar';
import { AchievementProgress } from './AchievementProgress';
import { useNavigate } from 'react-router-dom';

interface AnalyticsData {
  safeJourneys: number;
  aiChats: number;
  streakDays: number;
  totalTime: number;
  moodAverage: number;
  safetyScore: number;
  completedActivities: number;
  emergencyEvents: number;
  level: number;
  xp: number;
  nextLevelXp: number;
}

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    safeJourneys: 0,
    aiChats: 0,
    streakDays: 0,
    totalTime: 0,
    moodAverage: 0,
    safetyScore: 0,
    completedActivities: 0,
    emergencyEvents: 0,
    level: 1,
    xp: 0,
    nextLevelXp: 1000
  });
  const [moodHistory, setMoodHistory] = useState<any[]>([]);
  const [safetyHistory, setSafetyHistory] = useState<any[]>([]);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user, timeRange]);

  const loadAnalyticsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Load session analytics
      const { data: sessions, error: sessionsError } = await supabase
        .from('session_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Load mood entries
      const { data: moods, error: moodsError } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .order('entry_date', { ascending: false });

      if (moodsError) throw moodsError;
      setMoodHistory(moods || []);

      // Load activity logs
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;
      setActivityHistory(activities || []);

      // Load safety events
      const { data: safetyEvents, error: safetyError } = await supabase
        .from('safety_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (safetyError) throw safetyError;
      setSafetyHistory(safetyEvents || []);

      // Load achievements
      const { data: userAchievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (achievementsError) throw achievementsError;
      setAchievements(userAchievements || []);

      // Calculate analytics data
      const safeWalkSessions = sessions?.filter(s => s.session_type === 'safewalk') || [];
      const heartMateSessions = sessions?.filter(s => s.session_type === 'heartmate') || [];
      
      const totalSafeJourneys = safeWalkSessions.length;
      const totalAiChats = heartMateSessions.length;
      const totalDuration = (sessions || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      
      // Calculate mood average
      const moodScores = (moods || []).map(m => getMoodScore(m.mood));
      const avgMood = moodScores.length > 0 
        ? moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length 
        : 0;
      
      // Calculate safety score
      const safetyScores = (sessions || [])
        .filter(s => s.safety_score)
        .map(s => s.safety_score);
      const avgSafetyScore = safetyScores.length > 0 
        ? safetyScores.reduce((sum, score) => sum + score, 0) / safetyScores.length 
        : 0;
      
      // Calculate streak
      const streak = calculateStreak(moods || []);
      
      // Calculate XP and level
      const totalXP = calculateTotalXP(
        totalSafeJourneys, 
        totalAiChats, 
        (activities || []).filter(a => a.completed).length,
        streak,
        (userAchievements || []).length
      );
      
      const { level, xp, nextLevelXp } = calculateLevel(totalXP);

      setAnalyticsData({
        safeJourneys: totalSafeJourneys,
        aiChats: totalAiChats,
        streakDays: streak,
        totalTime: totalDuration,
        moodAverage: avgMood,
        safetyScore: avgSafetyScore,
        completedActivities: (activities || []).filter(a => a.completed).length,
        emergencyEvents: (safetyEvents || []).length,
        level,
        xp,
        nextLevelXp
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodScore = (mood: string): number => {
    const scores: Record<string, number> = {
      'very-sad': 1,
      'sad': 2,
      'neutral': 3,
      'happy': 4,
      'very-happy': 5
    };
    return scores[mood] || 3;
  };

  const calculateStreak = (moods: any[]): number => {
    if (moods.length === 0) return 0;
    
    const sortedMoods = [...moods].sort((a, b) => 
      new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedMoods.length; i++) {
      const entryDate = new Date(sortedMoods[i].entry_date);
      entryDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const calculateTotalXP = (
    safeJourneys: number,
    aiChats: number,
    activities: number,
    streak: number,
    achievements: number
  ): number => {
    // XP calculation formula
    const journeyXP = safeJourneys * 100;
    const chatXP = aiChats * 50;
    const activityXP = activities * 75;
    const streakXP = streak * 150;
    const achievementXP = achievements * 200;
    
    return journeyXP + chatXP + activityXP + streakXP + achievementXP;
  };

  const calculateLevel = (totalXP: number): { level: number; xp: number; nextLevelXp: number } => {
    // Level calculation formula (exponential growth)
    const baseXP = 1000;
    const exponent = 1.5;
    
    let level = 1;
    let xpForNextLevel = baseXP;
    let xpRemaining = totalXP;
    
    while (xpRemaining >= xpForNextLevel) {
      xpRemaining -= xpForNextLevel;
      level++;
      xpForNextLevel = Math.floor(baseXP * Math.pow(level, exponent));
    }
    
    return {
      level,
      xp: xpRemaining,
      nextLevelXp: xpForNextLevel
    };
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <motion.button
                onClick={() => navigate('/dashboard')}
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </motion.button>
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Analytics</h1>
                <p className="text-sm text-neutral-400">Track your safety metrics</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Settings className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
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

          {/* Level and XP Progress */}
          <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Level {analyticsData.level}</h2>
                    <p className="text-blue-300">Safety Guardian</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">{analyticsData.xp} / {analyticsData.nextLevelXp} XP</div>
                  <p className="text-blue-300 text-sm">{Math.floor((analyticsData.xp / analyticsData.nextLevelXp) * 100)}% to Level {analyticsData.level + 1}</p>
                </div>
              </div>
              
              <div className="w-full bg-black/50 rounded-full h-4 mb-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(analyticsData.xp / analyticsData.nextLevelXp) * 100}%` }}
                  transition={{ duration: 1.5 }}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full"
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/30 p-4 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <span className="text-white font-medium">Safe Journeys</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{analyticsData.safeJourneys}</span>
                    <span className="text-blue-300 text-sm">+{analyticsData.safeJourneys * 100} XP</span>
                  </div>
                </div>
                
                <div className="bg-black/30 p-4 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Heart className="h-5 w-5 text-pink-400" />
                    <span className="text-white font-medium">AI Chats</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{analyticsData.aiChats}</span>
                    <span className="text-pink-300 text-sm">+{analyticsData.aiChats * 50} XP</span>
                  </div>
                </div>
                
                <div className="bg-black/30 p-4 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-5 w-5 text-green-400" />
                    <span className="text-white font-medium">Day Streak</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{analyticsData.streakDays}</span>
                    <span className="text-green-300 text-sm">+{analyticsData.streakDays * 150} XP</span>
                  </div>
                </div>
                
                <div className="bg-black/30 p-4 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Award className="h-5 w-5 text-yellow-400" />
                    <span className="text-white font-medium">Achievements</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{achievements.length}</span>
                    <span className="text-yellow-300 text-sm">+{achievements.length * 200} XP</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <div className="p-6 text-center">
                <Shield className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">
                  {analyticsData.safeJourneys}
                </div>
                <div className="text-sm text-blue-300">Safe Journeys</div>
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
              <div className="p-6 text-center">
                <Heart className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">
                  {analyticsData.aiChats}
                </div>
                <div className="text-sm text-purple-300">AI Conversations</div>
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
              <div className="p-6 text-center">
                <Activity className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">
                  {analyticsData.completedActivities}
                </div>
                <div className="text-sm text-green-300">Activities Done</div>
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <div className="p-6 text-center">
                <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">
                  {formatTime(analyticsData.totalTime)}
                </div>
                <div className="text-sm text-yellow-300">Total Time</div>
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mood Chart */}
            <Card className="bg-black border-white/[0.2]">
              <div className="p-6">
                <CardTitle className="text-white mb-6 flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-pink-400" />
                  <span>Mood Trends</span>
                </CardTitle>
                
                {moodHistory.length > 0 ? (
                  <MoodChart moodData={moodHistory} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Heart className="h-12 w-12 text-neutral-700 mb-4" />
                    <p className="text-neutral-500 text-center">No mood data available yet.<br />Start tracking your mood to see trends.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Safety Score Chart */}
            <Card className="bg-black border-white/[0.2]">
              <div className="p-6">
                <CardTitle className="text-white mb-6 flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  <span>Safety Score</span>
                </CardTitle>
                
                {safetyHistory.length > 0 ? (
                  <SafetyScoreChart safetyData={safetyHistory} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Shield className="h-12 w-12 text-neutral-700 mb-4" />
                    <p className="text-neutral-500 text-center">No safety data available yet.<br />Complete SafeWalk journeys to see your safety score.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Activity Calendar */}
          <Card className="bg-black border-white/[0.2]">
            <div className="p-6">
              <CardTitle className="text-white mb-6 flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-400" />
                <span>Activity Calendar</span>
              </CardTitle>
              
              {activityHistory.length > 0 ? (
                <ActivityCalendar activities={activityHistory} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <Calendar className="h-12 w-12 text-neutral-700 mb-4" />
                  <p className="text-neutral-500 text-center">No activity data available yet.<br />Complete activities to see your calendar.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Achievements */}
          <Card className="bg-black border-white/[0.2]">
            <div className="p-6">
              <CardTitle className="text-white mb-6 flex items-center space-x-2">
                <Award className="h-5 w-5 text-yellow-400" />
                <span>Achievements</span>
              </CardTitle>
              
              {achievements.length > 0 ? (
                <AchievementProgress achievements={achievements} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <Award className="h-12 w-12 text-neutral-700 mb-4" />
                  <p className="text-neutral-500 text-center">No achievements unlocked yet.<br />Keep using SafeMate to earn badges and rewards.</p>
                  <Button 
                    onClick={() => navigate('/gamification')}
                    className="mt-4 bg-gradient-to-r from-yellow-600 to-yellow-700"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    <span>View Available Achievements</span>
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Safety Tips */}
          <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30">
            <div className="p-6">
              <CardTitle className="text-white mb-4 flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <span>Safety Insights</span>
              </CardTitle>
              
              <div className="space-y-4">
                {analyticsData.safeJourneys > 0 ? (
                  <>
                    <div className="p-4 bg-black/30 rounded-xl">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                        <div>
                          <h4 className="text-white font-medium">Great Safety Record</h4>
                          <p className="text-neutral-300 text-sm mt-1">
                            You've completed {analyticsData.safeJourneys} safe journeys with an average safety score of {analyticsData.safetyScore.toFixed(1)}/10.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {analyticsData.streakDays > 0 && (
                      <div className="p-4 bg-black/30 rounded-xl">
                        <div className="flex items-start space-x-3">
                          <Target className="h-5 w-5 text-blue-400 mt-0.5" />
                          <div>
                            <h4 className="text-white font-medium">Consistent Usage</h4>
                            <p className="text-neutral-300 text-sm mt-1">
                              You've maintained a {analyticsData.streakDays}-day streak. Keep it up to earn more XP and unlock achievements!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {analyticsData.moodAverage > 0 && (
                      <div className="p-4 bg-black/30 rounded-xl">
                        <div className="flex items-start space-x-3">
                          <Heart className="h-5 w-5 text-pink-400 mt-0.5" />
                          <div>
                            <h4 className="text-white font-medium">Emotional Wellness</h4>
                            <p className="text-neutral-300 text-sm mt-1">
                              Your average mood is {analyticsData.moodAverage.toFixed(1)}/5. {
                                analyticsData.moodAverage > 3.5 
                                  ? 'You\'re doing great! Keep up the positive energy.' 
                                  : 'Consider trying more wellness activities to improve your mood.'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-black/30 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                      <div>
                        <h4 className="text-white font-medium">Get Started with SafeWalk</h4>
                        <p className="text-neutral-300 text-sm mt-1">
                          Complete your first SafeWalk journey to start building your safety profile and earning XP.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}