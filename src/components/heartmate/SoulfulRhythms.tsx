import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipForward, 
  SkipBack,
  Heart,
  Waves,
  AlertCircle
} from 'lucide-react';

interface SoulfulRhythmsProps {
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function SoulfulRhythms({ onPlayStateChange }: SoulfulRhythmsProps) {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Use more reliable audio sources or create a demo mode
  const tracks = [
    {
      title: "Ocean Waves",
      artist: "Nature Sounds",
      url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
      color: "from-blue-500 to-cyan-500",
      isDemo: true
    },
    {
      title: "Forest Ambience",
      artist: "Nature Sounds", 
      url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
      color: "from-green-500 to-emerald-500",
      isDemo: true
    },
    {
      title: "Gentle Rain",
      artist: "Nature Sounds",
      url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
      color: "from-indigo-500 to-blue-500",
      isDemo: true
    },
    {
      title: "Meditation Bells",
      artist: "Mindful Melodies",
      url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
      color: "from-purple-500 to-pink-500",
      isDemo: true
    }
  ];

  // Initialize audio on component mount
  useEffect(() => {
    // Check if device is mobile
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    };
    
    setIsMobileDevice(checkMobileDevice());

    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'none'; // Changed to 'none' to avoid immediate loading
      audio.volume = volume;
      audio.loop = false;
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
      console.log('Audio element created');
    }
    
    return () => {
      // Clean up on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      console.log('Audio element cleaned up');
    };
  }, []);

  // Handle track changes
  useEffect(() => {
    if (!audioRef.current || tracks.length === 0) return;
    
    const audio = audioRef.current;
    setIsLoading(false); // Don't auto-load
    setHasError(false);
    setErrorMessage('');
    
    // Only set source when user actually tries to play
    console.log(`Track selected: ${tracks[currentTrack].title}`);
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 30); // Default to 30 seconds for demo tracks
      setIsLoading(false);
      setAudioInitialized(true);
      setHasError(false);
      console.log(`Track loaded: ${tracks[currentTrack].title}, duration: ${audio.duration || 30}`);
      
      // Auto-play if it was playing before
      if (isPlaying) {
        playAudio();
      }
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      console.log('Track ended, playing next track');
      handleNext();
    };
    
    const handleError = (e: Event) => {
      console.error('Audio loading error for track:', tracks[currentTrack].title, e);
      setIsLoading(false);
      setIsPlaying(false);
      setHasError(true);
      setErrorMessage(`Unable to load ${tracks[currentTrack].title}. This is a demo version.`);
      
      // For demo tracks, simulate a successful load with a short duration
      if (tracks[currentTrack].isDemo) {
        setTimeout(() => {
          setHasError(false);
          setErrorMessage('');
          setDuration(30); // 30 second demo
          setAudioInitialized(true);
          console.log('Demo track simulated load');
        }, 1000);
      }
    };
    
    const handleCanPlay = () => {
      console.log('Audio can play:', tracks[currentTrack].title);
      setIsLoading(false);
      setAudioInitialized(true);
      setHasError(false);
    };
    
    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // Clean up event listeners
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      // Load the track when user tries to play
      if (!audioInitialized && !isLoading) {
        loadCurrentTrack();
      } else if (audioInitialized) {
        playAudio();
      }
    } else {
      pauseAudio();
    }
    
    // Notify parent component about play state change
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying);
    }
    
    console.log(`Play state changed: ${isPlaying ? 'playing' : 'paused'}`);
  }, [isPlaying, audioInitialized]);

  // Handle volume changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    audioRef.current.volume = isMuted ? 0 : volume;
    console.log(`Volume changed: ${isMuted ? 0 : volume}`);
  }, [volume, isMuted]);

  const loadCurrentTrack = () => {
    if (!audioRef.current || tracks.length === 0) return;
    
    const audio = audioRef.current;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    
    // For demo tracks, simulate loading
    if (tracks[currentTrack].isDemo) {
      console.log(`Loading demo track: ${tracks[currentTrack].title}`);
      
      // Simulate loading delay
      setTimeout(() => {
        setIsLoading(false);
        setAudioInitialized(true);
        setDuration(30); // 30 second demo
        
        if (isPlaying) {
          // Start demo playback simulation
          simulateDemoPlayback();
        }
      }, 500);
      
      return;
    }
    
    // Try to load real audio
    audio.src = tracks[currentTrack].url;
    audio.volume = isMuted ? 0 : volume;
    audio.load();
  };

  const simulateDemoPlayback = () => {
    if (!isPlaying) return;
    
    // Simulate audio playback for demo tracks
    const interval = setInterval(() => {
      if (!isPlaying) {
        clearInterval(interval);
        return;
      }
      
      setCurrentTime(prev => {
        const newTime = prev + 0.1;
        if (newTime >= 30) { // Demo duration
          clearInterval(interval);
          handleNext();
          return 0;
        }
        return newTime;
      });
    }, 100);
    
    // Store interval reference for cleanup
    (audioRef.current as any)._demoInterval = interval;
  };

  const playAudio = async () => {
    if (!audioRef.current) return;
    
    console.log('Attempting to play audio');
    
    // Handle demo tracks
    if (tracks[currentTrack].isDemo) {
      simulateDemoPlayback();
      return;
    }
    
    try {
      // For mobile devices, we need to handle autoplay restrictions
      if (isMobileDevice) {
        // Try to resume AudioContext if it exists
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('AudioContext resumed for mobile');
          }
        }
      }
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Audio playing successfully');
          animationRef.current = requestAnimationFrame(updateProgress);
        }).catch(error => {
          console.error('Error playing audio:', error);
          
          // Handle autoplay restrictions
          if (error.name === 'NotAllowedError') {
            console.log('Autoplay restricted, waiting for user interaction');
            setIsPlaying(false);
            setErrorMessage('Click to enable audio playback');
            
            // Add a one-time click listener to the document to enable audio
            const enableAudio = () => {
              if (audioRef.current) {
                const newPlayPromise = audioRef.current.play();
                if (newPlayPromise !== undefined) {
                  newPlayPromise.then(() => {
                    setIsPlaying(true);
                    setErrorMessage('');
                    console.log('Audio playing after user interaction');
                    animationRef.current = requestAnimationFrame(updateProgress);
                  }).catch(err => {
                    console.error('Still cannot play audio after user interaction:', err);
                    setErrorMessage('Audio playback not supported');
                  });
                }
              }
              document.removeEventListener('click', enableAudio);
            };
            
            document.addEventListener('click', enableAudio, { once: true });
          } else {
            setErrorMessage('Audio playback failed');
          }
        });
      }
    } catch (error) {
      console.error('Error in playAudio:', error);
      setIsPlaying(false);
      setErrorMessage('Audio playback error');
    }
  };

  const pauseAudio = () => {
    if (!audioRef.current) return;
    
    // Clear demo interval if it exists
    if ((audioRef.current as any)._demoInterval) {
      clearInterval((audioRef.current as any)._demoInterval);
      (audioRef.current as any)._demoInterval = null;
    }
    
    if (!tracks[currentTrack].isDemo) {
      audioRef.current.pause();
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const updateProgress = () => {
    if (audioRef.current && !tracks[currentTrack].isDemo) {
      setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    // Stop current playback
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioInitialized(false);
    
    if (tracks.length <= 1) {
      // If only one track, restart it
      setCurrentTime(0);
      return;
    }
    
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
  };

  const handlePrevious = () => {
    // Stop current playback
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioInitialized(false);
    
    if (tracks.length <= 1) {
      // If only one track, restart it
      setCurrentTime(0);
      return;
    }
    
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    
    if (audioRef.current && !tracks[currentTrack].isDemo) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-black border border-white/20 rounded-xl p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Music className="h-5 w-5 text-purple-400" />
          <h3 className="text-white font-medium">Soulful Rhythms</h3>
        </div>
        <div className="text-xs text-neutral-400">Enhance your wellness experience</div>
      </div>
      
      {/* Error message */}
      {hasError && errorMessage && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-red-400 text-sm">{errorMessage}</span>
        </div>
      )}
      
      {/* Demo notice */}
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="text-blue-400 text-sm">
          🎵 Demo Mode: This is a preview of the music player. In the full version, you can upload your own audio files or connect to streaming services.
        </div>
      </div>
      
      {/* Visualizer */}
      <div className="relative h-16 mb-4 overflow-hidden rounded-lg">
        <div className={`absolute inset-0 bg-gradient-to-r ${tracks[currentTrack]?.color || 'from-purple-500 to-blue-500'} opacity-20`}></div>
        
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          animate={{ 
            opacity: isPlaying ? 1 : 0.5 
          }}
        >
          <div className="flex items-end justify-center space-x-1 h-full w-full px-4">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className={`w-1 bg-gradient-to-t ${tracks[currentTrack]?.color || 'from-purple-500 to-blue-500'} rounded-t-full`}
                animate={{ 
                  height: isPlaying 
                    ? `${10 + Math.random() * 60}%` 
                    : '10%' 
                }}
                transition={{ 
                  duration: 0.4,
                  repeat: isPlaying ? Infinity : 0,
                  repeatType: "reverse",
                  delay: i * 0.05
                }}
              />
            ))}
          </div>
        </motion.div>
        
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-between items-center">
            <div className="text-white text-xs font-medium truncate max-w-[150px]">
              {tracks[currentTrack]?.title || 'No Track Selected'}
            </div>
            <div className="text-neutral-400 text-xs">
              {tracks[currentTrack]?.artist || 'Unknown Artist'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${isPlaying ? 'rgb(168, 85, 247)' : 'rgb(139, 92, 246)'} 0%, rgb(139, 92, 246) ${(currentTime / (duration || 1)) * 100}%, rgb(64, 64, 64) ${(currentTime / (duration || 1)) * 100}%, rgb(64, 64, 64) 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-neutral-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevious}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <SkipBack className="h-4 w-4 text-white" />
          </button>
          
          <motion.button
            onClick={handlePlayPause}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-full transition-colors ${
              isPlaying 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 text-white" />
            ) : (
              <Play className="h-5 w-5 text-white" />
            )}
          </motion.button>
          
          <button
            onClick={handleNext}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <SkipForward className="h-4 w-4 text-white" />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleMute}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-white" />
            ) : (
              <Volume2 className="h-4 w-4 text-white" />
            )}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${volume * 100}%, rgb(64, 64, 64) ${volume * 100}%, rgb(64, 64, 64) 100%)`
            }}
          />
        </div>
      </div>
      
      {/* Track list */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-neutral-400 mb-2">Demo Tracks</div>
        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
          {tracks.map((track, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setCurrentTrack(index);
                setIsPlaying(true);
                setAudioInitialized(false);
              }}
              whileHover={{ x: 5 }}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-left ${
                currentTrack === index 
                  ? `bg-gradient-to-r ${track.color} bg-opacity-20` 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-2">
                {currentTrack === index && isPlaying ? (
                  <div className="flex space-x-0.5">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className={`w-0.5 h-3 bg-gradient-to-t ${track.color}`}
                        animate={{ 
                          height: [3, 12, 3],
                        }}
                        transition={{ 
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Play className="h-3 w-3 text-white" />
                )}
                <div>
                  <div className="text-sm text-white font-medium">{track.title}</div>
                  <div className="text-xs text-neutral-400">{track.artist}</div>
                </div>
              </div>
              {currentTrack === index && (
                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${track.color}`}></div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Benefits */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center space-x-2 text-xs text-neutral-400">
          <Heart className="h-3 w-3 text-pink-400" />
          <span>Music enhances meditation and mindfulness practices</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-1">
          <Waves className="h-3 w-3 text-blue-400" />
          <span>Soulful rhythms promote relaxation and stress reduction</span>
        </div>
      </div>
    </div>
  );
}