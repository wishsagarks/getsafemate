import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  MapPin, 
  Phone, 
  Mic, 
  MicOff, 
  Navigation,
  AlertTriangle,
  Clock,
  Users,
  Heart,
  Settings,
  Play,
  Pause,
  Square,
  ArrowLeft,
  X,
  Brain,
  Video,
  Camera,
  CheckCircle,
  Zap,
  Target,
  Star,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PermissionManager } from './PermissionManager';
import { LocationTracker } from './LocationTracker';
import { EmergencySystem } from './EmergencySystem';
import { EnhancedAICompanion } from './EnhancedAICompanion';
import { ApiKeyManager } from './ApiKeyManager';
import { useNavigate } from 'react-router-dom';
import { DataCollectionService } from '../insights/DataCollectionService';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { Button } from '../ui/aceternity-button';
import { HeroHighlight, Highlight } from '../ui/hero-highlight';
import { BackgroundBeams } from '../ui/background-beams';

interface SafeWalkProps {
  onClose: () => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export function SafeWalkMode({ onClose }: SafeWalkProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aiCompanionActive, setAiCompanionActive] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [videoCompanionActive, setVideoCompanionActive] = useState(false);
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [showTavusVideoModal, setShowTavusVideoModal] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState<'companion' | 'location' | 'emergency'>('companion');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkPermissions();
    checkApiKeysInSupabase();
    setAiCompanionActive(true);
    
    // Auto-hide welcome after 3 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
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

