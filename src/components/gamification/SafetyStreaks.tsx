import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, Star, Shield, Heart, Award } from 'lucide-react';
import { Card, CardTitle } from '../ui/aceternity-card';

interface SafetyStreaksProps {
  currentStreak: number;
  longestStreak: number;
  streakHistory: {
    date: string;
    completed: boolean;
    activity?: string;
  }[];
}

export function SafetyStreaks({ currentStreak, longestStreak, streakHistory }: SafetyStreaksProps) {
  // Get current date and calculate dates for the last 4 weeks
  const today = new Date();
  const calendar: Date[][] = [];
  
  // Create 4 weeks of dates
  for (let week = 0; week < 4; week++) {
    const weekDates: Date[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() - ((3 - week) * 7 + (6 - day)));
      weekDates.push(date);
    }
    calendar.push(weekDates);
  }

  // Check if a date has activity
  const hasActivity = (date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0];
    return streakHistory.some(item => item.date === dateString && item.completed);
  };

  // Get activity type for a date
  const getActivityType = (date: Date): string | undefined => {
    const dateString = date.toISOString().split('T')[0];
    const activity = streakHistory.find(item => item.date === dateString);
    return activity?.activity;
  };

  // Get icon based on activity type
  const getActivityIcon = (type?: string) => {
    switch (type) {
      case 'safewalk': return <Shield className="h-3 w-3 text-blue-400" />;
      case 'heartmate': return <Heart className="h-3 w-3 text-pink-400" />;
      case 'achievement': return <Award className="h-3 w-3 text-yellow-400" />;
      default: return <CheckCircle className="h-3 w-3 text-green-400" />;
    }
  };

  return (
    <Card className="bg-black border-white/[0.2]">
      <div className="p-6">
        <CardTitle className="text-white mb-6 flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <span>Safety Streaks</span>
        </CardTitle>
        
        <div className="flex items-center justify-between mb-6">
          <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-800/30 text-center flex-1 mr-4">
            <div className="text-3xl font-bold text-white">{currentStreak}</div>
            <div className="text-sm text-indigo-300">Current Streak</div>
          </div>
          
          <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-800/30 text-center flex-1">
            <div className="text-3xl font-bold text-white">{longestStreak}</div>
            <div className="text-sm text-purple-300">Longest Streak</div>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-2 text-center mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-xs text-neutral-500">{day}</div>
            ))}
          </div>
          
          {/* Calendar weeks */}
          {calendar.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((date, dayIndex) => {
                const isToday = date.toDateString() === today.toDateString();
                const hasCompleted = hasActivity(date);
                const activityType = getActivityType(date);
                
                return (
                  <motion.div
                    key={dayIndex}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: weekIndex * 0.1 + dayIndex * 0.02 }}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center relative group ${
                      isToday ? 'border-2 border-indigo-500' : ''
                    }`}
                  >
                    <div 
                      className={`absolute inset-0 rounded-md ${
                        hasCompleted ? 'bg-indigo-900/50' : 'bg-neutral-900/50'
                      }`}
                    />
                    
                    <div className="relative z-10 text-center">
                      <div className="text-[10px] text-neutral-500">
                        {date.getDate()}
                      </div>
                      {hasCompleted && (
                        <div className="mt-1">
                          {getActivityIcon(activityType)}
                        </div>
                      )}
                    </div>
                    
                    {/* Tooltip */}
                    {hasCompleted && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black/90 text-white text-xs rounded p-2 hidden group-hover:block z-20 whitespace-nowrap">
                        <div className="font-medium mb-1">{date.toLocaleDateString()}</div>
                        <div className="flex items-center space-x-1">
                          {getActivityIcon(activityType)}
                          <span>{activityType || 'Activity'} completed</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Streak Rewards */}
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-xl border border-indigo-800/30">
          <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
            <Star className="h-4 w-4 text-yellow-400" />
            <span>Streak Rewards</span>
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-400">3</span>
                </div>
                <span className="text-sm text-white">3-Day Streak</span>
              </div>
              <div className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                +150 XP
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-400">7</span>
                </div>
                <span className="text-sm text-white">7-Day Streak</span>
              </div>
              <div className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                +300 XP
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-400">14</span>
                </div>
                <span className="text-sm text-white">14-Day Streak</span>
              </div>
              <div className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                +500 XP
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-400">30</span>
                </div>
                <span className="text-sm text-white">30-Day Streak</span>
              </div>
              <div className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                +1000 XP
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}