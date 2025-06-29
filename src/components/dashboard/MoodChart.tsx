import React from 'react';
import { motion } from 'framer-motion';
import { Smile, Frown, Meh, Sun, Cloud, CloudRain } from 'lucide-react';

interface MoodEntry {
  id: string;
  mood: string;
  energy_level: number;
  stress_level: number;
  entry_date: string;
}

interface MoodChartProps {
  moodData: MoodEntry[];
}

export function MoodChart({ moodData }: MoodChartProps) {
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'very-happy': return <Sun className="h-6 w-6 text-green-400" />;
      case 'happy': return <Smile className="h-6 w-6 text-blue-400" />;
      case 'neutral': return <Meh className="h-6 w-6 text-yellow-400" />;
      case 'sad': return <Cloud className="h-6 w-6 text-orange-400" />;
      case 'very-sad': return <CloudRain className="h-6 w-6 text-red-400" />;
      default: return <Meh className="h-6 w-6 text-gray-400" />;
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'very-happy': return 'bg-green-400';
      case 'happy': return 'bg-blue-400';
      case 'neutral': return 'bg-yellow-400';
      case 'sad': return 'bg-orange-400';
      case 'very-sad': return 'bg-red-400';
      default: return 'bg-gray-400';
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

  // Sort data by date
  const sortedData = [...moodData].sort((a, b) => 
    new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  );

  // Get last 14 entries or less
  const recentData = sortedData.slice(-14);

  // Calculate average mood
  const avgMood = recentData.length > 0
    ? recentData.reduce((sum, entry) => sum + getMoodScore(entry.mood), 0) / recentData.length
    : 0;

  // Calculate trend (improving, stable, declining)
  const getTrend = () => {
    if (recentData.length < 4) return 'stable';
    
    const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
    const secondHalf = recentData.slice(Math.floor(recentData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, entry) => sum + getMoodScore(entry.mood), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, entry) => sum + getMoodScore(entry.mood), 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  };

  const trend = getTrend();

  return (
    <div className="space-y-6">
      {/* Average Mood */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm text-neutral-400">Average Mood</span>
          <div className="text-2xl font-bold text-white">{avgMood.toFixed(1)}/5</div>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-black/30">
          {trend === 'improving' && <span className="text-green-400 text-sm">Improving ↑</span>}
          {trend === 'declining' && <span className="text-red-400 text-sm">Declining ↓</span>}
          {trend === 'stable' && <span className="text-yellow-400 text-sm">Stable →</span>}
        </div>
      </div>

      {/* Mood Chart */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-neutral-500">
          <span>Very Happy</span>
          <span>Happy</span>
          <span>Neutral</span>
          <span>Sad</span>
          <span>Very Sad</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-20 h-full flex items-end">
          <div className="w-full h-full flex items-end relative">
            {/* Horizontal grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="absolute w-full border-t border-white/10" 
                style={{ bottom: `${i * 25}%` }}
              />
            ))}
            
            {/* Data points */}
            <div className="w-full h-full flex items-end">
              {recentData.map((entry, index) => {
                const moodScore = getMoodScore(entry.mood);
                const heightPercentage = ((moodScore - 1) / 4) * 100; // 1-5 to 0-100%
                
                return (
                  <div 
                    key={entry.id} 
                    className="flex-1 flex flex-col items-center justify-end h-full"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className={`w-4 ${getMoodColor(entry.mood)} rounded-t-sm`}
                    />
                    <div className="mt-2 text-xs text-neutral-500 transform -rotate-45 origin-top-left">
                      {new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mood Legend */}
      <div className="flex justify-center space-x-4 pt-6">
        {[
          { mood: 'very-happy', label: 'Very Happy' },
          { mood: 'happy', label: 'Happy' },
          { mood: 'neutral', label: 'Neutral' },
          { mood: 'sad', label: 'Sad' },
          { mood: 'very-sad', label: 'Very Sad' }
        ].map((item) => (
          <div key={item.mood} className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full ${getMoodColor(item.mood)}`} />
            <span className="text-xs text-neutral-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}