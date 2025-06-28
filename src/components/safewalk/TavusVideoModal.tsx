import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  X,
  AlertCircle,
  CheckCircle,
  Loader,
  Phone,
  PhoneOff,
  Clock,
  User,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TavusVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmergencyDetected?: () => void;
}

interface TavusConversation {
  conversationId: string;
  conversationUrl: string;
  status: 'creating' | 'active' | 'ending' | 'ended' | 'error';
  startTime: number;
  maxDuration: number; // in seconds
}

export function TavusVideoModal({ isOpen, onClose, onEmergencyDetected }: TavusVideoModalProps) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<TavusConversation | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(61); // 61 seconds as per your requirement
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  // Your replica ID
  const REPLICA_ID = 'r9d30b0e55ac';

  useEffect(() => {
    if (isOpen && !conversation) {
      initializeVideoCall();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  useEffect(() => {
    if (conversation?.status === 'active') {
      startCountdownTimer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [conversation?.status]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // End conversation if active
    if (conversationIdRef.current && conversation?.status === 'active') {
      endConversation(conversationIdRef.current);
    }
  };

  const initializeVideoCall = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Get user's Tavus API key from database
      const { data: apiKeys, error: apiError } = await supabase
        .from('user_api_keys')
        .select('tavus_api_key')
        .eq('user_id', user.id)
        .single();

      if (apiError || !apiKeys?.tavus_api_key) {
        throw new Error('Tavus API key not configured. Please add your API key in Settings.');
      }

      const userApiKey = apiKeys.tavus_api_key.trim();
      setApiKey(userApiKey);

      // Validate API key format
      if (userApiKey.length < 20) {
        throw new Error('Invalid Tavus API key format. Please check your API key in Settings.');
      }

      // Create Tavus conversation
      const conversationData = await createTavusConversation(userApiKey);
      setConversation(conversationData);
      conversationIdRef.current = conversationData.conversationId;
      
    } catch (error) {
      console.error('Error initializing video call:', error);
      setError(error.message || 'Failed to start video call');
    } finally {
      setIsCreating(false);
    }
  };

  const createTavusConversation = async (userApiKey: string): Promise<TavusConversation> => {
    console.log('🎥 Creating Tavus conversation with replica:', REPLICA_ID);
    
    // Using the exact format from your const options example
    const options = {
      method: 'POST',
      headers: {
        'x-api-key': userApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "conversation_name": "Safety Companion",
        "properties": {
          "enable_recording": false,
          "participant_left_timeout": 1,
          "max_call_duration": 61
        },
        "conversational_context": "SafeMate is a modern, AI-powered safety companion designed to walk with, comfort, and support individuals who may feel anxious or vulnerable during their journeys. Created as a caring, ever-present digital friend, SafeMate combines the warmth and attentiveness of a trusted companion with practical safety features—periodic check-ins, instant access to emergency support, and the ability to offer calming conversation or guided relaxation when needed. Whether walking home at night, commuting through busy streets, or simply seeking reassurance, users can rely on SafeMate's gentle presence and empathetic responses. Unlike a traditional security app, SafeMate's persona is friendly, encouraging, and nonjudgmental—celebrating small moments of courage, validating feelings, and offering to stay present through both routine trips and moments of distress. SafeMate's mission is to ensure that no one ever feels truly alone; with every check-in and comforting word, it transforms technology into a source of both safety and genuine human-like connection.",
        "replica_id": REPLICA_ID
      })
    };

    const response = await fetch('https://tavusapi.com/v2/conversations', options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tavus conversation creation failed:', response.status, errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid Tavus API key. Please verify your API key in Settings.');
      } else if (response.status === 403) {
        throw new Error('Tavus API key does not have permission to create conversations.');
      } else if (response.status === 404) {
        throw new Error(`Replica ${REPLICA_ID} not found or not accessible with your API key.`);
      } else {
        throw new Error(`Tavus API error: ${errorData.message || response.statusText}`);
      }
    }

    const data = await response.json();
    console.log('✅ Tavus conversation created:', data);
    
    return {
      conversationId: data.conversation_id,
      conversationUrl: data.conversation_url,
      status: 'active',
      startTime: Date.now(),
      maxDuration: 61
    };
  };

  const endConversation = async (conversationId: string) => {
    if (!apiKey || !conversationId) return;

    try {
      console.log('🔚 Ending Tavus conversation:', conversationId);
      
      const options = {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      };

      const response = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}/end`, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error ending conversation:', response.status, errorData);
      } else {
        console.log('✅ Conversation ended successfully');
      }
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  };

  const startCountdownTimer = () => {
    setTimeRemaining(61); // Reset to 61 seconds
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeExpired = () => {
    console.log('⏰ Time expired, ending conversation');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (conversationIdRef.current) {
      endConversation(conversationIdRef.current);
    }
    
    setConversation(prev => prev ? { ...prev, status: 'ended' } : null);
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const handleManualEnd = () => {
    console.log('👤 User manually ending conversation');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (conversationIdRef.current) {
      endConversation(conversationIdRef.current);
    }
    
    setConversation(prev => prev ? { ...prev, status: 'ending' } : null);
    
    // Close immediately on manual end
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining <= 10) return 'text-red-400';
    if (timeRemaining <= 30) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">SafeMate Video Support</h3>
                <p className="text-gray-300 text-sm flex items-center space-x-2">
                  <User className="h-3 w-3" />
                  <span>AI Replica {REPLICA_ID}</span>
                  {conversation?.status === 'active' && (
                    <>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span className={getTimeColor()}>{formatTime(timeRemaining)} remaining</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {conversation?.status === 'active' && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                  timeRemaining <= 10 ? 'bg-red-500/20' : 
                  timeRemaining <= 30 ? 'bg-yellow-500/20' : 'bg-green-500/20'
                }`}>
                  <Clock className={`h-4 w-4 ${getTimeColor()}`} />
                  <span className={`text-sm font-mono font-bold ${getTimeColor()}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative h-96">
            {isCreating && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <Loader className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-white font-semibold">Starting video call...</p>
                  <p className="text-gray-400 text-sm">Connecting to SafeMate AI Replica</p>
                  <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-gray-500">
                    <Shield className="h-3 w-3" />
                    <span>Powered by Tavus Conversations API</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h4 className="text-white font-semibold mb-2">Connection Failed</h4>
                  <p className="text-gray-300 text-sm mb-4">{error}</p>
                  <div className="space-y-2">
                    <button
                      onClick={initializeVideoCall}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mr-2"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {conversation?.status === 'active' && conversation.conversationUrl && (
              <iframe
                ref={iframeRef}
                src={conversation.conversationUrl}
                className="w-full h-full border-0"
                allow="camera; microphone; autoplay; encrypted-media; fullscreen"
                allowFullScreen
                title="SafeMate AI Video Call"
                style={{ backgroundColor: '#1f2937' }}
              />
            )}

            {(conversation?.status === 'ended' || conversation?.status === 'ending') && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-white font-semibold mb-2">
                    {conversation.status === 'ending' ? 'Ending Call...' : 'Call Completed'}
                  </h4>
                  <p className="text-gray-300 text-sm">
                    {conversation.status === 'ending' 
                      ? 'Safely ending your SafeMate session'
                      : 'Your SafeMate video session has completed'
                    }
                  </p>
                  {conversation.status === 'ended' && (
                    <p className="text-gray-400 text-xs mt-2">Window will close automatically</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          {conversation?.status === 'active' && (
            <div className="flex items-center justify-center space-x-4 p-4 bg-gray-800 border-t border-gray-700">
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                className={`p-3 rounded-full transition-colors ${
                  isVideoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
              </button>
              
              <button
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className={`p-3 rounded-full transition-colors ${
                  isAudioEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
                title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
              </button>
              
              <button
                onClick={handleManualEnd}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                title="End call"
              >
                <PhoneOff className="h-5 w-5 text-white" />
              </button>
            </div>
          )}

          {/* Emergency Detection Banner */}
          {conversation?.status === 'active' && (
            <div className="absolute bottom-20 left-4 right-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 backdrop-blur-sm"
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-200 text-sm">
                    Emergency monitoring active - say "emergency" if you need immediate help
                  </span>
                </div>
              </motion.div>
            </div>
          )}

          {/* Technical Info */}
          <div className="absolute bottom-2 right-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Tavus Conversations API • Replica {REPLICA_ID}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}