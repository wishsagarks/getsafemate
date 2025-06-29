import React from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  Shield, 
  Heart, 
  Star, 
  Calendar, 
  Target, 
  Users, 
  Zap,
  CheckCircle,
  LockKeyhole
} from 'lucide-react';

interface AchievementCardProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    type: string;
    points: number;
    earned: boolean;
    unlockedAt?: string;
  };
}

export function AchievementCard({ achievement }: AchievementCardProps) {
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
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={`p-6 rounded-xl text-center transition-all duration-200 border ${
        getAchievementBackground(achievement.type, achievement.earned)
      }`}
    >
      <div className="relative">
        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
          achievement.earned ? `bg-${achievement.color.split('-')[0]}-500/20` : 'bg-neutral-800'
        }`}>
          <achievement.icon className={`h-10 w-10 ${
            achievement.earned ? achievement.color : 'text-neutral-600'
          }`} />
        </div>
        
        {achievement.earned ? (
          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
        ) : (
          <div className="absolute -top-1 -right-1 bg-neutral-700 rounded-full p-1">
            <LockKeyhole className="h-5 w-5 text-neutral-400" />
          </div>
        )}
      </div>
      
      <h3 className={`text-lg font-bold ${achievement.earned ? 'text-white' : 'text-neutral-500'}`}>
        {achievement.name}
      </h3>
      
      <p className={`text-sm mt-2 ${achievement.earned ? 'text-neutral-300' : 'text-neutral-600'}`}>
        {achievement.description}
      </p>
      
      <div className="mt-4">
        {achievement.earned ? (
          <div className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
            +{achievement.points} XP
          </div>
        ) : (
          <div className="inline-block px-3 py-1 bg-neutral-800 text-neutral-500 rounded-full text-sm">
            +{achievement.points} XP
          </div>
        )}
      </div>
      
      {achievement.earned && achievement.unlockedAt && (
        <div className="mt-2 text-xs text-neutral-500">
          Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  );
}