import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageCircle, 
  Heart,
  Brain,
  Zap
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
}

interface AICompanionProps {
  isActive: boolean;
  onEmergencyDetected: () => void;
}

export function AICompanion({ isActive, onEmergencyDetected }: AICompanionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (isActive) {
      // Initialize AI companion
      addAIMessage("Hi! I'm your SafeMate AI companion. I'm here to keep you company and ensure your safety during your walk. How are you feeling today?");
      
      // Initialize speech recognition if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
            
          if (event.results[event.results.length - 1].isFinal) {
            handleUserMessage(transcript);
          }
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, [isActive]);

  const addAIMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, message]);
    
    // Speak the message if voice is enabled
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
  };

  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;
      
      // Try to use a female voice for more comforting experience
      const voices = speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('samantha')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      synthesisRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  };

  const handleUserMessage = (content: string) => {
    addUserMessage(content);
    
    // Simple AI response logic (in production, this would use ElevenLabs + Tavus)
    setTimeout(() => {
      const responses = getAIResponse(content.toLowerCase());
      addAIMessage(responses);
    }, 1000);
  };

  const getAIResponse = (userInput: string): string => {
    // Emergency detection keywords
    const emergencyKeywords = ['help', 'emergency', 'danger', 'scared', 'following', 'unsafe', 'threat'];
    
    if (emergencyKeywords.some(keyword => userInput.includes(keyword))) {
      onEmergencyDetected();
      return "I detected you might be in danger. I'm immediately alerting your emergency contacts and activating all safety protocols. Stay calm, help is on the way.";
    }
    
    // Emotional support responses
    if (userInput.includes('nervous') || userInput.includes('anxious')) {
      return "It's completely normal to feel nervous. Take a deep breath with me. Remember, I'm here with you every step of the way, and your emergency contacts are just one tap away.";
    }
    
    if (userInput.includes('tired') || userInput.includes('exhausted')) {
      return "I understand you're feeling tired. Would you like me to help you find the nearest safe place to rest, or shall I call someone to pick you up?";
    }
    
    if (userInput.includes('lost') || userInput.includes('confused')) {
      return "Don't worry, I have your exact location. Let me help you navigate. I can also share your location with your emergency contacts if needed.";
    }
    
    // General supportive responses
    const supportiveResponses = [
      "I'm right here with you. You're doing great! How's the walk going so far?",
      "Thanks for sharing that with me. I'm always here to listen and keep you safe.",
      "That's interesting! I love our conversations. It makes the walk much more enjoyable.",
      "You're being so brave. Remember, I'm monitoring everything and you're completely safe.",
      "I appreciate you talking with me. It helps me understand how to better support you."
    ];
    
    return supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)];
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
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
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ 
              scale: isSpeaking ? [1, 1.1, 1] : 1,
              rotate: isSpeaking ? [0, 5, -5, 0] : 0
            }}
            transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
            className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Brain className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h3 className="text-white font-semibold">AI Companion</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-gray-300">
                {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white" />}
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="bg-black/20 rounded-lg p-4 h-48 overflow-y-auto mb-4 space-y-3">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-purple-500/80 text-white'
            }`}>
              {message.type === 'ai' && (
                <div className="flex items-center space-x-1 mb-1">
                  <Heart className="h-3 w-3" />
                  <span className="text-xs font-medium">SafeMate AI</span>
                </div>
              )}
              <p>{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Controls */}
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
        </div>

        {/* Text Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
            placeholder="Type a message to your AI companion..."
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={sendTextMessage}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Technology Credits */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        <p>🤖 Powered by <strong>Tavus AI Avatar</strong> & <strong>ElevenLabs Voice</strong></p>
        <p>🎙️ Speech processing by <strong>Deepgram</strong></p>
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