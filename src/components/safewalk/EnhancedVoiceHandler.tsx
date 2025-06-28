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
  autoListenEnabled = false, // Disabled by default now
  onAutoListenTrigger
}: EnhancedVoiceHandlerProps) {
  const [isReadyToListen, setIsReadyToListen] = useState(true);
  const [deepgramSocket, setDeepgramSocket] = useState<WebSocket | null>(null);
  const [isDeepgramListening, setIsDeepgramListening] = useState(false);
  const [deepgramAvailable, setDeepgramAvailable] = useState(true);
  const [listeningTimeout, setListeningTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileAudioReady, setMobileAudioReady] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastTranscript, setLastTranscript] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const deepgramMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mobileAudioPlayRef = useRef<((text: string) => Promise<void>) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const cleanup = () => {
    console.log('🧹 Cleaning up voice handler...');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Recognition already stopped');
      }
    }

    if (deepgramMediaRecorderRef.current && deepgramMediaRecorderRef.current.state !== 'inactive') {
      try {
        deepgramMediaRecorderRef.current.stop();
      } catch (error) {
        console.log('MediaRecorder already stopped');
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🎤 Audio track stopped');
      });
      streamRef.current = null;
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
    setConnectionAttempts(0);
  };

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onstart = () => {
        console.log('🎤 Browser speech recognition started');
        onListeningChange(true);
        setIsReadyToListen(false);
        
        if (listeningTimeout) {
          clearTimeout(listeningTimeout);
        }
        
        // Fixed 10-second timeout
        const timeout = setTimeout(() => {
          console.log('🎤 10-second timeout - stopping automatically');
          stopListening();
        }, 10000);
        setListeningTimeout(timeout);
      };
      
      recognitionRef.current.onresult = (event) => {
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript.trim();
          console.log('🗣️ Browser speech recognized:', transcript);
          
          if (listeningTimeout) {
            clearTimeout(listeningTimeout);
            setListeningTimeout(null);
          }
          
          if (transcript && transcript !== lastTranscript) {
            setLastTranscript(transcript);
            onUserMessage(transcript);
          } else if (!transcript) {
            onError?.("I didn't catch that. Could you please repeat?");
          }
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Browser speech recognition error:', event.error);
        
        if (listeningTimeout) {
          clearTimeout(listeningTimeout);
          setListeningTimeout(null);
        }
        
        if (event.error === 'no-speech') {
          onError?.("I didn't hear anything. Please try speaking again.");
        } else if (event.error === 'audio-capture') {
          onError?.("Microphone access denied. Please check your permissions.");
        } else if (event.error === 'not-allowed') {
          onError?.("Microphone permission denied. Please allow microphone access.");
        } else {
          onError?.(`Speech recognition error: ${event.error}`);
        }
        
        onListeningChange(false);
        setIsReadyToListen(true);
      };
      
      recognitionRef.current.onend = () => {
        console.log('🎤 Browser speech recognition ended');
        
        if (listeningTimeout) {
          clearTimeout(listeningTimeout);
          setListeningTimeout(null);
        }
        
        onListeningChange(false);
        setIsReadyToListen(true);
      };

      console.log('✅ Browser speech recognition initialized');
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      onError?.('Failed to initialize speech recognition');
    }
  };

  const initializeDeepgramConnection = async () => {
    if (!apiKeys?.deepgram_api_key || !deepgramAvailable || connectionAttempts >= 3) {
      console.log('Deepgram not available or max attempts reached, using browser speech recognition');
      return false;
    }

    try {
      console.log('🎙️ Initializing Deepgram connection... (attempt', connectionAttempts + 1, ')');
      setConnectionAttempts(prev => prev + 1);
      
      const socket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=false&endpointing=300&utterance_end_ms=1000',
        ['token', apiKeys.deepgram_api_key]
      );

      socket.onopen = () => {
        console.log('✅ Deepgram WebSocket connected');
        setDeepgramSocket(socket);
        setConnectionAttempts(0); // Reset on successful connection
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript.trim();
            
            if (transcript && data.is_final) {
              console.log('🎙️ Deepgram transcript:', transcript);
              
              if (transcript !== lastTranscript) {
                setLastTranscript(transcript);
                onUserMessage(transcript);
                stopDeepgramListening();
              }
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
        
        if (connectionAttempts >= 3) {
          onError?.('Deepgram connection failed. Using browser speech recognition.');
        }
      };

      socket.onclose = (event) => {
        console.log('Deepgram WebSocket closed:', event.code, event.reason);
        setDeepgramSocket(null);
        setIsDeepgramListening(false);
        
        if (event.code !== 1000 && connectionAttempts < 3) {
          console.log('Deepgram connection lost, will retry with browser fallback');
        }
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
      if (!deepgramSocket || deepgramSocket.readyState !== WebSocket.OPEN) {
        const initialized = await initializeDeepgramConnection();
        if (!initialized) {
          return false;
        }
        // Wait for connection to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!deepgramSocket || deepgramSocket.readyState !== WebSocket.OPEN) {
          console.log('Deepgram connection not ready, falling back to browser');
          return false;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      streamRef.current = stream;

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
        console.log('🎙️ Deepgram MediaRecorder stopped');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
          deepgramSocket.send(JSON.stringify({ type: 'CloseStream' }));
        }
      };

      mediaRecorder.start(100); // Send data every 100ms
      setIsDeepgramListening(true);
      onListeningChange(true);
      setIsReadyToListen(false);

      // Fixed 10-second timeout for Deepgram too
      const timeout = setTimeout(() => {
        console.log('🎙️ Deepgram 10-second timeout - stopping automatically');
        stopDeepgramListening();
      }, 10000);
      setListeningTimeout(timeout);

      console.log('🎙️ Deepgram listening started');
      return true;
    } catch (error) {
      console.error('Error starting Deepgram listening:', error);
      setDeepgramAvailable(false);
      
      if (error.name === 'NotAllowedError') {
        onError?.('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        onError?.('No microphone found. Please check your audio devices.');
      } else {
        onError?.('Failed to access microphone. Please check your permissions.');
      }
      
      return false;
    }
  };

  const stopDeepgramListening = () => {
    console.log('🎙️ Stopping Deepgram listening...');
    
    if (deepgramMediaRecorderRef.current && deepgramMediaRecorderRef.current.state !== 'inactive') {
      try {
        deepgramMediaRecorderRef.current.stop();
      } catch (error) {
        console.log('MediaRecorder already stopped');
      }
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
      console.log('Already listening or not ready');
      return;
    }

    console.log('🎤 Starting voice input...');
    setLastTranscript(''); // Reset last transcript

    // Try Deepgram first if available and we haven't exceeded retry attempts
    if (apiKeys?.deepgram_api_key && deepgramAvailable && connectionAttempts < 3) {
      console.log('🎙️ Attempting Deepgram speech recognition');
      const success = await startDeepgramListening();
      if (success) {
        return;
      }
      console.log('🔄 Deepgram failed, falling back to browser speech recognition');
    }

    // Fallback to browser speech recognition
    if (!recognitionRef.current) {
      console.log('Speech recognition not available');
      onError?.('Speech recognition not available');
      return;
    }

    try {
      // Ensure recognition is stopped before starting
      if (recognitionRef.current.state !== 'inactive') {
        recognitionRef.current.stop();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('🎤 Starting browser speech recognition');
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting browser speech recognition:', error);
      setIsReadyToListen(true);
      onListeningChange(false);
      
      if (error.name === 'InvalidStateError') {
        // Try again after a short delay
        setTimeout(() => {
          if (recognitionRef.current && recognitionRef.current.state === 'inactive') {
            try {
              recognitionRef.current.start();
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              onError?.('Speech recognition failed to start. Please try again.');
            }
          }
        }, 500);
      } else {
        onError?.('Failed to start speech recognition. Please check your microphone permissions.');
      }
    }
  };

  const stopListening = () => {
    console.log('🎤 Stopping voice input...');
    
    if (isDeepgramListening) {
      stopDeepgramListening();
    } else if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Recognition already stopped');
      }
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

      {/* Voice Controls - Manual Only */}
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
              <span className="text-sm">Stop Listening</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm">Voice Chat (10s)</span>
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

      {/* Status Indicators */}
      <div className="grid grid-cols-1 gap-3 text-xs">
        <div className="p-2 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Mic className="h-3 w-3 text-orange-400" />
            <span className="text-white">
              Speech: {apiKeys?.deepgram_api_key && deepgramAvailable ? 'Deepgram' : 'Browser'} | Manual Mode (10s timeout)
            </span>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {connectionAttempts > 0 && deepgramAvailable && (
        <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-yellow-200 text-sm">
              Deepgram connection issues (attempt {connectionAttempts}/3) - using browser fallback
            </span>
          </div>
        </div>
      )}

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