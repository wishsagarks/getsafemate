import React from 'react';
import { motion } from 'framer-motion';
import { Wind, Heart, Brain, Sparkles } from 'lucide-react';

interface Activity {
  id: string;
  activity_type: string;
  activity_name: string;
  created_at: string;
  completed: boolean;
}

interface ActivityCalendarProps {
  activities: Activity[];
}

export function ActivityCalendar({ activities }: ActivityCalendarProps) {
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

  // Group activities by date
  const activitiesByDate = activities.reduce((acc: Record<string, Activity[]>, activity) => {
    const date = new Date(activity.created_at).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {});

  // Get activity count for a date
  const getActivityCount = (date: Date): number => {
    return activitiesByDate[date.toDateString()]?.length || 0;
  };

  // Get activity intensity class based on count
  const getIntensityClass = (count: number): string => {
    if (count === 0) return 'bg-neutral-900';
    if (count === 1) return 'bg-blue-900';
    if (count === 2) return 'bg-blue-700';
    if (count === 3) return 'bg-blue-500';
    return 'bg-blue-300';
  };

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'breathing': return <Wind className="h-3 w-3 text-blue-400" />;
      case 'meditation': return <Brain className="h-3 w-3 text-purple-400" />;
      case 'movement': return <Sparkles className="h-3 w-3 text-green-400" />;
      case 'mindfulness': return <Heart className="h-3 w-3 text-pink-400" />;
      default: return <Sparkles className="h-3 w-3 text-blue-400" />;
    }
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex justify-between items-center">
        <div className="text-white font-medium">Activity Calendar</div>
        <div className="text-neutral-400 text-sm">Last 4 Weeks</div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-2 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-xs text-neutral-500">{day}</div>
          ))}
        </div>
        
        {/* Calendar weeks */}
        {calendar.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((date, dayIndex) => {
              const activityCount = getActivityCount(date);
              const isToday = date.toDateString() === today.toDateString();
              const activities = activitiesByDate[date.toDateString()] || [];
              
              return (
                <motion.div
                  key={dayIndex}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: weekIndex * 0.1 + dayIndex * 0.02 }}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center relative group ${
                    isToday ? 'border-2 border-blue-500' : ''
                  }`}
                >
                  <div 
                    className={`absolute inset-0 rounded-md ${getIntensityClass(activityCount)}`}
                    style={{ opacity: activityCount > 0 ? 0.7 : 0.2 }}
                  />
                  
                  <div className="relative z-10 text-center">
                    <div className="text-[10px] text-neutral-500">
                      {formatDate(date)}
                    </div>
                    {activityCount > 0 && (
                      <div className="text-xs font-medium text-white mt-1">
                        {activityCount}
                      </div>
                    )}
                  </div>
                  
                  {/* Tooltip */}
                  {activityCount > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black/90 text-white text-xs rounded p-2 hidden group-hover:block z-20 whitespace-nowrap">
                      <div className="font-medium mb-1">{formatDate(date)}</div>
                      <div className="space-y-1">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex items-center space-x-1">
                            {getActivityIcon(activity.activity_type)}
                            <span>{activity.activity_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 pt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-sm bg-neutral-900" />
          <span className="text-xs text-neutral-400">No Activity</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-sm bg-blue-900" />
          <span className="text-xs text-neutral-400">1 Activity</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-sm bg-blue-700" />
          <span className="text-xs text-neutral-400">2 Activities</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-xs text-neutral-400">3 Activities</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-sm bg-blue-300" />
          <span className="text-xs text-neutral-400">4+ Activities</span>
        </div>
      </div>
    </div>
  );
}