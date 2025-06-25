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
  ExternalLink,
  RefreshCw,
  User,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TavusLiveKitIntegrationProps {
  isActive: boolean;
  onEmergencyDetected: () => void;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

interface TavusSession {
  sessionId: string;
  sessionToken?: string;
  roomToken?: string;
  roomName?: string;
  wsUrl?: string;
  assetId: string;
  assetType: 'persona' | 'replica';
  mode: 'audio' | 'video';
  sessionType: string;
  status: string;
  embedUrl?: string;
  conversationUrl?: string;
}

// Hardcoded API key and asset IDs as requested
const HARDCODED_API_KEY = 'd8a82253fd3d474996106d87f1c7e6d3';
const YOUR_PERSONA_ID = 'p157bb5e234e';
const YOUR_REPLICA_ID = 'r9d30b0e55ac';

export function TavusLiveKitIntegration({ 
  isActive, 
  onEmergencyDetected, 
  onConnectionStatusChange 
}: TavusLiveKitIntegrationProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [tavusSession, setTavusSession] = useState<TavusSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [assetsValidated, setAssetsValidated] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<{
    personaAccessible: boolean;
    replicaAccessible: boolean;
    preferredAsset: 'persona' | 'replica' | null;
  }>({
    personaAccessible: false,
    replicaAccessible: false,
    preferredAsset: null
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isActive) {
      validateAssetsAndInitialize();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isActive]);

  useEffect(() => {
    onConnectionStatusChange?.(connectionStatus);
  }, [connectionStatus, onConnectionStatusChange]);

  const validateAssetsAndInitialize = async () => {
    if (!user) return;

    setError(null);

    try {
      console.log('Using hardcoded API key to validate assets...');
      
      // Validate available assets using hardcoded API key
      await validateAssets();
      
    } catch (error) {
      console.error('Error in validateAssetsAndInitialize:', error);
      setError('Failed to initialize Tavus integration');
      setConnectionStatus('error');
    }
  };

  const validateAssets = async () => {
    try {
      console.log('Validating available assets with hardcoded API key...');
      
      let personaAccessible = false;
      let replicaAccessible = false;

      // Use the exact GET method you provided
      const options = {
        method: 'GET', 
        headers: {
          'x-api-key': HARDCODED_API_KEY
        }
      };

      // Check persona first (preferred)
      try {
        console.log('Checking persona:', YOUR_PERSONA_ID);
        const personaResponse = await fetch(`https://tavusapi.com/v2/personas/${YOUR_PERSONA_ID}`, options);
        
        if (personaResponse.ok) {
          const personaData = await personaResponse.json();
          console.log('✅ Persona accessible:', personaData);
          personaAccessible = true;
        } else {
          console.log('❌ Persona not accessible:', personaResponse.status);
        }
      } catch (error) {
        console.log('Error checking persona:', error);
      }

      // Check replica as fallback
      try {
        console.log('Checking replica:', YOUR_REPLICA_ID);
        const replicaResponse = await fetch(`https://tavusapi.com/v2/replicas/${YOUR_REPLICA_ID}`, options);
        
        if (replicaResponse.ok) {
          const replicaData = await replicaResponse.json();
          console.log('✅ Replica accessible:', replicaData);
          replicaAccessible = true;
        } else {
          console.log('❌ Replica not accessible:', replicaResponse.status);
        }
      } catch (error) {
        console.log('Error checking replica:', error);
      }

      // Determine preferred asset
      let preferredAsset: 'persona' | 'replica' | null = null;
      if (personaAccessible) {
        preferredAsset = 'persona';
      } else if (replicaAccessible) {
        preferredAsset = 'replica';
      }

      setAvailableAssets({
        personaAccessible,
        replicaAccessible,
        preferredAsset
      });

      if (preferredAsset) {
        setAssetsValidated(true);
        console.log(`✅ Assets validated. Will use ${preferredAsset}: ${preferredAsset === 'persona' ? YOUR_PERSONA_ID : YOUR_REPLICA_ID}`);
      } else {
        throw new Error(`Neither persona ${YOUR_PERSONA_ID} nor replica ${YOUR_REPLICA_ID} found with the hardcoded API key.`);
      }
      
    } catch (error) {
      console.error('Error validating assets:', error);
      setError(error.message || 'Failed to validate your Tavus assets');
      setConnectionStatus('error');
    }
  };

  const initializeTavusSession = async () => {
    if (!assetsValidated || !user || !availableAssets.preferredAsset) {
      setError('Assets not validated or user not authenticated');
      return;
    }

    setIsInitializing(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      console.log('Creating Tavus session with hardcoded API key...');
      
      // Create session directly using hardcoded API key
      const session = await createTavusSessionDirect();
      setTavusSession(session);
      
      // Load the session based on asset type
      if (session.assetType === 'persona' && session.embedUrl) {
        await loadCVISession(session);
      } else if (session.assetType === 'replica' && session.conversationUrl) {
        await loadConversationSession(session);
      }
      
      setConnectionStatus('connected');
      console.log('Tavus session initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Tavus session:', error);
      setError(error.message || 'Failed to initialize video companion');
      setConnectionStatus('error');
    } finally {
      setIsInitializing(false);
    }
  };

  const createTavusSessionDirect = async (): Promise<TavusSession> => {
    if (!user || !availableAssets.preferredAsset) {
      throw new Error('User not authenticated or no preferred asset');
    }

    console.log('Creating Tavus session directly with hardcoded API key...');
    
    const sessionId = crypto.randomUUID();
    const assetType = availableAssets.preferredAsset;
    const assetId = assetType === 'persona' ? YOUR_PERSONA_ID : YOUR_REPLICA_ID;

    try {
      if (assetType === 'persona') {
        // Create CVI session for persona
        const response = await fetch('https://tavusapi.com/v2/cvi/sessions', {
          method: 'POST',
          headers: {
            'x-api-key': HARDCODED_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            persona_id: YOUR_PERSONA_ID,
            properties: {
              max_session_duration: 3600,
              participant_left_timeout: 300,
              participant_absent_timeout: 60,
              enable_recording: false,
              enable_transcription: true,
              language: 'en'
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`CVI API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log('✅ CVI session created:', data);
        
        return {
          sessionId: data.session_id,
          sessionToken: data.session_token,
          assetId,
          assetType,
          mode: 'video',
          sessionType: 'safewalk',
          status: data.status || 'active',
          embedUrl: `https://tavus.io/embed/${data.session_id}`
        };
        
      } else {
        // Create conversation for replica
        const response = await fetch('https://tavusapi.com/v2/conversations', {
          method: 'POST',
          headers: {
            'x-api-key': HARDCODED_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            replica_id: YOUR_REPLICA_ID,
            conversation_name: `SafeMate Session ${new Date().toISOString()}`,
            properties: {
              max_call_duration: 3600,
              participant_left_timeout: 300,
              participant_absent_timeout: 60,
              enable_recording: false,
              enable_transcription: true,
              language: 'en'
            },
            conversation_context: "You are SafeMate, an AI safety companion providing support and monitoring.",
            custom_greeting: "Hi! I'm your SafeMate AI companion. How are you feeling?"
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Conversation API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log('✅ Conversation created:', data);
        
        return {
          sessionId: data.conversation_id,
          assetId,
          assetType,
          mode: 'video',
          sessionType: 'safewalk',
          status: data.status || 'active',
          conversationUrl: data.conversation_url
        };
      }
    } catch (error) {
      console.error('Error creating Tavus session:', error);
      throw error;
    }
  };

  const loadCVISession = async (session: TavusSession) => {
    try {
      console.log('Loading CVI session in iframe...');
      
      if (iframeRef.current && session.embedUrl) {
        // Set the iframe source to the Tavus CVI embed URL
        iframeRef.current.src = `${session.embedUrl}?token=${session.sessionToken}`;
        
        // Listen for iframe load events
        iframeRef.current.onload = () => {
          console.log('CVI iframe loaded successfully');
          setConnectionStatus('connected');
        };
        
        iframeRef.current.onerror = () => {
          console.error('Error loading CVI iframe');
          setConnectionStatus('error');
          setError('Failed to load video companion interface');
        };
      }
      
    } catch (error) {
      console.error('Error loading CVI session:', error);
      throw new Error(`CVI loading failed: ${error.message}`);
    }
  };

  const loadConversationSession = async (session: TavusSession) => {
    try {
      console.log('Loading conversation session...');
      
      if (iframeRef.current && session.conversationUrl) {
        // Set the iframe source to the Tavus conversation URL
        iframeRef.current.src = session.conversationUrl;
        
        // Listen for iframe load events
        iframeRef.current.onload = () => {
          console.log('Conversation iframe loaded successfully');
          setConnectionStatus('connected');
        };
        
        iframeRef.current.onerror = () => {
          console.error('Error loading conversation iframe');
          setConnectionStatus('error');
          setError('Failed to load conversation interface');
        };
      }
      
    } catch (error) {
      console.error('Error loading conversation session:', error);
      throw new Error(`Conversation loading failed: ${error.message}`);
    }
  };

  const cleanup = () => {
    console.log('Cleaning up Tavus integration...');
    
    if (iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
    
    setConnectionStatus('disconnected');
    setTavusSession(null);
    setError(null);
    setAssetsValidated(false);
    setAvailableAssets({
      personaAccessible: false,
      replicaAccessible: false,
      preferredAsset: null
    });
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    console.log('Video toggled:', !isVideoEnabled);
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    console.log('Audio toggled:', !isAudioEnabled);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log('Mute toggled:', !isMuted);
  };

  if (!isActive) {
    return null;
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <span className="text-white font-semibold">Tavus Integration Error</span>
        </div>
        <p className="text-red-300 text-sm mb-4">{error}</p>
        <div className="flex space-x-3">
          <button
            onClick={validateAssetsAndInitialize}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
          <a
            href="https://tavus.io/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Check Assets</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ 
              scale: connectionStatus === 'connected' ? [1, 1.1, 1] : 1,
            }}
            transition={{ duration: 0.5, repeat: connectionStatus === 'connected' ? Infinity : 0 }}
            className="p-2 rounded-full bg-gradient-to-r from-green-500 to-blue-500"
          >
            <Video className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h3 className="text-white font-semibold">Tavus AI Video Companion</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                connectionStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              <span className="text-gray-300">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 connectionStatus === 'error' ? 'Error' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-xs text-blue-300 flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>Hardcoded API</span>
          </div>
          {availableAssets.preferredAsset && (
            <div className="text-xs text-green-300 flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Using: {availableAssets.preferredAsset}</span>
            </div>
          )}
        </div>
      </div>

      {/* Asset Status */}
      <div className="mb-6 p-4 bg-black/20 rounded-lg">
        <h4 className="text-white font-medium mb-2 flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span>Your Tavus Assets (Hardcoded API)</span>
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Persona: {YOUR_PERSONA_ID}</p>
              <p className="text-gray-300 text-sm">
                Status: {availableAssets.personaAccessible ? (
                  <span className="text-green-300">✅ Available (CVI)</span>
                ) : (
                  <span className="text-red-300">❌ Not accessible</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Replica: {YOUR_REPLICA_ID}</p>
              <p className="text-gray-300 text-sm">
                Status: {availableAssets.replicaAccessible ? (
                  <span className="text-green-300">✅ Available (Conversation)</span>
                ) : (
                  <span className="text-red-300">❌ Not accessible</span>
                )}
              </p>
            </div>
          </div>
          {availableAssets.preferredAsset && (
            <div className="mt-2 p-2 bg-green-500/20 rounded border border-green-500/30">
              <p className="text-green-200 text-sm font-medium">
                🎯 Will use {availableAssets.preferredAsset}: {availableAssets.preferredAsset === 'persona' ? YOUR_PERSONA_ID : YOUR_REPLICA_ID}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Connection Controls */}
      {assetsValidated && !tavusSession && (
        <div className="mb-6">
          <button
            onClick={initializeTavusSession}
            disabled={isInitializing}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
          >
            {isInitializing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Starting Video Companion...</span>
              </>
            ) : (
              <>
                <Video className="h-5 w-5" />
                <span>Start Video Companion</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Session Display */}
      {connectionStatus === 'connected' && tavusSession && (
        <div className="mb-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {/* Tavus Session Iframe */}
            <iframe
              ref={iframeRef}
              className="w-full h-full"
              allow="camera; microphone; autoplay; encrypted-media; fullscreen"
              allowFullScreen
              title="Tavus AI Companion"
            />
            
            {/* Connection Status Overlay */}
            <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/50 px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
              }`} />
              <span className="text-white text-sm">
                {connectionStatus === 'connected' ? 'Live with SafeMate AI' : 'Connecting...'}
              </span>
            </div>

            {/* Asset Info */}
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
              <span className="text-white text-xs font-medium">
                {tavusSession.assetType === 'persona' ? 'Persona' : 'Replica'}: {tavusSession.assetId}
              </span>
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
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-colors ${
                isAudioEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              }`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
            </button>
            
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                !isMuted ? 'bg-purple-500 hover:bg-purple-600' : 'bg-red-500 hover:bg-red-600'
              }`}
              title={!isMuted ? 'Mute audio' : 'Unmute audio'}
            >
              {!isMuted ? <Volume2 className="h-5 w-5 text-white" /> : <VolumeX className="h-5 w-5 text-white" />}
            </button>
            
            <button
              onClick={cleanup}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
              title="End video call"
            >
              <PhoneOff className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Session Info */}
      {tavusSession && (
        <div className="p-4 bg-black/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Active Session</h4>
              <p className="text-gray-300 text-sm">ID: {tavusSession.sessionId}</p>
              <p className="text-gray-300 text-sm">Asset: {tavusSession.assetType} ({tavusSession.assetId})</p>
              <p className="text-gray-300 text-sm">Status: {tavusSession.status}</p>
            </div>
            {(tavusSession.embedUrl || tavusSession.conversationUrl) && (
              <a
                href={tavusSession.embedUrl || tavusSession.conversationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded bg-green-500/30 hover:bg-green-500/50 transition-colors"
                title="Open session in new tab"
              >
                <ExternalLink className="h-4 w-4 text-green-300" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Technology Credits */}
      <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
        <p>🔑 <strong>Hardcoded API Key</strong>: d8a82253fd3d474996106d87f1c7e6d3</p>
        <p>🤖 <strong>Smart Fallback</strong>: Persona preferred, Replica as backup</p>
        <p>🎥 <strong>Tavus CVI/Conversations</strong> • Direct API integration</p>
        <p>✅ <strong>Automatic asset detection</strong> for reliable connections</p>
      </div>
    </div>
  );
}