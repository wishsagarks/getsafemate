import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  Award, 
  Trophy, 
  Shield, 
  Heart, 
  Zap,
  Target,
  Calendar,
  Users,
  CheckCircle,
  LockKeyhole,
  ArrowLeft,
  Settings,
  Share2,
  Camera,
  Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { Button } from '../ui/aceternity-button';
import { useNavigate } from 'react-router-dom';
import { ShareableCard } from './ShareableCard';

interface GamificationDashboardProps {
  onClose?: () => void;
}

export function GamificationDashboard({ onClose }: GamificationDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(0);
  const [nextLevelXP, setNextLevelXP] = useState(1000);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [stats, setStats] = useState({
    safeJourneys: 0,
    aiChats: 0,
    streakDays: 0,
    activitiesCompleted: 0
  });
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load achievements
      const { data: userAchievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (achievementsError) throw achievementsError;
      setAchievements(userAchievements || []);

      // Load session analytics for stats
      const { data: sessions, error: sessionsError } = await supabase
        .from('session_analytics')
        .select('*')
        .eq('user_id', user.id);

      if (sessionsError) throw sessionsError;

      // Load activity logs
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true);

      if (activitiesError) throw activitiesError;

      // Load mood entries for streak calculation
      const { data: moods, error: moodsError } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (moodsError) throw moodsError;

      // Calculate stats
      const safeWalkSessions = (sessions || []).filter(s => s.session_type === 'safewalk').length;
      const heartMateSessions = (sessions || []).filter(s => s.session_type === 'heartmate').length;
      const activitiesCompleted = (activities || []).length;
      const streak = calculateStreak(moods || []);

      setStats({
        safeJourneys: safeWalkSessions,
        aiChats: heartMateSessions,
        streakDays: streak,
        activitiesCompleted
      });

      // Calculate XP and level
      const totalXP = calculateTotalXP(
        safeWalkSessions,
        heartMateSessions,
        activitiesCompleted,
        streak,
        (userAchievements || []).length
      );

      const { level, xp, nextLevelXp } = calculateLevel(totalXP);
      setUserLevel(level);
      setUserXP(xp);
      setNextLevelXP(nextLevelXp);

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
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

  // Define all possible badges
  const allBadges = [
    { id: 'safety-guardian', name: 'Safety Guardian', icon: Shield, color: 'text-blue-500', earned: false },
    { id: 'journey-master', name: 'Journey Master', icon: Star, color: 'text-yellow-500', earned: false },
    { id: 'heart-helper', name: 'Heart Helper', icon: Heart, color: 'text-pink-500', earned: false },
    { id: 'speed-walker', name: 'Speed Walker', icon: Zap, color: 'text-purple-500', earned: false },
    { id: 'community-hero', name: 'Community Hero', icon: Users, color: 'text-green-500', earned: false },
    { id: 'elite-protector', name: 'Elite Protector', icon: Trophy, color: 'text-orange-500', earned: false },
    { id: 'wellness-warrior', name: 'Wellness Warrior', icon: Heart, color: 'text-red-500', earned: false },
    { id: 'streak-master', name: 'Streak Master', icon: Calendar, color: 'text-indigo-500', earned: false },
    { id: 'goal-achiever', name: 'Goal Achiever', icon: Target, color: 'text-emerald-500', earned: false }
  ];

  // Mark earned badges
  const badges = allBadges.map(badge => {
    const earned = achievements.some(a => 
      a.achievement_name.toLowerCase() === badge.name.toLowerCase()
    );
    return { ...badge, earned };
  });

  // Get rank based on level
  const getRank = (level: number): string => {
    if (level >= 20) return 'Legendary Guardian';
    if (level >= 15) return 'Master Protector';
    if (level >= 10) return 'Elite Sentinel';
    if (level >= 5) return 'Safety Expert';
    return 'Safety Novice';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading your achievements...</p>
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
                onClick={onClose || (() => navigate('/dashboard'))}
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </motion.button>
              <div className="p-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Achievements</h1>
                <p className="text-sm text-neutral-400">Level up your safety journey</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={() => setShowShareCard(!showShareCard)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white"
              >
                <Share2 className="h-5 w-5" />
              </motion.button>
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
          {/* Shareable Card Section */}
          {showShareCard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-green-500/20 to-blue-500/20 border-green-500/30">
                <div className="p-6">
                  <CardTitle className="text-white mb-4 flex items-center space-x-2">
                    <Camera className="h-5 w-5 text-green-400" />
                    <span>Shareable Achievement Card</span>
                  </CardTitle>
                  
                  <ShareableCard
                    level={userLevel}
                    xp={userXP}
                    rank={getRank(userLevel)}
                    achievements={achievements}
                    stats={stats}
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {/* Level Card */}
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                      <Trophy className="h-10 w-10 text-white" />
                    </div>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute -inset-1 rounded-full bg-gradient-to-r from-yellow-500/50 to-orange-500/50 blur-md -z-10"
                    />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Level {userLevel}</h2>
                    <p className="text-yellow-300">{getRank(userLevel)}</p>
                  </div>
                </div>
                
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-neutral-300">XP Progress</span>
                    <span className="text-sm text-neutral-300">{userXP} / {nextLevelXP}</span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(userXP / nextLevelXP) * 100}%` }}
                      transition={{ duration: 1.5 }}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-4 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">
                    {Math.floor((userXP / nextLevelXP) * 100)}% to Level {userLevel + 1} • {nextLevelXP - userXP} XP needed
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-900/20 border-blue-800/30">
              <div className="p-4 text-center">
                <Shield className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.safeJourneys}</div>
                <div className="text-sm text-blue-300">Safe Journeys</div>
                <div className="text-xs text-blue-500 mt-1">+{stats.safeJourneys * 100} XP</div>
              </div>
            </Card>
            
            <Card className="bg-pink-900/20 border-pink-800/30">
              <div className="p-4 text-center">
                <Heart className="h-8 w-8 text-pink-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.aiChats}</div>
                <div className="text-sm text-pink-300">AI Chats</div>
                <div className="text-xs text-pink-500 mt-1">+{stats.aiChats * 50} XP</div>
              </div>
            </Card>
            
            <Card className="bg-green-900/20 border-green-800/30">
              <div className="p-4 text-center">
                <Zap className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.activitiesCompleted}</div>
                <div className="text-sm text-green-300">Activities</div>
                <div className="text-xs text-green-500 mt-1">+{stats.activitiesCompleted * 75} XP</div>
              </div>
            </Card>
            
            <Card className="bg-indigo-900/20 border-indigo-800/30">
              <div className="p-4 text-center">
                <Calendar className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.streakDays}</div>
                <div className="text-sm text-indigo-300">Day Streak</div>
                <div className="text-xs text-indigo-500 mt-1">+{stats.streakDays * 150} XP</div>
              </div>
            </Card>
          </div>

          {/* Badges Grid */}
          <Card className="bg-black border-white/[0.2]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <CardTitle className="text-white flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-400" />
                  <span>Achievement Badges</span>
                </CardTitle>
                
                <Button
                  onClick={() => setShowShareCard(!showShareCard)}
                  className="bg-gradient-to-r from-green-600 to-green-700"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  <span>Share Achievements</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {badges.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className={`p-4 rounded-xl text-center transition-all duration-200 ${
                      badge.earned
                        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-transparent'
                        : 'bg-gray-900 opacity-50 border-2 border-dashed border-gray-700'
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                        badge.earned ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gray-800'
                      }`}>
                        <badge.icon className={`h-8 w-8 ${badge.color}`} />
                      </div>
                      
                      {badge.earned ? (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="absolute -top-1 -right-1 bg-gray-700 rounded-full p-0.5">
                          <LockKeyhole className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="font-medium text-white leading-tight">
                      {badge.name}
                    </div>
                    
                    {badge.earned ? (
                      <div className="text-xs text-green-400 mt-1">✓ Earned</div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-1">Locked</div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>

          {/* Next Goals */}
          <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-800/30">
            <div className="p-6">
              <CardTitle className="text-white mb-4 flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-400" />
                <span>Next Goals</span>
              </CardTitle>
              
              <div className="space-y-4">
                {stats.safeJourneys < 10 && (
                  <div className="p-4 bg-black/30 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="text-white font-medium">Safety Guardian</h4>
                        <p className="text-neutral-400 text-sm mt-1">
                          Complete {10 - stats.safeJourneys} more safe journeys
                        </p>
                        <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(stats.safeJourneys / 10 * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 mt-1">
                          <span>{stats.safeJourneys}/10 journeys</span>
                          <span>+200 XP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {stats.aiChats < 10 && (
                  <div className="p-4 bg-black/30 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <Heart className="h-5 w-5 text-pink-400 mt-0.5" />
                      <div>
                        <h4 className="text-white font-medium">Heart Helper</h4>
                        <p className="text-neutral-400 text-sm mt-1">
                          Use HeartMate {10 - stats.aiChats} more times
                        </p>
                        <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                          <div 
                            className="bg-pink-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(stats.aiChats / 10 * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 mt-1">
                          <span>{stats.aiChats}/10 chats</span>
                          <span>+200 XP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {stats.streakDays < 7 && (
                  <div className="p-4 bg-black/30 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-indigo-400 mt-0.5" />
                      <div>
                        <h4 className="text-white font-medium">Streak Master</h4>
                        <p className="text-neutral-400 text-sm mt-1">
                          Maintain a streak for {7 - stats.streakDays} more days
                        </p>
                        <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                          <div 
                            className="bg-indigo-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(stats.streakDays / 7 * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 mt-1">
                          <span>{stats.streakDays}/7 days</span>
                          <span>+300 XP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {userLevel < 5 && (
                  <div className="p-4 bg-black/30 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <Target className="h-5 w-5 text-emerald-400 mt-0.5" />
                      <div>
                        <h4 className="text-white font-medium">Goal Achiever</h4>
                        <p className="text-neutral-400 text-sm mt-1">
                          Reach level 5 (currently level {userLevel})
                        </p>
                        <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(userLevel / 5 * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 mt-1">
                          <span>Level {userLevel}/5</span>
                          <span>+500 XP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Leaderboard Preview */}
          <Card className="bg-black border-white/[0.2]">
            <div className="p-6">
              <CardTitle className="text-white mb-4 flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-400" />
                <span>Leaderboard Preview</span>
              </CardTitle>
              
              <div className="space-y-2">
                <div className="p-3 bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/30 flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">Sarah Chen</div>
                      <div className="text-xs text-neutral-500">Level 18 • Master Protector</div>
                    </div>
                  </div>
                  <div className="text-yellow-400 font-bold">24,350 XP</div>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-gray-500/20 to-gray-500/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-500/30 flex items-center justify-center">
                      <Award className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">Michael Rodriguez</div>
                      <div className="text-xs text-neutral-500">Level 15 • Elite Sentinel</div>
                    </div>
                  </div>
                  <div className="text-gray-400 font-bold">18,720 XP</div>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-orange-500/20 to-orange-500/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center">
                      <Award className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">Priya Sharma</div>
                      <div className="text-xs text-neutral-500">Level 12 • Elite Sentinel</div>
                    </div>
                  </div>
                  <div className="text-orange-400 font-bold">14,580 XP</div>
                </div>
                
                <div className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center">
                      <Star className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">You</div>
                      <div className="text-xs text-neutral-500">Level {userLevel} • {getRank(userLevel)}</div>
                    </div>
                  </div>
                  <div className="text-blue-400 font-bold">{userXP + (userLevel - 1) * 1000} XP</div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <Button
                  className="bg-gradient-to-r from-green-600 to-green-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  <span>Full Leaderboard Coming Soon</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Upcoming Features */}
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <div className="p-6 text-center">
              <CardTitle className="text-white mb-4">Coming Soon</CardTitle>
              <CardDescription className="text-purple-200 mb-6">
                We're working on exciting new gamification features to make your safety journey even more rewarding!
              </CardDescription>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-black/30 rounded-xl">
                  <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                  <div className="text-white font-medium">Friends & Teams</div>
                  <div className="text-xs text-neutral-400 mt-1">Compete with friends</div>
                </div>
                
                <div className="p-4 bg-black/30 rounded-xl">
                  <Trophy className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                  <div className="text-white font-medium">Tournaments</div>
                  <div className="text-xs text-neutral-400 mt-1">Weekly challenges</div>
                </div>
                
                <div className="p-4 bg-black/30 rounded-xl">
                  <Award className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <div className="text-white font-medium">Rewards</div>
                  <div className="text-xs text-neutral-400 mt-1">Redeem XP for prizes</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}