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
  Shield,
  ExternalLink,
  Monitor
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TavusVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmergencyDetected?: () => void;
  onVideoCallStart?: () => void;
  onVideoCallEnd?: () => void;
}

interface TavusConversation {
  conversationId: string;
  conversationUrl: string;
  status: 'creating' | 'active' | 'ending' | 'ended' | 'error';
  startTime: number;
  maxDuration: number; // in seconds
}

export function TavusVideoModal({ 
  isOpen, 
  onClose, 
  onEmergencyDetected,
  onVideoCallStart,
  onVideoCallEnd 
}: TavusVideoModalProps) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<TavusConversation | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(61); // 61 seconds as per your requirement
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [conversationWindow, setConversationWindow] = useState<Window | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const windowCheckRef = useRef<NodeJS.Timeout | null>(null);

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
      // Notify parent that video call started
      onVideoCallStart?.();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [conversation?.status]);

  useEffect(() => {
    // Check if conversation window is closed
    if (conversationWindow && windowCheckRef.current === null) {
      windowCheckRef.current = setInterval(() => {
        if (conversationWindow.closed) {
          console.log('🪟 Conversation window was closed by user');
          handleWindowClosed();
        }
      }, 1000);
    }

    return () => {
      if (windowCheckRef.current) {
        clearInterval(windowCheckRef.current);
        windowCheckRef.current = null;
      }
    };
  }, [conversationWindow]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (windowCheckRef.current) {
      clearInterval(windowCheckRef.current);
      windowCheckRef.current = null;
    }
    
    // Close conversation window if open
    if (conversationWindow && !conversationWindow.closed) {
      conversationWindow.close();
    }
    
    // End conversation if active
    if (conversationIdRef.current && conversation?.status === 'active') {
      endConversation(conversationIdRef.current);
    }

    // Notify parent that video call ended
    onVideoCallEnd?.();
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
      
      // Show instructions before opening
      setShowInstructions(true);
      
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

  const openConversationWindow = () => {
    if (!conversation?.conversationUrl) return;

    console.log('🪟 Opening Tavus conversation in new window:', conversation.conversationUrl);
    
    // Open in a new window with specific dimensions
    const windowFeatures = 'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no';
    const newWindow = window.open(conversation.conversationUrl, 'SafeMateVideoCall', windowFeatures);
    
    if (newWindow) {
      setConversationWindow(newWindow);
      setShowInstructions(false);
      
      // Focus the new window
      newWindow.focus();
      
      console.log('✅ Conversation window opened successfully');
      console.log('📹 Video call started - AI features will be paused');
    } else {
      setError('Failed to open conversation window. Please allow popups for this site.');
    }
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
    
    // Close conversation window
    if (conversationWindow && !conversationWindow.closed) {
      conversationWindow.close();
    }
    
    if (conversationIdRef.current) {
      endConversation(conversationIdRef.current);
    }
    
    setConversation(prev => prev ? { ...prev, status: 'ended' } : null);
    
    // Notify parent that video call ended
    onVideoCallEnd?.();
    
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
    
    // Close conversation window
    if (conversationWindow && !conversationWindow.closed) {
      conversationWindow.close();
    }
    
    if (conversationIdRef.current) {
      endConversation(conversationIdRef.current);
    }
    
    setConversation(prev => prev ? { ...prev, status: 'ending' } : null);
    
    // Notify parent that video call ended
    onVideoCallEnd?.();
    
    // Close immediately on manual end
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleWindowClosed = () => {
    console.log('🪟 Conversation window closed, ending session');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (windowCheckRef.current) {
      clearInterval(windowCheckRef.current);
      windowCheckRef.current = null;
    }
    
    if (conversationIdRef.current) {
      endConversation(conversationIdRef.current);
    }
    
    setConversation(prev => prev ? { ...prev, status: 'ended' } : null);
    
    // Notify parent that video call ended
    onVideoCallEnd?.();
    
    // Close modal after window is closed
    setTimeout(() => {
      onClose();
    }, 2000);
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
          className="relative w-full max-w-2xl bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">SafeMate Video Support</h3>
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
          <div className="p-6">
            {isCreating && (
              <div className="text-center py-8">
                <Loader className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                <h4 className="text-white font-semibold text-lg mb-2">Starting Video Call...</h4>
                <p className="text-gray-400">Connecting to SafeMate AI Replica</p>
                <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <Shield className="h-3 w-3" />
                  <span>Powered by Tavus Conversations API</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h4 className="text-white font-semibold text-lg mb-2">Connection Failed</h4>
                <p className="text-gray-300 mb-6">{error}</p>
                <div className="space-x-3">
                  <button
                    onClick={initializeVideoCall}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {showInstructions && conversation && (
              <div className="text-center py-8">
                <Monitor className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h4 className="text-white font-semibold text-lg mb-2">Ready to Connect!</h4>
                <p className="text-gray-300 mb-6">
                  Your SafeMate AI companion is ready. Click below to open the video call in a new window.
                </p>
                
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div className="text-left">
                      <h5 className="text-blue-200 font-medium mb-1">Important:</h5>
                      <ul className="text-blue-300 text-sm space-y-1">
                        <li>• Allow popups if prompted by your browser</li>
                        <li>• Grant camera and microphone permissions</li>
                        <li>• Keep this window open to monitor the timer</li>
                        <li>• Call will automatically end after 61 seconds</li>
                        <li>• <strong>AI voice/text features will pause during video call</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={openConversationWindow}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg flex items-center space-x-2 mx-auto"
                >
                  <ExternalLink className="h-5 w-5" />
                  <span>Open Video Call</span>
                </button>
              </div>
            )}

            {conversation?.status === 'active' && conversationWindow && !showInstructions && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-semibold">Video Call Active</span>
                </div>
                
                <h4 className="text-white font-semibold text-lg mb-2">Connected to SafeMate AI</h4>
                <p className="text-gray-300 mb-2">
                  Your video call is running in a separate window. 
                  {conversationWindow.closed ? ' Window was closed.' : ' Switch to that window to continue.'}
                </p>
                
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-6">
                  <p className="text-yellow-200 text-sm">
                    📹 <strong>Smart Mode Active:</strong> AI voice and text features are paused during video call. 
                    Safety monitoring and check-ins continue in the background.
                  </p>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className={`h-5 w-5 ${getTimeColor()}`} />
                      <span className="text-white">Time Remaining:</span>
                    </div>
                    <span className={`text-2xl font-mono font-bold ${getTimeColor()}`}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                  
                  <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        timeRemaining <= 10 ? 'bg-red-500' : 
                        timeRemaining <= 30 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(timeRemaining / 61) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleManualEnd}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2 mx-auto"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>End Call</span>
                </button>
              </div>
            )}

            {(conversation?.status === 'ended' || conversation?.status === 'ending') && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h4 className="text-white font-semibold text-lg mb-2">
                  {conversation.status === 'ending' ? 'Ending Call...' : 'Call Completed'}
                </h4>
                <p className="text-gray-300 mb-2">
                  {conversation.status === 'ending' 
                    ? 'Safely ending your SafeMate session'
                    : 'Your SafeMate video session has completed successfully'
                  }
                </p>
                <p className="text-green-300 text-sm">
                  📹 AI voice and text features will resume shortly
                </p>
                {conversation.status === 'ended' && (
                  <p className="text-gray-400 text-sm mt-2">This window will close automatically</p>
                )}
              </div>
            )}
          </div>

          {/* Technical Info */}
          <div className="px-6 pb-4">
            <div className="text-xs text-gray-500 text-center">
              <div className="flex items-center justify-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Tavus Conversations API • Replica {REPLICA_ID} • 61-second sessions • Smart AI pause</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}