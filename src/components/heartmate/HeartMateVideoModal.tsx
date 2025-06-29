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
  Monitor,
  Heart,
  Brain,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface HeartMateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function HeartMateVideoModal({ 
  isOpen, 
  onClose, 
  onVideoCallStart,
  onVideoCallEnd 
}: HeartMateVideoModalProps) {
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
  const [callCompleted, setCallCompleted] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const windowCheckRef = useRef<NodeJS.Timeout | null>(null);
  const hasNotifiedCallEnd = useRef<boolean>(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Your replica ID - using the same as SafeWalk for now
  const REPLICA_ID = 'r9d30b0e55ac';

  useEffect(() => {
    // Check if device is mobile
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    };
    
    setIsMobileDevice(checkMobileDevice());

    if (isOpen && !conversation && !callCompleted) {
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
      if (!hasNotifiedCallEnd.current) {
        onVideoCallStart?.();
      }
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

  // Scroll to top when modal content changes
  useEffect(() => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }
  }, [isCreating, error, showInstructions, conversation?.status]);

  // Check if returning from a video call (mobile)
  useEffect(() => {
    const wasInVideoCall = localStorage.getItem('heartmate_video_active') === 'true';
    
    if (wasInVideoCall) {
      // Clear the flag
      localStorage.removeItem('heartmate_video_active');
      
      // Get the conversation ID
      const savedConversationId = localStorage.getItem('heartmate_video_conversation_id');
      if (savedConversationId) {
        localStorage.removeItem('heartmate_video_conversation_id');
        
        // End the conversation
        endConversation(savedConversationId);
      }
      
      // Notify that the call has ended
      if (!hasNotifiedCallEnd.current) {
        hasNotifiedCallEnd.current = true;
        onVideoCallEnd?.();
      }
      
      // Close modal after window is closed
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, []);

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

    // Only notify parent once
    if (!hasNotifiedCallEnd.current) {
      hasNotifiedCallEnd.current = true;
      onVideoCallEnd?.();
    }
  };

  const initializeVideoCall = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsCreating(true);
    setError(null);
    setCallCompleted(false);
    hasNotifiedCallEnd.current = false;

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
        "conversation_name": "HeartMate Emotional Support",
        "properties": {
          "enable_recording": false,
          "participant_left_timeout": 1,
          "max_call_duration": 61
        },
        "conversational_context": "You are HeartMate, an AI emotional support companion designed to provide empathetic, caring responses focused on emotional wellness and mental health. Your approach is warm, supportive, and gentle. You validate feelings, offer comfort, and provide a safe space for users to express themselves. You're skilled in mindfulness techniques, deep breathing exercises, and emotional regulation strategies. Your goal is to help users feel heard, understood, and supported during difficult moments. You respond with compassion, never judgment, and focus on being present with the user rather than trying to 'fix' their problems. You're also knowledgeable about mental health resources but primarily focus on providing immediate emotional support through your caring presence.",
        "replica_id": REPLICA_ID
      })
    };

    const response = await fetch('https://tavusapi.com/v2/conversations', options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tavus conversation creation failed:', response.status, errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid Tavus API key. Please verify your key at tavus.io/dashboard/api-keys');
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
    
    if (isMobileDevice) {
      // For mobile devices, open in same window with special handling
      localStorage.setItem('heartmate_video_active', 'true');
      localStorage.setItem('heartmate_video_conversation_id', conversationIdRef.current || '');
      localStorage.setItem('heartmate_video_end_time', (Date.now() + timeRemaining * 1000).toString());
      
      window.location.href = conversation.conversationUrl;
      return;
    }
    
    // Open in a new window with specific dimensions
    const windowFeatures = 'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no';
    const newWindow = window.open(conversation.conversationUrl, 'HeartMateVideoCall', windowFeatures);
    
    if (newWindow) {
      setConversationWindow(newWindow);
      setShowInstructions(false);
      
      // Focus the new window
      newWindow.focus();
      
      console.log('✅ Conversation window opened successfully');
      console.log('📹 Video call started - AI features will be paused');
    } else {
      // Don't show error immediately - user might have popup blocker
      console.warn('⚠️ Could not open popup window - popup blocker might be active');
      
      // Show helpful message instead of error
      setError('Please allow popups for this site and try again. Check your browser\'s popup blocker settings.');
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
    setCallCompleted(true);
    
    // Notify parent that video call ended (only once)
    if (!hasNotifiedCallEnd.current) {
      hasNotifiedCallEnd.current = true;
      onVideoCallEnd?.();
    }
    
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
    setCallCompleted(true);
    
    // Notify parent that video call ended (only once)
    if (!hasNotifiedCallEnd.current) {
      hasNotifiedCallEnd.current = true;
      onVideoCallEnd?.();
    }
    
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
    setCallCompleted(true);
    
    // Notify parent that video call ended (only once)
    if (!hasNotifiedCallEnd.current) {
      hasNotifiedCallEnd.current = true;
      onVideoCallEnd?.();
    }
    
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
          style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header - Fixed */}
          <div className="flex items-center justify-between p-6 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">HeartMate Video Support</h3>
                <p className="text-gray-300 text-sm flex items-center space-x-2">
                  <User className="h-3 w-3" />
                  <span>AI Emotional Support</span>
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

          {/* Content - Scrollable */}
          <div 
            ref={modalContentRef}
            className="p-6 overflow-y-auto flex-1"
            style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {isCreating && (
              <div className="text-center py-8">
                <Loader className="h-12 w-12 text-pink-500 animate-spin mx-auto mb-4" />
                <h4 className="text-white font-semibold text-lg mb-2">Starting Video Call...</h4>
                <p className="text-gray-400">Connecting to HeartMate AI Companion</p>
                <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <Shield className="h-3 w-3" />
                  <span>Powered by Tavus Conversations API</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h4 className="text-white font-semibold text-lg mb-2">Setup Required</h4>
                <p className="text-gray-300 mb-6">{error}</p>
                
                {error.includes('popup') && (
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6 text-left">
                    <h5 className="text-blue-200 font-medium mb-2">How to enable popups:</h5>
                    <ul className="text-blue-300 text-sm space-y-1">
                      <li>• Look for a popup blocker icon in your address bar</li>
                      <li>• Click it and select "Always allow popups from this site"</li>
                      <li>• Or go to browser Settings → Privacy → Popups and add this site</li>
                      <li>• Refresh the page and try again</li>
                    </ul>
                  </div>
                )}
                
                <div className="space-x-3">
                  <button
                    onClick={() => {
                      setError(null);
                      if (conversation?.conversationUrl) {
                        if (isMobileDevice) {
                          // For mobile devices, open in same window with special handling
                          localStorage.setItem('heartmate_video_active', 'true');
                          localStorage.setItem('heartmate_video_conversation_id', conversationIdRef.current || '');
                          localStorage.setItem('heartmate_video_end_time', (Date.now() + timeRemaining * 1000).toString());
                          
                          window.location.href = conversation.conversationUrl;
                        } else {
                          openConversationWindow();
                        }
                      } else {
                        initializeVideoCall();
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {conversation?.conversationUrl ? 'Try Opening Video Again' : 'Try Again'}
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

            {showInstructions && conversation && !error && (
              <div className="text-center py-8">
                <Monitor className="h-12 w-12 text-pink-500 mx-auto mb-4" />
                <h4 className="text-white font-semibold text-lg mb-2">Ready to Connect!</h4>
                <p className="text-gray-300 mb-6">
                  Your HeartMate AI companion is ready. Click below to {isMobileDevice ? 'start' : 'open'} the video call.
                </p>
                
                <div className="bg-pink-500/20 border border-pink-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <Heart className="h-5 w-5 text-pink-400 mt-0.5" />
                    <div className="text-left">
                      <h5 className="text-pink-200 font-medium mb-1">How HeartMate Video Can Help:</h5>
                      <ul className="text-pink-300 text-sm space-y-1">
                        <li>• Face-to-face emotional support when you need it most</li>
                        <li>• Guided breathing and mindfulness exercises</li>
                        <li>• Visual cues for relaxation techniques</li>
                        <li>• Compassionate presence during difficult moments</li>
                        <li>• Private, judgment-free space to express yourself</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div className="text-left">
                      <h5 className="text-blue-200 font-medium mb-1">Important:</h5>
                      <ul className="text-blue-300 text-sm space-y-1">
                        {isMobileDevice ? (
                          <>
                            <li>• You'll be redirected to the video call page</li>
                            <li>• Grant camera and microphone permissions when prompted</li>
                            <li>• Use your browser's back button to return when finished</li>
                            <li>• Call will automatically end after 61 seconds</li>
                          </>
                        ) : (
                          <>
                            <li>• Allow popups if prompted by your browser</li>
                            <li>• Grant camera and microphone permissions</li>
                            <li>• Keep this window open to monitor the timer</li>
                            <li>• Call will automatically end after 61 seconds</li>
                          </>
                        )}
                        <li>• <strong>AI voice/text features will pause during video call</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={isMobileDevice ? () => {
                    // For mobile devices, open in same window with special handling
                    localStorage.setItem('heartmate_video_active', 'true');
                    localStorage.setItem('heartmate_video_conversation_id', conversationIdRef.current || '');
                    localStorage.setItem('heartmate_video_end_time', (Date.now() + timeRemaining * 1000).toString());
                    
                    window.location.href = conversation.conversationUrl;
                  } : openConversationWindow}
                  className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg flex items-center space-x-2 mx-auto"
                >
                  <ExternalLink className="h-5 w-5" />
                  <span>{isMobileDevice ? 'Start Video Call' : 'Open Video Call'}</span>
                </button>
              </div>
            )}

            {conversation?.status === 'active' && conversationWindow && !showInstructions && !error && !isMobileDevice && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-semibold">Video Call Active</span>
                </div>
                
                <h4 className="text-white font-semibold text-lg mb-2">Connected to HeartMate AI</h4>
                <p className="text-gray-300 mb-2">
                  Your video call is running in a separate window. 
                  {conversationWindow.closed ? ' Window was closed.' : ' Switch to that window to continue.'}
                </p>
                
                <div className="bg-pink-500/20 border border-pink-500/30 rounded-lg p-3 mb-6">
                  <p className="text-pink-200 text-sm">
                    💖 <strong>Emotional Support Mode:</strong> Your AI companion is focused on providing emotional support and wellness guidance.
                  </p>
                </div>
                
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-6">
                  <p className="text-yellow-200 text-sm">
                    📹 <strong>Smart Mode Active:</strong> AI voice and text features are paused during video call. 
                    Wellness tracking continues in the background.
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
                    ? 'Safely ending your HeartMate session'
                    : 'Your HeartMate video session has completed successfully'
                  }
                </p>
                <p className="text-green-300 text-sm">
                  💖 AI voice and text features will resume shortly
                </p>
                {conversation.status === 'ended' && (
                  <p className="text-gray-400 text-sm mt-2">This window will close automatically</p>
                )}
              </div>
            )}
          </div>

          {/* Technical Info - Fixed at bottom */}
          <div className="px-6 pb-4 bg-gray-900 border-t border-gray-800">
            <div className="text-xs text-gray-500 text-center py-2">
              <div className="flex items-center justify-center space-x-1">
                <Heart className="h-3 w-3 text-pink-400" />
                <span>Tavus Conversations API • Emotional Support AI • 61-second sessions • Smart AI pause</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}