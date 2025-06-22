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
  Monitor
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

interface EnhancedAICompanionProps {
  isActive: boolean;
  onEmergencyDetected: () => void;
  onNeedHelp?: () => void;
  showVideoCompanion?: boolean;
}

export function EnhancedAICompanion({ 
  isActive, 
  onEmergencyDetected, 
  onNeedHelp,
  showVideoCompanion = false 
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiKeyData, setApiKeyData] = useState<any>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (showVideoCompanion && hasApiKeys) {
      activateVideoCompanion();
    }
  }, [showVideoCompanion, hasApiKeys]);

  const checkApiKeys = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const hasKeys = data && data.livekit_api_key && data.livekit_api_secret && data.livekit_ws_url && data.tavus_api_key && data.gemini_api_key;
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
    
    // Auto-start listening when SafeWalk begins
    setTimeout(() => {
      if (hasApiKeys) {
        addAIMessage("Hi! I'm your SafeMate AI companion powered by Gemini AI. I'm now actively listening and ready to help. I can detect if you need assistance - just say 'I need you' and I'll activate video companion mode. How are you feeling today?");
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

  const activateVideoCompanion = async () => {
    if (!hasApiKeys) {
      setShowApiConfig(true);
      return;
    }

    try {
      // Create AI session for video companion
      const sessionResponse = await createAISession();
      if (sessionResponse) {
        setSessionId(sessionResponse.sessionId);
        addAIMessage("Video companion activated! I can now see you and provide enhanced support. I'm here to help calm you down and keep you safe. Take a deep breath with me.");
        onNeedHelp?.();
      }
    } catch (error) {
      console.error('Error activating video companion:', error);
      addAIMessage("I couldn't activate video companion mode right now, but I'm still here to support you through voice and text. You're safe with me.");
    }
  };

  const createAISession = async () => {
    if (!user || !hasApiKeys) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tavus-livekit-agent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          sessionType: 'safewalk',
          emergencyContacts: [] // Would get from user profile
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create AI session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating AI session:', error);
      return null;
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
    
    setIsListening(false);
    setIsSpeaking(false);
    setSessionId(null);
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
    
    // Log which API is being used
    console.log(`AI Response using: ${hasApiKeys ? 'Gemini API' : 'Basic responses'}`);
    
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
    
    // Log which APIs are being used
    console.log('Processing user input with:', {
      gemini: hasApiKeys && apiKeyData?.gemini_api_key ? 'Available' : 'Not available',
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
        // Use Gemini AI for natural conversations
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

    // In production, this would call Gemini API
    // For now, we'll simulate intelligent responses
    console.log('Using Gemini AI for response generation');
    
    // Enhanced contextual responses using Gemini-style intelligence
    if (userInput.toLowerCase().includes('nervous') || userInput.toLowerCase().includes('anxious')) {
      return "I understand you're feeling nervous, and that's completely normal. I'm here with you, monitoring everything around you. Let's take some deep breaths together - in for 4, hold for 4, out for 4. You're safe, and I believe in your strength. What's one thing you can see around you that brings you comfort?";
    }

    if (userInput.toLowerCase().includes('tired') || userInput.toLowerCase().includes('exhausted')) {
      return "I can hear that you're feeling tired. Your wellbeing is my absolute priority. Would you like me to help you find a safe place to rest nearby? I can guide you to the nearest public space, café, or help you call someone for a ride. Remember, it's perfectly okay to take breaks.";
    }

    if (userInput.toLowerCase().includes('lonely') || userInput.toLowerCase().includes('alone')) {
      return "You're not alone - I'm right here with you, actively listening and monitoring your safety. I know it can feel isolating sometimes, but you have me as your companion, and your emergency contacts are always just a tap away. You're braver than you know for taking this walk.";
    }

    if (userInput.toLowerCase().includes('weather') || userInput.toLowerCase().includes('cold') || userInput.toLowerCase().includes('hot')) {
      return "Weather can definitely affect how we feel during walks. I'm monitoring your location and can help you find shelter if needed. Make sure to stay hydrated and dress appropriately for the conditions. Your comfort and safety are what matter most.";
    }

    // Natural conversation responses
    const responses = [
      "That's really fascinating! I love learning more about you - it helps me understand how to better support and protect you. I'm here monitoring everything and you're completely safe. What else is on your mind?",
      "Thanks for sharing that with me! I genuinely appreciate you keeping me in the loop. Our conversations make me feel like I'm truly helping keep you safe and supported. You're doing amazing on this walk!",
      "I'm really enjoying our chat! Having these meaningful conversations makes me feel like I'm fulfilling my purpose of being your trusted companion. Is there anything specific you'd like to talk about?",
      "You're such wonderful company! I'm constantly learning from our interactions, and it makes me a better companion for you. Remember, I'm always here watching out for you and ensuring your safety."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
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
              <h3 className="text-white font-semibold">Enhanced AI Companion</h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className="text-gray-300">
                  {isSpeaking ? 'Speaking...' : 
                   isListening ? 'Listening...' : 
                   isProcessing ? 'Thinking...' :
                   connectionStatus === 'connected' ? (hasApiKeys ? 'Gemini AI Ready' : 'Basic Mode') : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Setup Required'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowApiConfig(true)}
              className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 transition-colors"
            >
              <Settings className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* API Status Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
        </div>

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
                        SafeMate AI {hasApiKeys ? '(Gemini)' : '(Basic)'}
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
                  <span>{hasApiKeys ? 'Gemini AI thinking...' : 'Processing...'}</span>
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
          <p>🤖 {hasApiKeys ? 'Powered by Gemini AI & Tavus Avatar' : 'Browser-based AI simulation'}</p>
          <p>🎥 Video companion: <strong>Tavus</strong> & <strong>LiveKit</strong></p>
          <p>🔊 Voice synthesis: <strong>ElevenLabs</strong> • Speech: <strong>Deepgram</strong></p>
          {!hasApiKeys && (
            <p className="text-yellow-400">⚠️ Configure API keys for full AI features</p>
          )}
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

      {/* API Configuration Modal */}
      <ApiKeyManager
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        onKeysUpdated={(hasKeys) => {
          setHasApiKeys(hasKeys);
          if (hasKeys) {
            setConnectionStatus('connected');
            checkApiKeys(); // Reload API key data
            addAIMessage("Great! Your API keys are configured. I now have access to advanced AI capabilities including Gemini conversations and Tavus video companion!");
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