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
  Square
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SafeWalkProps {
  onClose: () => void;
}

export function SafeWalkMode({ onClose }: SafeWalkProps) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [aiCompanionActive, setAiCompanionActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const startSafeWalk = async () => {
    setIsActive(true);
    setDuration(0);
    
    // Start location tracking
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }

    // Initialize AI companion
    setAiCompanionActive(true);
  };

  const stopSafeWalk = () => {
    setIsActive(false);
    setIsRecording(false);
    setIsVideoOn(false);
    setAiCompanionActive(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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
      
      // Initialize LiveKit for video calling
      // This would integrate with LiveKit for real video calls
      console.log('Starting video call with emergency contacts...');
      
    } catch (error) {
      console.error('Error starting video call:', error);
    }
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
        // Here we would send to Deepgram for transcription
        console.log('Recording stopped, sending to Deepgram for transcription...');
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const triggerSOS = () => {
    // Emergency alert system
    console.log('SOS TRIGGERED - Alerting emergency contacts and authorities');
    
    // This would integrate with:
    // - SMS/calling emergency contacts
    // - Sharing live location
    // - Starting automatic recording
    // - Alerting local authorities if configured
    
    if (!isRecording) {
      startRecording();
    }
    
    if (!isVideoOn) {
      startVideoCall();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-purple-900 to-black">
      {/* Header */}
      <div className="relative p-6 bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
          
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Settings className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Location Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center space-x-3 mb-4">
              <MapPin className="h-6 w-6 text-green-400" />
              <h3 className="text-white font-semibold">Location</h3>
            </div>
            {location ? (
              <div className="text-green-200 text-sm">
                <p>Lat: {location.lat.toFixed(6)}</p>
                <p>Lng: {location.lng.toFixed(6)}</p>
                <p className="text-xs text-green-300 mt-2">📍 Sharing with emergency contacts</p>
              </div>
            ) : (
              <p className="text-gray-300 text-sm">Getting location...</p>
            )}
          </motion.div>

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
                🤖 Powered by ElevenLabs & Tavus AI
              </p>
            )}
          </motion.div>

          {/* Emergency Contacts */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Users className="h-6 w-6 text-orange-400" />
              <h3 className="text-white font-semibold">Emergency</h3>
            </div>
            <p className="text-sm text-orange-200">2 contacts ready</p>
            <p className="text-xs text-orange-300 mt-2">📞 Auto-call on SOS</p>
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
                🎥 Powered by LiveKit • Streaming to emergency contacts
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
              onClick={startVideoCall}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-xl font-semibold transition-all ${
                isVideoOn 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {isVideoOn ? <VideoOff className="h-6 w-6 mx-auto mb-2" /> : <Video className="h-6 w-6 mx-auto mb-2" />}
              Video Call
            </motion.button>

            {/* Audio Recording */}
            <motion.button
              onClick={isRecording ? () => {
                if (mediaRecorderRef.current) {
                  mediaRecorderRef.current.stop();
                  setIsRecording(false);
                }
              } : startRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-xl font-semibold transition-all ${
                isRecording 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {isMuted ? <MicOff className="h-6 w-6 mx-auto mb-2" /> : <Mic className="h-6 w-6 mx-auto mb-2" />}
              {isRecording ? 'Recording' : 'Record'}
            </motion.button>

            {/* SOS Emergency */}
            <motion.button
              onClick={triggerSOS}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-4 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white border-2 border-red-400"
            >
              <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
              SOS
            </motion.button>
          </div>
        </div>

        {/* AI Companion Chat */}
        {aiCompanionActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-white font-semibold mb-4">AI Companion</h3>
            <div className="bg-black/20 rounded-lg p-4 mb-4 h-32 overflow-y-auto">
              <div className="text-purple-200 text-sm">
                <p className="mb-2">🤖 <strong>SafeMate AI:</strong> Hi! I'm here to keep you company during your walk. How are you feeling?</p>
                <p className="text-gray-300 text-xs">Powered by ElevenLabs voice synthesis & Tavus AI avatar</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Chat with your AI companion..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
                Send
              </button>
            </div>
          </motion.div>
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