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

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isActive) {
      // Ready to initialize when user clicks the button
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

  const initializeTavusSession = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsInitializing(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      console.log('Creating Tavus session via Edge Function...');
      
      // Create session via Edge Function
      const session = await createTavusSessionViaEdgeFunction();
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

  const createTavusSessionViaEdgeFunction = async (): Promise<TavusSession> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('Creating Tavus session via Edge Function...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authentication session found');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tavus-livekit-agent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          sessionType: 'safewalk',
          mode: 'video'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Edge Function error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('✅ Tavus session created via Edge Function:', data);
      
      return {
        sessionId: data.sessionId || data.session_id || crypto.randomUUID(),
        sessionToken: data.sessionToken || data.session_token,
        roomToken: data.roomToken || data.room_token,
        roomName: data.roomName || data.room_name,
        wsUrl: data.wsUrl || data.ws_url,
        assetId: data.assetId || data.asset_id || 'unknown',
        assetType: data.assetType || data.asset_type || 'persona',
        mode: 'video',
        sessionType: 'safewalk',
        status: data.status || 'active',
        embedUrl: data.embedUrl || data.embed_url,
        conversationUrl: data.conversationUrl || data.conversation_url
      };
        
    } catch (error) {
      console.error('Error creating Tavus session via Edge Function:', error);
      throw error;
    }
  };

  const loadCVISession = async (session: TavusSession) => {
    try {
      console.log('Loading CVI session in iframe...');
      
      if (iframeRef.current && session.embedUrl) {
        // Set the iframe source to the Tavus CVI embed URL
        iframeRef.current.src = `${session.embedUrl}${session.sessionToken ? `?token=${session.sessionToken}` : ''}`;
        
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
            onClick={initializeTavusSession}
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
            <span>Edge Function</span>
          </div>
          {tavusSession && (
            <div className="text-xs text-green-300 flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Using: {tavusSession.assetType}</span>
            </div>
          )}
        </div>
      </div>

      {/* Asset Status */}
      {tavusSession && (
        <div className="mb-6 p-4 bg-black/20 rounded-lg">
          <h4 className="text-white font-medium mb-2 flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Active Tavus Asset</span>
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Asset ID: {tavusSession.assetId}</p>
                <p className="text-gray-300 text-sm">
                  Type: <span className="text-green-300">✅ {tavusSession.assetType}</span>
                </p>
                <p className="text-gray-300 text-sm">Status: {tavusSession.status}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Controls */}
      {!tavusSession && (
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
        <p>🔒 <strong>Secure Backend</strong>: API calls via Supabase Edge Function</p>
        <p>🤖 <strong>Smart Asset Selection</strong>: Automatic persona/replica detection</p>
        <p>🎥 <strong>Tavus CVI/Conversations</strong> • Server-side API integration</p>
        <p>✅ <strong>CORS-free</strong> reliable connections via backend proxy</p>
      </div>
    </div>
  );
}