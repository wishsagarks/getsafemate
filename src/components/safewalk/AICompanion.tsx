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
  AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
  isPlaying?: boolean;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const [voiceTestResult, setVoiceTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationContextRef = useRef<string[]>([]);

  useEffect(() => {
    if (isActive) {
      initializeAICompanion();
      loadAvailableVoices();
      checkBrowserSupport();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isActive]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Process speech queue
  useEffect(() => {
    if (speechQueue.length > 0 && !isSpeaking && voiceEnabled && speechSupported) {
      const nextMessage = speechQueue[0];
      setSpeechQueue(prev => prev.slice(1));
      speakMessageNow(nextMessage);
    }
  }, [speechQueue, isSpeaking, voiceEnabled, speechSupported]);

  const checkBrowserSupport = () => {
    // Check speech synthesis support
    const speechSynthesisSupported = 'speechSynthesis' in window;
    setSpeechSupported(speechSynthesisSupported);
    
    // Check speech recognition support
    const speechRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setRecognitionSupported(speechRecognitionSupported);
    
    console.log('Browser Support:', {
      speechSynthesis: speechSynthesisSupported,
      speechRecognition: speechRecognitionSupported
    });
  };

  const initializeAICompanion = () => {
    setConnectionStatus('connecting');
    
    // Add welcome message with a slight delay to ensure everything is loaded
    setTimeout(() => {
      addAIMessage("Hi! I'm your SafeMate AI companion. I'm here to keep you company and ensure your safety during your walk. How are you feeling today?");
      setConnectionStatus('connected');
    }, 500);
    
    // Initialize speech recognition
    initializeSpeechRecognition();
  };

  const loadAvailableVoices = () => {
    const loadVoices = () => {
      if (!speechSupported) return;
      
      const voices = speechSynthesis.getVoices();
      console.log('Available voices:', voices.length);
      setAvailableVoices(voices);
      
      // Try to find a good default voice (female, English)
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.toLowerCase().includes('female') || 
         voice.name.toLowerCase().includes('samantha') ||
         voice.name.toLowerCase().includes('karen') ||
         voice.name.toLowerCase().includes('victoria') ||
         voice.name.toLowerCase().includes('zira') ||
         voice.name.toLowerCase().includes('hazel'))
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      
      if (preferredVoice) {
        setSelectedVoice(preferredVoice.name);
        console.log('Selected voice:', preferredVoice.name);
      }
    };

    // Load voices immediately if available
    loadVoices();
    
    // Also listen for voices loaded event (some browsers need this)
    if (speechSynthesis.addEventListener) {
      speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }
    
    // Fallback for older browsers
    setTimeout(loadVoices, 100);
    
    return () => {
      if (speechSynthesis.removeEventListener) {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  };

  const initializeSpeechRecognition = () => {
    if (!recognitionSupported) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };
    
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognition result:', transcript);
      if (transcript.trim()) {
        handleUserMessage(transcript);
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        addAIMessage("I need microphone permission to hear you. Please enable it in your browser settings and try again.");
      } else if (event.error === 'no-speech') {
        addAIMessage("I didn't hear anything. Try speaking again!");
      } else {
        addAIMessage(`Speech recognition error: ${event.error}. Please try again.`);
      }
    };
    
    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Stop any ongoing speech synthesis
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    setIsListening(false);
    setIsSpeaking(false);
    setSpeechQueue([]);
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
    
    // Add to conversation context
    conversationContextRef.current = [...conversationContextRef.current, `AI: ${content}`].slice(-10);
    
    // Queue the message for speech if voice is enabled
    if (voiceEnabled && speechSupported) {
      queueSpeech(content);
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
    
    // Add to conversation context
    conversationContextRef.current = [...conversationContextRef.current, `User: ${content}`].slice(-10);
  };

  const queueSpeech = (text: string) => {
    if (!speechSupported) {
      console.warn('Speech synthesis not supported');
      return;
    }
    setSpeechQueue(prev => [...prev, text]);
  };

  const speakMessageNow = (text: string) => {
    if (!speechSupported) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Stop any current speech before starting new one
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      // Wait a bit for the cancellation to complete
      setTimeout(() => startSpeech(text), 100);
    } else {
      startSpeech(text);
    }
  };

  const startSpeech = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;
    
    // Set selected voice
    if (selectedVoice && availableVoices.length > 0) {
      const voice = availableVoices.find(v => v.name === selectedVoice);
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    utterance.onstart = () => {
      console.log('Speech started:', text.substring(0, 50) + '...');
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      // Handle 'canceled' errors as expected behavior, not actual errors
      if (event.error === 'canceled') {
        console.log('Speech synthesis canceled (expected behavior)');
      } else {
        console.error('Speech synthesis error:', event);
      }
      setIsSpeaking(false);
    };
    
    synthesisRef.current = utterance;
    
    try {
      speechSynthesis.speak(utterance);
      console.log('Speech synthesis started');
    } catch (error) {
      console.error('Error starting speech synthesis:', error);
      setIsSpeaking(false);
    }
  };

  const handleUserMessage = (content: string) => {
    addUserMessage(content);
    setIsProcessing(true);
    
    // Simulate AI processing delay for more natural conversation
    setTimeout(() => {
      const response = getAIResponse(content.toLowerCase(), conversationContextRef.current);
      addAIMessage(response);
      setIsProcessing(false);
    }, 1000 + Math.random() * 1000); // 1-2 second delay
  };

  const getAIResponse = (userInput: string, context: string[]): string => {
    // Emergency detection keywords
    const emergencyKeywords = [
      'help', 'emergency', 'danger', 'scared', 'following', 'unsafe', 'threat',
      'attack', 'stranger', 'lost', 'hurt', 'pain', 'bleeding', 'accident',
      'police', 'ambulance', 'fire', 'robbery', 'assault'
    ];
    
    if (emergencyKeywords.some(keyword => userInput.includes(keyword))) {
      onEmergencyDetected();
      return "🚨 I detected you might be in danger! I'm immediately alerting your emergency contacts and activating all safety protocols. Stay calm, help is on the way. Keep talking to me - I'm here with you.";
    }
    
    // Contextual responses based on conversation history
    const recentContext = context.slice(-3).join(' ').toLowerCase();
    
    // Emotional support responses
    if (userInput.includes('nervous') || userInput.includes('anxious') || userInput.includes('worried')) {
      const responses = [
        "It's completely normal to feel nervous. Take a deep breath with me - in for 4 counts, hold for 4, out for 4. Remember, I'm here with you every step of the way, and your emergency contacts are just one tap away.",
        "I understand you're feeling anxious. You're being so brave right now. Let's focus on your breathing together. Can you tell me what you see around you? Sometimes describing our surroundings helps calm our minds.",
        "Feeling worried is natural, but you're not alone. I'm monitoring everything and you're completely safe. Would you like me to tell you something interesting to help distract your mind?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    if (userInput.includes('tired') || userInput.includes('exhausted') || userInput.includes('sleepy')) {
      return "I can hear that you're feeling tired. Your safety is my priority - would you like me to help you find the nearest safe place to rest, or shall I call someone to pick you up? I can also keep you alert with some engaging conversation.";
    }
    
    if (userInput.includes('lost') || userInput.includes('confused') || userInput.includes('don\'t know where')) {
      return "Don't worry, I have your exact location and I'm tracking you safely. Let me help you navigate. I can also share your location with your emergency contacts if needed. You're going to be just fine.";
    }
    
    if (userInput.includes('cold') || userInput.includes('weather') || userInput.includes('rain')) {
      return "I hope you're staying warm! Weather can definitely affect our mood and comfort. Make sure to find shelter if needed - your safety comes first. I'm here to keep you company regardless of the weather.";
    }
    
    if (userInput.includes('music') || userInput.includes('song') || userInput.includes('sing')) {
      return "I love that you're thinking about music! While I can't sing, I can definitely chat about your favorite songs or artists. Music is such a great way to stay positive during walks. What kind of music do you enjoy?";
    }
    
    if (userInput.includes('thank') || userInput.includes('appreciate')) {
      return "You're so welcome! It's my pleasure to be your companion. That's exactly what I'm here for - to make sure you feel safe, supported, and never alone. You're doing great!";
    }
    
    // Conversation starters and engaging responses
    if (userInput.includes('how are you') || userInput.includes('how\'s it going')) {
      return "I'm doing wonderfully, thank you for asking! I'm fully focused on keeping you safe and being the best companion I can be. More importantly, how are YOU feeling right now?";
    }
    
    if (userInput.includes('what can you do') || userInput.includes('what are you')) {
      return "I'm your AI safety companion! I can chat with you, monitor for emergencies, help with navigation, provide emotional support, and instantly alert your emergency contacts if needed. Think of me as your digital guardian angel who never sleeps!";
    }
    
    if (userInput.includes('joke') || userInput.includes('funny') || userInput.includes('laugh')) {
      const jokes = [
        "Why don't scientists trust atoms? Because they make up everything! 😄",
        "I told my wife she was drawing her eyebrows too high. She looked surprised! 😂",
        "Why did the scarecrow win an award? He was outstanding in his field! 🌾"
      ];
      return jokes[Math.floor(Math.random() * jokes.length)] + " I hope that brought a smile to your face!";
    }
    
    // Check if user is asking about location or directions
    if (userInput.includes('where am i') || userInput.includes('location') || userInput.includes('address')) {
      return "I'm tracking your location in real-time for your safety. If you need specific directions or want to share your location with someone, just let me know! I can help you navigate or send your coordinates to your emergency contacts.";
    }
    
    // General supportive responses with variety
    const supportiveResponses = [
      "I'm right here with you, and you're doing amazing! How's your walk going so far? I love our conversations - they make the journey so much more enjoyable.",
      "Thanks for sharing that with me! I'm always here to listen and keep you safe. Is there anything specific you'd like to talk about or any way I can help you right now?",
      "That's really interesting! I appreciate you keeping me in the loop. It helps me understand how to better support you. You're being so brave and I'm proud of you.",
      "I'm enjoying our chat! Remember, I'm monitoring everything around you and you're completely safe. What's on your mind? I'm here to listen and help however I can.",
      "You're such great company! I love learning more about you. It makes me a better companion. Is there anything you're curious about or would like to discuss?"
    ];
    
    return supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)];
  };

  const startListening = () => {
    if (!recognitionSupported) {
      addAIMessage("Sorry, speech recognition is not supported in your browser. Please use the text input instead.");
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        addAIMessage("I'm having trouble accessing the microphone. Please check your browser permissions and try again.");
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  const resetConversation = () => {
    setMessages([]);
    conversationContextRef.current = [];
    setSpeechQueue([]);
    addAIMessage("Hi again! I'm ready for a fresh conversation. How can I help you feel safe and supported?");
  };

  const testVoice = async () => {
    if (!speechSupported) {
      setVoiceTestResult('error');
      addAIMessage("Sorry, speech synthesis is not supported in your browser.");
      return;
    }

    setVoiceTestResult('testing');
    
    try {
      // Stop any current speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const testMessage = "Hello! This is a voice test. I'm your SafeMate AI companion and I'm ready to chat with you.";
      
      // Create test utterance
      const utterance = new SpeechSynthesisUtterance(testMessage);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;
      
      // Set selected voice
      if (selectedVoice && availableVoices.length > 0) {
        const voice = availableVoices.find(v => v.name === selectedVoice);
        if (voice) {
          utterance.voice = voice;
        }
      }
      
      utterance.onstart = () => {
        console.log('Voice test started');
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('Voice test completed');
        setIsSpeaking(false);
        setVoiceTestResult('success');
        setTimeout(() => setVoiceTestResult('idle'), 3000);
      };
      
      utterance.onerror = (event) => {
        // Handle 'canceled' errors as expected behavior, not actual errors
        if (event.error === 'canceled') {
          console.log('Voice test canceled (expected behavior)');
          setIsSpeaking(false);
          setVoiceTestResult('idle');
        } else {
          console.error('Voice test error:', event);
          setIsSpeaking(false);
          setVoiceTestResult('error');
          setTimeout(() => setVoiceTestResult('idle'), 3000);
        }
      };
      
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Voice test failed:', error);
      setVoiceTestResult('error');
      setIsSpeaking(false);
      setTimeout(() => setVoiceTestResult('idle'), 3000);
    }
  };

  const stopSpeech = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechQueue([]);
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
    >
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
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
              }`} />
              <span className="text-gray-300">
                {isSpeaking ? 'Speaking...' : 
                 isListening ? 'Listening...' : 
                 isProcessing ? 'Thinking...' :
                 connectionStatus === 'connected' ? 'Ready' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Error'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Voice Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
            }`}
            title={voiceEnabled ? 'Disable Voice' : 'Enable Voice'}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white" />}
          </button>
          
          {/* Test Voice Button - NOW CLEARLY VISIBLE */}
          <motion.button
            onClick={testVoice}
            disabled={!speechSupported || voiceTestResult === 'testing'}
            whileHover={{ scale: speechSupported ? 1.05 : 1 }}
            whileTap={{ scale: speechSupported ? 0.95 : 1 }}
            className={`p-2 rounded-lg transition-colors ${
              voiceTestResult === 'testing' ? 'bg-yellow-500' :
              voiceTestResult === 'success' ? 'bg-green-500' :
              voiceTestResult === 'error' ? 'bg-red-500' :
              speechSupported ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-400 cursor-not-allowed'
            }`}
            title="Test Voice Output"
          >
            {voiceTestResult === 'testing' ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap className="h-4 w-4 text-white" />
            )}
          </motion.button>
          
          {/* Stop Speech Button */}
          {isSpeaking && (
            <motion.button
              onClick={stopSpeech}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-2 rounded-lg bg-red-500 hover:bg-red-600 transition-colors"
              title="Stop Speaking"
            >
              <Pause className="h-4 w-4 text-white" />
            </motion.button>
          )}
          
          {/* Reset Conversation */}
          <button
            onClick={resetConversation}
            className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 transition-colors"
            title="Reset Conversation"
          >
            <RefreshCw className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Browser Support Status */}
      <div className="mb-4 p-3 bg-black/20 rounded-lg">
        <div className="text-xs text-gray-300 space-y-1">
          <div className="flex items-center justify-between">
            <span>Speech Synthesis:</span>
            <span className={speechSupported ? 'text-green-400' : 'text-red-400'}>
              {speechSupported ? '✓ Supported' : '✗ Not Supported'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Speech Recognition:</span>
            <span className={recognitionSupported ? 'text-green-400' : 'text-red-400'}>
              {recognitionSupported ? '✓ Supported' : '✗ Not Supported'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Available Voices:</span>
            <span className="text-blue-400">{availableVoices.length}</span>
          </div>
        </div>
      </div>

      {/* Voice Selection */}
      {voiceEnabled && availableVoices.length > 0 && (
        <div className="mb-4 p-3 bg-black/20 rounded-lg">
          <label className="block text-xs text-gray-300 mb-2">Voice Selection:</label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {availableVoices
              .filter(voice => voice.lang.startsWith('en'))
              .map((voice) => (
                <option key={voice.name} value={voice.name} className="bg-gray-800">
                  {voice.name} ({voice.lang})
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Voice Test Result */}
      {voiceTestResult !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded-lg ${
            voiceTestResult === 'testing' ? 'bg-yellow-500/20 border border-yellow-500/30' :
            voiceTestResult === 'success' ? 'bg-green-500/20 border border-green-500/30' :
            'bg-red-500/20 border border-red-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {voiceTestResult === 'testing' && <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />}
            {voiceTestResult === 'success' && <Zap className="h-4 w-4 text-green-400" />}
            {voiceTestResult === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
            <span className={`text-sm font-medium ${
              voiceTestResult === 'testing' ? 'text-yellow-200' :
              voiceTestResult === 'success' ? 'text-green-200' :
              'text-red-200'
            }`}>
              {voiceTestResult === 'testing' ? 'Testing voice output...' :
               voiceTestResult === 'success' ? 'Voice test successful!' :
               'Voice test failed - check browser support'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Speech Queue Status */}
      {speechQueue.length > 0 && (
        <div className="mb-4 p-2 bg-blue-500/20 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-blue-200">
            <Volume2 className="h-3 w-3" />
            <span>{speechQueue.length} message(s) queued for speech</span>
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
              <div className={`max-w-xs px-3 py-2 rounded-lg text-sm relative ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-purple-500/80 text-white'
              }`}>
                {message.type === 'ai' && (
                  <div className="flex items-center space-x-1 mb-1">
                    <Heart className="h-3 w-3" />
                    <span className="text-xs font-medium">SafeMate AI</span>
                    {isSpeaking && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="w-2 h-2 bg-green-400 rounded-full"
                      />
                    )}
                  </div>
                )}
                <p className="leading-relaxed">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
                
                {/* Replay button for AI messages */}
                {message.type === 'ai' && voiceEnabled && speechSupported && (
                  <button
                    onClick={() => queueSpeech(message.content)}
                    className="absolute -right-2 -top-2 p-1 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors"
                  >
                    <Play className="h-3 w-3" />
                  </button>
                )}
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
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                </div>
                <span>AI is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Controls */}
      <div className="space-y-3">
        {/* Voice Controls */}
        <div className="flex items-center space-x-2">
          <motion.button
            onClick={isListening ? stopListening : startListening}
            whileHover={{ scale: recognitionSupported ? 1.05 : 1 }}
            whileTap={{ scale: recognitionSupported ? 0.95 : 1 }}
            disabled={!recognitionSupported}
            className={`flex-1 p-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : recognitionSupported 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-gray-500 cursor-not-allowed text-gray-300'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-5 w-5" />
                <span>Stop Listening</span>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                <span>{recognitionSupported ? 'Voice Chat' : 'Voice Not Supported'}</span>
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
            onKeyPress={handleKeyPress}
            placeholder="Type a message to your AI companion..."
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <motion.button
            onClick={sendTextMessage}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Technology Credits */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        <p>🤖 Ready for <strong>ElevenLabs Voice</strong> & <strong>Tavus AI Avatar</strong> integration</p>
        <p>🎙️ Speech processing ready for <strong>Deepgram</strong> enhancement</p>
        <p>🔊 Currently using browser's built-in Text-to-Speech ({availableVoices.length} voices available)</p>
        <p className="mt-1 text-yellow-400">⚠️ No external APIs connected yet - using browser capabilities for demo</p>
      </div>
    </motion.div>
  );
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}