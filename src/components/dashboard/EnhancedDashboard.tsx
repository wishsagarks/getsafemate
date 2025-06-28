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
  Smile
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { HeroHighlight, Highlight } from '../ui/hero-highlight';
import { BackgroundBeams } from '../ui/background-beams';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userStats, setUserStats] = useState<UserStats>({
    safeJourneys: 47,
    aiChats: 23,
    streakDays: 12,
    totalTime: 2840,
    lastActivity: '2 hours ago',
    moodAverage: 4.2,
    energyLevel: 7.5
  });
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadUserProfile();
    
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
      id: 'emergency',
      title: 'Emergency SOS',
      description: 'Quick access to emergency contacts',
      icon: Users,
      color: 'text-red-400',
      gradient: 'from-red-600 to-orange-600',
      action: () => console.log('Emergency SOS'),
      badge: 'Instant'
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Manage your safety preferences',
      icon: Settings,
      color: 'text-gray-400',
      gradient: 'from-gray-600 to-slate-600',
      action: () => window.location.href = '/settings'
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
              onClick={() => window.location.href = '/settings'}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              <Settings className="h-6 w-6 text-white" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
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
                    <span className="text-sm text-neutral-400">{userStats.moodAverage}/5</span>
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
                    <span className="text-sm text-neutral-400">{userStats.energyLevel}/10</span>
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
                    className="p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl border border-purple-500/30 transition-all"
                  >
                    <Sparkles className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                    <span className="text-xs text-purple-300">Wellness</span>
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
                className="w-full mt-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/20 transition-all flex items-center justify-center space-x-2 text-neutral-300 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">View All Activity</span>
              </motion.button>
            </div>
          </Card>
        </motion.div>

        {/* AI Features Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
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