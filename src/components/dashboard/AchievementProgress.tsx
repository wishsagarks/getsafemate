import React from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  Shield, 
  Heart, 
  Star, 
  Zap, 
  Users, 
  Target, 
  Calendar,
  CheckCircle,
  LockKeyhole
} from 'lucide-react';

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description?: string;
  badge_icon?: string;
  points_earned: number;
  unlocked_at: string;
  is_featured: boolean;
}

interface AchievementProgressProps {
  achievements: Achievement[];
}

export function AchievementProgress({ achievements }: AchievementProgressProps) {
  // Define all possible achievements
  const allAchievements = [
    {
      id: 'safety-guardian',
      type: 'safety',
      name: 'Safety Guardian',
      description: 'Complete 10 safe journeys',
      icon: Shield,
      color: 'blue',
      points: 200
    },
    {
      id: 'journey-master',
      type: 'safety',
      name: 'Journey Master',
      description: 'Complete 50 safe journeys',
      icon: Star,
      color: 'yellow',
      points: 500
    },
    {
      id: 'heart-helper',
      type: 'wellness',
      name: 'Heart Helper',
      description: 'Use HeartMate mode 10 times',
      icon: Heart,
      color: 'pink',
      points: 200
    },
    {
      id: 'speed-walker',
      type: 'safety',
      name: 'Speed Walker',
      description: 'Complete a journey in record time',
      icon: Zap,
      color: 'purple',
      points: 150
    },
    {
      id: 'community-hero',
      type: 'social',
      name: 'Community Hero',
      description: 'Connect with 5 friends on SafeMate',
      icon: Users,
      color: 'green',
      points: 300
    },
    {
      id: 'elite-protector',
      type: 'safety',
      name: 'Elite Protector',
      description: 'Maintain a perfect safety score for 30 days',
      icon: Award,
      color: 'orange',
      points: 1000
    },
    {
      id: 'wellness-warrior',
      type: 'wellness',
      name: 'Wellness Warrior',
      description: 'Complete 20 wellness activities',
      icon: Heart,
      color: 'red',
      points: 400
    },
    {
      id: 'streak-master',
      type: 'streak',
      name: 'Streak Master',
      description: 'Maintain a 7-day streak',
      icon: Calendar,
      color: 'indigo',
      points: 300
    },
    {
      id: 'goal-achiever',
      type: 'milestone',
      name: 'Goal Achiever',
      description: 'Reach level 5',
      icon: Target,
      color: 'emerald',
      points: 500
    }
  ];

  // Map unlocked achievements
  const unlockedMap = achievements.reduce((acc: Record<string, Achievement>, achievement) => {
    // Try to match by name since IDs might be different
    const matchingPredefined = allAchievements.find(a => 
      a.name.toLowerCase() === achievement.achievement_name.toLowerCase()
    );
    
    if (matchingPredefined) {
      acc[matchingPredefined.id] = achievement;
    }
    
    return acc;
  }, {});

  // Get achievement icon
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'safety': return Shield;
      case 'wellness': return Heart;
      case 'streak': return Calendar;
      case 'milestone': return Target;
      case 'social': return Users;
      default: return Award;
    }
  };

  // Get achievement color
  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'safety': return 'text-blue-400';
      case 'wellness': return 'text-pink-400';
      case 'streak': return 'text-indigo-400';
      case 'milestone': return 'text-emerald-400';
      case 'social': return 'text-green-400';
      default: return 'text-yellow-400';
    }
  };

  // Get achievement background
  const getAchievementBackground = (type: string, unlocked: boolean) => {
    if (!unlocked) return 'bg-neutral-900 border-neutral-800';
    
    switch (type) {
      case 'safety': return 'bg-blue-900/20 border-blue-800/50';
      case 'wellness': return 'bg-pink-900/20 border-pink-800/50';
      case 'streak': return 'bg-indigo-900/20 border-indigo-800/50';
      case 'milestone': return 'bg-emerald-900/20 border-emerald-800/50';
      case 'social': return 'bg-green-900/20 border-green-800/50';
      default: return 'bg-yellow-900/20 border-yellow-800/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Featured Achievements */}
      {achievements.filter(a => a.is_featured).length > 0 && (
        <div className="mb-6">
          <h3 className="text-white font-medium mb-4">Featured Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements
              .filter(a => a.is_featured)
              .map((achievement) => {
                const achievementType = achievement.achievement_type;
                const AchievementIcon = getAchievementIcon(achievementType);
                
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border ${getAchievementBackground(achievementType, true)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-3 rounded-xl bg-black/30">
                        <AchievementIcon className={`h-6 w-6 ${getAchievementColor(achievementType)}`} />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{achievement.achievement_name}</h4>
                        <p className="text-neutral-400 text-sm mt-1">{achievement.achievement_description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                            +{achievement.points_earned} XP
                          </span>
                          <span className="text-xs text-neutral-500">
                            {new Date(achievement.unlocked_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}

      {/* All Achievements */}
      <div>
        <h3 className="text-white font-medium mb-4">All Achievements</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
          {allAchievements.map((achievement, index) => {
            const isUnlocked = !!unlockedMap[achievement.id];
            const AchievementIcon = achievement.icon;
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className={`p-4 rounded-xl text-center transition-all duration-200 border ${
                  getAchievementBackground(achievement.type, isUnlocked)
                }`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                    isUnlocked ? `bg-${achievement.color}-500/20` : 'bg-neutral-800'
                  }`}>
                    <AchievementIcon className={`h-6 w-6 ${
                      isUnlocked ? `text-${achievement.color}-400` : 'text-neutral-600'
                    }`} />
                  </div>
                  
                  {isUnlocked && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  )}
                  
                  {!isUnlocked && (
                    <div className="absolute -top-1 -right-1 bg-neutral-700 rounded-full p-0.5">
                      <LockKeyhole className="h-3 w-3 text-neutral-400" />
                    </div>
                  )}
                </div>
                
                <div className={`text-sm font-medium ${isUnlocked ? 'text-white' : 'text-neutral-500'}`}>
                  {achievement.name}
                </div>
                
                <div className={`text-xs mt-1 ${isUnlocked ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {achievement.description}
                </div>
                
                <div className="mt-2 text-xs">
                  {isUnlocked ? (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                      +{achievement.points} XP
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-neutral-800 text-neutral-500 rounded-full">
                      +{achievement.points} XP
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}