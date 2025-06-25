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
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TavusLiveKitIntegrationProps {
  isActive: boolean;
  onEmergencyDetected: () => void;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

interface ApiKeys {
  tavus_api_key: string;
}

interface TavusCVISession {
  sessionId: string;
  sessionToken: string;
  personaId: string;
  mode: 'audio' | 'video';
  sessionType: string;
  status: string;
  embedUrl?: string;
}

// Your specific persona ID
const YOUR_PERSONA_ID = 'p5d11710002a';

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
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [tavusCVISession, setTavusCVISession] = useState<TavusCVISession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [personaValidated, setPersonaValidated] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isActive) {
      loadApiKeysAndInitialize();
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

  const loadApiKeysAndInitialize = async () => {
    if (!user) return;

    setLoadingKeys(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('tavus_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading API keys:', error);
        setError('Failed to load API keys from database');
        setConnectionStatus('error');
        return;
      }

      if (!data) {
        setError('No API keys configured. Please set up your API keys first.');
        setConnectionStatus('error');
        return;
      }

      // Validate required keys
      if (!data.tavus_api_key) {
        setError('Missing required Tavus API key. Please configure your Tavus API key.');
        setConnectionStatus('error');
        return;
      }

      setApiKeys({
        tavus_api_key: data.tavus_api_key
      });

      console.log('API keys loaded successfully');
      
      // Validate your specific persona
      await validatePersona(data.tavus_api_key);
      
    } catch (error) {
      console.error('Error in loadApiKeysAndInitialize:', error);
      setError('Failed to initialize Tavus CVI integration');
      setConnectionStatus('error');
    } finally {
      setLoadingKeys(false);
    }
  };

  const validatePersona = async (tavusApiKey: string) => {
    try {
      console.log('Validating your persona:', YOUR_PERSONA_ID);
      
      const response = await fetch(`https://tavusapi.com/v2/personas/${YOUR_PERSONA_ID}`, {
        method: 'GET',
        headers: {
          'x-api-key': tavusApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to validate persona:', response.status, errorData);
        
        if (response.status === 401) {
          throw new Error('Invalid Tavus API key. Please check your API key in Settings.');
        } else if (response.status === 403) {
          throw new Error('Tavus API key does not have permission to access this persona.');
        } else if (response.status === 404) {
          throw new Error(`Persona ${YOUR_PERSONA_ID} not found. Please verify the persona exists in your Tavus account.`);
        } else {
          throw new Error(`Failed to validate persona: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
      }

      const personaData = await response.json();
      console.log('Persona validated successfully:', personaData);
      
      // Personas are always ready to use, no status check needed
      setPersonaValidated(true);
      console.log('Your persona is ready for conversations');
      
    } catch (error) {
      console.error('Error validating persona:', error);
      setError(error.message || 'Failed to validate your Tavus persona');
      setConnectionStatus('error');
    }
  };

  const initializeTavusCVI = async () => {
    if (!apiKeys || !personaValidated || !user) {
      setError('Missing API keys, persona not validated, or user not authenticated');
      return;
    }

    setIsInitializing(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      console.log('Initializing Tavus CVI integration with your persona...');
      
      // Call the backend edge function to create CVI session
      const session = await createTavusCVISession();
      setTavusCVISession(session);
      
      // Load the CVI session in iframe
      await loadCVISession(session);
      
      setConnectionStatus('connected');
      console.log('Tavus CVI integration initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Tavus CVI:', error);
      setError(error.message || 'Failed to initialize video companion');
      setConnectionStatus('error');
    } finally {
      setIsInitializing(false);
    }
  };

  const createTavusCVISession = async (): Promise<TavusCVISession> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('Creating Tavus CVI session via backend...');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tavus-livekit-agent`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        sessionType: 'safewalk',
        mode: 'video',
        emergencyContacts: []
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend CVI session creation failed:', response.status, errorData);
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (response.status === 400) {
        throw new Error(errorData.details || errorData.error || 'Invalid request to backend');
      } else if (response.status === 500) {
        throw new Error(errorData.details || errorData.error || 'Backend server error');
      } else {
        throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
    }

    const sessionData = await response.json();
    console.log('Tavus CVI session created successfully via backend:', sessionData);
    
    return sessionData;
  };

  const loadCVISession = async (session: TavusCVISession) => {
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

  const cleanup = () => {
    console.log('Cleaning up Tavus CVI integration...');
    
    if (iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
    
    setConnectionStatus('disconnected');
    setTavusCVISession(null);
    setError(null);
    setPersonaValidated(false);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    console.log('Video toggled:', !isVideoEnabled);
    // Note: Video control would need to be implemented via postMessage to iframe
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    console.log('Audio toggled:', !isAudioEnabled);
    // Note: Audio control would need to be implemented via postMessage to iframe
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log('Mute toggled:', !isMuted);
    // Note: Mute control would need to be implemented via postMessage to iframe
  };

  if (!isActive) {
    return null;
  }

  if (loadingKeys) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-center space-x-3">
          <Loader className="h-6 w-6 animate-spin text-blue-400" />
          <span className="text-white">Loading Tavus CVI integration...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <span className="text-white font-semibold">Tavus CVI Error</span>
        </div>
        <p className="text-red-300 text-sm mb-4">{error}</p>
        <div className="flex space-x-3">
          <button
            onClick={loadApiKeysAndInitialize}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
          {error.includes('persona') && (
            <a
              href="https://tavus.io/dashboard/personas"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Check Persona</span>
            </a>
          )}
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
          <div className="text-xs text-green-300 flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>Persona: {YOUR_PERSONA_ID}</span>
          </div>
          {personaValidated && (
            <div className="text-xs text-green-300 flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Persona Status */}
      <div className="mb-6 p-4 bg-black/20 rounded-lg">
        <h4 className="text-white font-medium mb-2 flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span>Your Tavus Persona</span>
        </h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-sm">Persona ID: {YOUR_PERSONA_ID}</p>
            <p className="text-gray-300 text-sm">
              Status: {personaValidated ? (
                <span className="text-green-300">✅ Ready for conversations</span>
              ) : (
                <span className="text-yellow-300">⏳ Validating...</span>
              )}
            </p>
          </div>
          <a
            href="https://tavus.io/dashboard/personas"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded bg-green-500/30 hover:bg-green-500/50 transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-green-300" />
          </a>
        </div>
      </div>

      {/* Connection Controls */}
      {personaValidated && !tavusCVISession && (
        <div className="mb-6">
          <button
            onClick={initializeTavusCVI}
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

      {/* CVI Iframe Display */}
      {connectionStatus === 'connected' && tavusCVISession && (
        <div className="mb-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {/* Tavus CVI Iframe */}
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

            {/* Persona Info */}
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
              <span className="text-white text-xs font-medium">
                Your Persona: {YOUR_PERSONA_ID}
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
      {tavusCVISession && (
        <div className="p-4 bg-black/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Active CVI Session</h4>
              <p className="text-gray-300 text-sm">ID: {tavusCVISession.sessionId}</p>
              <p className="text-gray-300 text-sm">Status: {tavusCVISession.status}</p>
              <p className="text-gray-300 text-sm">Using Persona: {YOUR_PERSONA_ID}</p>
            </div>
            {tavusCVISession.embedUrl && (
              <a
                href={tavusCVISession.embedUrl}
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
        <p>🤖 <strong>Your Tavus Persona ({YOUR_PERSONA_ID})</strong> with CVI real-time communication</p>
        <p>🎥 <strong>Tavus CVI</strong> for video • 🔊 <strong>ElevenLabs</strong> voice</p>
        <p>🎙️ <strong>Deepgram</strong> speech recognition • 🧠 <strong>Gemini 2.5 Flash</strong></p>
        <p>✅ <strong>Secure CVI session tokens</strong> for reliable connections</p>
      </div>
    </div>
  );
}