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
  const [apiKeysStatus, setApiKeysStatus] = useState<{
    allPresent: boolean;
    tavusValidated: boolean;
    assetsAvailable: boolean;
  }>({
    allPresent: false,
    tavusValidated: false,
    assetsAvailable: false
  });
  
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
        setApiKeysStatus({
          allPresent: false,
          tavusValidated: false,
          assetsAvailable: false
        });
        return;
      }

      console.log('API keys data from Supabase:', data);

      if (data) {
        // Check if all required keys are present
        const hasAllKeys = !!(
          data.livekit_api_key && 
          data.livekit_api_secret && 
          data.livekit_ws_url && 
          data.tavus_api_key && 
          data.gemini_api_key &&
          data.elevenlabs_api_key &&
          data.deepgram_api_key
        );
        
        console.log('Has all required keys:', hasAllKeys);
        
        if (hasAllKeys) {
          // Validate Tavus assets if all keys are present
          const assetsStatus = await validateTavusAssets(data.tavus_api_key);
          
          setApiKeysStatus({
            allPresent: true,
            tavusValidated: true,
            assetsAvailable: assetsStatus.hasAssets
          });
          
          setHasApiKeys(assetsStatus.hasAssets); // Only set true if assets are accessible
          
          if (assetsStatus.hasAssets) {
            console.log('✅ All API keys present and Tavus assets validated');
          } else {
            console.log('⚠️ API keys present but no accessible Tavus assets found');
          }
        } else {
          console.log('❌ Missing required API keys');
          setHasApiKeys(false);
          setApiKeysStatus({
            allPresent: false,
            tavusValidated: false,
            assetsAvailable: false
          });
        }
      } else {
        console.log('No API keys found in database');
        setHasApiKeys(false);
        setApiKeysStatus({
          allPresent: false,
          tavusValidated: false,
          assetsAvailable: false
        });
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
      setHasApiKeys(false);
      setApiKeysStatus({
        allPresent: false,
        tavusValidated: false,
        assetsAvailable: false
      });
    } finally {
      setApiKeysLoading(false);
    }
  };

  const validateTavusAssets = async (tavusApiKey: string): Promise<{ hasAssets: boolean; details: string }> => {
    try {
      console.log('Validating Tavus assets...');
      
      const YOUR_PERSONA_ID = 'p157bb5e234e';
      const YOUR_REPLICA_ID = 'r9d30b0e55ac';
      
      let personaAccessible = false;
      let replicaAccessible = false;

      // Check personas
      try {
        const personasResponse = await fetch('https://tavusapi.com/v2/personas', {
          method: 'GET',
          headers: {
            'x-api-key': tavusApiKey,
            'Content-Type': 'application/json'
          }
        });

        if (personasResponse.ok) {
          const personasData = await personasResponse.json();
          const personas = personasData.data || [];
          personaAccessible = personas.some((p: any) => p.persona_id === YOUR_PERSONA_ID);
          console.log('Persona accessible:', personaAccessible);
        }
      } catch (error) {
        console.log('Error checking personas:', error);
      }

      // Check replicas
      try {
        const replicasResponse = await fetch('https://tavusapi.com/v2/replicas', {
          method: 'GET',
          headers: {
            'x-api-key': tavusApiKey,
            'Content-Type': 'application/json'
          }
        });

        if (replicasResponse.ok) {
          const replicasData = await replicasResponse.json();
          const replicas = replicasData.data || [];
          replicaAccessible = replicas.some((r: any) => r.replica_id === YOUR_REPLICA_ID);
          console.log('Replica accessible:', replicaAccessible);
        }
      } catch (error) {
        console.log('Error checking replicas:', error);
      }

      const hasAssets = personaAccessible || replicaAccessible;
      let details = '';
      
      if (personaAccessible && replicaAccessible) {
        details = `Both persona ${YOUR_PERSONA_ID} and replica ${YOUR_REPLICA_ID} accessible`;
      } else if (personaAccessible) {
        details = `Persona ${YOUR_PERSONA_ID} accessible (replica not found)`;
      } else if (replicaAccessible) {
        details = `Replica ${YOUR_REPLICA_ID} accessible (persona not found)`;
      } else {
        details = `Neither persona ${YOUR_PERSONA_ID} nor replica ${YOUR_REPLICA_ID} found`;
      }

      console.log('Asset validation result:', { hasAssets, details });
      return { hasAssets, details };
      
    } catch (error) {
      console.error('Error validating Tavus assets:', error);
      return { hasAssets: false, details: 'Error validating assets' };
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

    if (!hasApiKeys) {
      setShowApiConfig(true);
      return;
    }

    setIsActive(true);
    setDuration(0);
    
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SafeWalk Started', {
        body: 'Your AI companion is now active with full API integration and will check in with you periodically.',
        icon: '/favicon.ico'
      });
    }
  };

  const stopSafeWalk = () => {
    setIsActive(false);
    setIsRecording(false);
    setEmergencyTriggered(false);
    setVideoCompanionActive(false);
    
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
  };

  const handleAICompanionNeedHelp = () => {
    // This is triggered when user says "I need you" to the AI
    setVideoCompanionActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show API configuration if keys are missing or assets not accessible
  if (apiKeysLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-purple-900 to-black overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Checking API configuration...</p>
        </div>
      </div>
    );
  }

  if (!hasApiKeys) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-purple-900 to-black overflow-hidden">
        <div className="relative p-4 sm:p-6 bg-black/20 backdrop-blur-lg border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/30"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
                <span className="text-white font-medium hidden sm:block">Back</span>
              </motion.button>
              
              <div className="p-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">API Setup Required</h1>
                <p className="text-red-200 text-sm sm:text-base">
                  {!apiKeysStatus.allPresent 
                    ? 'Missing required API keys' 
                    : !apiKeysStatus.assetsAvailable 
                    ? 'Tavus assets not accessible'
                    : 'Configuration incomplete'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-[calc(100vh-80px)]">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-center mb-6">
                <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  {!apiKeysStatus.allPresent 
                    ? 'API Keys Required' 
                    : 'Tavus Assets Not Accessible'
                  }
                </h2>
                <p className="text-gray-300">
                  {!apiKeysStatus.allPresent 
                    ? 'SafeMate requires all sponsored API keys for full functionality. Please configure all required APIs to continue.'
                    : 'Your API keys are configured but your Tavus persona/replica assets are not accessible. Please check your Tavus account.'
                  }
                </p>
              </div>
              
              {/* Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className={`p-4 rounded-lg border ${
                  apiKeysStatus.allPresent 
                    ? 'bg-green-500/20 border-green-500/30' 
                    : 'bg-red-500/20 border-red-500/30'
                }`}>
                  <h3 className="font-semibold text-white mb-2 flex items-center space-x-2">
                    {apiKeysStatus.allPresent ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    )}
                    <span>API Keys Status</span>
                  </h3>
                  <ul className={`text-sm space-y-1 ${
                    apiKeysStatus.allPresent ? 'text-green-200' : 'text-red-200'
                  }`}>
                    <li>• Gemini 2.5 Flash (AI conversations)</li>
                    <li>• Deepgram (Speech recognition)</li>
                    <li>• ElevenLabs (Voice synthesis)</li>
                    <li>• Tavus (AI video avatar)</li>
                    <li>• LiveKit (Real-time communication)</li>
                  </ul>
                  <p className={`text-xs mt-2 ${
                    apiKeysStatus.allPresent ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {apiKeysStatus.allPresent ? '✅ All keys present in Supabase' : '❌ Missing keys in Supabase'}
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg border ${
                  apiKeysStatus.assetsAvailable 
                    ? 'bg-green-500/20 border-green-500/30' 
                    : 'bg-red-500/20 border-red-500/30'
                }`}>
                  <h3 className="font-semibold text-white mb-2 flex items-center space-x-2">
                    {apiKeysStatus.assetsAvailable ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    )}
                    <span>Tavus Assets Status</span>
                  </h3>
                  <ul className={`text-sm space-y-1 ${
                    apiKeysStatus.assetsAvailable ? 'text-green-200' : 'text-red-200'
                  }`}>
                    <li>• Persona: p157bb5e234e</li>
                    <li>• Replica: r9d30b0e55ac</li>
                    <li>• Smart fallback system</li>
                    <li>• Automatic asset detection</li>
                  </ul>
                  <p className={`text-xs mt-2 ${
                    apiKeysStatus.assetsAvailable ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {apiKeysStatus.assetsAvailable ? '✅ Assets accessible' : '❌ No accessible assets found'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowApiConfig(true)}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold text-lg transition-all shadow-lg"
              >
                {!apiKeysStatus.allPresent 
                  ? 'Configure All Required APIs' 
                  : 'Check Tavus Asset Configuration'
                }
              </button>
            </div>
          </div>
        </div>

        {/* API Configuration Modal */}
        <ApiKeyManager
          isOpen={showApiConfig}
          onClose={() => setShowApiConfig(false)}
          onKeysUpdated={(hasKeys) => {
            if (hasKeys) {
              setShowApiConfig(false);
              checkApiKeysInSupabase(); // Re-check after update
            }
          }}
        />
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
                {isActive ? `Active • ${formatTime(duration)}` : 'Ready with smart fallback system'}
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
              onClick={() => setShowPermissions(true)}
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
              🤖 Smart Fallback System Ready
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
                🎙️ Audio captured for Deepgram
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

            {/* Show Avatar Button */}
            <motion.button
              onClick={() => setVideoCompanionActive(!videoCompanionActive)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 sm:p-4 rounded-xl font-semibold transition-all ${
                videoCompanionActive 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Video className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
              <span className="text-xs sm:text-sm">{videoCompanionActive ? 'Hide Avatar' : 'Show Avatar'}</span>
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
        />

        {/* Technology Credits */}
        <div className="text-center text-xs text-gray-400 space-y-1 pb-4">
          <p>🎥 Video calls powered by <strong>LiveKit</strong></p>
          <p>🤖 Smart fallback: <strong>Tavus Persona/Replica</strong> • Voice by <strong>ElevenLabs</strong></p>
          <p>🎙️ Speech recognition by <strong>Deepgram</strong></p>
          <p>🧠 LLM conversations by <strong>Gemini 2.5 Flash</strong></p>
          <p>📍 Periodic check-ins with location & audio snippets</p>
          <p>🔍 Error monitoring by <strong>Sentry</strong></p>
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
    </div>
  );
}