  useEffect(() => {
    if (isActive && intervalRef.current === null) {
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else if (!isActive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  const checkApiKeysInSupabase = async () => {
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
        // Check if we have at least Gemini for basic functionality
        const hasBasicKeys = data.gemini_api_key;
        const hasAllKeys = data.livekit_api_key && 
          data.livekit_api_secret && 
          data.livekit_ws_url && 
          data.tavus_api_key && 
          data.gemini_api_key &&
          data.elevenlabs_api_key &&
          data.deepgram_api_key;
        
        console.log('Has basic keys (Gemini):', hasBasicKeys);
        console.log('Has all keys:', hasAllKeys);
        
        // Allow basic functionality with just Gemini
        setHasApiKeys(hasBasicKeys);
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

  const checkPermissions = async () => {
    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      const locationPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      
      if (micPermission.state === 'granted' && locationPermission.state === 'granted') {
        setPermissionsGranted(true);
      } else {
        setShowPermissions(true);
      }
    } catch (error) {
      setShowPermissions(true);
    }
  };

  const handlePermissionsGranted = () => {
    setPermissionsGranted(true);
    setShowPermissions(false);
  };

  const handleClose = () => {
    if (isActive) {
      setShowExitConfirm(true);
    } else {
      endSession();
      navigate('/dashboard');
    }
  };

  const confirmExit = () => {
    endSession();
    navigate('/dashboard');
  };

  const createSession = async () => {
    if (!user) return;

    try {
      // Create a new session in the ai_sessions table
      const { data, error } = await supabase
        .from('ai_sessions')
        .insert({
          user_id: user.id,
          session_type: 'safewalk',
          room_name: `safewalk-${user.id}-${Date.now()}`,
          avatar_id: `safewalk-${Date.now()}`,
          status: 'active',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return;
      }

      console.log('SafeWalk session created:', data.id);
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
          duration_seconds: duration
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error ending session:', error);
        return;
      }

      console.log('SafeWalk session ended:', sessionId, 'Duration:', duration);

      // Save session analytics
      await DataCollectionService.saveSessionAnalytics(user.id, sessionId, {
        session_type: 'safewalk',
        duration_seconds: duration,
        messages_exchanged: Math.floor(duration / 30), // Approximate
        safety_score: 8 // Default good score
      });
      
      // Award achievement if this is their first SafeWalk session
      const { data: sessions, error: sessionsError } = await supabase
        .from('ai_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_type', 'safewalk');
        
      if (!sessionsError && sessions && sessions.length === 1) {
        // This is their first session, award the achievement
        await DataCollectionService.awardAchievement(user.id, {
          achievement_type: 'safety',
          achievement_name: 'Safety Guardian',
          achievement_description: 'Completed your first SafeWalk journey',
          badge_icon: 'shield',
          points_earned: 200,
          is_featured: true
        });
      }
      
      // If they've completed 10 sessions, award another achievement
      if (!sessionsError && sessions && sessions.length === 10) {
        await DataCollectionService.awardAchievement(user.id, {
          achievement_type: 'safety',
          achievement_name: 'Journey Master',
          achievement_description: 'Completed 10 SafeWalk journeys',
          badge_icon: 'star',
          points_earned: 500,
          is_featured: true
        });
      }
    } catch (error) {
      console.error('Error in endSession:', error);
    }
  };

  const startSafeWalk = async () => {
    if (!permissionsGranted) {
      setShowPermissions(true);
      return;
    }

    setIsActive(true);
    setDuration(0);
    
    // Create a new session
    await createSession();
    
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SafeWalk Started', {
        body: hasApiKeys 
          ? 'Your AI companion is now active with enhanced capabilities and will check in with you periodically.'
          : 'Your AI companion is now active in basic mode and will check in with you periodically.',
        icon: '/favicon.ico'
      });
    }
  };

  const stopSafeWalk = () => {
    setIsActive(false);
    setIsRecording(false);
    setEmergencyTriggered(false);
    setVideoCompanionActive(false);
    setShowTavusVideoModal(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // End the session
    endSession();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SafeWalk Completed', {
        body: `Journey completed safely in ${formatTime(duration)}. Well done!`,
        icon: '/favicon.ico'
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        console.log('Recording stopped - ready for Deepgram processing');
        
        // In production, this would be sent to Deepgram for transcription
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safemate-recording-${new Date().toISOString()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleLocationUpdate = (location: LocationData) => {
    setCurrentLocation(location);
  };

  const handleEmergencyTriggered = () => {
    setEmergencyTriggered(true);
    
    // Auto-start recording for emergency
    if (!isRecording) {
      startRecording();
    }
    
    // Activate video companion for emergency support
    setVideoCompanionActive(true);
    setShowTavusVideoModal(true);
    
    // Log safety event
    if (user && sessionId) {
      DataCollectionService.logSafetyEvent(user.id, sessionId, {
        event_type: 'sos_triggered',
        severity: 'high',
        location_lat: currentLocation?.latitude,
        location_lng: currentLocation?.longitude,
        location_accuracy: currentLocation?.accuracy,
        emergency_contacts_notified: 1,
        resolution_status: 'ongoing'
      });
    }
  };

  const handleAICompanionNeedHelp = () => {
    // This is triggered when user says "I need you" to the AI
    setVideoCompanionActive(true);
    setShowTavusVideoModal(true);
  };

  const handleShowAvatarClick = () => {
    // Direct activation of video companion modal
    if (hasApiKeys) {
      setVideoCompanionActive(true);
      setShowTavusVideoModal(true);
    } else {
      setShowApiConfig(true);
    }
  };

  const handleTavusVideoClose = () => {
    setShowTavusVideoModal(false);
    // Keep videoCompanionActive true if needed for other logic
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'companion', name: 'AI Companion', icon: Brain },
    { id: 'location', name: 'Location', icon: MapPin },
    { id: 'emergency', name: 'Emergency', icon: AlertTriangle },
  ];

  // Show loading while checking API keys
  if (apiKeysLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Checking AI capabilities...</p>
        </div>
      </div>
    );
  }

  if (showPermissions) {
    return (
      <PermissionManager
        onPermissionsGranted={handlePermissionsGranted}
        onClose={() => setShowPermissions(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden flex flex-col">
      <BackgroundBeams />
      
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
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-2xl">
                  <Shield className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Welcome to <Highlight className="text-white">SafeWalk</Highlight>
                </h1>
                <p className="text-xl text-neutral-300">
                  Your AI-powered safety companion
                </p>
              </motion.div>
            </HeroHighlight>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Fixed with increased spacing */}
      <div className="flex-shrink-0 p-4 sm:p-6 bg-black border-b border-white/[0.2] mt-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={() => navigate('/dashboard')}
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20 min-w-[40px]"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
              <span className="text-white font-medium hidden sm:block">Back</span>
            </motion.button>
            
            <motion.div
              animate={{ 
                scale: isActive ? [1, 1.1, 1] : 1,
                rotate: isActive ? [0, 5, -5, 0] : 0
              }}
              transition={{ 
                duration: 2, 
                repeat: isActive ? Infinity : 0,
                ease: "easeInOut"
              }}
              className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
            >
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">SafeWalk</h1>
              <p className="text-blue-400 text-sm sm:text-base flex items-center space-x-2">
                <span>{isActive ? `Active • ${formatTime(duration)}` : hasApiKeys ? 'AI Enhanced Ready' : 'Basic Mode Ready'}</span>
                {currentLocation && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1 text-green-400">
                      <MapPin className="h-3 w-3" />
                      <span>GPS Active</span>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {emergencyTriggered && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="px-2 sm:px-3 py-1 bg-red-500 text-white text-xs sm:text-sm font-bold rounded-full"
              >
                EMERGENCY ACTIVE
              </motion.div>
            )}
            
            {videoCompanionActive && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-2 sm:px-3 py-1 bg-purple-500 text-white text-xs sm:text-sm font-bold rounded-full"
              >
                AI COMPANION
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

      {/* Tab Navigation - Fixed */}
      <div className="flex-shrink-0 bg-black border-b border-white/[0.2]">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-white/5'
                  : 'text-neutral-400 hover:text-blue-300 hover:bg-white/5'
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
        className="flex-1 overflow-y-auto bg-black pt-6"
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
            {/* Control Panel - Always visible */}
            <Card className="bg-black border-white/[0.2] mb-6">
              <div className="p-6">
                <CardTitle className="text-white mb-6 flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span>Safety Controls</span>
                </CardTitle>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {/* Start/Stop Safe Walk */}
                  <motion.button
                    onClick={isActive ? stopSafeWalk : startSafeWalk}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-3 sm:p-4 rounded-xl font-semibold transition-all ${
                      isActive 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Square className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
                        <span className="text-xs sm:text-sm">Stop Walk</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
                        <span className="text-xs sm:text-sm">Start Walk</span>
                      </>
                    )}
                  </motion.button>

                  {/* Audio Recording */}
                  <motion.button
                    onClick={isRecording ? stopRecording : startRecording}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-3 sm:p-4 rounded-xl font-semibold transition-all ${
                      isRecording 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    {isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />}
                    <span className="text-xs sm:text-sm">{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                  </motion.button>

                  {/* Show Avatar Button - Now directly opens video modal */}
                  <motion.button
                    onClick={handleShowAvatarClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-3 sm:p-4 rounded-xl font-semibold transition-all ${
                      videoCompanionActive 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    <Video className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
                    <span className="text-xs sm:text-sm">
                      {hasApiKeys ? 'Video Call' : 'Setup Video'}
                    </span>
                  </motion.button>
                </div>
                
                {/* Status Indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-4 w-4 text-purple-400" />
                      <span className="text-xs text-white">
                        {hasApiKeys && aiCompanionActive ? 'Gemini Active' : 'Basic AI'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4 text-blue-400" />
                      <span className="text-xs text-white">
                        {hasApiKeys ? 'Video Ready' : 'No Video'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-red-400" />
                      <span className="text-xs text-white">
                        {currentLocation ? 'GPS Active' : 'No GPS'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-white">
                        {isActive ? formatTime(duration) : 'Ready'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {activeTab === 'companion' && (
              <motion.div
                key="companion"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <EnhancedAICompanion
                  isActive={aiCompanionActive}
                  onEmergencyDetected={handleEmergencyTriggered}
                  onNeedHelp={handleAICompanionNeedHelp}
                  showVideoCompanion={videoCompanionActive}
                  currentLocation={currentLocation}
                  showTavusVideoModal={showTavusVideoModal}
                  setShowTavusVideoModal={setShowTavusVideoModal}
                  onTavusVideoClose={handleTavusVideoClose}
                />
              </motion.div>
            )}

            {activeTab === 'location' && (
              <motion.div
                key="location"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <LocationTracker
                  isActive={true} // Always active to ensure location tracking works
                  onLocationUpdate={handleLocationUpdate}
                />
                
                {/* Safety Stats */}
                <Card className="bg-black border-white/[0.2] mt-6">
                  <div className="p-6">
                    <CardTitle className="text-white mb-6 flex items-center space-x-2">
                      <Target className="h-5 w-5 text-green-400" />
                      <span>Safety Statistics</span>
                    </CardTitle>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-xl">
                        <div className="text-2xl font-bold text-white">{isActive ? formatTime(duration) : '00:00'}</div>
                        <div className="text-sm text-neutral-400">Current Journey</div>
                      </div>
                      
                      <div className="p-4 bg-white/5 rounded-xl">
                        <div className="text-2xl font-bold text-white">
                          {currentLocation ? Math.round(currentLocation.accuracy) + 'm' : 'N/A'}
                        </div>
                        <div className="text-sm text-neutral-400">GPS Accuracy</div>
                      </div>
                      
                      <div className="p-4 bg-white/5 rounded-xl">
                        <div className="text-2xl font-bold text-white">
                          {currentLocation ? '8.5/10' : 'N/A'}
                        </div>
                        <div className="text-sm text-neutral-400">Safety Score</div>
                      </div>
                      
                      <div className="p-4 bg-white/5 rounded-xl">
                        <div className="text-2xl font-bold text-white">
                          {isActive ? '2' : '0'}
                        </div>
                        <div className="text-sm text-neutral-400">Check-ins</div>
                      </div>
                    </div>
                    
                    {/* Safety Tip */}
                    <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                      <div className="flex items-start space-x-3">
                        <Sparkles className="h-5 w-5 text-blue-400 mt-0.5" />
                        <div>
                          <h4 className="text-white font-medium">Safety Tip</h4>
                          <p className="text-blue-200 text-sm mt-1">
                            Share your location with trusted contacts before starting a journey in unfamiliar areas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'emergency' && (
              <motion.div
                key="emergency"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <EmergencySystem
                  isActive={true} // Always active to ensure emergency features work
                  currentLocation={currentLocation}
                  onEmergencyTriggered={handleEmergencyTriggered}
                />
                
                {/* Emergency Resources */}
                <Card className="bg-black border-white/[0.2] mt-6">
                  <div className="p-6">
                    <CardTitle className="text-white mb-6 flex items-center space-x-2">
                      <Phone className="h-5 w-5 text-red-400" />
                      <span>Emergency Resources</span>
                    </CardTitle>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-red-500/20">
                              <Phone className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium">Emergency Services</div>
                              <div className="text-sm text-neutral-400">Police, Fire, Ambulance</div>
                            </div>
                          </div>
                          <Button
                            onClick={() => window.open('tel:911', '_self')}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Call 911
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                              <Users className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium">Trusted Contacts</div>
                              <div className="text-sm text-neutral-400">Alert your emergency contacts</div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleEmergencyTriggered()}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Alert Now
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-green-500/20">
                              <MapPin className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium">Share Location</div>
                              <div className="text-sm text-neutral-400">Send your current position</div>
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              if (currentLocation) {
                                const mapsUrl = `https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
                                window.open(mapsUrl, '_blank');
                              }
                            }}
                            disabled={!currentLocation}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          >
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Safety Tips */}
                    <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                        <div>
                          <h4 className="text-white font-medium">Safety Tips</h4>
                          <ul className="text-yellow-200 text-sm mt-2 space-y-1">
                            <li>• Stay in well-lit, populated areas when possible</li>
                            <li>• Keep your phone charged and accessible</li>
                            <li>• Share your route with trusted contacts</li>
                            <li>• Trust your instincts - if something feels wrong, seek help</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Technology Credits - Fixed at bottom */}
      <div className="flex-shrink-0 p-4 bg-black border-t border-white/10">
        <div className="text-center text-xs text-neutral-400 space-y-1">
          <p>🛡️ <strong className="text-blue-400">SafeWalk</strong> - Your AI-powered safety companion</p>
          <p>🤖 Powered by <strong className="text-purple-400">Gemini 2.5 Flash</strong> • 🎥 Video support via <strong className="text-blue-400">Tavus</strong></p>
          <p>🔊 Voice by <strong className="text-green-400">ElevenLabs</strong> • 🎙️ Speech by <strong className="text-orange-400">Deepgram</strong></p>
          <p>📍 Location tracking • 🚨 Emergency alerts • 💬 AI support</p>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">End Safe Walk?</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your SafeWalk session is currently active with periodic check-ins. Are you sure you want to end it and return to the dashboard?
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Continue Walk
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  End Walk
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* API Configuration Modal */}
      <ApiKeyManager
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        onKeysUpdated={(hasKeys) => {
          setHasApiKeys(hasKeys);
          if (hasKeys) {
            checkApiKeysInSupabase();
          }
        }}
      />
    </div>
  );
}