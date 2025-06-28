import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
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
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef<number>(0);

  useEffect(() => {
    if (isActive) {
      checkApiKeys();
      initializeCompanion();
    }
  }, [isActive]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    
    if (voiceEnabled && !isSpeaking) {
      speakMessage(content);
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
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    
    try {
      // Use browser speech synthesis for now
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 1.0;
        
        // Try to use a female voice
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
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        utterance.onerror = () => {
          setIsSpeaking(false);
        };
        
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error speaking message:', error);
      setIsSpeaking(false);
    }
  };

  const handleUserMessage = async (content: string) => {
    addUserMessage(content);
    setIsProcessing(true);
    
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

  return (
    <div className="space-y-6">
      {/* Companion Status */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ 
                scale: isActive ? [1, 1.1, 1] : 1,
                rotate: isActive ? [0, 5, -5, 0] : 0
              }}
              transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
              className="p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
            >
              <Heart className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">HeartMate AI</h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className="text-gray-600 dark:text-gray-300">
                  {isActive ? `Active • ${formatTime(sessionDuration)}` : 'Ready to support you'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {currentMood && (
              <div className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                {getMoodIcon(currentMood.mood)}
                <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                  {currentMood.mood.replace('-', ' ')}
                </span>
              </div>
            )}
            
            <motion.button
              onClick={onToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                isActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-pink-500 hover:bg-pink-600 text-white'
              }`}
            >
              {isActive ? 'Pause' : 'Start'} Session
            </motion.button>
          </div>
        </div>

        {/* API Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {hasApiKeys ? 'Gemini AI' : 'Basic Mode'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                Voice Ready
              </span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                Private & Safe
              </span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-pink-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                Emotional AI
              </span>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 h-80 overflow-y-auto mb-4 space-y-3">
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
                    ? 'bg-pink-500 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                }`}>
                  {message.type === 'ai' && (
                    <div className="flex items-center space-x-2 mb-2">
                      <Heart className="h-3 w-3 text-pink-500" />
                      <span className="text-xs font-medium text-pink-500">
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
          
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-2xl text-sm shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                        className="w-2 h-2 bg-pink-500 rounded-full"
                      />
                    ))}
                  </div>
                  <span>HeartMate is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Controls */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
            placeholder="Share your thoughts and feelings..."
            className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          />
          <button
            onClick={sendTextMessage}
            disabled={!inputText.trim()}
            className="px-4 py-3 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`px-4 py-3 rounded-xl transition-colors ${
              voiceEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            {voiceEnabled ? <Volume2 className="h-5 w-5 text-white" /> : <VolumeX className="h-5 w-5 text-white" />}
          </button>
        </div>

        {/* API Configuration Notice */}
        {!hasApiKeys && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                Configure API keys in Settings for enhanced AI emotional support
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Emotional Support Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Emotional Check-ins */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-pink-500" />
            <span>Quick Check-ins</span>
          </h3>
          
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
                className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Session Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span>Session Progress</span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Session Time</span>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatTime(sessionDuration)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Messages Exchanged</span>
              <span className="text-lg font-bold text-pink-600 dark:text-pink-400">
                {messages.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">AI Mode</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {hasApiKeys ? 'Enhanced' : 'Basic'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}