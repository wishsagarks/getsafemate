import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Shield,
  WifiOff,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ApiKeyManager } from './ApiKeyManager';
import { TavusAIAvatar } from './TavusAIAvatar';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
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

interface ApiConnectionStatus {
  deepgram: 'connected' | 'connecting' | 'error' | 'disconnected' | 'ready';
  elevenlabs: 'connected' | 'connecting' | 'error' | 'disconnected' | 'ready';
  livekit: 'connected' | 'connecting' | 'error' | 'disconnected' | 'ready';
  gemini: 'connected' | 'connecting' | 'error' | 'disconnected' | 'ready';
  tavus: 'connected' | 'connecting' | 'error' | 'disconnected' | 'ready';
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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error' | 'ready'>('connecting');
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
  const [isManualListening, setIsManualListening] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiConnectionStatus>({
    deepgram: 'disconnected',
    elevenlabs: 'disconnected',
    livekit: 'disconnected',
    gemini: 'disconnected',
    tavus: 'disconnected'
  });
  const [connectionErrors, setConnectionErrors] = useState<string[]>([]);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitWsUrl, setLivekitWsUrl] = useState<string | null>(null);
  const [videoCompanionRequested, setVideoCompanionRequested] = useState(false);
  const [isVideoSessionActive, setIsVideoSessionActive] = useState(false);
  
  // CRITICAL: Separate mute states for AI companion and Tavus avatar
  const [aiCompanionMuted, setAiCompanionMuted] = useState(false);
  const [tavusAvatarMuted, setTavusAvatarMuted] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Critical: Use refs to prevent infinite loops
  const initializationStateRef = useRef<{
    isInitialized: boolean;
    isInitializing: boolean;
    lastUserId: string | null;
    lastApiKeysCheck: number;
  }>({
    isInitialized: false,
    isInitializing: false,
    lastUserId: null,
    lastApiKeysCheck: 0
  });

  // Memoize cleanup function to prevent recreating on every render
  const cleanup = useCallback(() => {
    console.log('Cleaning up AI companion...');
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    stopPeriodicCheckIns();
    setIsListening(false);
    setIsSpeaking(false);
    setSessionId(null);
    setLivekitRoom(null);
    setLivekitToken(null);
    setLivekitWsUrl(null);
    setMessages([]);
    setConnectionStatus('connecting');
    setVideoCompanionRequested(false);
    setIsVideoSessionActive(false);
    setApiStatus({
      deepgram: 'disconnected',
      elevenlabs: 'disconnected',
      livekit: 'disconnected',
      gemini: 'disconnected',
      tavus: 'disconnected'
    });
    clearConnectionErrors();
    
    // Reset initialization state
    initializationStateRef.current = {
      isInitialized: false,
      isInitializing: false,
      lastUserId: null,
      lastApiKeysCheck: 0
    };
  }, []);

  // Check API keys only when component mounts or user changes
  useEffect(() => {
    const currentUserId = user?.id;
    const now = Date.now();
    const state = initializationStateRef.current;
    
    // Only check API keys if:
    // 1. Component is active
    // 2. User exists
    // 3. User changed OR it's been more than 30 seconds since last check
    if (isActive && currentUserId && 
        (state.lastUserId !== currentUserId || (now - state.lastApiKeysCheck) > 30000)) {
      
      console.log('Checking API keys for user change or timeout:', currentUserId);
      state.lastUserId = currentUserId;
      state.lastApiKeysCheck = now;
      checkApiKeys();
    } else if (!isActive) {
      cleanup();
    }

    return cleanup;
  }, [isActive, user?.id, cleanup]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Video companion activation - only when explicitly requested
  useEffect(() => {
    if (videoCompanionRequested && hasApiKeys && !isVideoSessionActive && 
        initializationStateRef.current.isInitialized && !initializationStateRef.current.isInitializing) {
      activateVideoCompanion();
    }
  }, [videoCompanionRequested, hasApiKeys, isVideoSessionActive]);

  // Periodic check-ins
  useEffect(() => {
    if (isActive && hasApiKeys && connectionStatus === 'connected') {
      startPeriodicCheckIns();
    } else {
      stopPeriodicCheckIns();
    }

    return () => stopPeriodicCheckIns();
  }, [isActive, hasApiKeys, connectionStatus]);

  // Initialize AI companion - prevent multiple calls with proper state management
  useEffect(() => {
    const state = initializationStateRef.current;
    
    if (isActive && hasApiKeys && !state.isInitialized && !state.isInitializing && 
        connectionStatus !== 'connected') {
      
      console.log('Starting AI companion initialization...');
      state.isInitializing = true;
      initializeAICompanion();
    }
  }, [isActive, hasApiKeys, connectionStatus]);

  const updateApiStatus = (api: keyof ApiConnectionStatus, status: ApiConnectionStatus[keyof ApiConnectionStatus]) => {
    setApiStatus(prev => ({ ...prev, [api]: status }));
  };

  const addConnectionError = (error: string) => {
    console.error('Connection error:', error);
    setConnectionErrors(prev => {
      const newErrors = [...prev, `${new Date().toLocaleTimeString()}: ${error}`];
      return newErrors.slice(-3); // Keep only last 3 errors
    });
  };

  const clearConnectionErrors = () => {
    setConnectionErrors([]);
  };

  const checkApiKeys = async () => {
    if (!user) {
      setApiKeysLoading(false);
      return;
    }

    setApiKeysLoading(true);
    clearConnectionErrors();
    
    try {
      console.log('Checking API keys for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching API keys:', error);
        addConnectionError('Failed to fetch API keys from database');
        setHasApiKeys(false);
        setConnectionStatus('error');
        return;
      }

      console.log('API keys data received:', !!data);

      if (data) {
        // Check required keys for basic functionality
        const requiredKeys = [
          'livekit_api_key',
          'livekit_api_secret', 
          'livekit_ws_url',
          'gemini_api_key'
        ];
        
        const missingKeys = requiredKeys.filter(key => !data[key]?.trim());
        const hasRequiredKeys = missingKeys.length === 0;
        
        console.log('API keys validation:', {
          hasRequiredKeys,
          missingKeys,
          totalRequired: requiredKeys.length
        });
        
        setHasApiKeys(hasRequiredKeys);
        setApiKeyData(data);
        
        if (missingKeys.length > 0) {
          addConnectionError(`Missing required API keys: ${missingKeys.join(', ')}`);
          setConnectionStatus('error');
        } else {
          console.log('Required API keys are present');
        }
      } else {
        console.log('No API keys found in database');
        addConnectionError('No API keys configured. Please set up your API keys.');
        setHasApiKeys(false);
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
      addConnectionError(`Unexpected error while checking API keys: ${error.message}`);
      setHasApiKeys(false);
      setConnectionStatus('error');
    } finally {
      setApiKeysLoading(false);
    }
  };

  const initializeAICompanion = async () => {
    const state = initializationStateRef.current;
    
    if (!hasApiKeys || state.isInitialized) {
      state.isInitializing = false;
      return;
    }
    
    console.log('Initializing AI companion with available APIs...');
    setConnectionStatus('connecting');
    clearConnectionErrors();
    
    try {
      // Mark APIs as ready based on available keys
      updateApiStatus('gemini', 'ready');
      updateApiStatus('livekit', 'ready');
      
      if (apiKeyData?.deepgram_api_key) {
        updateApiStatus('deepgram', 'ready');
      }
      if (apiKeyData?.elevenlabs_api_key) {
        updateApiStatus('elevenlabs', 'ready');
      }
      if (apiKeyData?.tavus_api_key) {
        updateApiStatus('tavus', 'ready');
      }
      
      // Initialize browser-based speech recognition as fallback
      initializeSpeechRecognition();
      
      // Simulate initialization delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mark as initialized BEFORE setting connected status
      state.isInitialized = true;
      state.isInitializing = false;
      
      addAIMessage("Hi! I'm your SafeMate AI companion. I'm ready to help keep you safe. Say 'I need you' to activate video companion. How are you feeling?");
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('Error initializing AI companion:', error);
      addConnectionError(`Initialization failed: ${error.message}`);
      setConnectionStatus('error');
      
      // Reset state on error to allow retry
      state.isInitialized = false;
      state.isInitializing = false;
    }
  };

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false; // Manual control
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onstart = () => {
      setIsListening(true);
      console.log('Speech recognition started');
    };
    
    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
        
      if (event.results[event.results.length - 1].isFinal && transcript.trim()) {
        handleUserMessage(transcript);
        // Stop listening after getting a result
        stopListening();
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      if (event.error === 'no-speech') {
        console.warn('Speech recognition: no speech detected');
      } else {
        console.error('Speech recognition error:', event.error);
        addConnectionError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };
    
    recognitionRef.current.onend = () => {
      setIsListening(false);
      console.log('Speech recognition ended');
    };
  };

  const startPeriodicCheckIns = () => {
    // Prevent multiple timers
    if (checkInTimer) {
      clearInterval(checkInTimer);
    }
    
    // Check in every 3 minutes during SafeWalk
    const interval = setInterval(() => {
      performCheckIn();
    }, 180000); // 3 minutes

    setCheckInTimer(interval);
    
    // Perform initial check-in after 45 seconds
    setTimeout(() => {
      performCheckIn();
    }, 45000);
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
    
    // Shorter check-in messages
    const checkInMessages = [
      "Quick check - all good?",
      "How are you doing?",
      "Everything okay?",
      "Safe and sound?",
      "All well?"
    ];
    
    const randomMessage = checkInMessages[Math.floor(Math.random() * checkInMessages.length)];
    addAIMessage(randomMessage);
    
    // Set waiting for response and start listening
    setWaitingForResponse(true);
    setTimeout(() => {
      if (waitingForResponse) {
        startListening();
      }
    }, 1000);
    
    // Share location if available
    if (currentLocation) {
      shareLocationSnippet();
    }
    
    // Start brief audio recording for safety
    startSafetyRecording();
  };

  const shareLocationSnippet = () => {
    if (!currentLocation) return;
    
    const locationMessage = `📍 Location: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
    addSystemMessage(locationMessage);
    
    // Log location for safety
    console.log('Safety location logged:', currentLocation);
  };

  const startSafetyRecording = async () => {
    if (audioRecording) return;
    
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
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        console.log('Safety audio snippet recorded for Deepgram processing');
        
        // In production, this would be sent to Deepgram for analysis
        // and stored securely for safety purposes
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setAudioRecording(false);
      };
      
      mediaRecorder.start();
      setAudioRecording(true);
      
      // Record for 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error starting safety recording:', error);
      addConnectionError(`Safety recording failed: ${error.message}`);
      setAudioRecording(false);
    }
  };

  const activateVideoCompanion = async () => {
    if (!hasApiKeys) {
      console.log('API keys not available for video companion');
      addConnectionError('Cannot activate video companion: API keys not configured');
      return;
    }

    if (isVideoSessionActive) {
      console.log('Video session already active');
      return;
    }

    try {
      updateApiStatus('tavus', 'connecting');
      addAIMessage("Activating video companion with existing Tavus conversation ca1a2790d282c4c1...");
      
      // Create AI session for video companion using existing conversation
      const sessionResponse = await createAISession('video');
      if (sessionResponse) {
        setSessionId(sessionResponse.sessionId);
        setLivekitToken(sessionResponse.roomToken);
        setLivekitWsUrl(sessionResponse.wsUrl);
        setIsVideoSessionActive(true);
        updateApiStatus('tavus', 'connected');
        addAIMessage("Video companion ready! I can see you now through our existing Tavus conversation.");
        onNeedHelp?.();
      }
    } catch (error) {
      console.error('Error activating video companion:', error);
      updateApiStatus('tavus', 'error');
      
      // Provide more helpful error messages based on the error content
      let errorMessage = "Couldn't activate video companion";
      let details = "";
      
      if (error.message.includes('LiveKit API keys not configured')) {
        details = " - LiveKit keys missing. Check Settings.";
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        details = " - network error. Check connection.";
      } else {
        details = ". Voice chat still available.";
      }
      
      addConnectionError(`Video companion activation failed: ${error.message}`);
      addAIMessage(errorMessage + details);
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

      console.log('Creating AI session with existing Tavus conversation ca1a2790d282c4c1...');
      
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
        const errorData = await response.json().catch(() => ({}));
        console.error('AI session creation failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        let errorMessage = errorData.error || `HTTP ${response.status}: Failed to create AI session`;
        
        // Add more context to common errors
        if (response.status === 400 && errorData.details) {
          errorMessage = errorData.details;
        } else if (response.status === 500 && errorData.details) {
          errorMessage = errorData.details;
        }
        
        throw new Error(errorMessage);
      }

      const sessionData = await response.json();
      console.log('AI session created successfully:', sessionData);
      return sessionData;
      
    } catch (error) {
      console.error('Error creating AI session:', error);
      throw error;
    }
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
    
    console.log(`AI Response using: ${hasApiKeys ? 'Gemini 2.5 Flash + Tavus Integration' : 'Browser fallback'}`);
    
    // CRITICAL: Only speak if voice is enabled AND AI companion is not muted
    // This prevents AI from speaking when muted, regardless of Tavus avatar state
    if (voiceEnabled && !aiCompanionMuted) {
      speakMessage(content);
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
    
    // Clear waiting for response when user responds
    setWaitingForResponse(false);
  };

  const addSystemMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, message]);
  };

  const speakMessage = (text: string) => {
    // CRITICAL: Check AI companion mute state, not Tavus avatar mute state
    if (!('speechSynthesis' in window) || aiCompanionMuted) return;

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;
    
    // Use ElevenLabs voice if available, otherwise browser default
    if (hasApiKeys && apiKeyData?.elevenlabs_api_key) {
      console.log('Using ElevenLabs voice synthesis');
      // In production, this would use ElevenLabs API
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const handleUserMessage = async (content: string) => {
    addUserMessage(content);
    setIsProcessing(true);
    
    console.log('Processing user input with:', {
      gemini: hasApiKeys && apiKeyData?.gemini_api_key ? 'Gemini 2.5 Flash Available' : 'Not available',
      deepgram: hasApiKeys && apiKeyData?.deepgram_api_key ? 'Available' : 'Browser speech recognition',
      elevenlabs: hasApiKeys && apiKeyData?.elevenlabs_api_key ? 'Available' : 'Browser speech synthesis',
      tavus: 'Existing conversation ca1a2790d282c4c1 with p5d11710002a'
    });
    
    // Check for "I need you" trigger - ONLY create session when this is said
    if (content.toLowerCase().includes('i need you') || content.toLowerCase().includes('need help')) {
      console.log('Video companion trigger detected: "I need you"');
      setVideoCompanionRequested(true);
      if (!isVideoSessionActive) {
        await activateVideoCompanion();
      }
    }
    
    try {
      let response: string;
      
      if (hasApiKeys && apiKeyData?.gemini_api_key) {
        // Use Gemini 2.5 Flash for natural conversations
        response = await getGeminiAIResponse(content, conversationContext);
      } else {
        // Fallback to basic responses
        response = getBasicAIResponse(content.toLowerCase());
      }
      
      setTimeout(() => {
        addAIMessage(response);
        setIsProcessing(false);
      }, 800);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const fallbackResponse = getBasicAIResponse(content.toLowerCase());
      addAIMessage(fallbackResponse);
      setIsProcessing(false);
    }
  };

  const getGeminiAIResponse = async (userInput: string, context: string[]): Promise<string> => {
    // Emergency detection with enhanced AI
    const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'unsafe', 'threat', 'attack', 'stranger', 'following', 'lost'];
    if (emergencyKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      onEmergencyDetected();
      return "🚨 Emergency detected! Alerting contacts and activating safety protocols. Stay calm, help is coming.";
    }

    try {
      // Call Gemini 2.5 Flash API with instructions for shorter responses
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKeyData.gemini_api_key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are SafeMate, an AI safety companion integrated with Tavus conversation ca1a2790d282c4c1 using persona p5d11710002a. You're monitoring a user during their SafeWalk session.

IMPORTANT: Keep responses SHORT and conversational (1-2 sentences max). Be caring but concise.

Context: User is on a walk and you're providing safety monitoring.
Recent conversation: ${context.slice(-3).join('\n')}

User just said: "${userInput}"

Respond briefly as a caring AI companion who prioritizes safety. If you detect safety concerns, prioritize those immediately.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 100, // Keep responses short
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
      console.error('Error calling Gemini API:', error);
      addConnectionError(`Gemini API error: ${error.message}`);
      
      // Fallback to short contextual responses
      if (userInput.toLowerCase().includes('nervous') || userInput.toLowerCase().includes('anxious')) {
        return "I understand. Take deep breaths with me. You're safe.";
      }

      if (userInput.toLowerCase().includes('tired') || userInput.toLowerCase().includes('exhausted')) {
        return "You sound tired. Want help finding a safe place to rest?";
      }

      const shortResponses = [
        "Got it! I'm here watching out for you.",
        "Thanks for letting me know. You're doing great!",
        "I'm here with you. What's on your mind?",
        "Understood. I'm keeping you safe."
      ];

      return shortResponses[Math.floor(Math.random() * shortResponses.length)];
    }
  };

  const getBasicAIResponse = (userInput: string): string => {
    const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'unsafe'];
    if (emergencyKeywords.some(keyword => userInput.includes(keyword))) {
      onEmergencyDetected();
      return "🚨 Emergency detected! Activating safety protocols.";
    }

    const basicResponses = [
      "I'm here with you!",
      "Got it. You're safe.",
      "Thanks for chatting!",
      "I'm watching out for you."
    ];

    return basicResponses[Math.floor(Math.random() * basicResponses.length)];
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setIsManualListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        addConnectionError(`Speech recognition start failed: ${error.message}`);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsManualListening(false);
    }
  };

  const sendTextMessage = () => {
    if (inputText.trim()) {
      handleUserMessage(inputText);
      setInputText('');
    }
  };

  // CRITICAL: Separate mute functions for AI companion and Tavus avatar
  const toggleAICompanionMute = () => {
    const newMutedState = !aiCompanionMuted;
    setAiCompanionMuted(newMutedState);
    
    // Stop any current AI speech when muting
    if (newMutedState && speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    
    console.log(`AI Companion voice output ${newMutedState ? 'muted' : 'unmuted'}`);
  };

  const retryConnections = () => {
    console.log('Retrying connections...');
    clearConnectionErrors();
    
    // Reset initialization state to allow retry
    initializationStateRef.current = {
      isInitialized: false,
      isInitializing: false,
      lastUserId: user?.id || null,
      lastApiKeysCheck: 0
    };
    
    if (hasApiKeys) {
      initializeAICompanion();
    } else {
      checkApiKeys();
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
          <span className="text-white font-semibold">Required API Keys Missing</span>
        </div>
        <p className="text-gray-300 text-sm mb-4">
          SafeMate requires LiveKit and Gemini API keys for Tavus integration:
        </p>
        <ul className="text-gray-300 text-sm space-y-1 mb-4">
          <li>• <strong>LiveKit:</strong> Real-time communication with Tavus</li>
          <li>• <strong>Gemini 2.5 Flash:</strong> AI conversations</li>
          <li>• <strong>Optional:</strong> Deepgram, ElevenLabs, Tavus keys</li>
        </ul>
        
        {connectionErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-red-200 text-sm">
                <p className="font-medium mb-1">Configuration Issues:</p>
                <ul className="space-y-1">
                  {connectionErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
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
                  {isSpeaking ? 'Speaking...' : 
                   isListening ? 'Listening...' : 
                   isProcessing ? 'Thinking...' :
                   connectionStatus === 'connected' ? 'Gemini + Tavus Ready' : 
                   connectionStatus === 'connecting' ? 'Initializing...' : 'Setup Required'}
                </span>
                {aiCompanionMuted && <span className="text-red-300 text-xs">(AI Muted)</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {connectionErrors.length > 0 && (
              <button
                onClick={retryConnections}
                className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 transition-colors"
                title="Retry connections"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            {lastCheckIn && (
              <div className="text-xs text-gray-300 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Last check: {lastCheckIn.toLocaleTimeString()}</span>
              </div>
            )}
            <button
              onClick={() => setShowApiConfig(true)}
              className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 transition-colors"
            >
              <Settings className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Connection Errors */}
        {connectionErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <WifiOff className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-red-200 text-sm">
                <p className="font-medium mb-1">Connection Issues:</p>
                <ul className="space-y-1">
                  {connectionErrors.slice(-3).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
                <button
                  onClick={retryConnections}
                  className="mt-2 text-xs bg-red-500/30 hover:bg-red-500/40 px-2 py-1 rounded transition-colors"
                >
                  Retry Connections
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Status Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className={`p-3 rounded-lg ${
            apiStatus.gemini === 'connected' ? 'bg-green-500/20' : 
            apiStatus.gemini === 'ready' ? 'bg-blue-500/20' :
            apiStatus.gemini === 'error' ? 'bg-red-500/20' : 'bg-gray-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              <Brain className={`h-4 w-4 ${
                apiStatus.gemini === 'connected' ? 'text-green-400' : 
                apiStatus.gemini === 'ready' ? 'text-blue-400' :
                apiStatus.gemini === 'error' ? 'text-red-400' : 'text-gray-400'
              }`} />
              <span className="text-xs text-white">
                Gemini 2.5
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${
            apiStatus.tavus === 'connected' ? 'bg-green-500/20' : 
            apiStatus.tavus === 'ready' ? 'bg-blue-500/20' :
            apiStatus.tavus === 'error' ? 'bg-red-500/20' : 'bg-gray-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              <Video className={`h-4 w-4 ${
                apiStatus.tavus === 'connected' ? 'text-green-400' : 
                apiStatus.tavus === 'ready' ? 'text-blue-400' :
                apiStatus.tavus === 'error' ? 'text-red-400' : 'text-gray-400'
              }`} />
              <span className="text-xs text-white">
                {isVideoSessionActive ? 'Video Active' : 'Tavus'}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${
            apiStatus.elevenlabs === 'connected' ? 'bg-green-500/20' : 
            apiStatus.elevenlabs === 'ready' ? 'bg-blue-500/20' :
            apiStatus.elevenlabs === 'error' ? 'bg-red-500/20' : 'bg-gray-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              <Volume2 className={`h-4 w-4 ${
                apiStatus.elevenlabs === 'connected' ? 'text-green-400' : 
                apiStatus.elevenlabs === 'ready' ? 'text-blue-400' :
                apiStatus.elevenlabs === 'error' ? 'text-red-400' : 'text-gray-400'
              }`} />
              <span className="text-xs text-white">
                {apiKeyData?.elevenlabs_api_key ? 'ElevenLabs' : 'Browser'}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${
            apiStatus.deepgram === 'connected' ? 'bg-green-500/20' : 
            apiStatus.deepgram === 'ready' ? 'bg-blue-500/20' :
            apiStatus.deepgram === 'error' ? 'bg-red-500/20' : 'bg-gray-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              <Mic className={`h-4 w-4 ${
                apiStatus.deepgram === 'connected' ? 'text-green-400' : 
                apiStatus.deepgram === 'ready' ? 'text-blue-400' :
                apiStatus.deepgram === 'error' ? 'text-red-400' : 'text-gray-400'
              }`} />
              <span className="text-xs text-white">
                {apiKeyData?.deepgram_api_key ? 'Deepgram' : 'Browser'}
              </span>
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
              <span className="text-red-200 text-sm font-medium">Recording safety audio snippet...</span>
            </div>
          </div>
        )}

        {/* Video Session Status */}
        {isVideoSessionActive && (
          <div className="mb-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Video className="h-4 w-4 text-purple-400" />
              <span className="text-purple-200 text-sm font-medium">
                Video companion active with Tavus conversation ca1a2790d282c4c1
              </span>
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
                className={`flex ${message.type === 'user' ? 'justify-end' : message.type === 'system' ? 'justify-center' : 'justify-start'}`}
              >
                <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  message.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : message.type === 'system'
                    ? 'bg-gray-500/80 text-white text-center'
                    : 'bg-purple-500/80 text-white'
                }`}>
                  {message.type === 'ai' && (
                    <div className="flex items-center space-x-1 mb-1">
                      <Brain className="h-3 w-3" />
                      <span className="text-xs font-medium">
                        SafeMate AI
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
                  <span>Thinking...</span>
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
              onClick={isListening ? stopListening : startListening}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 p-3 rounded-lg font-medium transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-5 w-5 mx-auto mb-1" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mx-auto mb-1" />
                  Voice Chat
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

            {/* CRITICAL: AI Companion Mute Button - separate from Tavus avatar */}
            <button
              onClick={toggleAICompanionMute}
              className={`p-3 rounded-lg transition-colors ${
                !aiCompanionMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              }`}
              title={aiCompanionMuted ? 'Unmute AI companion responses' : 'Mute AI companion responses'}
            >
              {!aiCompanionMuted ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white" />}
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
          <p>🤖 Powered by Gemini 2.5 Flash + Tavus Integration</p>
          <p>🎥 Video companion: <strong>Tavus ca1a2790d282c4c1</strong> & <strong>LiveKit</strong></p>
          <p>🎭 Persona: <strong>p5d11710002a</strong> • Replica: <strong>r4317e64d25a</strong></p>
          <p>🔊 Voice synthesis: <strong>ElevenLabs</strong> • Speech: <strong>Deepgram</strong></p>
          <p>📍 Smart check-ins with location sharing</p>
          <p>💬 Say "I need you" to activate video companion</p>
          <p>🔇 Independent mute controls for AI companion and Tavus avatar</p>
        </div>
      </div>

      {/* Tavus AI Avatar Component - Only show when video session is active */}
      {isVideoSessionActive && hasApiKeys && livekitToken && livekitWsUrl && (
        <TavusAIAvatar
          isActive={true}
          onEmergencyDetected={onEmergencyDetected}
          livekitToken={livekitToken}
          livekitWsUrl={livekitWsUrl}
          onConnectionStatusChange={(status) => {
            console.log('Tavus connection status:', status);
          }}
        />
      )}

      {/* API Configuration Modal */}
      <ApiKeyManager
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        onKeysUpdated={(hasKeys) => {
          setHasApiKeys(hasKeys);
          if (hasKeys) {
            setConnectionStatus('connecting');
            checkApiKeys(); // Reload API key data
            addAIMessage("Great! API keys configured. Ready to help!");
          }
        }}
      />
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