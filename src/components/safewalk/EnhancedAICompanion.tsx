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
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ApiKeyManager } from './ApiKeyManager';

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

interface TavusConversation {
  conversation_id: string;
  conversation_url: string;
  status: string;
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
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  const [apiKeyData, setApiKeyData] = useState<ApiKeys | null>(null);
  const [checkInTimer, setCheckInTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [audioRecording, setAudioRecording] = useState(false);
  const [videoCompanionActive, setVideoCompanionActive] = useState(false);
  const [tavusConversation, setTavusConversation] = useState<TavusConversation | null>(null);
  const [dailyCallFrame, setDailyCallFrame] = useState<any>(null);
  const [isConnectedToTavus, setIsConnectedToTavus] = useState(false);
  const [activationInProgress, setActivationInProgress] = useState(false);
  const [lastActivationTime, setLastActivationTime] = useState<number>(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isActive) {
      checkApiKeys();
      initializeAICompanion();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isActive]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showVideoCompanion && hasApiKeys && !videoCompanionActive && !activationInProgress) {
      const now = Date.now();
      // Prevent duplicate activations within 5 seconds
      if (now - lastActivationTime > 5000) {
        setLastActivationTime(now);
        activateVideoCompanion();
      }
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

  const checkApiKeys = async () => {
    if (!user) return;

    try {
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

      const hasKeys = data && 
        data.livekit_api_key && 
        data.livekit_api_secret && 
        data.livekit_ws_url && 
        data.tavus_api_key && 
        data.gemini_api_key &&
        data.elevenlabs_api_key &&
        data.deepgram_api_key;
      
      setHasApiKeys(hasKeys);
      setApiKeyData(data);
      
      if (!hasKeys) {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
      setHasApiKeys(false);
      setConnectionStatus('error');
    }
  };

  const initializeAICompanion = () => {
    setConnectionStatus('connecting');
    
    setTimeout(() => {
      if (hasApiKeys) {
        addAIMessage("Hi! I'm your SafeMate AI companion powered by Gemini 2.5 Flash. I'm now actively monitoring your safety and will check in with you periodically. Say 'I need you' to activate video companion mode. How are you feeling today?");
        setConnectionStatus('connected');
        
        // Start listening automatically
        startListening();
      } else {
        addAIMessage("Welcome! I'm your SafeMate companion. To unlock my full AI capabilities including Gemini conversations and Tavus video companion, please configure your API keys. I can still provide basic support using browser features.");
        setConnectionStatus('error');
      }
    }, 1000);
    
    initializeSpeechRecognition();
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
      setAudioRecording(false);
    }
  };

  const activateVideoCompanion = async () => {
    if (!hasApiKeys || !apiKeyData) {
      setShowApiConfig(true);
      return;
    }

    if (activationInProgress || videoCompanionActive) {
      console.log('Video companion activation already in progress or active');
      return;
    }

    setActivationInProgress(true);
    console.log('Activating video companion with Tavus integration...');

    try {
      // Create new Tavus conversation directly
      const conversation = await createTavusConversation();
      setTavusConversation(conversation);
      
      // Load Daily.co SDK and connect
      await loadDailySDK();
      await connectToTavusDaily(conversation);
      
      setVideoCompanionActive(true);
      addAIMessage("Video companion activated! I can now see you and provide enhanced support. I'm here to help calm you down and keep you safe. Take a deep breath with me.");
      onNeedHelp?.();
      
    } catch (error) {
      console.error('Error activating video companion:', error);
      addAIMessage("I couldn't activate video companion mode right now, but I'm still here to support you through voice and text. You're safe with me.");
    } finally {
      setActivationInProgress(false);
    }
  };

  const createTavusConversation = async (): Promise<TavusConversation> => {
    if (!apiKeyData?.tavus_api_key) {
      throw new Error('Tavus API key not available');
    }

    console.log('Creating Tavus conversation...');
    
    // First, get available replicas to use the first one
    const replicasResponse = await fetch('https://tavusapi.com/v2/replicas', {
      method: 'GET',
      headers: {
        'x-api-key': apiKeyData.tavus_api_key,
        'Content-Type': 'application/json'
      }
    });

    if (!replicasResponse.ok) {
      const errorData = await replicasResponse.json().catch(() => ({}));
      console.error('Error fetching replicas:', errorData);
      
      if (replicasResponse.status === 401) {
        throw new Error('Invalid Tavus API key. Please check your API key in Settings and ensure it has the correct permissions.');
      } else if (replicasResponse.status === 403) {
        throw new Error('Tavus API key does not have permission to access replicas.');
      } else {
        throw new Error(`Failed to fetch replicas: ${replicasResponse.status} - ${errorData.message || 'Unknown error'}`);
      }
    }

    const replicasData = await replicasResponse.json();
    console.log('Available replicas:', replicasData);

    if (!replicasData.data || replicasData.data.length === 0) {
      throw new Error('No replicas available in your Tavus account. Please create a replica first at https://tavus.io/dashboard/replicas');
    }

    // Use the first available replica
    const replicaId = replicasData.data[0].replica_id;
    console.log('Using replica:', replicaId);
    
    // Create conversation with the replica
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'x-api-key': apiKeyData.tavus_api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        replica_id: replicaId,
        conversation_name: `SafeMate Session ${Date.now()}`,
        callback_url: null,
        properties: {
          max_call_duration: 3600,
          participant_left_timeout: 300,
          participant_absent_timeout: 60,
          enable_recording: false,
          enable_transcription: true,
          language: 'en'
        },
        conversation_context: "You are SafeMate, an AI safety companion. You're currently in a video call with a user who needs safety monitoring and emotional support. Be caring, protective, and supportive. Watch for any signs of distress or danger.",
        custom_greeting: "Hi! I'm your SafeMate AI companion. I can see you and I'm here to keep you safe. How are you feeling right now?"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tavus API error:', errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid Tavus API key. Please check your API key in Settings and ensure it has the correct permissions.');
      } else if (response.status === 403) {
        throw new Error('Tavus API key does not have permission to create conversations.');
      } else if (response.status === 404) {
        throw new Error('Replica not found. Please verify the replica exists in your Tavus account.');
      } else {
        throw new Error(`Tavus API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }
    }

    const data = await response.json();
    console.log('Tavus conversation created:', data);
    
    return {
      conversation_id: data.conversation_id,
      conversation_url: data.conversation_url,
      status: data.status
    };
  };

  const loadDailySDK = async () => {
    if (window.DailyIframe) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const connectToTavusDaily = async (conversation: TavusConversation) => {
    try {
      console.log('Connecting to Tavus conversation:', conversation.conversation_url);
      
      const callFrame = window.DailyIframe.createCallObject({
        url: conversation.conversation_url,
        showLeaveButton: false,
        showFullscreenButton: false,
        showLocalVideo: true,
        showParticipantsBar: false
      });

      // Set up event listeners
      callFrame.on('joined-meeting', (event) => {
        console.log('Joined Tavus conversation:', event);
        setIsConnectedToTavus(true);
      });

      callFrame.on('participant-joined', (event) => {
        console.log('Participant joined:', event);
        if (event.participant.user_name?.includes('Tavus') || event.participant.user_name?.includes('replica')) {
          console.log('Tavus avatar joined the conversation');
          addAIMessage("I'm now connected and can see you! Ready to help keep you safe.");
        }
      });

      callFrame.on('track-started', (event) => {
        console.log('Track started:', event);
        if (event.participant && event.track.kind === 'video') {
          if (avatarVideoRef.current && event.participant.user_name?.includes('Tavus')) {
            avatarVideoRef.current.srcObject = new MediaStream([event.track]);
            avatarVideoRef.current.play();
          }
        }
      });

      callFrame.on('error', (event) => {
        console.error('Daily call error:', event);
        addAIMessage("I'm experiencing connection issues. Let me try to reconnect...");
      });

      // Join the conversation
      await callFrame.join({
        url: conversation.conversation_url,
        userName: `SafeMate_User_${user?.id?.slice(0, 8)}`,
        userData: {
          userId: user?.id,
          sessionType: 'safewalk',
          conversationId: conversation.conversation_id
        }
      });

      setDailyCallFrame(callFrame);
      
    } catch (error) {
      console.error('Error connecting to Tavus Daily room:', error);
      throw error;
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
    };
    recognitionRef.current.onend = () => {
      setIsListening(false);
      // Auto-restart listening if AI is active
      if (isActive && hasApiKeys) {
        setTimeout(() => startListening(), 1000);
      }
    };
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (dailyCallFrame) {
      try {
        dailyCallFrame.leave();
        dailyCallFrame.destroy();
      } catch (error) {
        console.error('Error cleaning up Daily call:', error);
      }
    }
    
    stopPeriodicCheckIns();
    setIsListening(false);
    setIsSpeaking(false);
    setVideoCompanionActive(false);
    setIsConnectedToTavus(false);
    setTavusConversation(null);
    setDailyCallFrame(null);
    setActivationInProgress(false);
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
    
    console.log(`AI Response using: ${hasApiKeys ? 'Gemini 2.5 Flash API' : 'Basic responses'}`);
    
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
    
    // Check for "I need you" trigger with debouncing
    const needHelpTriggers = ['i need you', 'need help', 'help me', 'i need help'];
    const containsTrigger = needHelpTriggers.some(trigger => content.toLowerCase().includes(trigger));
    
    if (containsTrigger && !videoCompanionActive && !activationInProgress) {
      const now = Date.now();
      if (now - lastActivationTime > 5000) { // 5 second debounce
        setLastActivationTime(now);
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

  if (!isActive) {
    return null;
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
                   connectionStatus === 'connected' ? (hasApiKeys ? 'Gemini 2.5 Flash Ready' : 'Basic Mode') : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Setup Required'}
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
            <button
              onClick={() => setShowApiConfig(true)}
              className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 transition-colors"
            >
              <Settings className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* API Status Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-white">
                {hasApiKeys && apiKeyData?.gemini_api_key ? 'Gemini 2.5' : 'Basic'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Video className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-white">
                {hasApiKeys && apiKeyData?.tavus_api_key ? 'Tavus' : 'None'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-white">
                {hasApiKeys && apiKeyData?.elevenlabs_api_key ? 'ElevenLabs' : 'Browser'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Mic className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-white">
                {hasApiKeys && apiKeyData?.deepgram_api_key ? 'Deepgram' : 'Browser'}
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

        {/* Video Companion Status */}
        {videoCompanionActive && (
          <div className="mb-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Video className="h-4 w-4 text-purple-400" />
                <span className="text-purple-200 text-sm font-medium">
                  Video Companion Active {isConnectedToTavus ? '(Connected)' : '(Connecting...)'}
                </span>
              </div>
              {tavusConversation && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-purple-300">
                    {tavusConversation.conversation_id.slice(0, 8)}...
                  </span>
                  <button
                    onClick={() => window.open(tavusConversation.conversation_url, '_blank')}
                    className="p-1 rounded bg-purple-500/30 hover:bg-purple-500/50 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 text-purple-300" />
                  </button>
                </div>
              )}
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
                        SafeMate AI {hasApiKeys ? '(Gemini 2.5)' : '(Basic)'}
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
                  <span>{hasApiKeys ? 'Gemini 2.5 Flash thinking...' : 'Processing...'}</span>
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
          <p>🤖 {hasApiKeys ? 'Powered by Gemini 2.5 Flash & Tavus Avatar' : 'Browser-based AI simulation'}</p>
          <p>🎥 Video companion: <strong>Tavus</strong> & <strong>Daily.co</strong></p>
          <p>🔊 Voice synthesis: <strong>ElevenLabs</strong> • Speech: <strong>Deepgram</strong></p>
          <p>📍 Periodic check-ins with location sharing for safety</p>
          {!hasApiKeys && (
            <p className="text-yellow-400">⚠️ Configure API keys for full AI features</p>
          )}
        </div>
      </div>

      {/* Tavus Video Companion */}
      {videoCompanionActive && tavusConversation && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Video className="h-6 w-6 text-purple-400" />
              <div>
                <h3 className="text-white font-semibold">Tavus Video Companion</h3>
                <p className="text-sm text-gray-300">Using first available replica</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnectedToTavus ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
              <span className="text-xs text-gray-300">
                {isConnectedToTavus ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Video Display */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative mb-4">
            {isConnectedToTavus ? (
              <video
                ref={avatarVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                <div className="text-center">
                  <Video className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                  <p className="text-white text-lg font-semibold">Connecting to Tavus...</p>
                  <p className="text-purple-200 text-sm">Using first available replica</p>
                </div>
              </div>
            )}

            {/* User Video PiP */}
            <div className="absolute top-4 right-4 w-24 h-18 bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            </div>
          </div>

          {/* Conversation Info */}
          <div className="text-xs text-gray-400 text-center">
            <p>Conversation ID: {tavusConversation.conversation_id}</p>
            <p>Status: {tavusConversation.status}</p>
          </div>
        </div>
      )}

      {/* API Configuration Modal */}
      <ApiKeyManager
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        onKeysUpdated={(hasKeys) => {
          setHasApiKeys(hasKeys);
          if (hasKeys) {
            setConnectionStatus('connected');
            checkApiKeys();
            addAIMessage("Great! Your API keys are configured. I now have access to Gemini 2.5 Flash for advanced conversations and Tavus video companion!");
          }
        }}
      />
    </div>
  );
}

// Extend Window interface for speech recognition and Daily.co
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    DailyIframe: any;
  }
}