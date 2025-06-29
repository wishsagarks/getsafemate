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
  Waves
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
  const [usingFallback, setUsingFallback] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback audio tracks using Web Audio API
  const tracks = [
    {
      title: "Peaceful Meditation",
      artist: "Mindful Sounds",
      url: null, // Will use fallback audio
      fallbackFreq: 432, // Hz - healing frequency
      color: "from-blue-500 to-cyan-500",
      duration: 300 // 5 minutes
    },
    {
      title: "Gentle Rain",
      artist: "Nature Sounds", 
      url: null, // Will use fallback audio
      fallbackFreq: 528, // Hz - love frequency
      color: "from-indigo-500 to-blue-500",
      duration: 240 // 4 minutes
    }
  ];

  // Initialize Web Audio API for fallback audio
  const initializeWebAudio = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        gainNodeRef.current.gain.value = volume;
        console.log('Web Audio API initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Web Audio API:', error);
    }
  };

  // Generate fallback audio using Web Audio API
  const playFallbackAudio = (frequency: number) => {
    if (!audioContextRef.current || !gainNodeRef.current) {
      initializeWebAudio();
      if (!audioContextRef.current || !gainNodeRef.current) return;
    }

    // Stop any existing oscillator
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
    }

    // Create new oscillator for ambient tone
    oscillatorRef.current = audioContextRef.current.createOscillator();
    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    
    // Create a gentle fade in/out effect
    const now = audioContextRef.current.currentTime;
    gainNodeRef.current.gain.setValueAtTime(0, now);
    gainNodeRef.current.gain.linearRampToValueAtTime(isMuted ? 0 : volume * 0.1, now + 2);
    
    oscillatorRef.current.connect(gainNodeRef.current);
    oscillatorRef.current.start();

    // Add subtle frequency modulation for more natural sound
    const lfo = audioContextRef.current.createOscillator();
    const lfoGain = audioContextRef.current.createGain();
    lfo.frequency.setValueAtTime(0.5, now); // 0.5 Hz modulation
    lfoGain.gain.setValueAtTime(2, now); // 2 Hz modulation depth
    lfo.connect(lfoGain);
    lfoGain.connect(oscillatorRef.current.frequency);
    lfo.start();

    console.log(`Playing fallback audio at ${frequency}Hz`);
    setUsingFallback(true);
    setAudioInitialized(true);
    setIsLoading(false);
    
    // Set duration for fallback audio
    setDuration(tracks[currentTrack].duration);
    setCurrentTime(0);

    // Start progress tracking
    let startTime = Date.now();
    fallbackIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setCurrentTime(elapsed);
      
      if (elapsed >= tracks[currentTrack].duration) {
        handleNext();
      }
    }, 100);
  };

  const stopFallbackAudio = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
      oscillatorRef.current = null;
    }
    
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    
    setUsingFallback(false);
    console.log('Fallback audio stopped');
  };

  // Initialize audio on component mount
  useEffect(() => {
    // Initialize Web Audio API for fallback
    initializeWebAudio();
    
    return () => {
      // Clean up on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      
      stopFallbackAudio();
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      console.log('Audio components cleaned up');
    };
  }, []);

  // Handle track changes
  useEffect(() => {
    if (tracks.length === 0) return;
    
    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    stopFallbackAudio();
    
    setIsLoading(true);
    setAudioInitialized(false);
    
    const currentTrackData = tracks[currentTrack];
    console.log(`Switching to track: ${currentTrackData.title}`);
    
    // Since we don't have reliable external URLs, use fallback audio directly
    setTimeout(() => {
      if (isPlaying) {
        playFallbackAudio(currentTrackData.fallbackFreq);
      } else {
        setIsLoading(false);
        setAudioInitialized(true);
        setDuration(currentTrackData.duration);
      }
    }, 500); // Small delay to show loading state
    
  }, [currentTrack]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioInitialized && !isLoading) return;
    
    if (isPlaying) {
      console.log('Starting playback');
      playFallbackAudio(tracks[currentTrack].fallbackFreq);
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      console.log('Pausing playback');
      stopFallbackAudio();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
    
    // Notify parent component about play state change
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying);
    }
    
  }, [isPlaying, audioInitialized]);

  // Handle volume changes
  useEffect(() => {
    if (gainNodeRef.current && usingFallback) {
      gainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : volume * 0.1, audioContextRef.current?.currentTime || 0);
      console.log(`Volume changed: ${isMuted ? 0 : volume}`);
    }
  }, [volume, isMuted, usingFallback]);

  const updateProgress = () => {
    if (usingFallback) {
      // Progress is handled by the interval in playFallbackAudio
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const handlePlayPause = () => {
    // Enable audio context on user interaction (required by browsers)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (tracks.length <= 1) {
      // If only one track, restart it
      setCurrentTime(0);
      if (isPlaying) {
        stopFallbackAudio();
        playFallbackAudio(tracks[currentTrack].fallbackFreq);
      }
      return;
    }
    
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
  };

  const handlePrevious = () => {
    if (tracks.length <= 1) {
      // If only one track, restart it
      setCurrentTime(0);
      if (isPlaying) {
        stopFallbackAudio();
        playFallbackAudio(tracks[currentTrack].fallbackFreq);
      }
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
    
    if (usingFallback && isPlaying) {
      // Restart fallback audio from new position
      stopFallbackAudio();
      playFallbackAudio(tracks[currentTrack].fallbackFreq);
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
        <div className="text-xs text-neutral-400">
          {usingFallback ? 'Ambient Tones' : 'Enhance your wellness experience'}
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
        <div className="text-xs text-neutral-400 mb-2">Ambient Tracks</div>
        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
          {tracks.map((track, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setCurrentTrack(index);
                setIsPlaying(true);
                setIsLoading(true);
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
                  <div className="text-xs text-neutral-400">{track.artist} • {track.fallbackFreq}Hz</div>
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
          <span>Healing frequencies promote meditation and mindfulness</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-1">
          <Waves className="h-3 w-3 text-blue-400" />
          <span>Ambient tones enhance relaxation and stress reduction</span>
        </div>
      </div>
    </div>
  );
}