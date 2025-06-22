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
  Heart
} from 'lucide-react';

interface TavusAIAvatarProps {
  isActive: boolean;
  onEmergencyDetected: () => void;
  roomToken?: string;
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
  roomToken,
  onConnectionStatusChange 
}: TavusAIAvatarProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [conversation, setConversation] = useState<Array<{id: string, type: 'user' | 'avatar', content: string, timestamp: number}>>([]);
  const [inputText, setInputText] = useState('');
  const [apiKeys, setApiKeys] = useState({
    livekit: '',
    tavus: '',
    elevenlabs: '',
    deepgram: ''
  });
  const [showApiConfig, setShowApiConfig] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const livekitConnectionRef = useRef<LiveKitConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && hasRequiredApiKeys()) {
      initializeLiveKitConnection();
    } else if (!isActive) {
      disconnectFromRoom();
    }

    return () => {
      disconnectFromRoom();
    };
  }, [isActive, apiKeys]);

  useEffect(() => {
    onConnectionStatusChange?.(connectionStatus);
  }, [connectionStatus, onConnectionStatusChange]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const hasRequiredApiKeys = () => {
    return apiKeys.livekit && apiKeys.tavus;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeLiveKitConnection = async () => {
    if (!hasRequiredApiKeys()) {
      setShowApiConfig(true);
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      // This would connect to your LiveKit server with Tavus integration
      // For now, we'll simulate the connection
      await simulateConnection();
      
      setConnectionStatus('connected');
      addAvatarMessage("Hello! I'm your AI safety companion. I'm here to keep you company and ensure your safety. How are you feeling today?");
      
    } catch (error) {
      console.error('Failed to connect to LiveKit:', error);
      setConnectionStatus('error');
    }
  };

  const simulateConnection = async () => {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would:
    // 1. Connect to LiveKit room using the provided token
    // 2. Initialize Tavus AI avatar
    // 3. Set up ElevenLabs voice synthesis
    // 4. Configure Deepgram speech recognition
    
    console.log('Simulating LiveKit + Tavus connection...');
  };

  const disconnectFromRoom = () => {
    if (livekitConnectionRef.current) {
      // Cleanup LiveKit connection
      livekitConnectionRef.current = null;
    }
    setConnectionStatus('disconnected');
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
    setTimeout(() => setAvatarSpeaking(false), content.length * 50); // Rough speaking duration
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

  const handleUserInput = (text: string) => {
    addUserMessage(text);
    
    // Process with AI (this would go through your backend)
    setTimeout(() => {
      const response = generateAIResponse(text.toLowerCase());
      addAvatarMessage(response);
    }, 1000);
  };

  const generateAIResponse = (userInput: string): string => {
    // Emergency detection
    const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'unsafe'];
    if (emergencyKeywords.some(keyword => userInput.includes(keyword))) {
      onEmergencyDetected();
      return "🚨 I detected you might be in danger! I'm immediately alerting your emergency contacts and activating all safety protocols. Stay calm, help is on the way.";
    }

    // Contextual responses
    if (userInput.includes('nervous') || userInput.includes('anxious')) {
      return "It's completely normal to feel nervous. Take a deep breath with me. Remember, I'm here with you every step of the way, and your emergency contacts are just one tap away.";
    }

    const responses = [
      "I'm right here with you, and you're doing amazing! How's your walk going so far?",
      "Thanks for sharing that with me! I'm always here to listen and keep you safe.",
      "That's really interesting! I appreciate you keeping me in the loop.",
      "You're such great company! I love learning more about you."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      handleUserInput(inputText);
      setInputText('');
    }
  };

  const startVoiceInput = () => {
    setIsListening(true);
    // This would use Deepgram for speech recognition
    console.log('Starting voice input with Deepgram...');
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
            <h3 className="text-white font-semibold">Tavus AI Avatar</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                connectionStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              <span className="text-gray-300">
                {connectionStatus === 'connected' ? (avatarSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Ready') :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowApiConfig(true)}
            className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 transition-colors"
          >
            <Settings className="h-4 w-4 text-white" />
          </button>
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
              {connectionStatus === 'connecting' ? 'Connecting to Tavus AI Avatar...' :
               connectionStatus === 'error' ? 'Failed to connect. Check API keys and try again.' :
               'Click settings to configure API keys and connect'}
            </span>
          </div>
        </div>
      )}

      {/* Video Feed */}
      {connectionStatus === 'connected' && (
        <div className="mb-6 relative">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {/* Avatar Video */}
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
                  <span className="text-xs font-medium">Tavus AI</span>
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
          placeholder="Chat with your AI avatar..."
          className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
        >
          Send
        </button>
      </div>

      {/* Technology Credits */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        <p>🤖 Powered by <strong>Tavus AI Avatar</strong> & <strong>LiveKit</strong></p>
        <p>🔊 Voice by <strong>ElevenLabs</strong> • Speech by <strong>Deepgram</strong></p>
      </div>

      {/* API Configuration Modal */}
      {showApiConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">API Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  LiveKit API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.livekit}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, livekit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter LiveKit API key"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tavus API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.tavus}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, tavus: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter Tavus API key"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ElevenLabs API Key (Optional)
                </label>
                <input
                  type="password"
                  value={apiKeys.elevenlabs}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, elevenlabs: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter ElevenLabs API key"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deepgram API Key (Optional)
                </label>
                <input
                  type="password"
                  value={apiKeys.deepgram}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, deepgram: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter Deepgram API key"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowApiConfig(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowApiConfig(false);
                  if (hasRequiredApiKeys()) {
                    initializeLiveKitConnection();
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Connect
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}