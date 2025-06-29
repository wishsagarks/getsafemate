import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Shield, 
  Heart, 
  Calendar, 
  Award, 
  CheckCircle, 
  Clock,
  ArrowRight,
  Star
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { Button } from '../ui/aceternity-button';

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  progress: number;
  target: number;
  xpReward: number;
  daysLeft: number;
  completed: boolean;
}

export function WeeklyChallenges() {
  const [challenges] = useState<Challenge[]>([
    {
      id: 'challenge-1',
      title: 'Safety Streak',
      description: 'Complete 5 SafeWalk journeys this week',
      icon: Shield,
      color: 'text-blue-400',
      progress: 3,
      target: 5,
      xpReward: 500,
      daysLeft: 3,
      completed: false
    },
    {
      id: 'challenge-2',
      title: 'Mood Master',
      description: 'Track your mood for 7 consecutive days',
      icon: Heart,
      color: 'text-pink-400',
      progress: 5,
      target: 7,
      xpReward: 750,
      daysLeft: 2,
      completed: false
    },
    {
      id: 'challenge-3',
      title: 'Wellness Warrior',
      description: 'Complete 3 different wellness activities',
      icon: Star,
      color: 'text-purple-400',
      progress: 2,
      target: 3,
      xpReward: 300,
      daysLeft: 4,
      completed: false
    },
    {
      id: 'challenge-4',
      title: 'Night Guardian',
      description: 'Complete 2 SafeWalk journeys after 8pm',
      icon: Shield,
      color: 'text-indigo-400',
      progress: 1,
      target: 2,
      xpReward: 400,
      daysLeft: 5,
      completed: false
    },
    {
      id: 'challenge-5',
      title: 'Achievement Hunter',
      description: 'Earn any new achievement',
      icon: Award,
      color: 'text-yellow-400',
      progress: 0,
      target: 1,
      xpReward: 1000,
      daysLeft: 7,
      completed: false
    }
  ]);

  return (
    <Card className="bg-black border-white/[0.2]">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <CardTitle className="text-white flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-400" />
            <span>Weekly Challenges</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2 px-3 py-1 bg-black/30 rounded-full">
            <Clock className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-yellow-300">Resets in 3 days</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border ${
                challenge.completed 
                  ? 'bg-green-900/20 border-green-800/30' 
                  : 'bg-black/30 border-white/10'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${challenge.completed ? 'bg-green-900/30' : 'bg-black/30'}`}>
                  <challenge.icon className={`h-5 w-5 ${challenge.completed ? 'text-green-400' : challenge.color}`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">{challenge.title}</h4>
                    <div className="flex items-center space-x-2">
                      {challenge.completed ? (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 rounded-full">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span className="text-xs text-green-400">Completed</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                          <Clock className="h-3 w-3 text-yellow-400" />
                          <span className="text-xs text-yellow-400">{challenge.daysLeft}d left</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-neutral-400 text-sm mt-1">{challenge.description}</p>
                  
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-neutral-500">
                        {challenge.progress}/{challenge.target} completed
                      </span>
                      <span className="text-xs text-yellow-400">+{challenge.xpReward} XP</span>
                    </div>
                    <div className="w-full bg-black/50 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          challenge.completed 
                            ? 'bg-green-500' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-6 flex justify-center">
          <Button className="bg-gradient-to-r from-green-600 to-green-700">
            <span>View All Challenges</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
}