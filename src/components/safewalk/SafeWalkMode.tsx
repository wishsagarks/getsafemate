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
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PermissionManager } from './PermissionManager';
import { LocationTracker } from './LocationTracker';
import { EmergencySystem } from './EmergencySystem';
import { EnhancedAICompanion } from './EnhancedAICompanion';
import { ApiKeyManager } from './ApiKeyManager';
import { useNavigate } from 'react-router-dom';

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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkPermissions();
    checkApiKeysInSupabase();
    setAiCompanionActive(true);
  }, []);

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
      onClose();
    }
  };

  const confirmExit = () => {
    stopSafeWalk();
    onClose();
  };

  const startSafeWalk = async () => {
    if (!permissionsGranted) {
      setShowPermissions(true);
      return;
    }

    setIsActive(true);
    setDuration(0);
    
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

  // Show loading while checking API keys
  if (apiKeysLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-purple-900 to-black overflow-hidden flex items-center justify-center">
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-purple-900 to-black overflow-hidden">
      {/* Enhanced Header */}
      <div className="relative p-4 sm:p-6 bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/30"
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
              <h1 className="text-xl sm:text-2xl font-bold text-white">Safe Walk</h1>
              <p className="text-blue-200 text-sm sm:text-base">
                {isActive ? `Active • ${formatTime(duration)}` : hasApiKeys ? 'AI Enhanced Ready' : 'Basic Mode Ready'}
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

      {/* Main Content - Scrollable */}
      <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-[calc(100vh-80px)]">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Location Card */}
          <LocationTracker
            isActive={isActive}
            onLocationUpdate={handleLocationUpdate}
          />

          {/* AI Companion Status Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/20"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              <h3 className="text-white font-semibold text-sm sm:text-base">AI Companion</h3>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${aiCompanionActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs sm:text-sm text-white">
                {aiCompanionActive ? 'Active & Monitoring' : 'Standby'}
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-2">
              🤖 {hasApiKeys ? 'Enhanced AI Ready' : 'Basic Mode Active'}
            </p>
            {videoCompanionActive && (
              <p className="text-xs text-blue-200 mt-1">
                🎥 Video companion active
              </p>
            )}
            {isActive && (
              <p className="text-xs text-green-200 mt-1">
                ⏰ Periodic check-ins enabled
              </p>
            )}
            {!hasApiKeys && (
              <button
                onClick={() => setShowApiConfig(true)}
                className="mt-2 text-xs text-yellow-300 hover:text-yellow-200 underline"
              >
                Configure APIs for full features
              </button>
            )}
          </motion.div>

          {/* Recording Status */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/20"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
              <h3 className="text-white font-semibold text-sm sm:text-base">Recording</h3>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs sm:text-sm text-white">
                {isRecording ? 'Recording Active' : 'Ready to Record'}
              </span>
            </div>
            {isRecording && (
              <p className="text-xs text-red-200 mt-2">
                🎙️ Audio captured for {hasApiKeys ? 'Deepgram' : 'local storage'}
              </p>
            )}
          </motion.div>
        </div>

        {/* Control Panel */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/20">
          <h3 className="text-white font-semibold mb-4 sm:mb-6">Safety Controls</h3>
          
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
        </div>

        {/* Emergency System */}
        <EmergencySystem
          isActive={isActive}
          currentLocation={currentLocation}
          onEmergencyTriggered={handleEmergencyTriggered}
        />

        {/* Enhanced AI Companion Interface */}
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

        {/* Technology Credits */}
        <div className="text-center text-xs text-gray-400 space-y-1 pb-4">
          <p>🤖 AI powered by <strong>Gemini 2.5 Flash</strong></p>
          <p>🎥 Video calls powered by <strong>LiveKit</strong> & <strong>Tavus</strong></p>
          <p>🔊 Voice by <strong>ElevenLabs</strong> • Speech by <strong>Deepgram</strong></p>
          <p>📍 Periodic check-ins with location & audio snippets</p>
          {!hasApiKeys && (
            <p className="text-yellow-400">⚠️ Basic mode active - configure APIs for enhanced features</p>
          )}
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