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
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TavusVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmergencyDetected?: () => void;
}

interface TavusSession {
  sessionId: string;
  sessionType: 'persona' | 'replica';
  embedUrl?: string;
  conversationUrl?: string;
  maxDuration: number;
  status: 'creating' | 'active' | 'ended' | 'error';
}

export function TavusVideoModal({ isOpen, onClose, onEmergencyDetected }: TavusVideoModalProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<TavusSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && !session) {
      createTavusSession();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (session?.status === 'active') {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [session?.status]);

  const createTavusSession = async () => {
    if (!user) return;

    setIsCreating(true);
    setError(null);

    try {
      // Get user's API keys
      const { data: apiKeys, error: apiError } = await supabase
        .from('user_api_keys')
        .select('tavus_api_key')
        .eq('user_id', user.id)
        .single();

      if (apiError || !apiKeys?.tavus_api_key) {
        throw new Error('Tavus API key not configured. Please add your API key in Settings.');
      }

      // Determine which asset to use
      const { assetId, assetType } = await determineAvailableAsset(apiKeys.tavus_api_key);
      
      // Create session based on asset type
      let sessionData: TavusSession;
      
      if (assetType === 'persona') {
        sessionData = await createPersonaSession(apiKeys.tavus_api_key, assetId);
      } else {
        sessionData = await createReplicaSession(apiKeys.tavus_api_key, assetId);
      }

      setSession(sessionData);
      
    } catch (error) {
      console.error('Error creating Tavus session:', error);
      setError(error.message || 'Failed to start video call');
    } finally {
      setIsCreating(false);
    }
  };

  const determineAvailableAsset = async (apiKey: string): Promise<{ assetId: string; assetType: 'persona' | 'replica' }> => {
    const PERSONA_ID = 'p157bb5e234e';
    const REPLICA_ID = 'r9d30b0e55ac';

    // Check persona first (preferred)
    try {
      const personaResponse = await fetch(`https://tavusapi.com/v2/personas/${PERSONA_ID}`, {
        headers: { 'x-api-key': apiKey }
      });

      if (personaResponse.ok) {
        return { assetId: PERSONA_ID, assetType: 'persona' };
      }
    } catch (error) {
      console.log('Persona not available, checking replica...');
    }

    // Check replica as fallback
    try {
      const replicaResponse = await fetch(`https://tavusapi.com/v2/replicas/${REPLICA_ID}`, {
        headers: { 'x-api-key': apiKey }
      });

      if (replicaResponse.ok) {
        return { assetId: REPLICA_ID, assetType: 'replica' };
      }
    } catch (error) {
      console.log('Replica not available');
    }

    throw new Error('Neither persona nor replica available in your account');
  };

  const createPersonaSession = async (apiKey: string, personaId: string): Promise<TavusSession> => {
    const response = await fetch('https://tavusapi.com/v2/cvi/sessions', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        persona_id: personaId,
        properties: {
          max_session_duration: 60, // 1 minute
          participant_left_timeout: 10,
          participant_absent_timeout: 5,
          enable_recording: false,
          enable_transcription: true,
          language: 'en'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Persona session error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      sessionId: data.session_id,
      sessionType: 'persona',
      embedUrl: `https://tavus.io/embed/${data.session_id}`,
      maxDuration: 60,
      status: 'active'
    };
  };

  const createReplicaSession = async (apiKey: string, replicaId: string): Promise<TavusSession> => {
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        replica_id: replicaId,
        conversation_name: `SafeMate Emergency Call ${new Date().toISOString()}`,
        properties: {
          max_call_duration: 60, // 1 minute
          participant_left_timeout: 10,
          participant_absent_timeout: 5,
          enable_recording: false,
          enable_transcription: true,
          language: 'en'
        },
        conversation_context: "You are SafeMate, an AI safety companion. The user has requested emergency support. Be caring, supportive, and help them feel safe. Ask about their situation and provide comfort.",
        custom_greeting: "Hi! I'm here to help you. Are you safe right now? Tell me what's happening."
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Replica session error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      sessionId: data.conversation_id,
      sessionType: 'replica',
      conversationUrl: data.conversation_url,
      maxDuration: 60,
      status: 'active'
    };
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setSession(prev => prev ? { ...prev, status: 'ended' } : null);
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              <div className="p-2 rounded-full bg-blue-500">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">SafeMate Video Support</h3>
                <p className="text-gray-300 text-sm">
                  {session?.sessionType === 'persona' ? 'AI Persona' : 'AI Replica'} • 
                  {session?.status === 'active' && ` ${formatTime(timeRemaining)} remaining`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {session?.status === 'active' && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-red-500/20 rounded-full">
                  <Clock className="h-4 w-4 text-red-400" />
                  <span className="text-red-300 text-sm font-mono">
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
                  <p className="text-white">Starting video call...</p>
                  <p className="text-gray-400 text-sm">Connecting to your AI companion</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h4 className="text-white font-semibold mb-2">Connection Failed</h4>
                  <p className="text-gray-300 text-sm mb-4">{error}</p>
                  <button
                    onClick={createTavusSession}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {session?.status === 'active' && (
              <iframe
                ref={iframeRef}
                src={session.embedUrl || session.conversationUrl}
                className="w-full h-full border-0"
                allow="camera; microphone; autoplay; encrypted-media; fullscreen"
                allowFullScreen
                title="SafeMate AI Video Call"
              />
            )}

            {session?.status === 'ended' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-white font-semibold mb-2">Call Ended</h4>
                  <p className="text-gray-300 text-sm">Your SafeMate session has completed</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          {session?.status === 'active' && (
            <div className="flex items-center justify-center space-x-4 p-4 bg-gray-800 border-t border-gray-700">
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                className={`p-3 rounded-full transition-colors ${
                  isVideoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {isVideoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
              </button>
              
              <button
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className={`p-3 rounded-full transition-colors ${
                  isAudioEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
              </button>
              
              <button
                onClick={endSession}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
              >
                <PhoneOff className="h-5 w-5 text-white" />
              </button>
            </div>
          )}

          {/* Emergency Detection */}
          {session?.status === 'active' && (
            <div className="absolute bottom-20 left-4 right-4">
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-200 text-sm">
                    Emergency monitoring active - say "emergency" if you need immediate help
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}