import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Smile, 
  Frown, 
  Meh, 
  Sun, 
  Cloud, 
  CloudRain,
  Zap,
  Battery,
  BatteryLow,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Save,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface MoodEntry {
  id: string;
  mood: 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy';
  energy: number;
  stress: number;
  notes: string;
  timestamp: string;
}

interface MoodTrackerProps {
  currentMood: MoodEntry | null;
  onMoodSaved: (mood: Omit<MoodEntry, 'id' | 'timestamp'>) => void;
  moodHistory: MoodEntry[];
}

export function MoodTracker({ currentMood, onMoodSaved, moodHistory }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState<MoodEntry['mood'] | null>(currentMood?.mood || null);
  const [energy, setEnergy] = useState(currentMood?.energy || 5);
  const [stress, setStress] = useState(currentMood?.stress || 3);
  const [notes, setNotes] = useState(currentMood?.notes || '');
  const [saving, setSaving] = useState(false);

  const moods = [
    { 
      id: 'very-sad', 
      label: 'Very Sad', 
      icon: CloudRain, 
      color: 'text-red-500', 
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800'
    },
    { 
      id: 'sad', 
      label: 'Sad', 
      icon: Cloud, 
      color: 'text-orange-500', 
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800'
    },
    { 
      id: 'neutral', 
      label: 'Neutral', 
      icon: Meh, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800'
    },
    { 
      id: 'happy', 
      label: 'Happy', 
      icon: Smile, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800'
    },
    { 
      id: 'very-happy', 
      label: 'Very Happy', 
      icon: Sun, 
      color: 'text-green-500', 
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800'
    },
  ];

  const handleSave = async () => {
    if (!selectedMood) return;

    setSaving(true);
    try {
      await onMoodSaved({
        mood: selectedMood,
        energy,
        stress,
        notes
      });
      
      // Show success feedback
      setTimeout(() => setSaving(false), 1000);
    } catch (error) {
      console.error('Error saving mood:', error);
      setSaving(false);
    }
  };

  const getEnergyIcon = (level: number) => {
    if (level >= 8) return <Zap className="h-4 w-4 text-green-500" />;
    if (level >= 5) return <Battery className="h-4 w-4 text-yellow-500" />;
    return <BatteryLow className="h-4 w-4 text-red-500" />;
  };

  const getStressIcon = (level: number) => {
    if (level >= 8) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (level >= 5) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Heart className="h-4 w-4 text-green-500" />;
  };

  const isToday = currentMood && new Date(currentMood.timestamp).toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-3 mb-4"
        >
          <Heart className="h-8 w-8 text-pink-500" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isToday ? 'Update Your Mood' : 'How Are You Feeling?'}
          </h2>
        </motion.div>
        <p className="text-gray-600 dark:text-gray-300">
          {isToday 
            ? 'You can update your mood entry for today'
            : 'Track your emotional state to better understand your patterns'
          }
        </p>
      </div>

      {/* Mood Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <Smile className="h-5 w-5 text-pink-500" />
          <span>Current Mood</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {moods.map((mood, index) => (
            <motion.button
              key={mood.id}
              onClick={() => setSelectedMood(mood.id as MoodEntry['mood'])}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl text-center transition-all ${
                selectedMood === mood.id
                  ? `${mood.bg} ${mood.border} border-2 shadow-lg`
                  : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <mood.icon className={`h-8 w-8 mx-auto mb-2 ${selectedMood === mood.id ? mood.color : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${
                selectedMood === mood.id 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {mood.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Energy & Stress Levels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Energy Level */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            {getEnergyIcon(energy)}
            <span>Energy Level</span>
            <span className="text-sm text-gray-500">({energy}/10)</span>
          </h3>
          
          <div className="space-y-4">
            <input
              type="range"
              min="1"
              max="10"
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)`
              }}
            />
            
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Exhausted</span>
              <span>Energized</span>
            </div>
          </div>
        </div>

        {/* Stress Level */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            {getStressIcon(stress)}
            <span>Stress Level</span>
            <span className="text-sm text-gray-500">({stress}/10)</span>
          </h3>
          
          <div className="space-y-4">
            <input
              type="range"
              min="1"
              max="10"
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%)`
              }}
            />
            
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Relaxed</span>
              <span>Stressed</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-pink-500" />
          <span>Notes (Optional)</span>
        </h3>
        
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What's on your mind? Any thoughts about your day or feelings..."
          className="w-full h-32 p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
        />
      </motion.div>

      {/* Recent Mood History */}
      {moodHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-pink-500" />
            <span>Recent Mood History</span>
          </h3>
          
          <div className="space-y-3">
            {moodHistory.slice(0, 5).map((entry, index) => {
              const moodConfig = moods.find(m => m.id === entry.mood);
              const date = new Date(entry.timestamp);
              const isEntryToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {moodConfig && <moodConfig.icon className={`h-5 w-5 ${moodConfig.color}`} />}
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {moodConfig?.label}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {isEntryToday ? 'Today' : date.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      {getEnergyIcon(entry.energy)}
                      <span>{entry.energy}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStressIcon(entry.stress)}
                      <span>{entry.stress}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <motion.button
          onClick={handleSave}
          disabled={!selectedMood || saving}
          whileHover={{ scale: selectedMood ? 1.05 : 1 }}
          whileTap={{ scale: selectedMood ? 0.95 : 1 }}
          className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg flex items-center space-x-2"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>{isToday ? 'Update Mood' : 'Save Mood Entry'}</span>
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}