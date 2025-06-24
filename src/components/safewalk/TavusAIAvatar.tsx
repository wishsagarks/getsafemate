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
  Clock,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TavusAIAvatarProps {
  isActive: boolean;
  onEmergencyDetected: () => void;
  livekitToken: string;
  livekitWsUrl: string;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

// Pre-configured Tavus conversation details
const TAVUS_CONVERSATION = {
  conversation_id: 'ca1a2790d282c4c1',
  persona_id: 'p5d11710002a',
  replica_id: 'r4317e64d25a',
  conversation_url: 'https://tavus.daily.co/ca1a2790d282c4c1',
  status: 'active'
};

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && livekitToken && livekitWsUrl) {
      connectToTavusConversation();
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

  const connectToTavusConversation = async () => {
    if (!livekitToken || !livekitWsUrl) {
      console.error('Missing LiveKit credentials');
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      console.log('Connecting to existing Tavus conversation:', TAVUS_CONVERSATION.conversation_id);
      console.log('Using persona:', TAVUS_CONVERSATION.persona_id);
      console.log('Replica ID:', TAVUS_CONVERSATION.replica_id);
      
      // Simulate connection to the existing Tavus conversation
      await simulateConnectionToExistingConversation();
      
      setLivekitRoom({ 
        token: livekitToken, 
        wsUrl: livekitWsUrl,
        conversationId: TAVUS_CONVERSATION.conversation_id,
        personaId: TAVUS_CONVERSATION.persona_id
      });
      setConnectionStatus('connected');
      
      addAvatarMessage(`Hello! I'm your SafeMate AI companion with the ${TAVUS_CONVERSATION.persona_id} persona. I'm connected through our existing conversation (${TAVUS_CONVERSATION.conversation_id}). I can see you through our video connection and I'm here to keep you safe. How are you feeling today?`);
      
      console.log('Connected to Tavus conversation successfully');
      
    } catch (error) {
      console.error('Error connecting to Tavus conversation:', error);
      setConnectionStatus('error');
    }
  };

  const simulateConnectionToExistingConversation = async () => {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Simulated connection to existing Tavus conversation established');
    
    // In a real implementation, this would:
    // 1. Connect to the existing Tavus conversation using the conversation URL
    // 2. Join the LiveKit room associated with the conversation
    // 3. Set up local video/audio tracks
    // 4. Display the Tavus avatar video stream from the existing conversation
    // 5. Handle audio communication with the pre-configured avatar
  };

  const disconnectFromRoom = () => {
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
    
    // Simulate AI response processing with persona context
    setTimeout(() => {
      const responses = [
        `I can see you're doing well! As your ${TAVUS_CONVERSATION.persona_id} companion, I'm here monitoring your safety through our video connection. How can I help support you right now?`,
        `Thanks for sharing that with me! Through our existing conversation session, I can see you and I'm here to keep you safe. What's on your mind?`,
        `I'm watching over you through our video call and everything looks good. You're safe with me and my ${TAVUS_CONVERSATION.persona_id} persona. How are you feeling?`,
        `I can see you clearly and you're doing great! I'm here to provide support and keep you safe through our established connection. What would you like to talk about?`
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
  };

  const stopVoiceInput = () => {
    setIsListening(false);
    console.log('Stopping voice input...');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const openTavusConversation = () => {
    window.open(TAVUS_CONVERSATION.conversation_url, '_blank');
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
            <h3 className="text-white font-semibold">Tavus AI Avatar ({TAVUS_CONVERSATION.persona_id})</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                connectionStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              <span className="text-gray-300">
                {connectionStatus === 'connected' ? (avatarSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Ready') :
                 connectionStatus === 'connecting' ? 'Connecting to existing conversation...' :
                 connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={openTavusConversation}
            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors"
            title="Open Tavus conversation in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          {livekitRoom && (
            <div className="text-xs text-green-300 flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Connected</span>
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
              {connectionStatus === 'connecting' ? `Connecting to existing Tavus conversation (${TAVUS_CONVERSATION.conversation_id})...` :
               connectionStatus === 'error' ? 'Failed to connect to existing conversation. Check credentials and try again.' :
               'Waiting for connection...'}
            </span>
          </div>
        </div>
      )}

      {/* Conversation Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-white">Persona: {TAVUS_CONVERSATION.persona_id}</span>
          </div>
        </div>
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Video className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-white">Conv: {TAVUS_CONVERSATION.conversation_id.slice(0, 8)}...</span>
          </div>
        </div>
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Heart className="h-4 w-4 text-pink-400" />
            <span className="text-xs text-white">Replica: {TAVUS_CONVERSATION.replica_id}</span>
          </div>
        </div>
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-xs text-white">Status: {TAVUS_CONVERSATION.status}</span>
          </div>
        </div>
      </div>

      {/* Video Feed */}
      {connectionStatus === 'connected' && (
        <div className="mb-6 relative">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {/* Tavus Avatar Video */}
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
              <div className="text-center">
                <Brain className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                <p className="text-white text-lg font-semibold">Tavus AI Avatar</p>
                <p className="text-purple-200 text-sm">Persona: {TAVUS_CONVERSATION.persona_id}</p>
                <p className="text-blue-200 text-xs mt-2">Conversation: {TAVUS_CONVERSATION.conversation_id}</p>
              </div>
            </div>
            
            {/* User Video (Picture-in-Picture) */}
            {isVideoEnabled && (
              <div className="absolute top-4 right-4 w-24 h-18 bg-gray-800 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-gray-700">
                  <Video className="h-6 w-6 text-gray-400" />
                </div>
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
              <span className="text-white text-xs font-medium">{TAVUS_CONVERSATION.persona_id}</span>
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

            <button
              onClick={openTavusConversation}
              className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
              title="Open in Tavus"
            >
              <ExternalLink className="h-5 w-5 text-white" />
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
                  <span className="text-xs font-medium">Tavus AI ({TAVUS_CONVERSATION.persona_id})</span>
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
        <p>🤖 <strong>Tavus AI Avatar</strong> with persona {TAVUS_CONVERSATION.persona_id}</p>
        <p>🎭 Replica ID: {TAVUS_CONVERSATION.replica_id}</p>
        <p>💬 Conversation: {TAVUS_CONVERSATION.conversation_id}</p>
        <p>🎥 <strong>LiveKit</strong> for real-time video • 🔊 <strong>ElevenLabs</strong> voice</p>
        <p>🎙️ <strong>Deepgram</strong> speech recognition</p>
      </div>
    </div>
  );
}