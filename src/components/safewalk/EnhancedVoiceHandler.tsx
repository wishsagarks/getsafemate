import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Smartphone } from 'lucide-react';
import { MobileAudioHandler } from './MobileAudioHandler';

interface EnhancedVoiceHandlerProps {
  isActive: boolean;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  onUserMessage: (message: string) => void;
  onSpeakMessage: (text: string) => Promise<void>;
  apiKeys?: {
    elevenlabs_api_key?: string;
    deepgram_api_key?: string;
  };
  isSpeaking: boolean;
  isListening: boolean;
  onListeningChange: (listening: boolean) => void;
  autoListenCountdown?: number;
  onError?: (error: string) => void;
  autoListenEnabled?: boolean;
  onAutoListenTrigger?: () => void;
}

export function EnhancedVoiceHandler({
  isActive,
  voiceEnabled,
  onVoiceToggle,
  onUserMessage,
  onSpeakMessage,
  apiKeys,
  isSpeaking,
  isListening,
  onListeningChange,
  autoListenCountdown = 0,
  onError,
  autoListenEnabled = true,
  onAutoListenTrigger
}: EnhancedVoiceHandlerProps) {
  const [isReadyToListen, setIsReadyToListen] = useState(true);
  const [deepgramSocket, setDeepgramSocket] = useState<WebSocket | null>(null);
  const [isDeepgramListening, setIsDeepgramListening] = useState(false);
  const [deepgramAvailable, setDeepgramAvailable] = useState(true);
  const [listeningTimeout, setListeningTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileAudioReady, setMobileAudioReady] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const deepgramMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mobileAudioPlayRef = useRef<((text: string) => Promise<void>) | null>(null);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return isMobileDevice || isTouchDevice;
    };

    setIsMobile(checkMobile());

    if (isActive) {
      initializeSpeechRecognition();
    }

    return cleanup;
  }, [isActive]);

  // Auto-listen trigger effect
  useEffect(() => {
    if (autoListenCountdown === 0 && autoListenEnabled && !isListening && !isSpeaking) {
      // Trigger auto-listen when countdown reaches 0
      setTimeout(() => {
        if (!isListening && !isSpeaking && autoListenEnabled) {
          console.log('🎤 Auto-listen triggered by countdown');
          startListening();
        }
      }, 100);
    }
  }, [autoListenCountdown, autoListenEnabled, isListening, isSpeaking]);

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (deepgramMediaRecorderRef.current && deepgramMediaRecorderRef.current.state !== 'inactive') {
      deepgramMediaRecorderRef.current.stop();
    }

    if (deepgramSocket) {
      deepgramSocket.close();
      setDeepgramSocket(null);
    }

    if (listeningTimeout) {
      clearTimeout(listeningTimeout);
      setListeningTimeout(null);
    }

    setIsDeepgramListening(false);
    onListeningChange(false);
    setIsReadyToListen(true);
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
    
    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started');
      onListeningChange(true);
      setIsReadyToListen(false);
      
      if (listeningTimeout) {
        clearTimeout(listeningTimeout);
      }
      
      const timeout = setTimeout(() => {
        console.log('🎤 Listening timeout - stopping automatically');
        stopListening();
      }, 10000);
      setListeningTimeout(timeout);
    };
    
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('🗣️ Speech recognized:', transcript);
      
      if (listeningTimeout) {
        clearTimeout(listeningTimeout);
        setListeningTimeout(null);
      }
      
      if (transcript.trim()) {
        onUserMessage(transcript);
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (listeningTimeout) {
        clearTimeout(listeningTimeout);
        setListeningTimeout(null);
      }
      
      if (event.error === 'no-speech') {
        onError?.("I didn't catch that. Could you please repeat?");
      }
      
      onListeningChange(false);
      setIsReadyToListen(true);
    };
    
    recognitionRef.current.onend = () => {
      console.log('🎤 Speech recognition ended');
      
      if (listeningTimeout) {
        clearTimeout(listeningTimeout);
        setListeningTimeout(null);
      }
      
      onListeningChange(false);
      setIsReadyToListen(true);
    };
  };

  const initializeDeepgramConnection = async () => {
    if (!apiKeys?.deepgram_api_key || !deepgramAvailable) {
      console.log('Deepgram not available, using browser speech recognition');
      return false;
    }

    try {
      console.log('🎙️ Initializing Deepgram connection...');
      
      const socket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=false&endpointing=300',
        ['token', apiKeys.deepgram_api_key]
      );

      socket.onopen = () => {
        console.log('✅ Deepgram WebSocket connected');
        setDeepgramSocket(socket);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript.trim();
            
            if (transcript && data.is_final) {
              console.log('🎙️ Deepgram transcript:', transcript);
              onUserMessage(transcript);
              stopDeepgramListening();
            }
          }
        } catch (error) {
          console.error('Error parsing Deepgram response:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('Deepgram WebSocket error:', error);
        setDeepgramAvailable(false);
        setDeepgramSocket(null);
      };

      socket.onclose = () => {
        console.log('Deepgram WebSocket closed');
        setDeepgramSocket(null);
        setIsDeepgramListening(false);
      };

      return true;
    } catch (error) {
      console.error('Error initializing Deepgram:', error);
      setDeepgramAvailable(false);
      return false;
    }
  };

  const startDeepgramListening = async () => {
    try {
      if (!deepgramSocket) {
        const initialized = await initializeDeepgramConnection();
        if (!initialized) {
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      deepgramMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
          deepgramSocket.send(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
          deepgramSocket.send(JSON.stringify({ type: 'CloseStream' }));
        }
      };

      mediaRecorder.start(100);
      setIsDeepgramListening(true);
      onListeningChange(true);
      setIsReadyToListen(false);

      const timeout = setTimeout(() => {
        console.log('🎙️ Deepgram listening timeout - stopping automatically');
        stopDeepgramListening();
      }, 10000);
      setListeningTimeout(timeout);

      console.log('🎙️ Deepgram listening started');
      return true;
    } catch (error) {
      console.error('Error starting Deepgram listening:', error);
      setDeepgramAvailable(false);
      return false;
    }
  };

  const stopDeepgramListening = () => {
    if (deepgramMediaRecorderRef.current && deepgramMediaRecorderRef.current.state !== 'inactive') {
      deepgramMediaRecorderRef.current.stop();
    }
    
    if (listeningTimeout) {
      clearTimeout(listeningTimeout);
      setListeningTimeout(null);
    }
    
    setIsDeepgramListening(false);
    onListeningChange(false);
    setIsReadyToListen(true);
    
    console.log('🎙️ Deepgram listening stopped');
  };

  const startListening = async () => {
    if (isListening || !isReadyToListen) {
      return;
    }

    // Try Deepgram first if available
    if (apiKeys?.deepgram_api_key && deepgramAvailable) {
      console.log('🎙️ Using Deepgram for speech recognition');
      const success = await startDeepgramListening();
      if (success) {
        return;
      }
      console.log('🔄 Deepgram failed, falling back to browser speech recognition');
    }

    // Fallback to browser speech recognition
    if (!recognitionRef.current) {
      console.log('Speech recognition not available');
      return;
    }

    try {
      if (recognitionRef.current.state !== 'inactive') {
        recognitionRef.current.stop();
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
      onListeningChange(false);
    }
  };

  const stopListening = () => {
    if (isDeepgramListening) {
      stopDeepgramListening();
    } else if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsReadyToListen(false);
    }
  };

  const handleMobileAudioReady = (playAudio: (text: string) => Promise<void>) => {
    mobileAudioPlayRef.current = playAudio;
    setMobileAudioReady(true);
    console.log('📱 Mobile audio handler ready');
  };

  const speakMessage = async (text: string) => {
    try {
      // On mobile, try mobile audio handler first
      if (isMobile && mobileAudioReady && mobileAudioPlayRef.current && apiKeys?.elevenlabs_api_key) {
        console.log('📱 Using mobile audio handler for ElevenLabs');
        await mobileAudioPlayRef.current(text);
        return;
      }

      // Fallback to regular speech synthesis
      await onSpeakMessage(text);
    } catch (error) {
      console.error('Error in enhanced voice handler:', error);
      // Final fallback to browser speech
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile Audio Handler */}
      <MobileAudioHandler
        isEnabled={isMobile && voiceEnabled && !!apiKeys?.elevenlabs_api_key}
        onAudioReady={handleMobileAudioReady}
        elevenLabsApiKey={apiKeys?.elevenlabs_api_key}
        onError={onError}
      />

      {/* Auto-listen countdown display */}
      {autoListenCountdown > 0 && autoListenEnabled && (
        <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <Mic className="h-4 w-4 text-blue-400 animate-pulse" />
            <span className="text-blue-200 text-sm font-medium">
              Auto-listening in {autoListenCountdown}s...
            </span>
          </div>
        </div>
      )}

      {/* Voice Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={isListening ? stopListening : startListening}
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
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mx-auto mb-1" />
              Voice Chat
            </>
          )}
        </button>
        
        <button
          onClick={onVoiceToggle}
          className={`p-3 rounded-lg transition-colors ${
            voiceEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white" />}
        </button>
      </div>

      {/* Status Indicators - Removed "Audio: Standard" */}
      <div className="grid grid-cols-1 gap-3 text-xs">
        <div className="p-2 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Mic className="h-3 w-3 text-orange-400" />
            <span className="text-white">
              Speech: {apiKeys?.deepgram_api_key && deepgramAvailable ? 'Deepgram' : 'Browser'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile-specific warnings */}
      {isMobile && !mobileAudioReady && apiKeys?.elevenlabs_api_key && (
        <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-yellow-200 text-sm">
              📱 Mobile audio optimization loading...
            </span>
          </div>
        </div>
      )}
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