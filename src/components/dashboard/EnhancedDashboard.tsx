import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Heart, 
  Users, 
  Settings, 
  MapPin, 
  Zap, 
  Star,
  Calendar,
  TrendingUp,
  Clock,
  Award,
  Sparkles,
  Brain,
  Video,
  Mic,
  Sun,
  Moon,
  ChevronRight,
  Plus,
  Activity,
  Target,
  Smile,
  BarChart3,
  Trophy,
  Share2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { HeroHighlight, Highlight } from '../ui/hero-highlight';
import { BackgroundBeams } from '../ui/background-beams';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  onSafeWalkStart: () => void;
  onHeartMateStart: () => void;
}

interface UserStats {
  safeJourneys: number;
  aiChats: number;
  streakDays: number;
  totalTime: number;
  lastActivity: string;
  moodAverage: number;
  energyLevel: number;
  level: number;
  xp: number;
  nextLevelXp: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
  action: () => void;
  badge?: string;
}

export function EnhancedDashboard({ onSafeWalkStart, onHeartMateStart }: DashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userStats, setUserStats] = useState<UserStats>({
    safeJourneys: 47,
    aiChats: 23,
    streakDays: 12,
    totalTime: 2840,
    lastActivity: '2 hours ago',
    moodAverage: 4.2,
    energyLevel: 7.5,
    level: 8,
    xp: 450,
    nextLevelXp: 1000
  });
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadUserProfile();
    loadUserStats();
    
    // Show welcome for new users or first visit today
    const lastWelcome = localStorage.getItem(`last_welcome_${user?.id}`);
    const today = new Date().toDateString();
    if (!lastWelcome || lastWelcome !== today) {
      setShowWelcome(true);
      localStorage.setItem(`last_welcome_${user?.id}`, today);
      setTimeout(() => setShowWelcome(false), 4000);
    }

    return () => clearInterval(timer);
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (data?.full_name) {
        setUserName(data.full_name.split(' ')[0]); // First name only
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load session analytics
      const { data: sessions, error: sessionsError } = await supabase
        .from('session_analytics')
        .select('*')
        .eq('user_id', user.id);

      if (sessionsError) throw sessionsError;

      // Load mood entries
      const { data: moods, error: moodsError } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (moodsError) throw moodsError;

      // Load activity logs
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Calculate stats
      const safeWalkSessions = (sessions || []).filter(s => s.session_type === 'safewalk').length;
      const heartMateSessions = (sessions || []).filter(s => s.session_type === 'heartmate').length;
      const totalDuration = (sessions || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      
      // Calculate mood average
      const moodScores = (moods || []).map(m => getMoodScore(m.mood));
      const avgMood = moodScores.length > 0 
        ? moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length 
        : 0;
      
      // Calculate streak
      const streak = calculateStreak(moods || []);
      
      // Calculate energy level average
      const energyLevels = (moods || []).map(m => m.energy_level);
      const avgEnergy = energyLevels.length > 0 
        ? energyLevels.reduce((sum, level) => sum + level, 0) / energyLevels.length 
        : 0;
      
      // Calculate XP and level
      const totalXP = calculateTotalXP(
        safeWalkSessions, 
        heartMateSessions, 
        (activities || []).filter(a => a.completed).length,
        streak
      );
      
      const { level, xp, nextLevelXp } = calculateLevel(totalXP);

      // Get last activity time
      let lastActivity = 'Never';
      const allActivities = [
        ...(sessions || []).map(s => ({ type: s.session_type, time: new Date(s.created_at) })),
        ...(moods || []).map(m => ({ type: 'mood', time: new Date(m.created_at) })),
        ...(activities || []).map(a => ({ type: a.activity_type, time: new Date(a.created_at) }))
      ].sort((a, b) => b.time.getTime() - a.time.getTime());
      
      if (allActivities.length > 0) {
        const now = new Date();
        const diff = now.getTime() - allActivities[0].time.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
          lastActivity = `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
          lastActivity = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
          lastActivity = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }
      }

      setUserStats({
        safeJourneys: safeWalkSessions,
        aiChats: heartMateSessions,
        streakDays: streak,
        totalTime: totalDuration,
        lastActivity,
        moodAverage: avgMood,
        energyLevel: avgEnergy,
        level,
        xp,
        nextLevelXp
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodScore = (mood: string): number => {
    const scores: Record<string, number> = {
      'very-happy': 5,
      'happy': 4,
      'neutral': 3,
      'sad': 2,
      'very-sad': 1
    };
    return scores[mood] || 3;
  };

  const calculateStreak = (moods: any[]): number => {
    if (moods.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < moods.length; i++) {
      const entryDate = new Date(moods[i].entry_date);
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
    streak: number
  ): number => {
    // XP calculation formula
    const journeyXP = safeJourneys * 100;
    const chatXP = aiChats * 50;
    const activityXP = activities * 75;
    const streakXP = streak * 150;
    
    return journeyXP + chatXP + activityXP + streakXP;
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

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTimeIcon = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 18) return Sun;
    return Moon;
  };

  const quickActions: QuickAction[] = [
    {
      id: 'safewalk',
      title: 'Start Safe Walk',
      description: 'Real-time protection with AI companion',
      icon: Shield,
      color: 'text-blue-400',
      gradient: 'from-blue-600 to-cyan-600',
      action: onSafeWalkStart,
      badge: 'GPS + AI'
    },
    {
      id: 'heartmate',
      title: 'Chat with HeartMate',
      description: 'Emotional support & wellness companion',
      icon: Heart,
      color: 'text-pink-400',
      gradient: 'from-pink-600 to-purple-600',
      action: onHeartMateStart,
      badge: 'AI Support'
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'Track your safety metrics and insights',
      icon: BarChart3,
      color: 'text-green-400',
      gradient: 'from-green-600 to-teal-600',
      action: () => navigate('/analytics'),
      badge: 'New'
    },
    {
      id: 'achievements',
      title: 'Achievements',
      description: 'View badges and level progress',
      icon: Trophy,
      color: 'text-yellow-400',
      gradient: 'from-yellow-600 to-orange-600',
      action: () => navigate('/gamification'),
      badge: 'New'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'safewalk',
      title: 'Safe journey completed',
      time: '2 hours ago',
      icon: MapPin,
      color: 'text-green-400'
    },
    {
      id: 2,
      type: 'heartmate',
      title: 'HeartMate conversation',
      time: 'Yesterday',
      icon: Heart,
      color: 'text-purple-400'
    },
    {
      id: 3,
      type: 'achievement',
      title: 'Earned Safety Guardian badge',
      time: '2 days ago',
      icon: Award,
      color: 'text-yellow-400'
    }
  ];

  const TimeIcon = getTimeIcon();

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <BackgroundBeams />
      
      {/* Welcome Animation */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <HeroHighlight className="w-full h-full flex items-center justify-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-2xl">
                  <Shield className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  {getGreeting()}, <Highlight className="text-white">{userName || 'Friend'}</Highlight>!
                </h1>
                <p className="text-xl text-neutral-300">
                  Welcome back to SafeMate
                </p>
              </motion.div>
            </HeroHighlight>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <TimeIcon className="h-5 w-5 text-yellow-400" />
                  <h1 className="text-2xl font-bold text-white">
                    {getGreeting()}{userName && `, ${userName}`}!
                  </h1>
                </div>
                <p className="text-neutral-400 flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{currentTime.toLocaleTimeString()}</span>
                  <span>•</span>
                  <span>Your safety & wellness companion</span>
                </p>
              </div>
            </motion.div>
            
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/settings')}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              <Settings className="h-6 w-6 text-white" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        {/* Level and XP Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Level {userStats.level}</h2>
                    <p className="text-yellow-300 text-sm">
                      {userStats.level >= 10 ? 'Elite Sentinel' : userStats.level >= 5 ? 'Safety Expert' : 'Safety Novice'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{userStats.xp} / {userStats.nextLevelXp} XP</div>
                  <p className="text-yellow-300 text-xs">
                    {Math.floor((userStats.xp / userStats.nextLevelXp) * 100)}% to Level {userStats.level + 1}
                  </p>
                </div>
              </div>
              
              <div className="w-full bg-black/50 rounded-full h-3 mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(userStats.xp / userStats.nextLevelXp) * 100}%` }}
                  transition={{ duration: 1.5 }}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full"
                />
              </div>
              
              <div className="flex justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-yellow-300">
                    {userStats.level >= 10 ? 'Elite Sentinel' : userStats.level >= 5 ? 'Safety Expert' : 'Safety Novice'}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, x: 5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/gamification')}
                  className="flex items-center space-x-1 text-xs text-yellow-300 hover:text-yellow-200"
                >
                  <span>View Achievements</span>
                  <ChevronRight className="h-3 w-3" />
                </motion.button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span>Quick Actions</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.action}
                className="cursor-pointer group"
              >
                <Card className="bg-black border-white/[0.2] hover:border-white/[0.3] transition-all duration-300 overflow-hidden">
                  <div className="relative p-6">
                    {/* Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
                    
                    {/* Badge */}
                    {action.badge && (
                      <div className="absolute top-4 right-4">
                        <span className="px-2 py-1 text-xs font-medium bg-white/10 text-white rounded-full">
                          {action.badge}
                        </span>
                      </div>
                    )}
                    
                    {/* Icon */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 shadow-lg`}
                    >
                      <action.icon className="h-6 w-6 text-white" />
                    </motion.div>
                    
                    {/* Content */}
                    <CardTitle className="text-white mb-2 group-hover:text-blue-300 transition-colors">
                      {action.title}
                    </CardTitle>
                    <CardDescription className="text-neutral-400 text-sm">
                      {action.description}
                    </CardDescription>
                    
                    {/* Arrow */}
                    <motion.div
                      initial={{ x: 0 }}
                      whileHover={{ x: 5 }}
                      className="absolute bottom-4 right-4"
                    >
                      <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-white transition-colors" />
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <span>Your Progress</span>
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <div className="p-6 text-center">
                <Shield className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">
                  {userStats.safeJourneys}
                </div>
                <div className="text-sm text-blue-300">Safe Journeys</div>
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
              <div className="p-6 text-center">
                <Heart className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">
                  {userStats.aiChats}
                </div>
                <div className="text-sm text-purple-300">AI Conversations</div>
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
              <div className="p-6 text-center">
                <Star className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">
                  {userStats.streakDays}
                </div>
                <div className="text-sm text-green-300">Day Streak</div>
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <div className="p-6 text-center">
                <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">
                  {Math.floor(userStats.totalTime / 60)}h
                </div>
                <div className="text-sm text-yellow-300">Total Time</div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Wellness Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Mood & Energy */}
          <Card className="bg-black border-white/[0.2]">
            <div className="p-6">
              <CardTitle className="text-white mb-6 flex items-center space-x-2">
                <Smile className="h-5 w-5 text-pink-400" />
                <span>Wellness Overview</span>
              </CardTitle>
              
              <div className="space-y-6">
                {/* Mood Average */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-neutral-300">Average Mood</span>
                    <span className="text-sm text-neutral-400">{userStats.moodAverage.toFixed(1)}/5</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(userStats.moodAverage / 5) * 100}%` }}
                      transition={{ duration: 1, delay: 0.8 }}
                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
                    />
                  </div>
                </div>

                {/* Energy Level */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-neutral-300">Energy Level</span>
                    <span className="text-sm text-neutral-400">{userStats.energyLevel.toFixed(1)}/10</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(userStats.energyLevel / 10) * 100}%` }}
                      transition={{ duration: 1, delay: 1 }}
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
                    />
                  </div>
                </div>

                {/* Quick Wellness Actions */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onHeartMateStart}
                    className="p-3 bg-pink-500/20 hover:bg-pink-500/30 rounded-xl border border-pink-500/30 transition-all"
                  >
                    <Heart className="h-5 w-5 text-pink-400 mx-auto mb-1" />
                    <span className="text-xs text-pink-300">Mood Check</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/analytics')}
                    className="p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl border border-blue-500/30 transition-all"
                  >
                    <BarChart3 className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                    <span className="text-xs text-blue-300">Analytics</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-black border-white/[0.2]">
            <div className="p-6">
              <CardTitle className="text-white mb-6 flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-400" />
                <span>Recent Activity</span>
              </CardTitle>
              
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-white/10">
                      <activity.icon className={`h-4 w-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {activity.title}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {activity.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/analytics')}
                className="w-full mt-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/20 transition-all flex items-center justify-center space-x-2 text-neutral-300 hover:text-white"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">View All Activity</span>
              </motion.button>
            </div>
          </Card>
        </motion.div>

        {/* Achievements Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <CardTitle className="text-white mb-2 flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <span>Achievements</span>
                  </CardTitle>
                  <CardDescription className="text-yellow-200">
                    Earn badges and rewards as you use SafeMate
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/gamification')}
                    className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300"
                  >
                    <Share2 className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/gamification')}
                    className="flex items-center space-x-1 text-sm text-yellow-300 hover:text-yellow-200"
                  >
                    <span>View All</span>
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "Safety Guardian", icon: Shield, color: "text-blue-400", earned: true },
                  { name: "Heart Helper", icon: Heart, color: "text-pink-400", earned: false },
                  { name: "Streak Master", icon: Calendar, color: "text-indigo-400", earned: true },
                  { name: "Goal Achiever", icon: Target, color: "text-emerald-400", earned: false }
                ].map((badge, index) => (
                  <motion.div
                    key={badge.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className={`p-4 rounded-xl text-center transition-all duration-200 ${
                      badge.earned
                        ? 'bg-black/30 border border-white/10'
                        : 'bg-black/20 opacity-50 border border-dashed border-white/10'
                    }`}
                  >
                    <badge.icon className={`h-8 w-8 mx-auto mb-2 ${badge.color}`} />
                    <div className="text-sm font-medium text-white">
                      {badge.name}
                    </div>
                    {badge.earned ? (
                      <div className="text-xs text-green-400 mt-1">✓ Earned</div>
                    ) : (
                      <div className="text-xs text-neutral-500 mt-1">Locked</div>
                    )}
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-black/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-yellow-400" />
                    <span className="text-white font-medium">Next Goal: Heart Helper</span>
                  </div>
                  <span className="text-xs text-yellow-300">+200 XP</span>
                </div>
                <p className="text-sm text-neutral-300 mt-2">
                  Use HeartMate mode 10 times to unlock this achievement
                </p>
                <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(userStats.aiChats / 10 * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>{userStats.aiChats}/10 HeartMate sessions</span>
                  <span>{Math.floor(userStats.aiChats / 10 * 100)}% complete</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* AI Features Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <CardTitle className="text-white mb-2 flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    <span>AI-Powered Features</span>
                  </CardTitle>
                  <CardDescription className="text-purple-200">
                    Experience next-generation safety and wellness with our advanced AI companions
                  </CardDescription>
                </div>
                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <Video className="h-6 w-6 text-blue-400 mb-2" />
                  <h4 className="font-semibold text-white text-sm mb-1">Video Companion</h4>
                  <p className="text-xs text-neutral-300">Face-to-face AI support via Tavus</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl">
                  <Mic className="h-6 w-6 text-green-400 mb-2" />
                  <h4 className="font-semibold text-white text-sm mb-1">Voice Chat</h4>
                  <p className="text-xs text-neutral-300">Natural conversations with ElevenLabs</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl">
                  <Brain className="h-6 w-6 text-purple-400 mb-2" />
                  <h4 className="font-semibold text-white text-sm mb-1">Smart AI</h4>
                  <p className="text-xs text-neutral-300">Powered by Gemini 2.5 Flash</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}