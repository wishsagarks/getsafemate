import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  MapPin, 
  Phone, 
  Camera, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Navigation,
  AlertTriangle,
  Clock,
  Users,
  Heart,
  Settings,
  Play,
  Pause,
  Square,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionManager } from './PermissionManager';
import { LocationTracker } from './LocationTracker';
import { EmergencySystem } from './EmergencySystem';
import { AICompanion } from './AICompanion';

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
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [aiCompanionActive, setAiCompanionActive] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if we need to show permissions
    checkPermissions();
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

  const checkPermissions = async () => {
    try {
      // Check if critical permissions are already granted
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      const locationPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      
      if (micPermission.state === 'granted' && locationPermission.state === 'granted') {
        setPermissionsGranted(true);
      } else {
        setShowPermissions(true);
      }
    } catch (error) {
      // If permission API is not supported, show permission manager
      setShowPermissions(true);
    }
  };

  const handlePermissionsGranted = () => {
    setPermissionsGranted(true);
    setShowPermissions(false);
  };

  const startSafeWalk = async () => {
    if (!permissionsGranted) {
      setShowPermissions(true);
      return;
    }

    setIsActive(true);
    setDuration(0);
    setAiCompanionActive(true);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    // Show start notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SafeWalk Started', {
        body: 'Your safety companion is now active and monitoring your journey.',
        icon: '/favicon.ico'
      });
    }
  };

  const stopSafeWalk = () => {
    setIsActive(false);
    setIsRecording(false);
    setIsVideoOn(false);
    setAiCompanionActive(false);
    setEmergencyTriggered(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Show completion notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SafeWalk Completed', {
        body: `Journey completed safely in ${formatTime(duration)}. Well done!`,
        icon: '/favicon.ico'
      });
    }
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: !isMuted 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsVideoOn(true);
      
      console.log('Video call started - ready for LiveKit integration');
      
    } catch (error) {
      console.error('Error starting video call:', error);
      alert('Unable to access camera. Please check your permissions.');
    }
  };

  const stopVideoCall = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsVideoOn(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: isVideoOn 
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
        console.log('Recording stopped - ready for Deepgram transcription');
        
        // Create download link for the recording
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
    
    // Auto-start recording during emergency
    if (!isRecording) {
      startRecording();
    }
    
    // Auto-start video if not already on
    if (!isVideoOn) {
      startVideoCall();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show permission manager if needed
  if (showPermissions) {
    return (
      <PermissionManager
        onPermissionsGranted={handlePermissionsGranted}
        onClose={() => setShowPermissions(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-purple-900 to-black">
      {/* Header */}
      <div className="relative p-6 bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            
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
              <Shield className="h-8 w-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">Safe Walk</h1>
              <p className="text-blue-200">
                {isActive ? `Active • ${formatTime(duration)}` : 'Ready to protect you'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {emergencyTriggered && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full"
              >
                EMERGENCY ACTIVE
              </motion.div>
            )}
            
            <button
              onClick={() => setShowPermissions(true)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Settings className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Location Card */}
          <LocationTracker
            isActive={isActive}
            onLocationUpdate={handleLocationUpdate}
          />

          {/* AI Companion Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Heart className="h-6 w-6 text-purple-400" />
              <h3 className="text-white font-semibold">AI Companion</h3>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${aiCompanionActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm text-white">
                {aiCompanionActive ? 'Active & Listening' : 'Standby'}
              </span>
            </div>
            {aiCompanionActive && (
              <p className="text-xs text-purple-200 mt-2">
                🤖 Ready for Tavus AI Avatar integration
              </p>
            )}
          </motion.div>

          {/* Recording Status */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Mic className="h-6 w-6 text-red-400" />
              <h3 className="text-white font-semibold">Recording</h3>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm text-white">
                {isRecording ? 'Recording Active' : 'Ready to Record'}
              </span>
            </div>
            {isRecording && (
              <p className="text-xs text-red-200 mt-2">
                🎙️ Audio being captured for safety
              </p>
            )}
          </motion.div>
        </div>

        {/* Video Feed */}
        <AnimatePresence>
          {isVideoOn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-black/30 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Live Video Feed</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-200 text-sm">LIVE</span>
                </div>
              </div>
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-64 bg-black rounded-lg object-cover"
              />
              <p className="text-xs text-gray-300 mt-2 text-center">
                🎥 Ready for LiveKit integration • Video available for emergency contacts
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control Panel */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-white font-semibold mb-6">Safety Controls</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Start/Stop Safe Walk */}
            <motion.button
              onClick={isActive ? stopSafeWalk : startSafeWalk}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-xl font-semibold transition-all ${
                isActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isActive ? (
                <>
                  <Square className="h-6 w-6 mx-auto mb-2" />
                  Stop Walk
                </>
              ) : (
                <>
                  <Play className="h-6 w-6 mx-auto mb-2" />
                  Start Walk
                </>
              )}
            </motion.button>

            {/* Video Call */}
            <motion.button
              onClick={isVideoOn ? stopVideoCall : startVideoCall}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-xl font-semibold transition-all ${
                isVideoOn 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {isVideoOn ? <VideoOff className="h-6 w-6 mx-auto mb-2" /> : <Video className="h-6 w-6 mx-auto mb-2" />}
              {isVideoOn ? 'Stop Video' : 'Start Video'}
            </motion.button>

            {/* Audio Recording */}
            <motion.button
              onClick={isRecording ? stopRecording : startRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-xl font-semibold transition-all ${
                isRecording 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {isMuted ? <MicOff className="h-6 w-6 mx-auto mb-2" /> : <Mic className="h-6 w-6 mx-auto mb-2" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </motion.button>

            {/* Mute Toggle */}
            <motion.button
              onClick={() => setIsMuted(!isMuted)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-xl font-semibold transition-all ${
                isMuted 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {isMuted ? <MicOff className="h-6 w-6 mx-auto mb-2" /> : <Mic className="h-6 w-6 mx-auto mb-2" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </motion.button>
          </div>
        </div>

        {/* Emergency System */}
        <EmergencySystem
          isActive={isActive}
          currentLocation={currentLocation}
          onEmergencyTriggered={handleEmergencyTriggered}
        />

        {/* AI Companion Interface */}
        {aiCompanionActive && (
          <AICompanion
            isActive={aiCompanionActive}
            onEmergencyDetected={handleEmergencyTriggered}
          />
        )}

        {/* Technology Credits */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>🎥 Video calls powered by <strong>LiveKit</strong></p>
          <p>🤖 AI avatar by <strong>Tavus</strong> • Voice by <strong>ElevenLabs</strong></p>
          <p>🎙️ Speech recognition by <strong>Deepgram</strong></p>
          <p>🔍 Error monitoring by <strong>Sentry</strong></p>
        </div>
      </div>
    </div>
  );
}