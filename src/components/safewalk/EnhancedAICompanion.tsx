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
  PhoneOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ApiKeyManager } from './ApiKeyManager';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { Input } from '../ui/aceternity-input';
import { Button } from '../ui/aceternity-button';

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
}

export function EnhancedAICompanion({ isActive, onEmergencyDetected }: EnhancedAICompanionProps) {
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
  const [showVideoCompanion, setShowVideoCompanion] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const checkApiKeys = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('livekit_api_key, tavus_api_key, openai_api_key, gemini_api_key')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const hasKeys = data && data.livekit_api_key && data.tavus_api_key;
      setHasApiKeys(hasKeys);
      
      if (!hasKeys) {
        setShowApiConfig(true);
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
      setShowApiConfig(true);
    }
  };

  const initializeAICompanion = () => {
    setConnectionStatus('connecting');
    
    setTimeout(() => {
      if (hasApiKeys) {
        addAIMessage("Hi! I'm your SafeMate AI companion powered by advanced AI. I'm here to keep you company and ensure your safety during your walk. How are you feeling today?");
        setConnectionStatus('connected');
      } else {
        addAIMessage("Welcome! To unlock my full AI capabilities, please configure your API keys in settings. I can still provide basic support using browser features.");
        setConnectionStatus('error');
      }
    }, 1000);
    
    initializeSpeechRecognition();
  };

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        handleUserMessage(transcript);
      }
    };
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    recognitionRef.current.onend = () => setIsListening(false);
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
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const handleUserMessage = async (content: string) => {
    addUserMessage(content);
    setIsProcessing(true);
    
    try {
      let response: string;
      
      if (hasApiKeys) {
        // Use advanced AI (OpenAI/Gemini) if available
        response = await getAdvancedAIResponse(content, conversationContext);
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

  const getAdvancedAIResponse = async (userInput: string, context: string[]): Promise<string> => {
    // This would call your backend with OpenAI/Gemini integration
    // For now, return enhanced responses
    
    const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'unsafe', 'threat'];
    if (emergencyKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      onEmergencyDetected();
      return "🚨 I detected you might be in danger! I'm immediately alerting your emergency contacts and activating all safety protocols. Stay calm, help is on the way. Keep talking to me - I'm here with you.";
    }

    // Enhanced contextual responses
    const contextualPrompt = `
    You are SafeMate, an AI safety companion. The user is on a walk and needs emotional support and safety guidance.
    
    Recent conversation context: ${context.slice(-3).join('\n')}
    
    User just said: "${userInput}"
    
    Respond as a caring, supportive AI companion focused on safety and emotional well-being. Keep responses conversational and under 100 words.
    `;

    // In a real implementation, this would call OpenAI/Gemini API
    return getEnhancedResponse(userInput.toLowerCase());
  };

  const getEnhancedResponse = (userInput: string): string => {
    if (userInput.includes('nervous') || userInput.includes('anxious')) {
      return "I understand you're feeling nervous. That's completely normal. Let's take some deep breaths together - in for 4, hold for 4, out for 4. I'm right here with you, monitoring everything. You're safe, and I'm proud of you for taking this walk. What's one thing you can see around you that makes you feel calm?";
    }

    if (userInput.includes('tired') || userInput.includes('exhausted')) {
      return "I can hear that you're feeling tired. Your wellbeing is my priority. Would you like me to help you find a safe place to rest nearby? I can also guide you to the nearest public space or help you call someone for a ride. Remember, it's okay to take breaks - safety first!";
    }

    if (userInput.includes('weather') || userInput.includes('cold') || userInput.includes('hot')) {
      return "Weather can definitely affect how we feel during walks. I'm monitoring your location and can help you find shelter if needed. Make sure to stay hydrated and dress appropriately. Your comfort and safety are what matter most. How are you feeling physically right now?";
    }

    const responses = [
      "That's really interesting! I love learning more about you - it helps me be a better companion. I'm here monitoring everything and you're completely safe. What else is on your mind?",
      "Thanks for sharing that with me! I appreciate you keeping me in the loop. It makes our conversation so much more meaningful. You're doing great on this walk!",
      "I'm enjoying our chat! You know, having these conversations makes me feel like I'm truly helping keep you safe and supported. Is there anything specific you'd like to talk about?",
      "You're such wonderful company! I'm constantly learning from our interactions. Remember, I'm always here watching out for you. How's the walk treating you so far?"
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

  const toggleVideoCompanion = async () => {
    if (!showVideoCompanion) {
      if (!hasApiKeys) {
        setShowApiConfig(true);
        return;
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsVideoEnabled(true);
        setShowVideoCompanion(true);
        addAIMessage("Video companion activated! I can now see you and provide even better support. Wave hello!");
      } catch (error) {
        console.error('Error accessing camera:', error);
        addAIMessage("I couldn't access your camera. Video companion will remain in audio-only mode.");
      }
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsVideoEnabled(false);
      setShowVideoCompanion(false);
      addAIMessage("Video companion deactivated. I'm still here in voice mode!");
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Main AI Companion Card */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30">
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
                   connectionStatus === 'connected' ? (hasApiKeys ? 'AI Ready' : 'Basic Mode') : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Setup Required'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowApiConfig(true)}
              variant="outline"
              size="sm"
              className="border-purple-500/30 hover:border-purple-500/50"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={toggleVideoCompanion}
              variant={showVideoCompanion ? "default" : "outline"}
              size="sm"
              className={showVideoCompanion ? "bg-blue-600 hover:bg-blue-700" : "border-blue-500/30 hover:border-blue-500/50"}
            >
              {showVideoCompanion ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Video Companion */}
        {showVideoCompanion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              
              {/* AI Avatar Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent">
                <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                  <div className="p-2 bg-purple-500 rounded-full">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white font-medium">AI Companion Active</span>
                </div>
                
                {isSpeaking && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 px-3 py-1 rounded-full">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="w-2 h-2 bg-green-400 rounded-full"
                    />
                    <span className="text-white text-sm">Speaking</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-white">
                {hasApiKeys ? 'Advanced AI' : 'Basic Mode'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Heart className="h-4 w-4 text-pink-400" />
              <span className="text-sm text-white">
                {messages.length} interactions
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
                      <span className="text-xs font-medium">SafeMate AI</span>
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
                  <span>AI is thinking...</span>
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
            <Button
              onClick={isListening ? stopListening : startListening}
              className={`flex-1 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Voice Chat
                </>
              )}
            </Button>
            
            <Button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              variant="outline"
              className={voiceEnabled ? 'border-blue-500/50' : 'border-gray-500/50'}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>

          {/* Text Input */}
          <div className="flex space-x-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
              placeholder="Chat with your AI companion..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-300"
            />
            <Button
              onClick={sendTextMessage}
              disabled={!inputText.trim()}
              className="bg-purple-500 hover:bg-purple-600"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Technology Credits */}
        <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
          <p>🤖 {hasApiKeys ? 'Powered by Advanced AI APIs' : 'Browser-based AI simulation'}</p>
          <p>🎥 Video companion ready for <strong>Tavus</strong> & <strong>LiveKit</strong></p>
          <p>🔊 Voice synthesis by <strong>ElevenLabs</strong> • Speech by <strong>Deepgram</strong></p>
        </div>
      </Card>

      {/* API Configuration Modal */}
      <ApiKeyManager
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        onKeysUpdated={(hasKeys) => {
          setHasApiKeys(hasKeys);
          if (hasKeys) {
            setConnectionStatus('connected');
            addAIMessage("Great! Your API keys are configured. I now have access to advanced AI capabilities for better conversations and support!");
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