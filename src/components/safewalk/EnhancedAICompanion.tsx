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
  const [isReadyToListen, setIsReadyToListen] = useState(true);
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
  const [activationInProgress, setActivationInProgress] = useState(false);
  const [lastActivationTime, setLastActivationTime] = useState<number>(0);
  const [autoListenTimeout, setAutoListenTimeout] = useState<NodeJS.Timeout | null>(null);
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [elevenLabsAvailable, setElevenLabsAvailable] = useState(true);
  const [micCountdown, setMicCountdown] = useState<number>(0);
  const [micCountdownInterval, setMicCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageIdCounter = useRef<number>(0);

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
    if (isActive && connectionStatus === 'connected') {
      startPeriodicCheckIns();
    } else {
      stopPeriodicCheckIns();
    }

    return () => stopPeriodicCheckIns();
  }, [isActive, connectionStatus]);

  // Process speech queue to prevent multiple voices
  useEffect(() => {
    if (speechQueue.length > 0 && !isProcessingSpeech) {
      processNextSpeech();
    }
  }, [speechQueue, isProcessingSpeech]);

  // Cleanup mic countdown on unmount
  useEffect(() => {
    return () => {
      if (micCountdownInterval) {
        clearInterval(micCountdownInterval);
      }
    };
  }, []);

  const processNextSpeech = async () => {
    if (speechQueue.length === 0 || isProcessingSpeech) return;
    
    setIsProcessingSpeech(true);
    const nextText = speechQueue[0];
    setSpeechQueue(prev => prev.slice(1));
    
    try {
      await speakMessageDirect(nextText);
    } catch (error) {
      console.error('Error in speech processing:', error);
    } finally {
      setIsProcessingSpeech(false);
    }
  };

  const checkApiKeys = async () => {
    if (!user) return;

    try {
      console.log('🔍 Checking API keys for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('📊 API Keys Query Result:', {
        data: data ? {
          hasGemini: !!data.gemini_api_key,
          hasElevenLabs: !!data.elevenlabs_api_key,
          hasDeepgram: !!data.deepgram_api_key,
          hasTavus: !!data.tavus_api_key,
          hasLiveKit: !!data.livekit_api_key,
          hasLiveKitSecret: !!data.livekit_api_secret,
          hasLiveKitWS: !!data.livekit_ws_url
        } : null,
        error: error?.message || null,
        userId: user.id
      });

      if (error) {
        console.error('❌ Error fetching API keys:', error);
        setHasApiKeys(false);
        setConnectionStatus('error');
        return;
      }

      // Check if we have at least Gemini for basic functionality
      const hasBasicKeys = data && data.gemini_api_key;
      const hasAllKeys = data && 
        data.livekit_api_key && 
        data.livekit_api_secret && 
        data.livekit_ws_url && 
        data.tavus_api_key && 
        data.gemini_api_key &&
        data.elevenlabs_api_key &&
        data.deepgram_api_key;
      
      console.log('✅ API Keys Status:', {
        hasBasicKeys,
        hasAllKeys,
        geminiKey: data?.gemini_api_key ? 'Present' : 'Missing',
        elevenLabsKey: data?.elevenlabs_api_key ? 'Present' : 'Missing',
        deepgramKey: data?.deepgram_api_key ? 'Present' : 'Missing',
        tavusKey: data?.tavus_api_key ? 'Present' : 'Missing',
        liveKitKey: data?.livekit_api_key ? 'Present' : 'Missing'
      });
      
      setHasApiKeys(hasBasicKeys);
      setApiKeyData(data);
      
      if (!hasBasicKeys) {
        setConnectionStatus('error');
      } else {
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('❌ Error checking API keys:', error);
      setHasApiKeys(false);
      setConnectionStatus('error');
    }
  };

  const initializeAICompanion = () => {
    setConnectionStatus('connecting');
    
    setTimeout(() => {
      if (hasApiKeys) {
        const welcomeMessage = "Hi! I'm your SafeMate AI companion. I'm here to keep you safe. How are you feeling?";
        addAIMessage(welcomeMessage);
        setConnectionStatus('connected');
      } else {
        const basicMessage = "Welcome! I'm your SafeMate companion. Configure API keys for full AI features.";
        addAIMessage(basicMessage);
        setConnectionStatus('connected');
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
      "Quick check - how are you doing?",
      "Everything okay? I'm here with you.",
      "How's your walk going?",
      "Checking in - feeling safe?",
      "All good? I'm monitoring everything."
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
    
    const locationMessage = `📍 Location: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
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
        console.log('Safety audio snippet recorded');
        
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
    console.log('Activating video companion...');

    try {
      setVideoCompanionActive(true);
      addAIMessage("Video companion activated! I'm here for you.");
      onNeedHelp?.();
      
    } catch (error) {
      console.error('Error activating video companion:', error);
      addAIMessage("I'm still here to support you through voice and text.");
    } finally {
      setActivationInProgress(false);
    }
  };

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false; // Changed to false for better control
    recognitionRef.current.interimResults = false; // Changed to false for cleaner results
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
      setIsReadyToListen(false);
    };
    
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('🗣️ Speech recognized:', transcript);
      
      if (transcript.trim()) {
        handleUserMessage(transcript);
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Handle 'no-speech' error with user-friendly message
      if (event.error === 'no-speech') {
        addAIMessage("I didn't catch that. Could you please repeat?");
      }
      
      setIsListening(false);
      setIsReadyToListen(true);
      clearMicCountdown();
    };
    
    recognitionRef.current.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
      setIsReadyToListen(true);
      clearMicCountdown();
    };
  };

  const startMicCountdown = () => {
    setMicCountdown(5);
    
    const interval = setInterval(() => {
      setMicCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setMicCountdownInterval(null);
          
          // Auto-stop listening if still active
          if (isListening) {
            stopListening();
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setMicCountdownInterval(interval);
  };

  const clearMicCountdown = () => {
    if (micCountdownInterval) {
      clearInterval(micCountdownInterval);
      setMicCountdownInterval(null);
    }
    setMicCountdown(0);
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (autoListenTimeout) {
      clearTimeout(autoListenTimeout);
    }
    
    clearMicCountdown();
    
    stopPeriodicCheckIns();
    setIsListening(false);
    setIsReadyToListen(true);
    setIsSpeaking(false);
    setVideoCompanionActive(false);
    setActivationInProgress(false);
    setSpeechQueue([]);
    setIsProcessingSpeech(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addAIMessage = (content: string) => {
    const message: Message = {
      id: `${Date.now()}-${messageIdCounter.current++}`,
      type: 'ai',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, message]);
    setConversationContext(prev => [...prev, `AI: ${content}`].slice(-10));
    
    console.log(`🤖 AI Response using: ${hasApiKeys && apiKeyData?.gemini_api_key ? 'Gemini 2.5 Flash API' : 'Basic responses'}`);
    
    // Add to speech queue if voice is enabled
    if (voiceEnabled) {
      setSpeechQueue(prev => [...prev, content]);
    }
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: `${Date.now()}-${messageIdCounter.current++}`,
      type: 'user',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, message]);
    setConversationContext(prev => [...prev, `User: ${content}`].slice(-10));
  };

  const speakMessageDirect = async (text: string): Promise<void> => {
    if (isSpeaking) {
      console.log('Already speaking, queuing message...');
      return;
    }

    setIsSpeaking(true);
    
    try {
      // Try ElevenLabs first if API key is available and ElevenLabs is still available
      if (hasApiKeys && apiKeyData?.elevenlabs_api_key && elevenLabsAvailable) {
        console.log('🔊 Attempting ElevenLabs voice synthesis');
        try {
          await speakWithElevenLabs(text);
          console.log('✅ ElevenLabs synthesis successful');
        } catch (error) {
          console.error('❌ ElevenLabs synthesis failed:', error);
          
          // If it's a 401 error, mark ElevenLabs as unavailable for this session
          if (error.message && error.message.includes('401')) {
            console.log('🚫 ElevenLabs API key invalid, disabling for this session');
            setElevenLabsAvailable(false);
          }
          
          // Fallback to browser speech synthesis
          console.log('🔄 Falling back to browser speech synthesis');
          await speakWithBrowser(text);
        }
      } else {
        console.log('🔊 Using browser speech synthesis');
        await speakWithBrowser(text);
      }
    } catch (error) {
      console.error('❌ All speech synthesis methods failed:', error);
    } finally {
      setIsSpeaking(false);
      
      // Auto-start listening after AI speaks (with 5-second timeout)
      if (isActive && connectionStatus === 'connected' && voiceEnabled) {
        setTimeout(() => {
          startListeningWithTimeout();
        }, 500);
      }
    }
  };

  const startListeningWithTimeout = () => {
    if (isListening || !isReadyToListen) return;
    
    console.log('🎤 Starting auto-listen with 5-second timeout');
    startListening();
    startMicCountdown();
  };

  const speakWithElevenLabs = async (text: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKeyData?.elevenlabs_api_key || ''
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onloadeddata = () => {
          console.log('🔊 ElevenLabs audio loaded, playing...');
          audio.play().catch(error => {
            console.error('Error playing ElevenLabs audio:', error);
            reject(error);
          });
        };
        
        audio.onended = () => {
          console.log('🔊 ElevenLabs audio playback ended');
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('ElevenLabs audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          reject(error);
        };
        
      } catch (error) {
        console.error('ElevenLabs synthesis error:', error);
        reject(error);
      }
    });
  };

  const speakWithBrowser = async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      // Wait a moment for cancel to complete
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
          utterance.volume = 0.8;
          
          // Try to use a female voice if available
          const voices = speechSynthesis.getVoices();
          const femaleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') || 
            voice.name.toLowerCase().includes('woman') ||
            voice.name.toLowerCase().includes('samantha') ||
            voice.name.toLowerCase().includes('karen') ||
            voice.name.toLowerCase().includes('susan')
          );
          
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
          
          utterance.onstart = () => {
            console.log('🔊 Browser speech synthesis started');
          };
          
          utterance.onend = () => {
            console.log('🔊 Browser speech synthesis ended');
            resolve();
          };
          
          utterance.onerror = (event) => {
            if (event.error === 'canceled') {
              console.log('Speech synthesis canceled (expected behavior)');
              resolve();
            } else {
              console.error('Speech synthesis error:', event.error);
              reject(new Error(event.error));
            }
          };
          
          synthesisRef.current = utterance;
          speechSynthesis.speak(utterance);
          
          console.log('🔊 Speaking message with browser:', text.substring(0, 30) + '...');
          
        } catch (error) {
          console.error('Error in browser speech synthesis:', error);
          reject(error);
        }
      }, 100);
    });
  };

  const handleUserMessage = async (content: string) => {
    addUserMessage(content);
    setIsProcessing(true);
    
    // Clear mic countdown when user speaks
    clearMicCountdown();
    
    console.log('🎯 Processing user input with:', {
      gemini: hasApiKeys && apiKeyData?.gemini_api_key ? 'Gemini 2.5 Flash Available' : 'Not available',
      deepgram: hasApiKeys && apiKeyData?.deepgram_api_key ? 'Available' : 'Browser speech recognition',
      elevenlabs: hasApiKeys && apiKeyData?.elevenlabs_api_key && elevenLabsAvailable ? 'Available' : 'Browser speech synthesis'
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
      return "🚨 Emergency detected! Alerting your contacts now. Stay calm, I'm here with you.";
    }

    try {
      // Call Gemini 2.5 Flash API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKeyData?.gemini_api_key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are SafeMate, an AI safety companion. Keep responses SHORT (1-2 sentences max). Be caring and supportive.

Context: User is on a SafeWalk session.
Recent conversation: ${context.slice(-3).join('\n')}

User: "${userInput}"

Respond briefly and supportively:`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 100, // Reduced for shorter responses
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
        return "I understand. Take deep breaths with me. You're safe, and I'm here.";
      }

      if (userInput.toLowerCase().includes('tired') || userInput.toLowerCase().includes('exhausted')) {
        return "You're doing great. Want me to help you find a safe place to rest?";
      }

      const responses = [
        "I'm here with you. How can I help?",
        "Thanks for sharing. You're doing amazing!",
        "I'm listening. What's on your mind?",
        "You're safe with me. Tell me more."
      ];

      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  const getBasicAIResponse = (userInput: string): string => {
    const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'unsafe'];
    if (emergencyKeywords.some(keyword => userInput.includes(keyword))) {
      onEmergencyDetected();
      return "🚨 Emergency detected! Activating safety protocols.";
    }

    const basicResponses = [
      "I'm here with you! How can I help?",
      "Thanks for chatting! What's on your mind?",
      "You're doing great! I'm here to support you.",
      "I'm listening. How are you feeling?"
    ];

    return basicResponses[Math.floor(Math.random() * basicResponses.length)];
  };

  const startListening = () => {
    if (!recognitionRef.current || isListening || !isReadyToListen) {
      return;
    }

    try {
      // Ensure any previous recognition session is stopped
      if (recognitionRef.current.state !== 'inactive') {
        recognitionRef.current.stop();
        // Wait for the recognition to fully stop before starting again
        setTimeout(() => {
          if (recognitionRef.current && recognitionRef.current.state === 'inactive') {
            recognitionRef.current.start();
          }
        }, 100);
      } else {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsReadyToListen(true);
      setIsListening(false);
      clearMicCountdown();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsReadyToListen(false);
    }
    
    clearMicCountdown();
  };

  const sendTextMessage = () => {
    if (inputText.trim()) {
      handleUserMessage(inputText);
      setInputText('');
    }
  };

  const testSpeech = () => {
    const testMessage = "Hello! I'm your SafeMate AI companion. Can you hear me clearly?";
    setSpeechQueue(prev => [...prev, testMessage]);
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
                   isListening ? (micCountdown > 0 ? `Listening (${micCountdown}s)...` : 'Listening...') : 
                   isProcessing ? 'Thinking...' :
                   connectionStatus === 'connected' ? (hasApiKeys && apiKeyData?.gemini_api_key ? 'Gemini Ready' : 'Basic Mode') : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {lastCheckIn && (
              <div className="text-xs text-gray-300 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Last: {lastCheckIn.toLocaleTimeString()}</span>
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
                {hasApiKeys && apiKeyData?.gemini_api_key ? 'Gemini' : 'Basic'}
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
                {hasApiKeys && apiKeyData?.elevenlabs_api_key && elevenLabsAvailable ? 'ElevenLabs' : 'Browser'}
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

        {/* Mic Countdown Display */}
        {micCountdown > 0 && (
          <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <Mic className="h-4 w-4 text-blue-400 animate-pulse" />
              <span className="text-blue-200 text-sm font-medium">
                Listening for {micCountdown} seconds...
              </span>
            </div>
          </div>
        )}

        {/* ElevenLabs API Key Warning */}
        {hasApiKeys && apiKeyData?.elevenlabs_api_key && !elevenLabsAvailable && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-200 text-sm">
                ElevenLabs API key invalid. Using browser speech synthesis instead.
              </span>
              <button
                onClick={() => setShowApiConfig(true)}
                className="text-yellow-400 hover:text-yellow-300 underline text-sm"
              >
                Update Key
              </button>
            </div>
          </div>
        )}

        {/* Safety Status */}
        {audioRecording && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-red-200 text-sm font-medium">Recording safety audio...</span>
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
                        SafeMate AI {hasApiKeys && apiKeyData?.gemini_api_key ? '(Gemini)' : '(Basic)'}
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
                  <span>{hasApiKeys && apiKeyData?.gemini_api_key ? 'Gemini thinking...' : 'Processing...'}</span>
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
              disabled={!isReadyToListen && !isListening}
              className={`flex-1 p-3 rounded-lg font-medium transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : isReadyToListen
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-500 text-white opacity-50 cursor-not-allowed'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-5 w-5 mx-auto mb-1" />
                  Stop Listening {micCountdown > 0 && `(${micCountdown}s)`}
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
            
            {/* Test Speech Button */}
            <button
              onClick={testSpeech}
              disabled={isSpeaking}
              className="p-3 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white transition-colors"
              title="Test speech synthesis"
            >
              {isSpeaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          </div>

          {/* Text Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
              placeholder="Chat with your AI companion... (say 'I need you' for video)"
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
          <p>🤖 {hasApiKeys && apiKeyData?.gemini_api_key ? 'Powered by Gemini 2.5 Flash' : 'Browser-based AI simulation'}</p>
          <p>🎥 Video: <strong>Tavus</strong> & <strong>LiveKit</strong></p>
          <p>🔊 Voice: <strong>{hasApiKeys && apiKeyData?.elevenlabs_api_key && elevenLabsAvailable ? 'ElevenLabs' : 'Browser'}</strong> • Speech: <strong>Deepgram</strong></p>
          <p>📍 Auto check-ins with location & audio snippets</p>
          <p>🎤 Auto-mic: 5s timeout after AI speaks</p>
          {!hasApiKeys && (
            <p className="text-yellow-400">⚠️ Configure API keys for full AI features</p>
          )}
        </div>
      </div>

      {/* API Configuration Modal */}
      <ApiKeyManager
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        onKeysUpdated={(hasKeys) => {
          setHasApiKeys(hasKeys);
          if (hasKeys) {
            setConnectionStatus('connected');
            setElevenLabsAvailable(true); // Reset ElevenLabs availability when keys are updated
            checkApiKeys();
            addAIMessage("Great! Your API keys are configured. I now have enhanced AI capabilities!");
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