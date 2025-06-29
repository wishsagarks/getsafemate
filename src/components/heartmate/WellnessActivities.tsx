import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Wind, 
  Heart, 
  Brain, 
  Music, 
  Flower,
  Sun,
  Moon,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Timer,
  Headphones,
  Smile,
  Zap
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { Button } from '../ui/aceternity-button';
import { SoulfulRhythms } from './SoulfulRhythms';
import { SpotifyPlayer } from './SpotifyPlayer';

interface MoodEntry {
  mood: 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy';
  energy: number;
  stress: number;
}

interface WellnessActivitiesProps {
  currentMood: MoodEntry | null;
  onActivityComplete: (activity: string) => void;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  category: 'breathing' | 'meditation' | 'movement' | 'mindfulness';
  moodBoost: string[];
  instructions: string[];
}

export function WellnessActivities({ currentMood, onActivityComplete }: WellnessActivitiesProps) {
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [musicPlayerType, setMusicPlayerType] = useState<'basic' | 'spotify'>('basic');

  const activities: Activity[] = [
    {
      id: 'box-breathing',
      title: '4-7-8 Breathing',
      description: 'Calming breath technique to reduce stress and anxiety',
      duration: '5 min',
      icon: Wind,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      category: 'breathing',
      moodBoost: ['sad', 'very-sad', 'neutral'],
      instructions: [
        'Sit comfortably with your back straight',
        'Inhale through your nose for 4 counts',
        'Hold your breath for 7 counts',
        'Exhale through your mouth for 8 counts',
        'Repeat this cycle 4-8 times'
      ]
    },
    {
      id: 'loving-kindness',
      title: 'Loving Kindness Meditation',
      description: 'Cultivate compassion and positive emotions',
      duration: '10 min',
      icon: Heart,
      color: 'text-pink-400',
      bg: 'bg-pink-500/20',
      category: 'meditation',
      moodBoost: ['sad', 'very-sad', 'neutral'],
      instructions: [
        'Sit quietly and close your eyes',
        'Start by sending love to yourself: "May I be happy, may I be peaceful"',
        'Extend these wishes to loved ones',
        'Include neutral people in your life',
        'Finally, send love to difficult people',
        'End by sending love to all beings everywhere'
      ]
    },
    {
      id: 'body-scan',
      title: 'Progressive Body Scan',
      description: 'Release tension and increase body awareness',
      duration: '15 min',
      icon: Sparkles,
      color: 'text-purple-400',
      bg: 'bg-purple-500/20',
      category: 'mindfulness',
      moodBoost: ['neutral', 'sad', 'very-sad'],
      instructions: [
        'Lie down comfortably on your back',
        'Close your eyes and take three deep breaths',
        'Start at the top of your head',
        'Slowly move your attention down through each part of your body',
        'Notice any tension and consciously relax each area',
        'End at your toes, feeling completely relaxed'
      ]
    },
    {
      id: 'gratitude-practice',
      title: 'Gratitude Reflection',
      description: 'Focus on positive aspects of your life',
      duration: '7 min',
      icon: Sun,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      category: 'mindfulness',
      moodBoost: ['neutral', 'happy', 'very-happy'],
      instructions: [
        'Find a quiet, comfortable space',
        'Think of 3 things you\'re grateful for today',
        'For each item, spend time really feeling the gratitude',
        'Consider why you\'re grateful for each thing',
        'Notice how gratitude feels in your body',
        'End by appreciating this moment of reflection'
      ]
    },
    {
      id: 'energy-boost',
      title: 'Energizing Movement',
      description: 'Quick exercises to boost energy and mood',
      duration: '8 min',
      icon: Zap,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      category: 'movement',
      moodBoost: ['neutral', 'sad'],
      instructions: [
        'Stand up and stretch your arms overhead',
        'Do 10 jumping jacks',
        'March in place for 30 seconds',
        'Do 5 gentle neck rolls each direction',
        'Take 5 deep breaths with arm movements',
        'End with a big smile and positive affirmation'
      ]
    },
    {
      id: 'mindful-listening',
      title: 'Mindful Sound Meditation',
      description: 'Use ambient sounds to center yourself',
      duration: '12 min',
      icon: Headphones,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/20',
      category: 'meditation',
      moodBoost: ['neutral', 'happy', 'very-happy'],
      instructions: [
        'Put on headphones or find a quiet space',
        'Close your eyes and listen to calming sounds',
        'Focus only on what you hear',
        'When your mind wanders, gently return to the sounds',
        'Notice different layers and textures in the audio',
        'Let the sounds wash over you completely'
      ]
    }
  ];

  useEffect(() => {
    // Clean up timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, []);

  const getRecommendedActivities = () => {
    if (!currentMood) return activities.slice(0, 3);
    
    return activities
      .filter(activity => activity.moodBoost.includes(currentMood.mood))
      .slice(0, 3);
  };

  const startActivity = (activity: Activity) => {
    setActiveActivity(activity);
    const duration = parseInt(activity.duration) * 60; // Convert to seconds
    setTimeRemaining(duration);
    setIsPlaying(false);
    
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const toggleActivity = () => {
    setIsPlaying(!isPlaying);
    
    if (!isPlaying && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            completeActivity();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimerInterval(timer);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const completeActivity = () => {
    if (activeActivity) {
      setCompletedActivities(prev => [...prev, activeActivity.id]);
      onActivityComplete(activeActivity.id);
      setIsPlaying(false);
      setTimeRemaining(0);
      
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  };

  const resetActivity = () => {
    if (activeActivity) {
      const duration = parseInt(activeActivity.duration) * 60;
      setTimeRemaining(duration);
      setIsPlaying(false);
      
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMusicPlayStateChange = (isPlaying: boolean) => {
    setMusicPlaying(isPlaying);
  };

  const toggleMusicPlayer = (type: 'basic' | 'spotify') => {
    if (showMusicPlayer && musicPlayerType === type) {
      setShowMusicPlayer(false);
    } else {
      setShowMusicPlayer(true);
      setMusicPlayerType(type);
    }
  };

  const recommendedActivities = getRecommendedActivities();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-3 mb-4"
        >
          <Sparkles className="h-8 w-8 text-purple-400" />
          <h2 className="text-3xl font-bold text-white">Wellness Activities</h2>
        </motion.div>
        <p className="text-neutral-400">
          {currentMood 
            ? `Based on your current mood, here are some activities that might help`
            : 'Choose an activity to support your emotional well-being'
          }
        </p>
      </div>

      {/* Music Player Options */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={() => toggleMusicPlayer('basic')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`p-3 rounded-xl transition-all ${
            showMusicPlayer && musicPlayerType === 'basic'
              ? 'bg-purple-600 text-white' 
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Music className="h-5 w-5" />
            <span>{showMusicPlayer && musicPlayerType === 'basic' ? (musicPlaying ? 'Basic Music Playing' : 'Basic Music Player') : 'Basic Music Player'}</span>
          </div>
        </motion.button>

        <motion.button
          onClick={() => toggleMusicPlayer('spotify')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`p-3 rounded-xl transition-all ${
            showMusicPlayer && musicPlayerType === 'spotify'
              ? 'bg-green-600 text-white' 
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Music className="h-5 w-5" />
            <span>{showMusicPlayer && musicPlayerType === 'spotify' ? (musicPlaying ? 'Spotify Playing' : 'Spotify Player') : 'Spotify Player'}</span>
          </div>
        </motion.button>
      </div>

      {/* Music Player */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: showMusicPlayer ? 1 : 0,
          height: showMusicPlayer ? 'auto' : 0
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        {showMusicPlayer && musicPlayerType === 'basic' && (
          <SoulfulRhythms onPlayStateChange={handleMusicPlayStateChange} />
        )}
        
        {showMusicPlayer && musicPlayerType === 'spotify' && (
          <SpotifyPlayer onPlayStateChange={handleMusicPlayStateChange} />
        )}
      </motion.div>

      {/* Active Activity */}
      <AnimatePresence>
        {activeActivity && (
          <Card className="bg-black border-white/[0.2]">
            <div className="text-center mb-6">
              <activeActivity.icon className={`h-12 w-12 mx-auto mb-3 ${activeActivity.color}`} />
              <CardTitle className="text-white mb-2">
                {activeActivity.title}
              </CardTitle>
              <CardDescription className="text-neutral-400">
                {activeActivity.description}
              </CardDescription>
            </div>

            {/* Timer */}
            <div className="text-center mb-6">
              <div className="text-4xl font-mono font-bold text-purple-400 mb-4">
                {formatTime(timeRemaining)}
              </div>
              
              <div className="flex items-center justify-center space-x-4">
                <Button
                  onClick={toggleActivity}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isPlaying ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                  <span>{isPlaying ? 'Pause' : 'Start'}</span>
                </Button>
                
                <Button
                  onClick={resetActivity}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  <span>Reset</span>
                </Button>
                
                <Button
                  onClick={() => setActiveActivity(null)}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-3">Instructions:</h4>
              <ol className="space-y-2">
                {activeActivity.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-neutral-300">
                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        )}
      </AnimatePresence>

      {/* Recommended Activities */}
      {currentMood && !activeActivity && (
        <Card className="bg-black border-white/[0.2]">
          <CardTitle className="text-white mb-4 flex items-center space-x-2">
            <Smile className="h-5 w-5 text-pink-400" />
            <span>Recommended for You</span>
          </CardTitle>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-xl cursor-pointer transition-all ${activity.bg} border border-white/20 hover:shadow-md`}
                onClick={() => startActivity(activity)}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <activity.icon className={`h-6 w-6 ${activity.color}`} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-sm">
                      {activity.title}
                    </h4>
                    <p className="text-xs text-neutral-400">
                      {activity.duration}
                    </p>
                  </div>
                  {completedActivities.includes(activity.id) && (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                </div>
                <p className="text-xs text-neutral-300">
                  {activity.description}
                </p>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* All Activities */}
      {!activeActivity && (
        <Card className="bg-black border-white/[0.2]">
          <CardTitle className="text-white mb-6 flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <span>All Wellness Activities</span>
          </CardTitle>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className={`p-6 rounded-xl cursor-pointer transition-all ${activity.bg} border border-white/20 hover:shadow-lg`}
                onClick={() => startActivity(activity)}
              >
                <div className="flex items-center justify-between mb-4">
                  <activity.icon className={`h-8 w-8 ${activity.color}`} />
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4 text-neutral-400" />
                    <span className="text-sm text-neutral-400">
                      {activity.duration}
                    </span>
                    {completedActivities.includes(activity.id) && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                </div>
                
                <h4 className="font-semibold text-white mb-2">
                  {activity.title}
                </h4>
                <p className="text-sm text-neutral-300 mb-3">
                  {activity.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-neutral-300 capitalize">
                    {activity.category}
                  </span>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-xs"
                  >
                    Start
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Completed Activities */}
      {completedActivities.length > 0 && !activeActivity && (
        <Card className="bg-green-500/20 border-green-500/30">
          <CardTitle className="text-white mb-4 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>Completed Today</span>
          </CardTitle>
          
          <div className="flex flex-wrap gap-2">
            {completedActivities.map(activityId => {
              const activity = activities.find(a => a.id === activityId);
              return activity ? (
                <div
                  key={activityId}
                  className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full text-sm text-green-300"
                >
                  <activity.icon className="h-4 w-4" />
                  <span>{activity.title}</span>
                  <CheckCircle className="h-3 w-3" />
                </div>
              ) : null;
            })}
          </div>
          
          <p className="text-sm text-green-300 mt-3">
            Great job! You've completed {completedActivities.length} wellness activit{completedActivities.length === 1 ? 'y' : 'ies'} today.
          </p>
        </Card>
      )}
    </div>
  );
}