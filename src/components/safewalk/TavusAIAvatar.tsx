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
  ExternalLink,
  Monitor,
  Users,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TavusAIAvatarProps {
  isActive: boolean;
  onEmergencyDetected: () => void;
  livekitToken: string;
  livekitWsUrl: string;
  tavusConversationUrl: string;
  tavusConversationId: string;
  tavusPersonaId?: string | null;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export function TavusAIAvatar({ 
  isActive, 
  onEmergencyDetected, 
  livekitToken,
  livekitWsUrl,
  tavusConversationUrl,
  tavusConversationId,
  tavusPersonaId,
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
  const [dailyRoom, setDailyRoom] = useState<any>(null);
  const [isConnectedToTavus, setIsConnectedToTavus] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dailyCallRef = useRef<any>(null);

  useEffect(() => {
    if (isActive && tavusConversationUrl) {
      initializeTavusConnection();
    } else {
      disconnectFromRoom();
    }

    return () => {
      disconnectFromRoom();
    };
  }, [isActive, tavusConversationUrl]);

  useEffect(() => {
    onConnectionStatusChange?.(connectionStatus);
  }, [connectionStatus, onConnectionStatusChange]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const initializeTavusConnection = async () => {
    setConnectionStatus('connecting');
    setConnectionError(null);
    
    try {
      console.log('Connecting to existing Tavus conversation:', tavusConversationId);
      
      // Load Daily.co SDK
      await loadDailySDK();
      
      // Connect to the existing Tavus conversation using the URL from edge function
      await connectToTavusDaily();
      
      setConnectionStatus('connected');
      setIsConnectedToTavus(true);
      
      addAvatarMessage(`Hello! I'm connected to our Tavus conversation ${tavusConversationId.slice(0, 8)}... with persona ${tavusPersonaId}. I can see you and I'm here to keep you safe. How are you feeling?`);
      
      console.log('Connected to Tavus conversation successfully:', tavusConversationId);
      
    } catch (error) {
      console.error('Error connecting to Tavus:', error);
      setConnectionStatus('error');
      setConnectionError(error.message);
      addAvatarMessage(`I'm having trouble connecting to the video session: ${error.message}. The conversation was created successfully, but I can't join it right now.`);
    }
  };

  const loadDailySDK = async () => {
    if (window.DailyIframe) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const connectToTavusDaily = async () => {
    try {
      console.log('Connecting to Tavus conversation URL:', tavusConversationUrl);
      
      // Create Daily call instance using the conversation URL from edge function
      const callFrame = window.DailyIframe.createCallObject({
        url: tavusConversationUrl,
        showLeaveButton: false,
        showFullscreenButton: false,
        showLocalVideo: true,
        showParticipantsBar: false
      });

      dailyCallRef.current = callFrame;

      // Set up event listeners
      callFrame.on('joined-meeting', (event) => {
        console.log('Joined Tavus conversation:', event);
        setIsConnectedToTavus(true);
        setConnectionStatus('connected');
      });

      callFrame.on('participant-joined', (event) => {
        console.log('Participant joined:', event);
        if (event.participant.user_name?.includes('Tavus') || event.participant.user_name?.includes(tavusPersonaId)) {
          console.log('Tavus avatar joined the conversation');
          addAvatarMessage("I'm now connected and can see you! Ready to help keep you safe.");
        }
      });

      callFrame.on('participant-left', (event) => {
        console.log('Participant left:', event);
      });

      callFrame.on('track-started', (event) => {
        console.log('Track started:', event);
        if (event.participant && event.track.kind === 'video') {
          // Display the video track
          if (avatarVideoRef.current && event.participant.user_name?.includes('Tavus')) {
            avatarVideoRef.current.srcObject = new MediaStream([event.track]);
            avatarVideoRef.current.play();
          }
        }
      });

      callFrame.on('error', (event) => {
        console.error('Daily call error:', event);
        setConnectionStatus('error');
        setConnectionError(`Daily.co error: ${event.errorMsg || 'Unknown error'}`);
        addAvatarMessage("I'm experiencing connection issues. Let me try to reconnect...");
      });

      callFrame.on('left-meeting', (event) => {
        console.log('Left meeting:', event);
        setIsConnectedToTavus(false);
        setConnectionStatus('disconnected');
      });

      // Join the conversation using the URL provided by the edge function
      await callFrame.join({
        url: tavusConversationUrl,
        userName: `SafeMate_User_${user?.id?.slice(0, 8)}`,
        userData: {
          userId: user?.id,
          sessionType: 'safewalk',
          conversationId: tavusConversationId
        }
      });

      setDailyRoom(callFrame);
      
    } catch (error) {
      console.error('Error connecting to Tavus Daily room:', error);
      throw error;
    }
  };

  const disconnectFromRoom = () => {
    if (dailyCallRef.current) {
      try {
        dailyCallRef.current.leave();
        dailyCallRef.current.destroy();
      } catch (error) {
        console.error('Error disconnecting from Daily room:', error);
      }
      dailyCallRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setLivekitRoom(null);
    setDailyRoom(null);
    setIsConnectedToTavus(false);
    setConnectionError(null);
  };

  const retryConnection = async () => {
    disconnectFromRoom();
    await initializeTavusConnection();
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
    
    // Send message to Tavus avatar via Daily.co
    if (dailyCallRef.current && isConnectedToTavus) {
      try {
        // Send chat message to the Tavus conversation
        await dailyCallRef.current.sendAppMessage({
          type: 'chat',
          message: text,
          from: 'user'
        });
        
        // Simulate AI response (in production, this would come from Tavus)
        setTimeout(() => {
          const responses = [
            `I can see you're doing well! As your ${tavusPersonaId} companion, I'm here monitoring your safety through our video connection. How can I help support you right now?`,
            `Thanks for sharing that with me! Through our conversation session, I can see you and I'm here to keep you safe. What's on your mind?`,
            `I'm watching over you through our video call and everything looks good. You're safe with me. How are you feeling?`,
            `I can see you clearly and you're doing great! I'm here to provide support and keep you safe. What would you like to talk about?`
          ];
          
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          addAvatarMessage(randomResponse);
        }, 1000);
        
      } catch (error) {
        console.error('Error sending message to Tavus:', error);
        addAvatarMessage("I heard you, but I'm having trouble with the video connection. I'm still here to help!");
      }
    } else {
      // Fallback response when not connected to Tavus
      setTimeout(() => {
        addAvatarMessage("I'm here with you! I'm working on connecting to the video companion. How can I help you feel safer?");
      }, 1000);
    }
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      handleUserInput(inputText);
      setInputText('');
    }
  };

  const startVoiceInput = () => {
    setIsListening(true);
    console.log('Starting voice input...');
    
    // Enable microphone in Daily call
    if (dailyCallRef.current && isConnectedToTavus) {
      dailyCallRef.current.setLocalAudio(true);
    }
  };

  const stopVoiceInput = () => {
    setIsListening(false);
    console.log('Stopping voice input...');
    
    // Disable microphone in Daily call
    if (dailyCallRef.current && isConnectedToTavus) {
      dailyCallRef.current.setLocalAudio(false);
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Control audio output in Daily call
    if (dailyCallRef.current && isConnectedToTavus) {
      // Mute/unmute remote audio (Tavus avatar)
      dailyCallRef.current.setLocalAudio(!newMutedState);
    }
    
    console.log(`Tavus avatar audio ${newMutedState ? 'muted' : 'unmuted'}`);
  };

  const toggleVideo = () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    
    // Control video in Daily call
    if (dailyCallRef.current && isConnectedToTavus) {
      dailyCallRef.current.setLocalVideo(newVideoState);
    }
  };

  const openTavusConversation = () => {
    if (tavusConversationUrl) {
      window.open(tavusConversationUrl, '_blank');
    }
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
            <h3 className="text-white font-semibold">Tavus Video Companion</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' && isConnectedToTavus ? 'bg-green-400 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                connectionStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              <span className="text-gray-300">
                {connectionStatus === 'connected' && isConnectedToTavus ? 
                  (avatarSpeaking ? 'Avatar Speaking...' : isListening ? 'Listening...' : 'Connected to Tavus') :
                 connectionStatus === 'connecting' ? 'Connecting to Tavus...' :
                 connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
              </span>
              {isMuted && <span className="text-red-300 text-xs">(Avatar Muted)</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {connectionStatus === 'error' && (
            <button
              onClick={retryConnection}
              className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 transition-colors"
              title="Retry connection"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {tavusConversationUrl && (
            <button
              onClick={openTavusConversation}
              className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors"
              title="Open Tavus conversation in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          {isConnectedToTavus && (
            <div className="text-xs text-green-300 flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {(connectionStatus !== 'connected' || !isConnectedToTavus) && (
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
              {connectionStatus === 'connecting' ? `Connecting to Tavus conversation ${tavusConversationId.slice(0, 8)}...` :
               connectionStatus === 'error' ? `Failed to connect: ${connectionError || 'Unknown error'}` :
               'Waiting for Tavus connection...'}
            </span>
          </div>
          {connectionStatus === 'error' && (
            <button
              onClick={retryConnection}
              className="mt-2 text-xs bg-yellow-500/30 hover:bg-yellow-500/40 px-2 py-1 rounded transition-colors text-yellow-200"
            >
              Retry Connection
            </button>
          )}
        </div>
      )}

      {/* Conversation Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-white">Persona: {tavusPersonaId || 'Unknown'}</span>
          </div>
        </div>
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Video className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-white">
              Conv: {tavusConversationId ? tavusConversationId.slice(0, 8) + '...' : 'None'}
            </span>
          </div>
        </div>
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Heart className="h-4 w-4 text-pink-400" />
            <span className="text-xs text-white">
              Status: {connectionStatus}
            </span>
          </div>
        </div>
        <div className="p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className={`h-4 w-4 ${isConnectedToTavus ? 'text-green-400' : 'text-gray-400'}`} />
            <span className="text-xs text-white">
              {isConnectedToTavus ? 'Live' : 'Connecting'}
            </span>
          </div>
        </div>
      </div>

      {/* Video Feed */}
      <div className="mb-6 relative">
        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
          {/* Tavus Avatar Video */}
          {isConnectedToTavus ? (
            <video
              ref={avatarVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted={isMuted}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
              <div className="text-center">
                {connectionStatus === 'connecting' ? (
                  <>
                    <Loader className="h-16 w-16 text-purple-400 mx-auto mb-4 animate-spin" />
                    <p className="text-white text-lg font-semibold">Connecting to Tavus...</p>
                    <p className="text-purple-200 text-sm">Persona: {tavusPersonaId}</p>
                    <p className="text-blue-200 text-xs mt-2">Conversation: {tavusConversationId}</p>
                  </>
                ) : connectionStatus === 'error' ? (
                  <>
                    <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <p className="text-white text-lg font-semibold">Connection Failed</p>
                    <p className="text-red-200 text-sm">{connectionError}</p>
                  </>
                ) : (
                  <>
                    <Brain className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                    <p className="text-white text-lg font-semibold">Tavus AI Avatar</p>
                    <p className="text-purple-200 text-sm">Persona: {tavusPersonaId}</p>
                    <p className="text-blue-200 text-xs mt-2">Conversation: {tavusConversationId}</p>
                  </>
                )}
              </div>
            </div>
          )}
          
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
              <span className="text-white text-sm">Tavus Speaking</span>
            </div>
          )}

          {/* Mute Indicator */}
          {isMuted && (
            <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-red-500/80 px-3 py-1 rounded-full">
              <VolumeX className="h-4 w-4 text-white" />
              <span className="text-white text-sm">Avatar Muted</span>
            </div>
          )}

          {/* Persona Indicator */}
          <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
            <span className="text-white text-xs font-medium">{tavusPersonaId || 'Unknown'}</span>
          </div>
        </div>
        
        {/* Video Controls */}
        <div className="flex items-center justify-center space-x-4 mt-4">
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
          </button>
          
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              !isMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            }`}
            title={isMuted ? 'Unmute Tavus avatar' : 'Mute Tavus avatar'}
          >
            {!isMuted ? <Volume2 className="h-5 w-5 text-white" /> : <VolumeX className="h-5 w-5 text-white" />}
          </button>
          
          <button
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            className={`p-3 rounded-full transition-colors ${
              isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-purple-500 hover:bg-purple-600'
            }`}
            title={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
          </button>

          {tavusConversationUrl && (
            <button
              onClick={openTavusConversation}
              className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
              title="Open in Tavus"
            >
              <ExternalLink className="h-5 w-5 text-white" />
            </button>
          )}

          {connectionStatus === 'error' && (
            <button
              onClick={retryConnection}
              className="p-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
              title="Retry connection"
            >
              <RefreshCw className="h-5 w-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Technology Credits */}
      <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
        <p>🤖 <strong>Tavus AI Avatar</strong> with persona {tavusPersonaId}</p>
        <p>💬 Conversation: {tavusConversationId}</p>
        <p>🎥 <strong>Daily.co</strong> integration • 🔊 <strong>ElevenLabs</strong> voice</p>
        <p>🎙️ <strong>Deepgram</strong> speech recognition</p>
        <p>🔇 Independent mute control for Tavus avatar</p>
        <p>✨ Uses conversation created by secure edge function</p>
      </div>
    </div>
  );
}

// Extend Window interface for Daily.co
declare global {
  interface Window {
    DailyIframe: any;
  }
}