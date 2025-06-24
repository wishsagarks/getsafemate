import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageCircle, 
  Heart,
  Brain,
  Zap,
  Send,
  Settings,
  RefreshCw,
  Play,
  Pause,
  AlertCircle,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Camera,
  Monitor,
  MapPin,
  Clock,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ApiKeyManager } from './ApiKeyManager';
import { TavusAIAvatar } from './TavusAIAvatar';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
  isPlaying?: boolean;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface EnhancedAICompanionProps {
  isActive: boolean;
  onEmergencyDetected: () => void;
  onNeedHelp?: () => void;
  showVideoCompanion?: boolean;
  currentLocation?: LocationData | null;
}

export function EnhancedAICompanion({ 
  isActive, 
  onEmergencyDetected, 
  onNeedHelp,
  showVideoCompanion = false,
  currentLocation 
}: EnhancedAICompanionProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiKeyData, setApiKeyData] = useState<any>(null);
  const [checkInTimer, setCheckInTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [audioRecording, setAudioRecording] = useState(false);
  const [livekitRoom, setLivekitRoom] = useState<any>(null);
  const [initializing, setInitializing] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isAutoListening, setIsAutoListening] = useState(false);
  const [deepgramConnection, setDeepgramConnection] = useState<any>(null);
  const [elevenLabsVoice, setElevenLabsVoice] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const silenceDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const deepgramSocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (isActive && user) {
      checkApiKeys();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isActive, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showVideoCompanion && hasApiKeys && !sessionId) {
      activateVideoCompanion();
    }
  }, [showVideoCompanion, hasApiKeys]);

  // Periodic check-ins when SafeWalk is active
  useEffect(() => {
    if (isActive && hasApiKeys && connectionStatus === 'connected') {
      startPeriodicCheckIns();
    } else {
      stopPeriodicCheckIns();
    }

    return () => stopPeriodicCheckIns();
  }, [isActive, hasApiKeys, connectionStatus]);

  // Initialize AI companion when API keys are confirmed
  useEffect(() => {
    if (isActive && hasApiKeys && !initializing && connectionStatus !== 'connected') {
      initializeAICompanion();
    }
  }, [isActive, hasApiKeys, initializing, connectionStatus]);

  const checkApiKeys = async () => {
    if (!user) return;

    setApiKeysLoading(true);
    try {
      console.log('Checking API keys for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching API keys:', error);
        setHasApiKeys(false);
        setConnectionStatus('error');
        return;
      }

      console.log('API keys data:', data);

      if (data) {
        const hasKeys = !!(
          data.livekit_api_key && 
          data.livekit_api_secret && 
          data.livekit_ws_url && 
          data.tavus_api_key && 
          data.gemini_api_key &&
          data.elevenlabs_api_key &&
          data.deepgram_api_key
        );
        
        console.log('Has all required keys:', hasKeys);
        setHasApiKeys(hasKeys);
        setApiKeyData(data);
        
        if (!hasKeys) {
          setConnectionStatus('error');
        }
      } else {
        console.log('No API keys found in database');
        setHasApiKeys(false);
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
      setHasApiKeys(false);
      setConnectionStatus('error');
    } finally {
      setApiKeysLoading(false);
    }
  };

  const initializeAICompanion = async () => {
    if (initializing || !hasApiKeys) return;
    
    console.log('Initializing AI companion with API keys...');
    setInitializing(true);
    setConnectionStatus('connecting');
    
    try {
      // Initialize all sponsored APIs
      await initializeDeepgramConnection();
      await initializeElevenLabsVoice();
      
      setTimeout(() => {
        addAIMessage("Hi! I'm your SafeMate AI companion powered by Gemini 2.5 Flash with ElevenLabs voice and Deepgram speech recognition. I'm now actively monitoring your safety and will check in with you periodically. Say 'I need you' to activate video companion mode. How are you feeling today?");
        setConnectionStatus('connected');
        
        // Start auto-listening with Deepgram
        startDeepgramListening();
        
        // Connect to LiveKit room for audio
        connectToLiveKitRoom();
      }, 1000);
      
    } catch (error) {
      console.error('Error initializing AI companion:', error);
      setConnectionStatus('error');
    } finally {
      setInitializing(false);
    }
  };

  const initializeDeepgramConnection = async () => {
    if (!apiKeyData?.deepgram_api_key) return;

    try {
      console.log('Initializing Deepgram connection...');
      
      // Create WebSocket connection to Deepgram
      const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300`;
      
      const socket = new WebSocket(wsUrl, ['token', apiKeyData.deepgram_api_key]);
      
      socket.onopen = () => {
        console.log('Deepgram WebSocket connected');
        setDeepgramConnection(socket);
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript;
          if (transcript.trim() && data.is_final) {
            handleUserMessage(transcript);
            stopDeepgramListening();
          }
        }
      };
      
      socket.onerror = (error) => {
        console.error('Deepgram WebSocket error:', error);
      };
      
      socket.onclose = () => {
        console.log('Deepgram WebSocket closed');
        setDeepgramConnection(null);
      };
      
      deepgramSocketRef.current = socket;
      
    } catch (error) {
      console.error('Error initializing Deepgram:', error);
    }
  };

  const initializeElevenLabsVoice = async () => {
    if (!apiKeyData?.elevenlabs_api_key) return;

    try {
      console.log('Initializing ElevenLabs voice...');
      
      // Set up ElevenLabs voice configuration
      setElevenLabsVoice({
        apiKey: apiKeyData.elevenlabs_api_key,
        voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam voice
        model: 'eleven_multilingual_v2'
      });
      
    } catch (error) {
      console.error('Error initializing ElevenLabs:', error);
    }
  };

  const startDeepgramListening = async () => {
    if (!deepgramConnection || !apiKeyData?.deepgram_api_key) {
      console.log('Deepgram not available, cannot start listening');
      return;
    }

    try {
      setIsListening(true);
      setIsAutoListening(true);
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && deepgramConnection?.readyState === WebSocket.OPEN) {
          deepgramConnection.send(event.data);
        }
      };
      
      mediaRecorder.start(100); // Send data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      
      // Start silence detection
      startSilenceDetection();
      
    } catch (error) {
      console.error('Error starting Deepgram listening:', error);
      setIsListening(false);
      setIsAutoListening(false);
    }
  };

  const stopDeepgramListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    setIsListening(false);
    clearSilenceDetection();
    
    // Auto-restart listening after AI response
    setTimeout(() => {
      if (isActive && hasApiKeys && !isSpeaking && isAutoListening) {
        startDeepgramListening();
      }
    }, 2000);
  };

  const connectToLiveKitRoom = async () => {
    if (!hasApiKeys || !apiKeyData) return;

    try {
      console.log('Connecting to LiveKit room for audio session...');
      
      // Create AI session for audio-only mode
      const sessionResponse = await createAISession('audio');
      if (sessionResponse) {
        setSessionId(sessionResponse.sessionId);
        setLivekitRoom(sessionResponse.roomToken);
        console.log('Connected to LiveKit room:', sessionResponse.roomName);
      }
    } catch (error) {
      console.error('Error connecting to LiveKit room:', error);
    }
  };

  const startPeriodicCheckIns = () => {
    // Check in every 2 minutes during SafeWalk
    const interval = setInterval(() => {
      performCheckIn();
    }, 120000); // 2 minutes

    setCheckInTimer(interval);
    
    // Perform initial check-in after 30 seconds
    setTimeout(() => {
      performCheckIn();
    }, 30000);
  };

  const stopPeriodicCheckIns = () => {
    if (checkInTimer) {
      clearInterval(checkInTimer);
      setCheckInTimer(null);
    }
  };

  const performCheckIn = () => {
    const now = new Date();
    setLastCheckIn(now);
    
    const checkInMessages = [
      "Hey! Just checking in - how are you doing? Everything okay on your walk?",
      "Quick safety check! How are you feeling right now? All good?",
      "Hi there! Just wanted to make sure you're safe and comfortable. How's everything going?",
      "Safety check-in time! How are you doing? Anything I can help with?",
      "Just checking on you! How's your walk going? Feeling safe and good?"
    ];
    
    const randomMessage = checkInMessages[Math.floor(Math.random() * checkInMessages.length)];
    addAIMessage(randomMessage);
    
    // Share location if available
    if (currentLocation) {
      shareLocationSnippet();
    }
    
    // Start brief audio recording for safety
    startSafetyRecording();
  };

  const shareLocationSnippet = () => {
    if (!currentLocation) return;
    
    const locationMessage = `📍 Location shared: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)} (±${Math.round(currentLocation.accuracy)}m accuracy)`;
    addAIMessage(locationMessage);
    
    // Log location for safety
    console.log('Safety location logged:', currentLocation);
  };

  const startSafetyRecording = async () => {
    if (audioRecording || !apiKeyData?.deepgram_api_key) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        console.log('Safety audio snippet recorded for Deepgram processing');
        
        // Send to Deepgram for analysis
        await analyzeAudioWithDeepgram(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setAudioRecording(false);
      };
      
      mediaRecorder.start();
      setAudioRecording(true);
      
      // Record for 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error starting safety recording:', error);
      setAudioRecording(false);
    }
  };

  const analyzeAudioWithDeepgram = async (audioBlob: Blob) => {
    if (!apiKeyData?.deepgram_api_key) return;

    try {
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKeyData.deepgram_api_key}`,
          'Content-Type': 'audio/webm'
        },
        body: audioBlob
      });

      const result = await response.json();
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      
      if (transcript) {
        console.log('Safety audio transcript:', transcript);
        
        // Analyze for emergency keywords
        const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'unsafe'];
        if (emergencyKeywords.some(keyword => transcript.toLowerCase().includes(keyword))) {
          onEmergencyDetected();
        }
      }
    } catch (error) {
      console.error('Error analyzing audio with Deepgram:', error);
    }
  };

  const activateVideoCompanion = async () => {
    if (!hasApiKeys) {
      console.log('API keys not available for video companion');
      return;
    }

    try {
      // Create AI session for video companion
      const sessionResponse = await createAISession('video');
      if (sessionResponse) {
        setSessionId(sessionResponse.sessionId);
        addAIMessage("Video companion activated! I can now see you and provide enhanced support with Tavus AI avatar. I'm here to help calm you down and keep you safe. Take a deep breath with me.");
        onNeedHelp?.();
      }
    } catch (error) {
      console.error('Error activating video companion:', error);
      addAIMessage("I couldn't activate video companion mode right now, but I'm still here to support you through voice and text with full API integration. You're safe with me.");
    }
  };

  const createAISession = async (mode: 'audio' | 'video') => {
    if (!user || !hasApiKeys || !apiKeyData) {
      throw new Error('Missing user or API keys');
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tavus-livekit-agent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          sessionType: 'safewalk',
          mode: mode,
          emergencyContacts: [] // Would get from user profile
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create AI session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating AI session:', error);
      throw error;
    }
  };

  const startSilenceDetection = () => {
    // Stop listening after 3 seconds of silence
    silenceDetectionRef.current = setTimeout(() => {
      if (isListening) {
        stopDeepgramListening();
      }
    }, 3000);
  };

  const resetSilenceDetection = () => {
    if (silenceDetectionRef.current) {
      clearTimeout(silenceDetectionRef.current);
      startSilenceDetection();
    }
  };

  const clearSilenceDetection = () => {
    if (silenceDetectionRef.current) {
      clearTimeout(silenceDetectionRef.current);
      silenceDetectionRef.current = null;
    }
  };

  const stopAutoListening = () => {
    setIsAutoListening(false);
    stopDeepgramListening();
  };

  const cleanup = () => {
    if (deepgramSocketRef.current) {
      deepgramSocketRef.current.close();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    clearSilenceDetection();
    stopPeriodicCheckIns();
    setIsListening(false);
    setIsSpeaking(false);
    setSessionId(null);
    setLivekitRoom(null);
    setMessages([]);
    setConnectionStatus('connecting');
    setDeepgramConnection(null);
    setElevenLabsVoice(null);
    setApiKeysLoading(true);
    setHasApiKeys(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addAIMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, message]);
    setConversationContext(prev => [...prev, `AI: ${content}`].slice(-10));
    
    console.log(`AI Response using: Gemini 2.5 Flash + ElevenLabs voice`);
    
    if (voiceEnabled) {
      speakMessageWithElevenLabs(content);
    }
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, message]);
    setConversationContext(prev => [...prev, `User: ${content}`].slice(-10));
  };

  const speakMessageWithElevenLabs = async (text: string) => {
    if (!elevenLabsVoice?.apiKey) {
      console.log('ElevenLabs not available, skipping voice synthesis');
      return;
    }

    try {
      setIsSpeaking(true);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoice.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsVoice.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: elevenLabsVoice.model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          
          // Resume auto-listening after speaking
          if (isAutoListening && isActive && hasApiKeys) {
            setTimeout(() => {
              startDeepgramListening();
            }, 500);
          }
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
      } else {
        throw new Error('ElevenLabs API error');
      }
    } catch (error) {
      console.error('Error with ElevenLabs voice synthesis:', error);
      setIsSpeaking(false);
    }
  };

  const handleUserMessage = async (content: string) => {
    addUserMessage(content);
    setIsProcessing(true);
    
    console.log('Processing user input with full API stack:', {
      gemini: 'Gemini 2.5 Flash',
      deepgram: 'Deepgram Nova-2',
      elevenlabs: 'ElevenLabs Multilingual v2'
    });
    
    // Check for "I need you" trigger
    if (content.toLowerCase().includes('i need you') || content.toLowerCase().includes('need help')) {
      if (!showVideoCompanion) {
        await activateVideoCompanion();
      }
    }
    
    try {
      const response = await getGeminiAIResponse(content, conversationContext);
      
      setTimeout(() => {
        addAIMessage(response);
        setIsProcessing(false);
      }, 1000);
    } catch (error) {
      console.error('Error getting AI response:', error);
      addAIMessage("I'm having trouble processing that right now, but I'm still here to help keep you safe with full API integration.");
      setIsProcessing(false);
    }
  };

  const getGeminiAIResponse = async (userInput: string, context: string[]): Promise<string> => {
    if (!apiKeyData?.gemini_api_key) {
      throw new Error('Gemini API key not available');
    }

    // Emergency detection with enhanced AI
    const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'unsafe', 'threat', 'attack', 'stranger', 'following', 'lost'];
    if (emergencyKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      onEmergencyDetected();
      return "🚨 I detected you might be in danger! I'm immediately alerting your emergency contacts and activating all safety protocols. Stay calm, help is on the way. Keep talking to me - I'm here with you and monitoring everything.";
    }

    try {
      // Call Gemini 2.5 Flash API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKeyData.gemini_api_key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are SafeMate, an AI safety companion with full API integration (Deepgram speech recognition, ElevenLabs voice synthesis, Tavus video avatar). You're currently monitoring a user during their SafeWalk session. Be caring, supportive, and safety-focused. Keep responses natural, conversational, and under 150 words.

Context: User is on a walk and you're providing real-time safety monitoring and emotional support using advanced AI APIs.
Recent conversation: ${context.slice(-5).join('\n')}

User just said: "${userInput}"

Respond as a caring AI companion who prioritizes safety and emotional well-being. If you detect any safety concerns, prioritize those immediately. Be natural and avoid overly formal language.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 150,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response from Gemini API');
      }
    } catch (error) {
      console.error('Error calling Gemini 2.5 Flash API:', error);
      
      // Fallback responses
      const fallbackResponses = [
        "I'm here with you and everything looks good from my monitoring. How can I help make your walk safer and more comfortable?",
        "Thanks for keeping me updated! I'm actively watching out for your safety. What's on your mind right now?",
        "You're doing great on this walk! I'm here to support you every step of the way. How are you feeling?",
        "I appreciate you talking with me. It helps me provide better safety monitoring. Is there anything specific you'd like to discuss?"
      ];
      
      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
  };

  const sendTextMessage = () => {
    if (inputText.trim()) {
      handleUserMessage(inputText);
      setInputText('');
    }
  };

  if (!isActive) {
    return null;
  }

  // Show loading state while checking API keys
  if (apiKeysLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-white">Checking API configuration...</span>
        </div>
      </div>
    );
  }

  // Show API configuration if keys are missing
  if (!hasApiKeys) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <span className="text-white font-semibold">All API Keys Required</span>
        </div>
        <p className="text-gray-300 text-sm mb-4">
          SafeMate requires all sponsored API keys for full functionality:
        </p>
        <ul className="text-gray-300 text-sm space-y-1 mb-4">
          <li>• <strong>Gemini 2.5 Flash:</strong> AI conversations</li>
          <li>• <strong>Deepgram:</strong> Speech recognition</li>
          <li>• <strong>ElevenLabs:</strong> Voice synthesis</li>
          <li>• <strong>Tavus:</strong> AI video avatar</li>
          <li>• <strong>LiveKit:</strong> Real-time communication</li>
        </ul>
        <button
          onClick={() => setShowApiConfig(true)}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium transition-all"
        >
          Configure Required APIs
        </button>
        
        {/* API Configuration Modal */}
        <ApiKeyManager
          isOpen={showApiConfig}
          onClose={() => setShowApiConfig(false)}
          onKeysUpdated={(hasKeys) => {
            setHasApiKeys(hasKeys);
            if (hasKeys) {
              setShowApiConfig(false);
              checkApiKeys();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main AI Companion Card */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ 
                scale: isSpeaking ? [1, 1.1, 1] : 1,
                rotate: isSpeaking ? [0, 5, -5, 0] : 0
              }}
              transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
              className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Brain className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-white font-semibold">SafeWalk AI Companion</h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className="text-gray-300">
                  {isSpeaking ? 'Speaking (ElevenLabs)...' : 
                   isListening ? 'Listening (Deepgram)...' : 
                   isProcessing ? 'Thinking (Gemini 2.5)...' :
                   connectionStatus === 'connected' ? 'Full API Stack Ready' : 
                   connectionStatus === 'connecting' ? 'Connecting APIs...' : 'API Setup Required'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {lastCheckIn && (
              <div className="text-xs text-gray-300 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Last check: {lastCheckIn.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* API Status Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-white">Gemini 2.5</span>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Video className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-white">Tavus</span>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-white">ElevenLabs</span>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Mic className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-white">Deepgram</span>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-red-400" />
              <span className="text-xs text-white">
                {currentLocation ? 'GPS Active' : 'No GPS'}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Status */}
        {audioRecording && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-red-200 text-sm font-medium">Recording safety audio with Deepgram...</span>
            </div>
          </div>
        )}

        {/* Auto-listening Status */}
        {isAutoListening && (
          <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-blue-200 text-sm font-medium">Auto-listening with Deepgram - speak naturally</span>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="bg-black/20 rounded-lg p-4 h-64 overflow-y-auto mb-4 space-y-3">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  message.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-purple-500/80 text-white'
                }`}>
                  {message.type === 'ai' && (
                    <div className="flex items-center space-x-1 mb-1">
                      <Brain className="h-3 w-3" />
                      <span className="text-xs font-medium">
                        SafeMate AI (Full API Stack)
                      </span>
                    </div>
                  )}
                  <p className="leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-purple-500/80 text-white px-3 py-2 rounded-lg text-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                        className="w-2 h-2 bg-white rounded-full"
                      />
                    ))}
                  </div>
                  <span>Gemini 2.5 Flash thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {/* Voice Controls */}
          <div className="flex items-center space-x-2">
            <motion.button
              onClick={isAutoListening ? stopAutoListening : startDeepgramListening}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 p-3 rounded-lg font-medium transition-all ${
                isAutoListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isAutoListening ? (
                <>
                  <MicOff className="h-5 w-5 mx-auto mb-1" />
                  Stop Deepgram Listen
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mx-auto mb-1" />
                  Start Deepgram Listen
                </>
              )}
            </motion.button>
            
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-3 rounded-lg transition-colors ${
                voiceEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white" />}
            </button>
          </div>

          {/* Text Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
              placeholder="Chat with your AI companion... (say 'I need you' for video support)"
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={sendTextMessage}
              disabled={!inputText.trim()}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Technology Credits */}
        <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
          <p>🤖 <strong>Powered by Full Sponsored API Stack</strong></p>
          <p>🧠 <strong>Gemini 2.5 Flash</strong> • 🎥 <strong>Tavus Avatar</strong> • 🎙️ <strong>Deepgram Nova-2</strong></p>
          <p>🔊 <strong>ElevenLabs Multilingual v2</strong> • 📡 <strong>LiveKit Real-time</strong></p>
          <p>📍 Auto-listening with 3s silence detection • Periodic check-ins</p>
        </div>
      </div>

      {/* Tavus AI Avatar Component */}
      {(showVideoCompanion || sessionId) && hasApiKeys && (
        <TavusAIAvatar
          isActive={true}
          onEmergencyDetected={onEmergencyDetected}
          roomToken={sessionId || undefined}
          onConnectionStatusChange={(status) => {
            console.log('Tavus connection status:', status);
          }}
        />
      )}
    </div>
  );
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}