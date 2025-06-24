import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LiveKit from 'livekit-client';
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
  livekit_api_key: string;
  livekit_api_secret: string;
  livekit_ws_url: string;
  tavus_api_key: string;
  elevenlabs_api_key?: string;
  deepgram_api_key?: string;
  gemini_api_key: string;
}

interface TavusSession {
  roomToken: string;
  roomName: string;
  avatarId: string;
  sessionId: string;
  wsUrl: string;
  mode: 'audio' | 'video';
  conversationId: string;
  conversationUrl: string;
  personaId: string;
  status: string;
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
  const [tavusSession, setTavusSession] = useState<TavusSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [personaValidated, setPersonaValidated] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<any>(null);

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
        .select('*')
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
      if (!data.livekit_api_key || !data.livekit_api_secret || !data.livekit_ws_url || !data.tavus_api_key) {
        setError('Missing required API keys. Please configure LiveKit and Tavus API keys.');
        setConnectionStatus('error');
        return;
      }

      setApiKeys({
        livekit_api_key: data.livekit_api_key,
        livekit_api_secret: data.livekit_api_secret,
        livekit_ws_url: data.livekit_ws_url,
        tavus_api_key: data.tavus_api_key,
        elevenlabs_api_key: data.elevenlabs_api_key,
        deepgram_api_key: data.deepgram_api_key,
        gemini_api_key: data.gemini_api_key
      });

      console.log('API keys loaded successfully');
      
