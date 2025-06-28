import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Smile, 
  Frown, 
  Meh, 
  Sun, 
  Cloud, 
  CloudRain,
  ArrowLeft,
  Settings,
  Calendar,
  TrendingUp,
  MessageCircle,
  Video,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Brain,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { MoodTracker } from './MoodTracker';
import { WellnessActivities } from './WellnessActivities';
import { EmotionalAICompanion } from './EmotionalAICompanion';
import { MoodInsights } from './MoodInsights';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { HeroHighlight, Highlight } from '../ui/hero-highlight';

interface HeartMateProps {
  onClose: () => void;
}

interface MoodEntry {
  id: string;
  mood: 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy';
  energy: number;
  stress: number;
  notes: string;
  timestamp: string;
}

export function HeartMateMode({ onClose }: HeartMateProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'companion' | 'mood' | 'activities' | 'insights'>('companion');
  const [currentMood, setCurrentMood] = useState<MoodEntry | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [isCompanionActive, setIsCompanionActive] = useState(true);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCompanionActive && intervalRef.current === null) {
      intervalRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else if (!isCompanionActive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCompanionActive]);

  useEffect(() => {
    loadMoodHistory();
    
    // Auto-hide welcome after 3 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Scroll to top when tab changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  const loadMoodHistory = async () => {
    if (!user) return;

    try {
      // In a real implementation, this would load from a mood_entries table
      // For now, we'll use localStorage as a demo
      const stored = localStorage.getItem(`heartmate_moods_${user.id}`);
      if (stored) {
        const moods = JSON.parse(stored);
        setMoodHistory(moods);
        
        // Get today's mood if it exists
        const today = new Date().toDateString();
        const todayMood = moods.find((mood: MoodEntry) => 
          new Date(mood.timestamp).toDateString() === today
        );
        if (todayMood) {
          setCurrentMood(todayMood);
        }
      }
    } catch (error) {
      console.error('Error loading mood history:', error);
    }
  };

  const saveMoodEntry = async (moodData: Omit<MoodEntry, 'id' | 'timestamp'>) => {
    if (!user) return;

    const newMood: MoodEntry = {
      id: crypto.randomUUID(),
      ...moodData,
      timestamp: new Date().toISOString()
    };

    try {
      const updatedHistory = [newMood, ...moodHistory.filter(m => 
        new Date(m.timestamp).toDateString() !== new Date().toDateString()
      )];
      
      setMoodHistory(updatedHistory);
      setCurrentMood(newMood);
      
      // Save to localStorage (in production, this would go to Supabase)
      localStorage.setItem(`heartmate_moods_${user.id}`, JSON.stringify(updatedHistory));
      
      console.log('Mood entry saved:', newMood);
    } catch (error) {
      console.error('Error saving mood entry:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'very-happy': return 'text-green-500';
      case 'happy': return 'text-blue-500';
      case 'neutral': return 'text-yellow-500';
      case 'sad': return 'text-orange-500';
      case 'very-sad': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getMoodIcon = (mood?: string) => {
    switch (mood) {
      case 'very-happy': return <Sun className="h-6 w-6" />;
      case 'happy': return <Smile className="h-6 w-6" />;
      case 'neutral': return <Meh className="h-6 w-6" />;
      case 'sad': return <Cloud className="h-6 w-6" />;
      case 'very-sad': return <CloudRain className="h-6 w-6" />;
      default: return <Heart className="h-6 w-6" />;
    }
  };

  const tabs = [
    { id: 'companion', name: 'AI Companion', icon: Heart },
    { id: 'mood', name: 'Mood Check', icon: Smile },
    { id: 'activities', name: 'Wellness', icon: Sparkles },
    { id: 'insights', name: 'Insights', icon: TrendingUp },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Welcome Animation with HeroHighlight */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-60 flex items-center justify-center"
          >
            <HeroHighlight className="w-full h-full flex items-center justify-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shadow-2xl">
                  <Heart className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Welcome to <Highlight className="text-white">HeartMate</Highlight>
                </h1>
                <p className="text-xl text-neutral-300">
                  Your emotional wellness companion
                </p>
              </motion.div>
            </HeroHighlight>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 sm:p-6 bg-black border-b border-white/[0.2]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
              <span className="text-white font-medium hidden sm:block">Back</span>
            </motion.button>
            
            <motion.div
              animate={{ 
                scale: isCompanionActive ? [1, 1.1, 1] : 1,
              }}
              transition={{ 
                duration: 2, 
                repeat: isCompanionActive ? Infinity : 0,
                ease: "easeInOut"
              }}
              className="p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
            >
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">HeartMate</h1>
              <p className="text-pink-400 text-sm sm:text-base flex items-center space-x-2">
                <span>{isCompanionActive ? `Active • ${formatTime(sessionDuration)}` : 'Ready for support'}</span>
                {currentMood && (
                  <>
                    <span>•</span>
                    <span className={`flex items-center space-x-1 ${getMoodColor(currentMood.mood)}`}>
                      {getMoodIcon(currentMood.mood)}
                      <span className="capitalize">{currentMood.mood.replace('-', ' ')}</span>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.location.href = '/settings'}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Fixed */}
      <div className="flex-shrink-0 bg-black border-b border-white/[0.2]">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-pink-400 border-b-2 border-pink-500 bg-white/5'
                  : 'text-neutral-400 hover:text-pink-300 hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Scrollable with visible scrollbar */}
      <div 
        ref={mainContentRef}
        className="flex-1 overflow-y-auto bg-black"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#6366f1 #1f2937'
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 8px;
          }
          div::-webkit-scrollbar-track {
            background: #1f2937;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb {
            background: #6366f1;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #4f46e5;
          }
        `}</style>
        
        <div className="p-4 sm:p-6 space-y-6">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'companion' && (
              <motion.div
                key="companion"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <EmotionalAICompanion
                  isActive={isCompanionActive}
                  onToggle={() => setIsCompanionActive(!isCompanionActive)}
                  currentMood={currentMood}
                  sessionDuration={sessionDuration}
                />
              </motion.div>
            )}

            {activeTab === 'mood' && (
              <motion.div
                key="mood"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MoodTracker
                  currentMood={currentMood}
                  onMoodSaved={saveMoodEntry}
                  moodHistory={moodHistory.slice(0, 7)} // Last 7 days
                />
              </motion.div>
            )}

            {activeTab === 'activities' && (
              <motion.div
                key="activities"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <WellnessActivities
                  currentMood={currentMood}
                  onActivityComplete={(activity) => {
                    console.log('Activity completed:', activity);
                    // In production, log this activity
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MoodInsights
                  moodHistory={moodHistory}
                  currentMood={currentMood}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Technology Credits - Fixed at bottom */}
      <div className="flex-shrink-0 p-4 bg-black border-t border-white/[0.2]">
        <div className="text-center text-xs text-neutral-400 space-y-1">
          <p>💖 <strong className="text-pink-400">HeartMate</strong> - Your emotional wellness companion</p>
          <p>🤖 Powered by <strong className="text-purple-400">Gemini 2.5 Flash</strong> • 🎥 Video support via <strong className="text-blue-400">Tavus</strong></p>
          <p>🔊 Voice by <strong className="text-green-400">ElevenLabs</strong> • 🎙️ Speech by <strong className="text-orange-400">Deepgram</strong></p>
          <p>📊 Mood tracking • 🧘 Wellness activities • 💬 Emotional AI support</p>
        </div>
      </div>
    </div>
  );
}