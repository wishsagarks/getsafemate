import React, { useRef, useEffect, useState } from 'react';
import { AlertCircle, Volume2, VolumeX, Smartphone } from 'lucide-react';

interface MobileAudioHandlerProps {
  isEnabled: boolean;
  onAudioReady: (playAudio: (text: string) => Promise<void>) => void;
  elevenLabsApiKey?: string;
  onError?: (error: string) => void;
}

interface AudioContextState {
  context: AudioContext | null;
  isResumed: boolean;
  isSupported: boolean;
}

export function MobileAudioHandler({ 
  isEnabled, 
  onAudioReady, 
  elevenLabsApiKey,
  onError 
}: MobileAudioHandlerProps) {
  const [audioContextState, setAudioContextState] = useState<AudioContextState>({
    context: null,
    isResumed: false,
    isSupported: false
  });
  const [isMobile, setIsMobile] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);

  const audioBufferRef = useRef<Map<string, AudioBuffer>>(new Map());
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return isMobileDevice || isTouchDevice;
    };

    setIsMobile(checkMobile());
    
    // Check Web Audio API support
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const isSupported = !!AudioContext;
    
    setAudioContextState(prev => ({ ...prev, isSupported }));

    if (isSupported && isEnabled) {
      initializeAudioContext();
    }
  }, [isEnabled]);

  useEffect(() => {
    if (isEnabled && audioContextState.isSupported) {
      // Provide the audio function to parent component
      onAudioReady(playElevenLabsAudio);
    }
  }, [isEnabled, audioContextState.isSupported, userInteracted]);

  const initializeAudioContext = async () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContext();
      
      setAudioContextState(prev => ({
        ...prev,
        context,
        isResumed: context.state === 'running'
      }));

      // On mobile, AudioContext starts suspended
      if (context.state === 'suspended') {
        console.log('📱 AudioContext suspended, waiting for user interaction');
        if (isMobile) {
          setShowMobilePrompt(true);
        }
      }
    } catch (error) {
      console.error('Error initializing AudioContext:', error);
      onError?.('Failed to initialize audio system');
    }
  };

  const resumeAudioContext = async () => {
    if (!audioContextState.context) return false;

    try {
      if (audioContextState.context.state === 'suspended') {
        await audioContextState.context.resume();
        console.log('✅ AudioContext resumed');
      }
      
      setAudioContextState(prev => ({ ...prev, isResumed: true }));
      setUserInteracted(true);
      setShowMobilePrompt(false);
      return true;
    } catch (error) {
      console.error('Error resuming AudioContext:', error);
      return false;
    }
  };

  const fetchAndDecodeAudio = async (text: string): Promise<AudioBuffer | null> => {
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not provided');
    }

    try {
      console.log('🔊 Fetching ElevenLabs audio for mobile...');
      
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          },
          output_format: 'mp3_44100_128' // Specify mobile-friendly format
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      if (!audioContextState.context) {
        throw new Error('AudioContext not available');
      }

      // Decode audio data
      const audioBuffer = await audioContextState.context.decodeAudioData(arrayBuffer);
      console.log('✅ Audio decoded successfully for mobile');
      
      return audioBuffer;
    } catch (error) {
      console.error('Error fetching/decoding audio:', error);
      throw error;
    }
  };

  const playAudioBuffer = async (audioBuffer: AudioBuffer): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!audioContextState.context) {
        reject(new Error('AudioContext not available'));
        return;
      }

      try {
        // Stop any currently playing audio
        if (currentSourceRef.current) {
          currentSourceRef.current.stop();
          currentSourceRef.current.disconnect();
        }

        // Create new audio source
        const source = audioContextState.context.createBufferSource();
        source.buffer = audioBuffer;
        
        // Create gain node for volume control
        const gainNode = audioContextState.context.createGain();
        gainNode.gain.value = 0.9; // Set volume to 90%
        
        // Connect audio graph
        source.connect(gainNode);
        gainNode.connect(audioContextState.context.destination);
        
        // Set up event handlers
        source.onended = () => {
          console.log('🔊 Mobile audio playback completed');
          currentSourceRef.current = null;
          setIsPlaying(false);
          resolve();
        };

        // Store reference and start playback
        currentSourceRef.current = source;
        setIsPlaying(true);
        source.start(0);
        
        console.log('🔊 Mobile audio playback started');
      } catch (error) {
        console.error('Error playing audio buffer:', error);
        setIsPlaying(false);
        reject(error);
      }
    });
  };

  const playElevenLabsAudio = async (text: string): Promise<void> => {
    // On mobile, require user interaction first
    if (isMobile && !userInteracted) {
      console.log('📱 Mobile audio requires user interaction first');
      setShowMobilePrompt(true);
      throw new Error('User interaction required for mobile audio');
    }

    // Ensure AudioContext is resumed
    if (!audioContextState.isResumed) {
      const resumed = await resumeAudioContext();
      if (!resumed) {
        throw new Error('Failed to resume AudioContext');
      }
    }

    try {
      // Check cache first
      const cacheKey = text.substring(0, 50); // Use first 50 chars as cache key
      let audioBuffer = audioBufferRef.current.get(cacheKey);
      
      if (!audioBuffer) {
        // Fetch and decode new audio
        audioBuffer = await fetchAndDecodeAudio(text);
        if (audioBuffer) {
          // Cache the audio buffer (limit cache size)
          if (audioBufferRef.current.size > 10) {
            const firstKey = audioBufferRef.current.keys().next().value;
            audioBufferRef.current.delete(firstKey);
          }
          audioBufferRef.current.set(cacheKey, audioBuffer);
        }
      } else {
        console.log('🔊 Using cached audio buffer');
      }

      if (audioBuffer) {
        await playAudioBuffer(audioBuffer);
      } else {
        throw new Error('Failed to get audio buffer');
      }
    } catch (error) {
      console.error('Error in mobile ElevenLabs playback:', error);
      throw error;
    }
  };

  const handleUserInteraction = async () => {
    const resumed = await resumeAudioContext();
    if (resumed) {
      // Process any queued audio
      if (audioQueue.length > 0) {
        const nextText = audioQueue[0];
        setAudioQueue(prev => prev.slice(1));
        try {
          await playElevenLabsAudio(nextText);
        } catch (error) {
          console.error('Error playing queued audio:', error);
        }
      }
    }
  };

  // Don't render anything if not enabled or not mobile
  if (!isEnabled || !isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile Audio Prompt */}
      {showMobilePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Enable Audio
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                To hear your AI companion's voice on mobile, please tap the button below to enable audio playback.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleUserInteraction}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  <Volume2 className="h-5 w-5" />
                  <span>Enable Audio</span>
                </button>
                <button
                  onClick={() => setShowMobilePrompt(false)}
                  className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Skip Audio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Audio Status Indicator */}
      {userInteracted && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-green-400" />
            <span className="text-green-200 text-sm font-medium">
              📱 Mobile audio enabled - ElevenLabs ready
            </span>
            {isPlaying && (
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-4 bg-green-400 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audio Context Error */}
      {!audioContextState.isSupported && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-red-200 text-sm">
              Web Audio API not supported on this device
            </span>
          </div>
        </div>
      )}
    </>
  );
}

// Extend Window interface for AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}