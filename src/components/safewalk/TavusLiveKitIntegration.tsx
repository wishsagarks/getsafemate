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
  RefreshCw
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

interface TavusReplica {
  replica_id: string;
  replica_name: string;
  status: string;
  created_at: string;
}

interface TavusConversation {
  conversation_id: string;
  conversation_url: string;
  status: string;
  replica_id: string;
}

interface LiveKitRoom {
  room: any;
  token: string;
  url: string;
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
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [availableReplicas, setAvailableReplicas] = useState<TavusReplica[]>([]);
  const [selectedReplica, setSelectedReplica] = useState<TavusReplica | null>(null);
  const [tavusConversation, setTavusConversation] = useState<TavusConversation | null>(null);
  const [livekitRoom, setLivekitRoom] = useState<LiveKitRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

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
      
      // Load available replicas
      await loadAvailableReplicas(data.tavus_api_key);
      
    } catch (error) {
      console.error('Error in loadApiKeysAndInitialize:', error);
      setError('Failed to initialize Tavus LiveKit integration');
      setConnectionStatus('error');
    } finally {
      setLoadingKeys(false);
    }
  };

  const loadAvailableReplicas = async (tavusApiKey: string) => {
    try {
      console.log('Loading available Tavus replicas...');
      
      const response = await fetch('https://tavusapi.com/v2/replicas', {
        method: 'GET',
        headers: {
          'x-api-key': tavusApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load replicas:', response.status, errorData);
        
        if (response.status === 401) {
          throw new Error('Invalid Tavus API key. Please check your API key in Settings.');
        } else if (response.status === 403) {
          throw new Error('Tavus API key does not have permission to access replicas.');
        } else {
          throw new Error(`Failed to load replicas: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
      }

      const data = await response.json();
      console.log('Replicas response:', data);

      if (data.data && Array.isArray(data.data)) {
        const replicas = data.data.map((replica: any) => ({
          replica_id: replica.replica_id,
          replica_name: replica.replica_name || replica.name || 'Unnamed Replica',
          status: replica.status,
          created_at: replica.created_at
        }));
        
        setAvailableReplicas(replicas);
        console.log(`Loaded ${replicas.length} available replicas`);
        
        // Auto-select the first available replica
        if (replicas.length > 0) {
          const firstReplica = replicas[0];
          setSelectedReplica(firstReplica);
          console.log('Auto-selected replica:', firstReplica.replica_id);
        } else {
          setError('No replicas available. Please create a replica at https://tavus.io/dashboard/replicas');
          setConnectionStatus('error');
        }
      } else {
        setError('No replicas found in your Tavus account. Please create a replica first.');
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error loading replicas:', error);
      setError(error.message || 'Failed to load Tavus replicas');
      setConnectionStatus('error');
    }
  };

  const initializeTavusLiveKit = async () => {
    if (!apiKeys || !selectedReplica) {
      setError('Missing API keys or replica selection');
      return;
    }

    setIsInitializing(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      console.log('Initializing Tavus LiveKit integration...');
      
      // Step 1: Create Tavus conversation
      const conversation = await createTavusConversation();
      setTavusConversation(conversation);
      
      // Step 2: Load LiveKit SDK
      await loadLiveKitSDK();
      
      // Step 3: Generate LiveKit token and connect
      const roomToken = await generateLiveKitToken();
      await connectToLiveKitRoom(roomToken);
      
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

  const createTavusConversation = async (): Promise<TavusConversation> => {
    if (!apiKeys || !selectedReplica) {
      throw new Error('Missing API keys or replica selection');
    }

    console.log('Creating Tavus conversation with replica:', selectedReplica.replica_id);
    
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'x-api-key': apiKeys.tavus_api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        replica_id: selectedReplica.replica_id,
        conversation_name: `SafeMate Session ${Date.now()}`,
        conversational_context: "You are SafeMate, an AI safety companion. You're currently in a video call with a user who needs safety monitoring and emotional support. Be caring, protective, and supportive. Watch for any signs of distress or danger.",
        custom_greeting: "Hi! I'm your SafeMate AI companion. I can see you and I'm here to keep you safe. How are you feeling right now?",
        properties: {
          max_call_duration: 3600,
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
      console.error('Tavus conversation creation failed:', response.status, errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid Tavus API key. Please check your API key in Settings.');
      } else if (response.status === 403) {
        throw new Error('Tavus API key does not have permission to create conversations.');
      } else if (response.status === 404) {
        throw new Error('Replica not found. Please verify the replica exists in your Tavus account.');
      } else if (response.status === 422) {
        throw new Error(`Invalid request: ${errorData.message || 'Please check your replica configuration'}`);
      } else {
        throw new Error(`Tavus API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }
    }

    const data = await response.json();
    console.log('Tavus conversation created:', data);
    
    return {
      conversation_id: data.conversation_id,
      conversation_url: data.conversation_url,
      status: data.status,
      replica_id: selectedReplica.replica_id
    };
  };

  const loadLiveKitSDK = async () => {
    if (window.LiveKit) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/livekit-client/dist/livekit-client.umd.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const generateLiveKitToken = async (): Promise<string> => {
    if (!apiKeys || !user) {
      throw new Error('Missing API keys or user information');
    }

    // In production, this should be done server-side for security
    // For now, we'll create a mock token structure
    const roomName = `safemate-${user.id}-${Date.now()}`;
    
    console.log('Generating LiveKit token for room:', roomName);
    
    // This would use the LiveKit server SDK in production:
    // const token = new AccessToken(apiKeys.livekit_api_key, apiKeys.livekit_api_secret, {
    //   identity: user.id,
    //   ttl: '1h'
    // });
    // token.addGrant({ roomJoin: true, room: roomName });
    // return token.toJwt();
    
    // For now, return a placeholder token
    return `lk_token_${roomName}_${user.id}_${Date.now()}`;
  };

  const connectToLiveKitRoom = async (token: string) => {
    if (!apiKeys || !window.LiveKit) {
      throw new Error('LiveKit SDK not loaded or missing API keys');
    }

    try {
      console.log('Connecting to LiveKit room...');
      
      const room = new window.LiveKit.Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: window.LiveKit.VideoPresets.h720.resolution,
        },
      });

      // Set up event listeners
      room.on(window.LiveKit.RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, participant.identity);
        
        if (track.kind === window.LiveKit.Track.Kind.Video) {
          if (participant.identity.includes('tavus') || participant.identity.includes('replica')) {
            // This is the Tavus avatar video
            if (avatarVideoRef.current) {
              track.attach(avatarVideoRef.current);
            }
          } else {
            // This is the user's video
            if (videoRef.current) {
              track.attach(videoRef.current);
            }
          }
        }
      });

      room.on(window.LiveKit.RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity);
        if (participant.identity.includes('tavus') || participant.identity.includes('replica')) {
          console.log('Tavus avatar joined the room');
        }
      });

      room.on(window.LiveKit.RoomEvent.Disconnected, (reason) => {
        console.log('Disconnected from room:', reason);
        setConnectionStatus('disconnected');
      });

      room.on(window.LiveKit.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('Connection quality changed:', quality, participant?.identity);
      });

      // Connect to the room
      await room.connect(apiKeys.livekit_ws_url, token);
      
      // Enable camera and microphone
      await room.localParticipant.enableCameraAndMicrophone();
      
      roomRef.current = room;
      
      setLivekitRoom({
        room,
        token,
        url: apiKeys.livekit_ws_url
      });
      
      console.log('Connected to LiveKit room successfully');
      
    } catch (error) {
      console.error('Error connecting to LiveKit room:', error);
      throw error;
    }
  };

  const cleanup = () => {
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch (error) {
        console.error('Error disconnecting from room:', error);
      }
      roomRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setTavusConversation(null);
    setLivekitRoom(null);
    setError(null);
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
          {error.includes('replica') && (
            <a
              href="https://tavus.io/dashboard/replicas"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Create Replica</span>
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
            className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Video className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h3 className="text-white font-semibold">Tavus LiveKit Video Companion</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                connectionStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              <span className="text-gray-300">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 connectionStatus === 'error' ? 'Error' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedReplica && (
            <div className="text-xs text-green-300 flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Replica: {selectedReplica.replica_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Replica Selection */}
      {availableReplicas.length > 0 && !tavusConversation && (
        <div className="mb-6 p-4 bg-black/20 rounded-lg">
          <h4 className="text-white font-medium mb-3">Select Tavus Replica:</h4>
          <div className="grid grid-cols-1 gap-2">
            {availableReplicas.map((replica) => (
              <button
                key={replica.replica_id}
                onClick={() => setSelectedReplica(replica)}
                className={`p-3 rounded-lg text-left transition-all ${
                  selectedReplica?.replica_id === replica.replica_id
                    ? 'bg-purple-500/30 border border-purple-400'
                    : 'bg-gray-500/20 hover:bg-gray-500/30 border border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{replica.replica_name}</p>
                    <p className="text-gray-300 text-xs">ID: {replica.replica_id}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    replica.status === 'ready' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {replica.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connection Controls */}
      {selectedReplica && !tavusConversation && (
        <div className="mb-6">
          <button
            onClick={initializeTavusLiveKit}
            disabled={isInitializing}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
          >
            {isInitializing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Initializing Video Companion...</span>
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
      {connectionStatus === 'connected' && tavusConversation && (
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
            
            {/* Connection Status Overlay */}
            <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/50 px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
              }`} />
              <span className="text-white text-sm">
                {connectionStatus === 'connected' ? 'Live' : 'Connecting...'}
              </span>
            </div>

            {/* Replica Info */}
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
              <span className="text-white text-xs font-medium">
                {selectedReplica?.replica_name}
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
            >
              {isVideoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
            </button>
            
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-colors ${
                isAudioEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
            </button>
            
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                !isMuted ? 'bg-purple-500 hover:bg-purple-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {!isMuted ? <Volume2 className="h-5 w-5 text-white" /> : <VolumeX className="h-5 w-5 text-white" />}
            </button>
            
            <button
              onClick={cleanup}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Conversation Info */}
      {tavusConversation && (
        <div className="p-4 bg-black/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Active Conversation</h4>
              <p className="text-gray-300 text-sm">ID: {tavusConversation.conversation_id}</p>
              <p className="text-gray-300 text-sm">Status: {tavusConversation.status}</p>
            </div>
            <a
              href={tavusConversation.conversation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded bg-purple-500/30 hover:bg-purple-500/50 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-purple-300" />
            </a>
          </div>
        </div>
      )}

      {/* Technology Credits */}
      <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
        <p>🤖 <strong>Tavus AI Avatar</strong> with LiveKit real-time communication</p>
        <p>🎥 <strong>LiveKit</strong> for video • 🔊 <strong>ElevenLabs</strong> voice</p>
        <p>🎙️ <strong>Deepgram</strong> speech recognition • 🧠 <strong>Gemini 2.5 Flash</strong></p>
      </div>
    </div>
  );
}

// Extend Window interface for LiveKit
declare global {
  interface Window {
    LiveKit: any;
  }
}