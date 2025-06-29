import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  MessageCircle, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Video,
  VideoOff,
  Settings,
  Brain,
  Sparkles,
  Send,
  Play,
  Pause,
  Smile,
  Frown,
  Meh,
  Sun,
  Cloud,
  CloudRain,
  User,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { Input } from '../ui/aceternity-input';
import { Button } from '../ui/aceternity-button';
import { useNavigate } from 'react-router-dom';

interface MoodEntry {
  mood: 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy';
  energy: number;
  stress: number;
  notes: string;
}

interface EmotionalAICompanionProps {
  isActive: boolean;
  onToggle: () => void;
  currentMood: MoodEntry | null;
  sessionDuration: number;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
  mood?: string;
}

export function EmotionalAICompanion({ 
  isActive, 
  onToggle, 
  currentMood, 
  sessionDuration 
}: EmotionalAICompanionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [listeningTimeout, setListeningTimeout] = useState<NodeJS.Timeout | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [videoCallEndMessageSent, setVideoCallEndMessageSent] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);
  const [apiKeyChecked, setApiKeyChecked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef<number>(0);

  useEffect(() => {
    if (isActive) {
      checkApiKeys();
      initializeCompanion();
      initializeSpeechRecognition();
    }

    return () => {
      cleanup();
    };
  }, [isActive]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSpeechRecognition = () => {
    // Check if speech recognition is supported
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    if (!isSupported) {
      console.warn('Speech recognition not supported');
      setSpeechRecognitionSupported(false);
      return;
    }

    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
        
        // Set 10-second timeout
        const timeout = setTimeout(() => {
          console.log('🎤 10-second timeout - stopping automatically');
          stopListening();
        }, 10000);
        setListeningTimeout(timeout);
      };
      
      recognition.onresult = (event) => {
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript.trim();
          console.log('🗣️ Speech recognized:', transcript);
          
          if (listeningTimeout) {
            clearTimeout(listeningTimeout);
            setListeningTimeout(null);
          }
          
          if (transcript) {
            handleUserMessage(transcript);
          }
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (listeningTimeout) {
          clearTimeout(listeningTimeout);
          setListeningTimeout(null);
        }
        
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          // Don't show error for no speech, just stop listening
          console.log('No speech detected');
        } else if (event.error === 'audio-capture') {
          addAIMessage("I couldn't access your microphone. Please check your permissions.");
        } else if (event.error === 'not-allowed') {
          addAIMessage("Microphone permission denied. Please allow microphone access to use voice chat.");
        }
      };
      
      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        
        if (listeningTimeout) {
          clearTimeout(listeningTimeout);
          setListeningTimeout(null);
        }
        
        setIsListening(false);
      };

      setSpeechRecognition(recognition);
      setSpeechRecognitionSupported(true);
      console.log('✅ Speech recognition initialized');
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setSpeechRecognitionSupported(false);
    }
  };

  const cleanup = () => {
    if (speechRecognition) {
      try {
        speechRecognition.stop();
      } catch (error) {
        console.log('Speech recognition already stopped');
      }
    }
    
    if (listeningTimeout) {
      clearTimeout(listeningTimeout);
      setListeningTimeout(null);
    }
    
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    setIsListening(false);
    setIsSpeaking(false);
  };

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

      const hasBasicKeys = data && data.gemini_api_key;
      setHasApiKeys(hasBasicKeys);
      setApiKeyChecked(true);
      
      if (hasBasicKeys) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
      setHasApiKeys(false);
      setConnectionStatus('error');
    }
  };

  const initializeCompanion = () => {
    setConnectionStatus('connecting');
    
    setTimeout(() => {
      const welcomeMessage = getPersonalizedWelcome();
      addAIMessage(welcomeMessage);
      setConnectionStatus('connected');
    }, 1000);
  };

  const getPersonalizedWelcome = () => {
    if (!currentMood) {
      return "Hello! I'm your HeartMate companion. I'm here to listen and support you. How are you feeling today?";
    }

    const moodResponses = {
      'very-happy': "I can sense you're feeling wonderful today! That's amazing. I'd love to hear what's bringing you such joy.",
      'happy': "You seem to be in a good mood today! That's lovely to see. What's been going well for you?",
      'neutral': "I see you're feeling balanced today. Sometimes neutral is exactly where we need to be. How can I support you?",
      'sad': "I notice you might be feeling a bit down today. I'm here to listen and support you through whatever you're experiencing.",
      'very-sad': "I can sense you're going through a difficult time right now. Please know that I'm here for you, and your feelings are completely valid."
    };

    return moodResponses[currentMood.mood] || "I'm here to support you emotionally. How are you feeling right now?";
  };

  const addAIMessage = (content: string) => {
    const message: Message = {
      id: `${Date.now()}-${messageIdCounter.current++}`,
      type: 'ai',
      content,
      timestamp: Date.now(),
      mood: currentMood?.mood
    };
    
    setMessages(prev => [...prev, message]);
    
    // Only speak if voice is enabled and video call is not active
    if (voiceEnabled && !isVideoCallActive) {
      console.log('🔊 Voice enabled - speaking message');
      speakMessage(content);
    } else if (isVideoCallActive) {
      console.log('📹 Video call active - AI message added but not spoken:', content);
    } else {
      console.log('🔇 Voice disabled - skipping speech synthesis');
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
  };

  const speakMessage = async (text: string) => {
    // Don't speak if video call is active
    if (isSpeaking || isVideoCallActive) {
      console.log('📹 Video call active or already speaking, skipping speech:', text.substring(0, 30) + '...');
      return;
    }

    setIsSpeaking(true);
    
    try {
      // Check if we have ElevenLabs API key and voice is enabled
      if (hasApiKeys) {
        const { data: apiKeys } = await supabase
          .from('user_api_keys')
          .select('elevenlabs_api_key')
          .eq('user_id', user?.id)
          .single();

        // Try ElevenLabs if API key is available and voice is enabled
        if (apiKeys?.elevenlabs_api_key?.trim() && voiceEnabled) {
          console.log('🔊 Using ElevenLabs for voice synthesis');
          try {
            await speakWithElevenLabs(text, apiKeys.elevenlabs_api_key);
            return;
          } catch (error) {
            console.error('❌ ElevenLabs failed, falling back to browser speech:', error);
            // Fall through to browser speech
          }
        }
      }

      // Fallback to browser speech synthesis (only if voice is enabled)
      if (voiceEnabled) {
        console.log('🔊 Using browser speech synthesis');
        await speakWithBrowser(text);
      }
    } catch (error) {
      console.error('Error speaking message:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const speakWithElevenLabs = async (text: string, apiKey: string): Promise<void> => {
    // Don't call ElevenLabs if voice is disabled
    if (!voiceEnabled) {
      console.log('🔇 Voice disabled - not calling ElevenLabs');
      throw new Error('Voice disabled');
    }

    return new Promise(async (resolve, reject) => {
      try {
        console.log('🔊 Calling ElevenLabs API...');
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            },
            output_format: 'mp3_44100_128'
          })
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audio.preload = 'auto';
        audio.volume = 1.0;
        
        audio.onloadeddata = () => {
          console.log('🔊 ElevenLabs audio loaded');
          audio.play().catch(reject);
        };
        
        audio.onended = () => {
          console.log('🔊 ElevenLabs audio playback ended');
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('ElevenLabs audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        
      } catch (error) {
        console.error('ElevenLabs synthesis error:', error);
        reject(error);
      }
    });
  };

  const speakWithBrowser = async (text: string): Promise<void> => {
    // Don't use browser speech if voice is disabled
    if (!voiceEnabled) {
      console.log('🔇 Voice disabled - not using browser speech');
      return;
    }

    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
          utterance.volume = 1.0;
          
          const voices = speechSynthesis.getVoices();
          const femaleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') || 
            voice.name.toLowerCase().includes('woman') ||
            voice.name.toLowerCase().includes('samantha') ||
            voice.name.toLowerCase().includes('karen') ||
            voice.name.toLowerCase().includes('susan') ||
            voice.name.toLowerCase().includes('zira') ||
            voice.name.toLowerCase().includes('hazel')
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
            // Handle 'interrupted' and 'canceled' as expected behavior
            if (event.error === 'canceled' || event.error === 'interrupted') {
              console.log('🔊 Speech synthesis canceled/interrupted (expected behavior)');
              resolve(); // Resolve instead of reject for expected cancellations
            } else {
              console.error('Speech synthesis error:', event.error);
              reject(new Error(event.error));
            }
          };
          
          speechSynthesis.speak(utterance);
          console.log('🔊 Speaking message with browser:', text.substring(0, 30) + '...');
          
        } catch (error) {
          console.error('Error in browser speech synthesis:', error);
          reject(error);
        }
      }, 100);
    });
  };

  const startListening = async () => {
    if (isListening || !speechRecognition) {
      console.log('Already listening or speech recognition not available');
      return;
    }

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      console.log('🎤 Starting voice input...');
      speechRecognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      
      if (error.name === 'NotAllowedError') {
        addAIMessage("I need microphone permission to hear you. Please allow microphone access and try again.");
      } else if (error.name === 'NotFoundError') {
        addAIMessage("No microphone found. Please check your audio devices.");
      } else {
        addAIMessage("I'm having trouble accessing your microphone. Please check your permissions and try again.");
      }
    }
  };

  const stopListening = () => {
    if (speechRecognition && isListening) {
      try {
        speechRecognition.stop();
      } catch (error) {
        console.log('Speech recognition already stopped');
      }
    }
    
    if (listeningTimeout) {
      clearTimeout(listeningTimeout);
      setListeningTimeout(null);
    }
  };

  const handleUserMessage = async (content: string) => {
    // Don't process user messages during video call (except for emergency triggers)
    if (isVideoCallActive) {
      console.log('📹 Video call active - user message logged but not processed:', content);
      return;
    }

    addUserMessage(content);
    setIsProcessing(true);
    
    // Check for "I need you" trigger for video
    const needHelpTriggers = ['i need you', 'need help', 'help me', 'i need help', 'video call', 'see you', 'video support', 'face to face'];
    const containsTrigger = needHelpTriggers.some(trigger => content.toLowerCase().includes(trigger));
    
    if (containsTrigger && hasApiKeys) {
      console.log('🎥 Triggering video call...');
      setShowVideoCall(true);
      addAIMessage("I'd be happy to connect with you face-to-face. Let me start a video call where I can better support you emotionally.");
      setIsProcessing(false);
      navigate('/heartmate');
      return;
    }
    
    try {
      let response: string;
      
      if (hasApiKeys) {
        response = await getEmotionalAIResponse(content);
      } else {
        response = getBasicEmotionalResponse(content.toLowerCase());
      }
      
      setTimeout(() => {
        addAIMessage(response);
        setIsProcessing(false);
      }, 1000);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const fallbackResponse = getBasicEmotionalResponse(content.toLowerCase());
      addAIMessage(fallbackResponse);
      setIsProcessing(false);
    }
  };

  const getEmotionalAIResponse = async (userInput: string): Promise<string> => {
    try {
      const { data: apiKeys } = await supabase
        .from('user_api_keys')
        .select('gemini_api_key')
        .eq('user_id', user?.id)
        .single();

      if (!apiKeys?.gemini_api_key) {
        throw new Error('No Gemini API key found');
      }

      const moodContext = currentMood ? 
        `The user's current mood is ${currentMood.mood} (energy: ${currentMood.energy}/10, stress: ${currentMood.stress}/10).` : 
        '';

      const conversationHistory = messages.slice(-6).map(m => 
        `${m.type === 'user' ? 'User' : 'HeartMate'}: ${m.content}`
      ).join('\n');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKeys.gemini_api_key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are HeartMate, a compassionate AI emotional support companion. You provide empathetic, caring responses focused on emotional wellness and mental health support.

${moodContext}

Recent conversation:
${conversationHistory}

User: "${userInput}"

Respond with empathy, validation, and gentle guidance. Keep responses warm, supportive, and 1-2 sentences. Focus on emotional support, not advice unless specifically asked.`
            }]
          }],
          generationConfig: {
            temperature: 0.8,
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
      console.error('Error calling Gemini API:', error);
      return getBasicEmotionalResponse(userInput.toLowerCase());
    }
  };

  const getBasicEmotionalResponse = (userInput: string): string => {
    const emotionalKeywords = {
      sad: [
        "I hear that you're feeling sad, and that's completely okay. Your feelings are valid.",
        "It sounds like you're going through a tough time. I'm here to listen.",
        "Sadness is a natural emotion. Would you like to talk about what's making you feel this way?"
      ],
      happy: [
        "I'm so glad to hear you're feeling happy! That's wonderful.",
        "Your joy is beautiful. What's bringing you happiness today?",
        "It's lovely to see you in such good spirits!"
      ],
      anxious: [
        "Anxiety can feel overwhelming. Let's take this one moment at a time.",
        "I understand that anxiety is difficult. You're not alone in this.",
        "Would some breathing exercises help? I'm here to support you through this."
      ],
      stressed: [
        "Stress can be really challenging. You're doing the best you can.",
        "It sounds like you have a lot on your plate. Let's talk about it.",
        "Stress is your body's way of responding to challenges. You're stronger than you know."
      ],
      lonely: [
        "Loneliness can be really painful. I want you to know that I'm here with you.",
        "You're not alone, even when it feels that way. I'm here to listen.",
        "Feeling lonely is hard. Would you like to share what's on your mind?"
      ]
    };

    // Check for emotional keywords
    for (const [emotion, responses] of Object.entries(emotionalKeywords)) {
      if (userInput.includes(emotion)) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }

    // Default supportive responses
    const defaultResponses = [
      "Thank you for sharing that with me. How are you feeling about it?",
      "I'm here to listen. Tell me more about what's on your mind.",
      "Your feelings matter, and I'm glad you're talking about them.",
      "That sounds important to you. I'd love to hear more.",
      "I appreciate you opening up to me. How can I best support you right now?"
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const sendTextMessage = () => {
    if (inputText.trim()) {
      handleUserMessage(inputText);
      setInputText('');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getMoodIcon = (mood?: string) => {
    switch (mood) {
      case 'very-happy': return <Sun className="h-4 w-4 text-green-500" />;
      case 'happy': return <Smile className="h-4 w-4 text-blue-500" />;
      case 'neutral': return <Meh className="h-4 w-4 text-yellow-500" />;
      case 'sad': return <Cloud className="h-4 w-4 text-orange-500" />;
      case 'very-sad': return <CloudRain className="h-4 w-4 text-red-500" />;
      default: return <Heart className="h-4 w-4 text-pink-500" />;
    }
  };

  const handleVideoCallStart = () => {
    console.log('📹 Video call started - pausing AI features');
    setIsVideoCallActive(true);
    setVideoCallEndMessageSent(false); // Reset the flag
  };

  const handleVideoCallEnd = () => {
    console.log('📹 Video call ended - resuming AI features');
    setIsVideoCallActive(false);
    
    // Only send the welcome back message once
    if (!videoCallEndMessageSent) {
      setVideoCallEndMessageSent(true);
      // Resume normal AI functionality with a single message
      setTimeout(() => {
        addAIMessage("I'm back to full voice and text support. How are you feeling after our video session?");
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black border-white/[0.2]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ 
                scale: isSpeaking && !isVideoCallActive ? [1, 1.1, 1] : 1,
                rotate: isSpeaking && !isVideoCallActive ? [0, 5, -5, 0] : 0
              }}
              transition={{ duration: 0.5, repeat: isSpeaking && !isVideoCallActive ? Infinity : 0 }}
              className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Heart className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-white font-semibold">HeartMate AI Companion</h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className="text-gray-300">
                  {isVideoCallActive ? '📹 Video Call Mode' :
                   isSpeaking ? 'Speaking...' : 
                   isListening ? 'Listening...' : 
                   isProcessing ? 'Thinking...' :
                   connectionStatus === 'connected' ? (hasApiKeys ? 'Gemini Ready' : 'Basic Mode') : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={onToggle}
              variant={isActive ? "destructive" : "default"}
              className={isActive ? "bg-red-600 hover:bg-red-700" : "bg-pink-600 hover:bg-pink-700"}
            >
              {isActive ? 'End Session' : 'Start Session'}
            </Button>
          </div>
        </div>

        {/* Video Call Status */}
        {isVideoCallActive && (
          <div className="mb-6 p-4 bg-pink-500/20 border border-pink-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <Video className="h-5 w-5 text-pink-400 animate-pulse" />
              <div>
                <h4 className="text-white font-medium">Video Call Active</h4>
                <p className="text-pink-200 text-sm">
                  Voice and text AI paused - continuing emotional support via video
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Status Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-white">
                {hasApiKeys ? 'Gemini AI' : 'Basic Mode'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center space-x-2">
              {voiceEnabled ? <Volume2 className="h-4 w-4 text-green-400" /> : <VolumeX className="h-4 w-4 text-red-400" />}
              <span className="text-xs text-white">
                Voice {voiceEnabled ? 'On' : 'Off'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-white">
                Private & Safe
              </span>
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-pink-400" />
              <span className="text-xs text-white">
                Emotional AI
              </span>
            </div>
          </div>
        </div>

        {/* API Key Warning - Only show if API keys are checked and not found */}
        {apiKeyChecked && !hasApiKeys && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-300 text-sm">
                Configure API keys in Settings for enhanced AI emotional support
              </span>
              <button
                onClick={() => navigate('/settings')}
                className="text-yellow-400 hover:text-yellow-300 underline text-sm"
              >
                Settings
              </button>
            </div>
          </div>
        )}

        {/* Chat Interface */}
        <div className="bg-white/5 rounded-xl p-4 h-80 overflow-y-auto mb-4 space-y-3">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs px-4 py-3 rounded-2xl text-sm ${
                  message.type === 'user' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-white/10 text-white shadow-sm'
                }`}>
                  {message.type === 'ai' && (
                    <div className="flex items-center space-x-2 mb-2">
                      <Heart className="h-3 w-3 text-pink-400" />
                      <span className="text-xs font-medium text-pink-400">
                        HeartMate {hasApiKeys ? '(Enhanced AI)' : '(Basic)'}
                      </span>
                      {message.mood && getMoodIcon(message.mood)}
                    </div>
                  )}
                  <p className="leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-70 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isProcessing && !isVideoCallActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white/10 text-white px-4 py-3 rounded-2xl text-sm shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                        className="w-2 h-2 bg-pink-400 rounded-full"
                      />
                    ))}
                  </div>
                  <span>{hasApiKeys ? 'Gemini thinking...' : 'Processing...'}</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Controls */}
        <div className="mb-4 p-4 bg-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium flex items-center space-x-2">
              <Mic className="h-4 w-4 text-pink-400" />
              <span>Voice Chat</span>
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-neutral-400">
                {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready'}
              </span>
              <div className={`w-2 h-2 rounded-full ${
                isListening ? 'bg-red-400 animate-pulse' : 
                isSpeaking ? 'bg-blue-400 animate-pulse' : 'bg-green-400'
              }`} />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isSpeaking || isVideoCallActive || !speechRecognitionSupported}
              className={`flex-1 ${
                isListening 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  <span>Start Voice Chat</span>
                </>
              )}
            </Button>
            
            <Button
              onClick={() => {
                console.log(`🔊 Voice toggle: ${voiceEnabled} -> ${!voiceEnabled}`);
                setVoiceEnabled(!voiceEnabled);
                
                // If disabling voice while speaking, stop current speech
                if (voiceEnabled && isSpeaking) {
                  console.log('🔇 Stopping current speech due to voice disable');
                  if ('speechSynthesis' in window) {
                    speechSynthesis.cancel();
                  }
                  setIsSpeaking(false);
                }
              }}
              variant="outline"
              className={`border-white/20 ${voiceEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              disabled={isVideoCallActive}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white" />}
            </Button>
          </div>
          
          <p className="text-xs text-neutral-400 mt-2 text-center">
            Click "Start Voice Chat" to talk with HeartMate • 10-second timeout • Voice responses {voiceEnabled ? 'enabled' : 'disabled'}
          </p>
          
          {/* Voice Status Indicator */}
          <div className="mt-2 p-2 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Voice Responses:</span>
              <span className={`font-medium ${voiceEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {voiceEnabled ? '✅ Enabled (ElevenLabs/Browser)' : '❌ Disabled (No API calls)'}
              </span>
            </div>
          </div>
        </div>

        {/* Text Input Controls */}
        <div className="flex space-x-2">
          <Input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
            placeholder={isVideoCallActive ? "Video call active - text chat paused" : "Share your thoughts and feelings..."}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder-neutral-400"
            disabled={isVideoCallActive}
          />
          <Button
            onClick={sendTextMessage}
            disabled={!inputText.trim() || isVideoCallActive}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Browser Compatibility Notice - Only show if speech recognition is not supported */}
        {!speechRecognitionSupported && (
          <div className="mt-4 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-400" />
              <span className="text-orange-300 text-sm">
                Voice chat requires a modern browser with speech recognition support
              </span>
            </div>
            <p className="text-orange-400 text-xs mt-1 ml-6">
              Try using Chrome, Edge, or Safari for full voice functionality
            </p>
          </div>
        )}
      </Card>

      {/* Quick Check-ins and Session Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Emotional Check-ins */}
        <Card className="bg-black border-white/[0.2]">
          <CardTitle className="text-white mb-4 flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-pink-400" />
            <span>Quick Check-ins</span>
          </CardTitle>
          
          <div className="space-y-2">
            {[
              "How are you feeling right now?",
              "What's been on your mind today?",
              "Is there anything worrying you?",
              "What made you smile recently?"
            ].map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleUserMessage(prompt)}
                disabled={isVideoCallActive}
                className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-neutral-300 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </Card>

        {/* Session Stats */}
        <Card className="bg-black border-white/[0.2]">
          <CardTitle className="text-white mb-4 flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <span>Session Progress</span>
          </CardTitle>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-400">Session Time</span>
              <span className="text-lg font-bold text-purple-400">
                {formatTime(sessionDuration)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-400">Messages Exchanged</span>
              <span className="text-lg font-bold text-pink-400">
                {messages.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-400">AI Mode</span>
              <span className="text-sm font-medium text-green-400">
                {hasApiKeys ? 'Enhanced' : 'Basic'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-400">Voice Chat</span>
              <span className="text-sm font-medium text-blue-400">
                {speechRecognitionSupported ? 'Available' : 'Not Supported'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-400">Voice Responses</span>
              <span className={`text-sm font-medium ${voiceEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {voiceEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </Card>
      </div>
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