      // Validate your specific persona
      await validatePersona(data.tavus_api_key);
      
    } catch (error) {
      console.error('Error in loadApiKeysAndInitialize:', error);
      setError('Failed to initialize Tavus LiveKit integration');
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

  const initializeTavusLiveKit = async () => {
    if (!apiKeys || !personaValidated || !user) {
      setError('Missing API keys, persona not validated, or user not authenticated');
      return;
    }

    setIsInitializing(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      console.log('Initializing Tavus LiveKit integration with your persona...');
      
      // Call the backend edge function to create session and get proper tokens
      const session = await createTavusSession();
      setTavusSession(session);
      
      // Connect to LiveKit room using the proper token from backend
      await connectToLiveKitRoom(session);
      
      setConnectionStatus('connected');
      console.log('Tavus LiveKit integration initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Tavus LiveKit:', error);
      setError(error.message || 'Failed to initialize video companion');
      setConnectionStatus('error');
    } finally {
      setIsInitializing(false);
    }
  };

  const createTavusSession = async (): Promise<TavusSession> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('Creating Tavus session via backend...');
    
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
      console.error('Backend session creation failed:', response.status, errorData);
      
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
    console.log('Tavus session created successfully via backend:', sessionData);
    
    return sessionData;
  };

  const connectToLiveKitRoom = async (session: TavusSession) => {
    try {
      console.log('Connecting to LiveKit room with proper token from backend...');
      
      const room = new LiveKit.Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: LiveKit.VideoPresets.h720.resolution,
        },
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Set up event listeners
      room.on(LiveKit.RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, participant.identity);
        
        if (track.kind === LiveKit.Track.Kind.Video) {
          if (participant.identity.includes('tavus') || participant.identity.includes('persona') || participant.identity !== user?.id) {
            // This is the Tavus avatar video
            console.log('Attaching Tavus avatar video');
            if (avatarVideoRef.current) {
              track.attach(avatarVideoRef.current);
            }
          } else {
            // This is the user's video
            console.log('Attaching user video');
            if (videoRef.current) {
              track.attach(videoRef.current);
            }
          }
        }
        
        if (track.kind === LiveKit.Track.Kind.Audio) {
          console.log('Audio track subscribed from:', participant.identity);
          // Audio tracks are automatically played
        }
      });

      room.on(LiveKit.RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity);
        if (participant.identity.includes('tavus') || participant.identity.includes('persona')) {
          console.log('Tavus avatar joined the room!');
        }
      });

      room.on(LiveKit.RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant disconnected:', participant.identity);
      });

      room.on(LiveKit.RoomEvent.Disconnected, (reason) => {
        console.log('Disconnected from room:', reason);
        setConnectionStatus('disconnected');
      });

      room.on(LiveKit.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('Connection quality changed:', quality, participant?.identity);
      });

      room.on(LiveKit.RoomEvent.DataReceived, (payload, participant) => {
        console.log('Data received from:', participant?.identity);
        // Handle any data messages from the Tavus avatar
      });

      // Connect to the room using the proper token from backend
      console.log('Connecting to room with backend-generated token...');
      await room.connect(session.wsUrl, session.roomToken);
      
      console.log('Connected to LiveKit room, enabling camera and microphone...');
      
      // Enable camera and microphone
      await room.localParticipant.enableCameraAndMicrophone();
      
      roomRef.current = room;
      
      console.log('LiveKit room setup completed successfully');
      
    } catch (error) {
      console.error('Error connecting to LiveKit room:', error);
      throw new Error(`LiveKit connection failed: ${error.message}`);
    }
  };

  const cleanup = () => {
    console.log('Cleaning up Tavus LiveKit integration...');
    
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
        console.log('Disconnected from LiveKit room');
      } catch (error) {
        console.error('Error disconnecting from room:', error);
      }
      roomRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setTavusSession(null);
    setError(null);
    setPersonaValidated(false);
  };

  const toggleVideo = async () => {
    if (roomRef.current) {
      try {
        if (isVideoEnabled) {
          await roomRef.current.localParticipant.setCameraEnabled(false);
        } else {
          await roomRef.current.localParticipant.setCameraEnabled(true);
        }
        setIsVideoEnabled(!isVideoEnabled);
        console.log('Video toggled:', !isVideoEnabled);
      } catch (error) {
        console.error('Error toggling video:', error);
      }
    }
  };

  const toggleAudio = async () => {
    if (roomRef.current) {
      try {
        if (isAudioEnabled) {
          await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        } else {
          await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        }
        setIsAudioEnabled(!isAudioEnabled);
        console.log('Audio toggled:', !isAudioEnabled);
      } catch (error) {
        console.error('Error toggling audio:', error);
      }
    }
  };

  const toggleMute = async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(isMuted);
        setIsMuted(!isMuted);
        console.log('Mute toggled:', !isMuted);
      } catch (error) {
        console.error('Error toggling mute:', error);
      }
    }
  };

  if (!isActive) {
    return null;
  }

  if (loadingKeys) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-center space-x-3">
          <Loader className="h-6 w-6 animate-spin text-blue-400" />
          <span className="text-white">Loading Tavus LiveKit integration...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <span className="text-white font-semibold">Tavus LiveKit Error</span>
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
      {personaValidated && !tavusSession && (
        <div className="mb-6">
          <button
            onClick={initializeTavusLiveKit}
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

      {/* Video Display */}
      {connectionStatus === 'connected' && tavusSession && (
        <div className="mb-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {/* Tavus Avatar Video */}
            <video
              ref={avatarVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            
            {/* User Video (Picture-in-Picture) */}
            {isVideoEnabled && (
              <div className="absolute top-4 right-4 w-24 h-18 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
              </div>
            )}
            
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

      {/* Conversation Info */}
      {tavusSession && (
        <div className="p-4 bg-black/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Active Conversation</h4>
              <p className="text-gray-300 text-sm">ID: {tavusSession.conversationId}</p>
              <p className="text-gray-300 text-sm">Status: {tavusSession.status}</p>
              <p className="text-gray-300 text-sm">Using Persona: {YOUR_PERSONA_ID}</p>
            </div>
            <a
              href={tavusSession.conversationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded bg-green-500/30 hover:bg-green-500/50 transition-colors"
              title="Open conversation in Tavus dashboard"
            >
              <ExternalLink className="h-4 w-4 text-green-300" />
            </a>
          </div>
        </div>
      )}

      {/* Technology Credits */}
      <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
        <p>🤖 <strong>Your Tavus Persona ({YOUR_PERSONA_ID})</strong> with LiveKit real-time communication</p>
        <p>🎥 <strong>LiveKit</strong> for video • 🔊 <strong>ElevenLabs</strong> voice</p>
        <p>🎙️ <strong>Deepgram</strong> speech recognition • 🧠 <strong>Gemini 2.5 Flash</strong></p>
        <p>✅ <strong>Secure backend token generation</strong> for reliable connections</p>
      </div>
    </div>
  );
}