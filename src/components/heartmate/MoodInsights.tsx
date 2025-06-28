import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar, 
  Heart,
  Zap,
  AlertTriangle,
  Smile,
  Sun,
  Cloud,
  CloudRain,
  Meh,
  Target,
  Award,
  Brain
} from 'lucide-react';

interface MoodEntry {
  id: string;
  mood: 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy';
  energy: number;
  stress: number;
  notes: string;
  timestamp: string;
}

interface MoodInsightsProps {
  moodHistory: MoodEntry[];
  currentMood: MoodEntry | null;
}

export function MoodInsights({ moodHistory, currentMood }: MoodInsightsProps) {
  const getMoodScore = (mood: string) => {
    const scores = {
      'very-sad': 1,
      'sad': 2,
      'neutral': 3,
      'happy': 4,
      'very-happy': 5
    };
    return scores[mood as keyof typeof scores] || 3;
  };

  const getMoodIcon = (mood: string) => {
    const icons = {
      'very-sad': CloudRain,
      'sad': Cloud,
      'neutral': Meh,
      'happy': Smile,
      'very-happy': Sun
    };
    return icons[mood as keyof typeof icons] || Meh;
  };

  const getMoodColor = (mood: string) => {
    const colors = {
      'very-sad': 'text-red-500',
      'sad': 'text-orange-500',
      'neutral': 'text-yellow-500',
      'happy': 'text-blue-500',
      'very-happy': 'text-green-500'
    };
    return colors[mood as keyof typeof colors] || 'text-gray-500';
  };

  const calculateAverages = () => {
    if (moodHistory.length === 0) return { mood: 3, energy: 5, stress: 5 };
    
    const totals = moodHistory.reduce((acc, entry) => ({
      mood: acc.mood + getMoodScore(entry.mood),
      energy: acc.energy + entry.energy,
      stress: acc.stress + entry.stress
    }), { mood: 0, energy: 0, stress: 0 });

    return {
      mood: totals.mood / moodHistory.length,
      energy: totals.energy / moodHistory.length,
      stress: totals.stress / moodHistory.length
    };
  };

  const getTrend = (values: number[]) => {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 0.3) return 'improving';
    if (diff < -0.3) return 'declining';
    return 'stable';
  };

  const getInsights = () => {
    if (moodHistory.length < 3) {
      return [
        "Keep tracking your mood to unlock personalized insights!",
        "Consistency in mood tracking helps identify patterns.",
        "Your emotional journey is unique and valuable."
      ];
    }

    const averages = calculateAverages();
    const moodScores = moodHistory.map(entry => getMoodScore(entry.mood));
    const energyLevels = moodHistory.map(entry => entry.energy);
    const stressLevels = moodHistory.map(entry => entry.stress);
    
    const moodTrend = getTrend(moodScores);
    const energyTrend = getTrend(energyLevels);
    const stressTrend = getTrend(stressLevels);

    const insights = [];

    // Mood insights
    if (moodTrend === 'improving') {
      insights.push("🌟 Your mood has been trending upward recently - that's wonderful!");
    } else if (moodTrend === 'declining') {
      insights.push("💙 Your mood has been lower lately. Remember, it's okay to have difficult periods.");
    } else {
      insights.push("⚖️ Your mood has been relatively stable, which shows good emotional balance.");
    }

    // Energy insights
    if (averages.energy > 7) {
      insights.push("⚡ You've been maintaining high energy levels - great job!");
    } else if (averages.energy < 4) {
      insights.push("🔋 Your energy has been low. Consider rest and self-care activities.");
    }

    // Stress insights
    if (averages.stress > 7) {
      insights.push("🧘 Your stress levels have been high. Try some relaxation techniques.");
    } else if (averages.stress < 4) {
      insights.push("😌 You've been managing stress well - keep up the good work!");
    }

    // Pattern insights
    const weekdayMoods = moodHistory.filter(entry => {
      const day = new Date(entry.timestamp).getDay();
      return day >= 1 && day <= 5; // Monday to Friday
    });
    
    const weekendMoods = moodHistory.filter(entry => {
      const day = new Date(entry.timestamp).getDay();
      return day === 0 || day === 6; // Saturday and Sunday
    });

    if (weekdayMoods.length > 0 && weekendMoods.length > 0) {
      const weekdayAvg = weekdayMoods.reduce((acc, entry) => acc + getMoodScore(entry.mood), 0) / weekdayMoods.length;
      const weekendAvg = weekendMoods.reduce((acc, entry) => acc + getMoodScore(entry.mood), 0) / weekendMoods.length;
      
      if (weekendAvg > weekdayAvg + 0.5) {
        insights.push("📅 You tend to feel better on weekends. Consider bringing more weekend joy into weekdays!");
      } else if (weekdayAvg > weekendAvg + 0.5) {
        insights.push("💼 You seem to thrive during weekdays. You might enjoy structure and routine!");
      }
    }

    return insights.slice(0, 4); // Limit to 4 insights
  };

  const getStreakInfo = () => {
    if (moodHistory.length === 0) return { current: 0, longest: 0 };
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    const sortedHistory = [...moodHistory].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Calculate current streak
    for (let i = 0; i < sortedHistory.length; i++) {
      const entryDate = new Date(sortedHistory[i].timestamp);
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    for (let i = 0; i < sortedHistory.length; i++) {
      tempStreak++;
      
      if (i === sortedHistory.length - 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        const currentDate = new Date(sortedHistory[i].timestamp);
        const nextDate = new Date(sortedHistory[i + 1].timestamp);
        const daysDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 1) {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 0;
        }
      }
    }

    return { current: currentStreak, longest: longestStreak };
  };

  const averages = calculateAverages();
  const insights = getInsights();
  const streakInfo = getStreakInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-3 mb-4"
        >
          <TrendingUp className="h-8 w-8 text-blue-500" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Mood Insights</h2>
        </motion.div>
        <p className="text-gray-600 dark:text-gray-300">
          Understand your emotional patterns and celebrate your progress
        </p>
      </div>

      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
          <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-3" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {moodHistory.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Entries</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
          <Target className="h-8 w-8 text-green-500 mx-auto mb-3" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {streakInfo.current}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Day Streak</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
          <Award className="h-8 w-8 text-purple-500 mx-auto mb-3" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {streakInfo.longest}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Best Streak</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
          <Heart className="h-8 w-8 text-pink-500 mx-auto mb-3" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {averages.mood.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Avg Mood</div>
        </div>
      </motion.div>

      {/* Averages Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          <span>Average Levels</span>
        </h3>

        <div className="space-y-6">
          {/* Mood Average */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Mood</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{averages.mood.toFixed(1)}/5</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(averages.mood / 5) * 100}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
              />
            </div>
          </div>

          {/* Energy Average */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Energy Level</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{averages.energy.toFixed(1)}/10</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(averages.energy / 10) * 100}%` }}
                transition={{ duration: 1, delay: 0.7 }}
                className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
              />
            </div>
          </div>

          {/* Stress Average */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stress Level</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{averages.stress.toFixed(1)}/10</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(averages.stress / 10) * 100}%` }}
                transition={{ duration: 1, delay: 0.9 }}
                className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-3 rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Mood Trend */}
      {moodHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            <span>Recent Mood History</span>
          </h3>

          <div className="grid grid-cols-7 gap-2">
            {moodHistory.slice(0, 7).reverse().map((entry, index) => {
              const MoodIcon = getMoodIcon(entry.mood);
              const date = new Date(entry.timestamp);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-xl text-center ${
                    isToday 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' 
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <MoodIcon className={`h-6 w-6 mx-auto mb-2 ${getMoodColor(entry.mood)}`} />
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {isToday ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    E:{entry.energy} S:{entry.stress}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 shadow-lg border border-purple-200 dark:border-purple-800"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <span>AI Insights</span>
        </h3>

        <div className="space-y-4">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-start space-x-3 p-4 bg-white dark:bg-gray-800 rounded-xl"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">
                  {index + 1}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {insight}
              </p>
            </motion.div>
          ))}
        </div>

        {moodHistory.length < 3 && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">
                Track your mood for a few more days to unlock detailed insights!
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Encouragement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-6 text-white"
      >
        <Heart className="h-8 w-8 mx-auto mb-3" />
        <h3 className="text-xl font-semibold mb-2">You're Doing Great!</h3>
        <p className="text-pink-100">
          Every day you track your mood is a step toward better emotional awareness and well-being. 
          Keep up the wonderful work! 💖
        </p>
      </motion.div>
    </div>
  );
}