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
import { DataCollectionService } from '../insights/DataCollectionService';
import { useNavigate } from 'react-router-dom';
import { HeartMateVideoModal } from './HeartMateVideoModal';

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'companion' | 'mood' | 'activities' | 'insights'>('companion');
  const [currentMood, setCurrentMood] = useState<MoodEntry | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [isCompanionActive, setIsCompanionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isSavingMood, setIsSavingMood] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showTavusVideoModal, setShowTavusVideoModal] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);

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
    createSession();
    checkApiKeys();
    
    // Auto-hide welcome after 3 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      endSession();
    };
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

  const checkApiKeys = async () => {
    if (!user) {
      setApiKeysLoading(false);
      return;
    }

    try {
      console.log('Checking API keys in Supabase for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching API keys:', error);
        setHasApiKeys(false);
        return;
      }

      console.log('API keys data from Supabase:', data);

      if (data) {
        // Check if we have at least Tavus for video functionality
        const hasTavusKey = data.tavus_api_key;
        
        console.log('Has Tavus key:', hasTavusKey);
        
        setHasApiKeys(!!hasTavusKey);
      } else {
        console.log('No API keys found in database');
        setHasApiKeys(false);
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
      setHasApiKeys(false);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const createSession = async () => {
    if (!user) return;

    try {
      // Create a new session in the ai_sessions table
      const { data, error } = await supabase
        .from('ai_sessions')
        .insert({
          user_id: user.id,
          session_type: 'heartmate',
          room_name: `heartmate-${user.id}-${Date.now()}`,
          avatar_id: `heartmate-${Date.now()}`,
          status: 'active',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return;
      }

      console.log('HeartMate session created:', data.id);
      setSessionId(data.id);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const endSession = async () => {
    if (!user || !sessionId) return;

    try {
      // Update the session with end time and duration
      const { error } = await supabase
        .from('ai_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: sessionDuration
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error ending session:', error);
        return;
      }

      console.log('HeartMate session ended:', sessionId, 'Duration:', sessionDuration);

      // Save session analytics
      await DataCollectionService.saveSessionAnalytics(user.id, sessionId, {
        session_type: 'heartmate',
        duration_seconds: sessionDuration,
        messages_exchanged: Math.floor(sessionDuration / 30), // Approximate
        mood_improvement_score: 1
      });
      
      // Award achievement if this is their first HeartMate session
      const { data: sessions, error: sessionsError } = await supabase
        .from('ai_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_type', 'heartmate');
        
      if (!sessionsError && sessions && sessions.length === 1) {
        // This is their first session, award the achievement
        await DataCollectionService.awardAchievement(user.id, {
          achievement_type: 'wellness',
          achievement_name: 'Heart Helper',
          achievement_description: 'Used HeartMate mode for the first time',
          badge_icon: 'heart',
          points_earned: 200
        });
      }
      
      // If they've completed 10 sessions, award another achievement
      if (!sessionsError && sessions && sessions.length === 10) {
        await DataCollectionService.awardAchievement(user.id, {
          achievement_type: 'wellness',
          achievement_name: 'Wellness Warrior',
          achievement_description: 'Completed 10 HeartMate sessions',
          badge_icon: 'heart',
          points_earned: 400
        });
      }
    } catch (error) {
      console.error('Error in endSession:', error);
    }
  };

  const loadMoodHistory = async () => {
    if (!user) return;

    try {
      // Load mood entries from Supabase
      const moodEntries = await DataCollectionService.getMoodHistory(user.id, 30);
      
      // Convert to our local format
      const formattedEntries = moodEntries.map(entry => ({
        id: entry.id,
        mood: entry.mood as 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy',
        energy: entry.energy_level,
        stress: entry.stress_level,
        notes: entry.notes || '',
        timestamp: entry.entry_date
      }));
      
      setMoodHistory(formattedEntries);
      
      // Get today's mood if it exists
      const today = new Date().toDateString();
      const todayMood = formattedEntries.find((mood: MoodEntry) => 
        new Date(mood.timestamp).toDateString() === today
      );
      
      if (todayMood) {
        setCurrentMood(todayMood);
      }
      
      console.log('Loaded mood history:', formattedEntries.length, 'entries');
    } catch (error) {
      console.error('Error loading mood history:', error);
      
      // Fallback to localStorage if database fails
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
    }
  };

  const saveMoodEntry = async (moodData: Omit<MoodEntry, 'id' | 'timestamp'>) => {
    if (!user) return;

    setIsSavingMood(true);
    try {
      // First, save to Supabase using DataCollectionService
      await DataCollectionService.saveMoodEntry(user.id, {
        mood: moodData.mood,
        energy_level: moodData.energy,
        stress_level: moodData.stress,
        notes: moodData.notes
      });
      
      console.log('Mood entry saved to database successfully');
      
      // Create a new mood entry object for local state
      const newMood: MoodEntry = {
        id: crypto.randomUUID(),
        ...moodData,
        timestamp: new Date().toISOString()
      };

      // Update local state
      const updatedHistory = [newMood, ...moodHistory.filter(m => 
        new Date(m.timestamp).toDateString() !== new Date().toDateString()
      )];
      
      setMoodHistory(updatedHistory);
      setCurrentMood(newMood);
      
      // Also save to localStorage as backup
      localStorage.setItem(`heartmate_moods_${user.id}`, JSON.stringify(updatedHistory));
      
      console.log('Mood entry saved:', newMood);
      
      // Log activity for analytics - use the current sessionId
      await DataCollectionService.saveSessionAnalytics(user.id, sessionId, {
        session_type: 'heartmate',
        duration_seconds: sessionDuration,
        messages_exchanged: 1,
        mood_improvement_score: 1
      });
      
      // Check if this is their first mood entry and award achievement
      const { data: moodEntries, error: moodError } = await supabase
        .from('mood_entries')
        .select('id')
        .eq('user_id', user.id);
        
      if (!moodError && moodEntries && moodEntries.length === 1) {
        // This is their first mood entry, award achievement
        await DataCollectionService.awardAchievement(user.id, {
          achievement_type: 'wellness',
          achievement_name: 'Mood Tracker',
          achievement_description: 'Tracked your mood for the first time',
          badge_icon: 'smile',
          points_earned: 100
        });
      }
    } catch (error) {
      console.error('Error saving mood entry:', error);
      
      // Fallback to localStorage only if database save fails
      const newMood: MoodEntry = {
        id: crypto.randomUUID(),
        ...moodData,
        timestamp: new Date().toISOString()
      };
      
      const updatedHistory = [newMood, ...moodHistory.filter(m => 
        new Date(m.timestamp).toDateString() !== new Date().toDateString()
      )];
      
      setMoodHistory(updatedHistory);
      setCurrentMood(newMood);
      
      localStorage.setItem(`heartmate_moods_${user.id}`, JSON.stringify(updatedHistory));
    } finally {
      setIsSavingMood(false);
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

  const handleClose = () => {
    endSession();
    onClose();
  };

  const handleVideoCallStart = () => {
    console.log('📹 Video call started - pausing AI features');
    setIsVideoCallActive(true);
  };

  const handleVideoCallEnd = () => {
    console.log('📹 Video call ended - resuming AI features');
    setIsVideoCallActive(false);
  };

  const handleShowVideoClick = () => {
    if (hasApiKeys) {
      setShowTavusVideoModal(true);
    } else {
      navigate('/settings');
    }
  };

  // Show loading while checking API keys
  if (apiKeysLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Checking AI capabilities...</p>
        </div>
      </div>
    );
  }

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
              onClick={handleClose}
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
            {isVideoCallActive && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-2 sm:px-3 py-1 bg-purple-500 text-white text-xs sm:text-sm font-bold rounded-full"
              >
                VIDEO CALL
              </motion.div>
            )}
            
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Call Button - Fixed below header */}
      <div className="flex-shrink-0 p-4 bg-black border-b border-white/[0.2]">
        <motion.button
          onClick={handleShowVideoClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full p-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Video className="h-5 w-5" />
          <span>{hasApiKeys ? 'Start Video Support Session' : 'Setup Video Support (API Keys Required)'}</span>
        </motion.button>
        <p className="text-center text-xs text-neutral-400 mt-2">
          Face-to-face emotional support with your AI companion
        </p>
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
                  onActivityComplete={async (activity) => {
                    console.log('Activity completed:', activity);
                    // Log activity to database
                    if (user) {
                      try {
                        await DataCollectionService.logActivity(user.id, {
                          activity_type: 'mindfulness',
                          activity_name: activity,
                          duration_seconds: 300, // Default 5 minutes
                          completed: true,
                          mood_before: currentMood?.mood,
                        });
                        
                        // Check if this is their first activity and award achievement
                        const { data: activities, error: activitiesError } = await supabase
                          .from('activity_logs')
                          .select('id')
                          .eq('user_id', user.id);
                          
                        if (!activitiesError && activities && activities.length === 1) {
                          // This is their first activity, award achievement
                          await DataCollectionService.awardAchievement(user.id, {
                            achievement_type: 'wellness',
                            achievement_name: 'Mindfulness Beginner',
                            achievement_description: 'Completed your first wellness activity',
                            badge_icon: 'sparkles',
                            points_earned: 100
                          });
                        }
                      } catch (error) {
                        console.error('Error logging activity:', error);
                      }
                    }
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

      {/* HeartMate Video Modal */}
      <HeartMateVideoModal
        isOpen={showTavusVideoModal}
        onClose={() => setShowTavusVideoModal(false)}
        onVideoCallStart={handleVideoCallStart}
        onVideoCallEnd={handleVideoCallEnd}
      />
    </div>
  );
}