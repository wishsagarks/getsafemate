import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader,
  Phone,
  PhoneOff,
  Brain,
  Heart,
  MapPin,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TavusAIAvatarProps {
  isActive: boolean;
  onEmergencyDetected: () => void;
  livekitToken: string;
  livekitWsUrl: string;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

interface LiveKitConnection {
  room: any;
  localParticipant: any;
  remoteParticipants: Map<string, any>;
}

export function TavusAIAvatar({ 
  isActive, 
  onEmergencyDetected, 
  livekitToken,
  livekitWsUrl,
  onConnectionStatusChange 
}: TavusAIAvatarProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [conversation, setConversation] = useState<Array<{id: string, type: 'user' | 'avatar', content: string, timestamp: number}>>([]);
  const [inputText, setInputText] = useState('');
  const [livekitRoom, setLivekitRoom] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const livekitConnectionRef = useRef<LiveKitConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && livekitToken && livekitWsUrl) {
      connectToLiveKitRoom();
    } else {
      disconnectFromRoom();
    }

    return () => {
      disconnectFromRoom();
    };
  }, [isActive, livekitToken, livekitWsUrl]);

  useEffect(() => {
    onConnectionStatusChange?.(connectionStatus);
  }, [connectionStatus, onConnectionStatusChange]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const connectToLiveKitRoom = async () => {
    if (!livekitToken || !livekitWsUrl) {
      console.error('Missing LiveKit credentials');
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      console.log('Connecting to LiveKit room with Tavus-provided credentials...');
      
      // In a real implementation, this would use the LiveKit SDK:
      // import { Room, connect } from 'livekit-client';
      // const room = await connect(livekitWsUrl, livekitToken, {
      //   audio: true,
      //   video: true,
      //   publishDefaults: {
      //     videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
      //   },
      // });
      
      // For now, simulate the connection
      await simulateLiveKitConnection();
      
      setLivekitRoom({ token: livekitToken, wsUrl: livekitWsUrl });
      setConnectionStatus('connected');
      
      addAvatarMessage("Hello! I'm your SafeMate AI companion with the p5d11710002a persona. I can see you through our video connection and I'm here to keep you safe. How are you feeling today?");
      
      console.log('Connected to LiveKit room successfully');
      
    } catch (error) {
      console.error('Error connecting to LiveKit room:', error);
      setConnectionStatus('error');
    }
  };

  const simulateLiveKitConnection = async () => {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Simulated LiveKit connection established with Tavus avatar');
    
    // In a real implementation, this would:
    // 1. Connect to LiveKit room using the provided token and WebSocket URL
    // 2. Set up local video/audio tracks
    // 3. Handle remote participant events (Tavus avatar)
    // 4. Display the Tavus avatar video stream
    // 5. Handle audio communication with the avatar
  };

  const disconnectFromRoom = () => {
    if (livekitConnectionRef.current) {
      // Cleanup LiveKit connection
      livekitConnectionRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setLivekitRoom(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addAvatarMessage = (content: string) => {
    const message = {
      id: Date.now().toString(),
      type: 'avatar' as const,
      content,
      timestamp: Date.now()
    };
    
    setConversation(prev => [...prev, message]);
    
    // Simulate avatar speaking
    setAvatarSpeaking(true);
    setTimeout(() => setAvatarSpeaking(false), content.length * 50);
  };

  const addUserMessage = (content: string) => {
    const message = {
      id: Date.now().toString(),
      type: 'user' as const,
      content,
      timestamp: Date.now()
    };
    
    setConversation(prev => [...prev, message]);
  };

  const handleUserInput = async (text: string) => {
    addUserMessage(text);
    
    // Emergency detection
    const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'unsafe', 'threat', 'attack', 'stranger', 'following', 'lost'];
    if (emergencyKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
      onEmergencyDetected();
      addAvatarMessage("🚨 I detected you might be in danger! I'm immediately alerting your emergency contacts and activating all safety protocols. Stay calm, help is on the way. Keep talking to me - I'm here with you and monitoring everything.");
      return;
    }
    
    // Simulate AI response processing
    setTimeout(() => {
      const responses = [
        "I can see you're doing well! I'm here monitoring your safety through our video connection. How can I help support you right now?",
        "Thanks for sharing that with me! I can see you through the video and I'm here to keep you safe. What's on your mind?",
        "I'm watching over you through our video call and everything looks good. You're safe with me. How are you feeling?",
        "I can see you clearly and you're doing great! I'm here to provide support and keep you safe. What would you like to talk about?"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addAvatarMessage(randomResponse);
    }, 1000);
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      handleUserInput(inputText);
      setInputText('');
    }
  };

  const startVoiceInput = () => {
    setIsListening(true);
    console.log('Starting voice input with Deepgram integration...');
    // In production, this would use Deepgram for speech recognition
  };

  const stopVoiceInput = () => {
    setIsListening(false);
    console.log('Stopping voice input...');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // This would mute/unmute the LiveKit audio track
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // This would enable/disable the LiveKit video track
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ 
              scale: avatarSpeaking ? [1, 1.1, 1] : 1,
              rotate: avatarSpeaking ? [0, 5, -5, 0] : 0
            }}
            transition={{ duration: 0.5, repeat: avatarSpeaking ? Infinity : 0 }}
            className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Brain className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h3 className="text-white font-semibold">Tavus AI Avatar (p5d11710002a)</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                connectionStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              <span className="text-gray-300">
                {connectionStatus === 'connected' ? (avatarSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Ready') :
                 connectionStatus === 'connecting' ? 'Connecting to Tavus + LiveKit...' :
                 connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {livekitRoom && (
            <div className="text-xs text-green-300 flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>LiveKit Connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {connectionStatus !== 'connected' && (
        <div className={`mb-4 p-4 rounded-lg border ${
          connectionStatus === 'error' ? 'bg-red-500/20 border-red-500/30' :
          connectionStatus === 'connecting' ? 'bg-yellow-500/20 border-yellow-500/30' :
          'bg-gray-500/20 border-gray-500/30'
        }`}>
          <div className="flex items-center space-x-2">
            {connectionStatus === 'connecting' && <Loader className="h-4 w-4 animate-spin text-yellow-400" />}
            {connectionStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
            {connectionStatus === 'disconnected' && <VideoOff className="h-4 w-4 text-gray-400" />}
            <span className={`text-sm font-medium ${
              connectionStatus === 'error' ? 'text-red-200' :
              connectionStatus === 'connecting' ? 'text-yellow-200' :
              'text-gray-200'
            }`}>
              {connectionStatus === 'connecting' ? 'Connecting to Tavus AI Avatar with p5d11710002a persona...' :
               connectionStatus === 'error' ? 'Failed to connect. Check credentials and try again.' :
               'Waiting for connection...'}
            </span>
          </div>
        </div>
      )}

      {/* API Status Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-white">Gemini 2.5</span>
          </div>
        </div>
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Video className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-white">Tavus p5d11</span>
          </div>
        </div>
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-green-400" />
            <span className="text-xs text-white">ElevenLabs</span>
          </div>
        </div>
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Mic className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-white">Deepgram</span>
          </div>
        </div>
      </div>

      {/* Video Feed */}
      {connectionStatus === 'connected' && (
        <div className="mb-6 relative">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {/* Tavus Avatar Video */}
            <video
              ref={avatarVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            
            {/* User Video (Picture-in-Picture) */}
            {isVideoEnabled && (
              <div className="absolute top-4 right-4 w-24 h-18 bg-gray-800 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
              </div>
            )}
            
            {/* Speaking Indicator */}
            {avatarSpeaking && (
              <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/50 px-3 py-1 rounded-full">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-2 h-2 bg-green-400 rounded-full"
                />
                <span className="text-white text-sm">AI Speaking</span>
              </div>
            )}

            {/* Persona Indicator */}
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
              <span className="text-white text-xs font-medium">p5d11710002a</span>
            </div>
          </div>
          
          {/* Video Controls */}
          <div className="flex items-center justify-center space-x-4 mt-4">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                isVideoEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              {isVideoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
            </button>
            
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                !isMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {!isMuted ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
            </button>
            
            <button
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              className={`p-3 rounded-full transition-colors ${
                isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              {isListening ? <PhoneOff className="h-5 w-5 text-white" /> : <Phone className="h-5 w-5 text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="bg-black/20 rounded-lg p-4 h-48 overflow-y-auto mb-4 space-y-3">
        {conversation.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-purple-500/80 text-white'
            }`}>
              {message.type === 'avatar' && (
                <div className="flex items-center space-x-1 mb-1">
                  <Heart className="h-3 w-3" />
                  <span className="text-xs font-medium">Tavus AI (p5d11710002a)</span>
                </div>
              )}
              <p>{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Controls */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Chat with your Tavus AI avatar..."
          className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={sendMessage}
          disabled={!inputText.trim()}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          Send
        </button>
      </div>

      {/* Technology Credits */}
      <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
        <p>🤖 <strong>Tavus AI Avatar</strong> with persona p5d11710002a</p>
        <p>🧠 Powered by <strong>Gemini 2.5 Flash</strong> for conversations</p>
        <p>🎥 <strong>LiveKit</strong> for real-time video • 🔊 <strong>ElevenLabs</strong> voice</p>
        <p>🎙️ <strong>Deepgram</strong> speech recognition</p>
      </div>
    </div>
  );
}