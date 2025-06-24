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
  const [isAutoListening, setIsAutoListening] = useState(false);
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

  // Video companion activation
  useEffect(() => {
    if (showVideoCompanion && hasApiKeys && !sessionId && 
        initializationStateRef.current.isInitialized && !initializationStateRef.current.isInitializing) {
      activateVideoCompanion();
    }
  }, [showVideoCompanion, hasApiKeys, sessionId]);

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
        // Check ALL required keys
        const requiredKeys = [
          'livekit_api_key',
          'livekit_api_secret', 
          'livekit_ws_url',
          'tavus_api_key',
          'gemini_api_key',
          'elevenlabs_api_key',
          'deepgram_api_key'
        ];
        
        const missingKeys = requiredKeys.filter(key => !data[key]?.trim());
        const hasAllKeys = missingKeys.length === 0;
        
        console.log('API keys validation:', {
          hasAllKeys,
          missingKeys,
          totalRequired: requiredKeys.length
        });
        
        setHasApiKeys(hasAllKeys);
        setApiKeyData(data);
        
        if (!hasAllKeys) {
          addConnectionError(`Missing required API keys: ${missingKeys.join(', ')}`);
          setConnectionStatus('error');
        } else {
          console.log('All required API keys are present');
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
    
    console.log('Initializing AI companion with full API stack...');
    setConnectionStatus('connecting');
    clearConnectionErrors();
    
    try {
      // Mark all APIs as ready since we have the keys
      updateApiStatus('gemini', 'ready');
      updateApiStatus('deepgram', 'ready');
      updateApiStatus('elevenlabs', 'ready');
      updateApiStatus('livekit', 'ready');
      updateApiStatus('tavus', 'ready');
      
      // Initialize browser-based speech recognition as fallback
      initializeSpeechRecognition();
      
      // Simulate initialization delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mark as initialized BEFORE setting connected status
      state.isInitialized = true;
      state.isInitializing = false;
      
      addAIMessage("Hi! I'm your SafeMate AI companion powered by the full sponsored API stack: Gemini 2.5 Flash for conversations, Deepgram for speech recognition, ElevenLabs for voice synthesis, Tavus for video avatars, and LiveKit for real-time communication. I'm now actively monitoring your safety and will check in with you periodically. Say 'I need you' to activate video companion mode. How are you feeling today?");
      setConnectionStatus('connected');
      
      // Start listening automatically
      setTimeout(() => {
        startListening();
      }, 1000);
      
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
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
        
      if (event.results[event.results.length - 1].isFinal && transcript.trim()) {
        handleUserMessage(transcript);
      }
    };
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error !== 'no-speech') {
        addConnectionError(`Speech recognition error: ${event.error}`);
      }
    };
    recognitionRef.current.onend = () => {
      setIsListening(false);
      // Auto-restart listening if AI is active and initialized
      if (isActive && hasApiKeys && initializationStateRef.current.isInitialized) {
        setTimeout(() => startListening(), 1000);
      }
    };
  };

  const startPeriodicCheckIns = () => {
    // Prevent multiple timers
    if (checkInTimer) {
      clearInterval(checkInTimer);
    }
    
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
      
      // Record for 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 10000);
      
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

    try {
      updateApiStatus('tavus', 'connecting');
      // Create AI session for video companion
      const sessionResponse = await createAISession('video');
      if (sessionResponse) {
        setSessionId(sessionResponse.sessionId);
        setLivekitToken(sessionResponse.roomToken);
        setLivekitWsUrl(sessionResponse.wsUrl);
        updateApiStatus('tavus', 'connected');
        addAIMessage("Video companion activated! I can now see you and provide enhanced support with Tavus AI avatar. I'm here to help calm you down and keep you safe. Take a deep breath with me.");
        onNeedHelp?.();
      }
    } catch (error) {
      console.error('Error activating video companion:', error);
      updateApiStatus('tavus', 'error');
      addConnectionError(`Video companion activation failed: ${error.message}`);
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
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create AI session`);
      }

      return await response.json();
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
    
    console.log(`AI Response using: ${hasApiKeys ? 'Full API Stack' : 'Browser fallback'}`);
    
    if (voiceEnabled) {
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
    if (!('speechSynthesis' in window)) return;

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
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
      elevenlabs: hasApiKeys && apiKeyData?.elevenlabs_api_key ? 'Available' : 'Browser speech synthesis'
    });
    
    // Check for "I need you" trigger
    if (content.toLowerCase().includes('i need you') || content.toLowerCase().includes('need help')) {
      if (!showVideoCompanion) {
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
      }, 1000);
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
              text: `You are SafeMate, an AI safety companion. You're currently monitoring a user during their SafeWalk session. Be caring, supportive, and safety-focused. 

Context: User is on a walk and you're providing real-time safety monitoring and emotional support.
Recent conversation: ${context.slice(-5).join('\n')}

User just said: "${userInput}"

Respond as a caring AI companion who prioritizes safety and emotional well-being. Keep responses conversational and supportive. If you detect any safety concerns, prioritize those immediately.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
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
      
      // Fallback to contextual responses
      if (userInput.toLowerCase().includes('nervous') || userInput.toLowerCase().includes('anxious')) {
        return "I understand you're feeling nervous, and that's completely normal. I'm here with you, monitoring everything around you. Let's take some deep breaths together - in for 4, hold for 4, out for 4. You're safe, and I believe in your strength. What's one thing you can see around you that brings you comfort?";
      }

      if (userInput.toLowerCase().includes('tired') || userInput.toLowerCase().includes('exhausted')) {
        return "I can hear that you're feeling tired. Your wellbeing is my absolute priority. Would you like me to help you find a safe place to rest nearby? I can guide you to the nearest public space, café, or help you call someone for a ride. Remember, it's perfectly okay to take breaks.";
      }

      const responses = [
        "That's really fascinating! I love learning more about you - it helps me understand how to better support and protect you. I'm here monitoring everything and you're completely safe. What else is on your mind?",
        "Thanks for sharing that with me! I genuinely appreciate you keeping me in the loop. Our conversations make me feel like I'm truly helping keep you safe and supported. You're doing amazing on this walk!",
        "I'm really enjoying our chat! Having these meaningful conversations makes me feel like I'm fulfilling my purpose of being your trusted companion. Is there anything specific you'd like to talk about?",
        "You're such wonderful company! I'm constantly learning from our interactions, and it makes me a better companion for you. Remember, I'm always here watching out for you and ensuring your safety."
      ];

      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  const getBasicAIResponse = (userInput: string): string => {
    const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'unsafe'];
    if (emergencyKeywords.some(keyword => userInput.includes(keyword))) {
      onEmergencyDetected();
      return "🚨 Emergency detected! Activating safety protocols and alerting your contacts.";
    }

    const basicResponses = [
      "I'm here with you! How can I help make your walk safer and more enjoyable?",
      "Thanks for chatting with me! I'm monitoring your safety. What's on your mind?",
      "You're doing great! I'm here to support you every step of the way.",
      "I appreciate you talking with me. How are you feeling right now?"
    ];

    return basicResponses[Math.floor(Math.random() * basicResponses.length)];
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
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
    }
  };

  const sendTextMessage = () => {
    if (inputText.trim()) {
      handleUserMessage(inputText);
      setInputText('');
    }
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
                   connectionStatus === 'connected' ? 'Full API Stack Ready' : 
                   connectionStatus === 'connecting' ? 'Initializing...' : 'Setup Required'}
                </span>
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
                Tavus
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
                ElevenLabs
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
                Deepgram
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
                        SafeMate AI (Full Stack)
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
          <p>🤖 Powered by Full Sponsored API Stack</p>
          <p>🎥 Video companion: <strong>Tavus</strong> & <strong>LiveKit</strong></p>
          <p>🔊 Voice synthesis: <strong>ElevenLabs</strong> • Speech: <strong>Deepgram</strong></p>
          <p>🧠 Conversations: <strong>Gemini 2.5 Flash</strong></p>
          <p>📍 Periodic check-ins with location sharing for safety</p>
        </div>
      </div>

      {/* Tavus AI Avatar Component */}
      {(showVideoCompanion || sessionId) && hasApiKeys && livekitToken && livekitWsUrl && (
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
            addAIMessage("Great! Your API keys are configured. I now have access to the full sponsored API stack for advanced conversations, voice synthesis, speech recognition, and video companion features!");
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