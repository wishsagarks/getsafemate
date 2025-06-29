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
  const [isLoading, setIsLoading] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const tracks = [
    {
      title: "Calm Meditation",
      artist: "Wellness Sounds",
      url: "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3",
      color: "from-blue-500 to-purple-500"
    },
    {
      title: "Deep Relaxation",
      artist: "Mindful Melodies",
      url: "https://www.soundjay.com/ambient/sounds/rain-01.mp3",
      color: "from-green-500 to-teal-500"
    },
    {
      title: "Healing Vibrations",
      artist: "Soul Harmony",
      url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      color: "from-pink-500 to-purple-500"
    },
    {
      title: "Peaceful Ambience",
      artist: "Tranquil Sounds",
      url: "https://actions.google.com/sounds/v1/ambiences/medium_rain_on_leaves.ogg",
      color: "from-amber-500 to-orange-500"
    }
  ];

  // Initialize audio on component mount
  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
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
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    setIsLoading(true);
    
    // Set the source and load the audio
    audio.src = tracks[currentTrack].url;
    audio.volume = isMuted ? 0 : volume;
    
    // Load the audio
    audio.load();
    
    console.log(`Loading track: ${tracks[currentTrack].title}`);
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setAudioInitialized(true);
      console.log(`Track loaded: ${tracks[currentTrack].title}, duration: ${audio.duration}`);
      
      // Auto-play if it was playing before
      if (isPlaying) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error auto-playing after track change:', error);
            setIsPlaying(false);
          });
        }
      }
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      console.log('Track ended, playing next');
      handleNext();
    };
    
    const handleError = (e: Event) => {
      console.error('Audio loading error for track:', tracks[currentTrack].title, e);
      setIsLoading(false);
      setIsPlaying(false);
      
      // Try to load next track if current one fails
      setTimeout(() => {
        if (currentTrack < tracks.length - 1) {
          setCurrentTrack(prev => prev + 1);
        }
      }, 1000);
    };
    
    const handleCanPlay = () => {
      console.log('Audio can play:', tracks[currentTrack].title);
      setIsLoading(false);
      setAudioInitialized(true);
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
    if (!audioRef.current || !audioInitialized) return;
    
    const audio = audioRef.current;
    
    if (isPlaying) {
      console.log('Attempting to play audio');
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
          
          // Try to handle autoplay restrictions
          if (error.name === 'NotAllowedError') {
            console.log('Autoplay restricted, waiting for user interaction');
            
            // Add a one-time click listener to the document to enable audio
            const enableAudio = () => {
              const newPlayPromise = audio.play();
              if (newPlayPromise !== undefined) {
                newPlayPromise.then(() => {
                  setIsPlaying(true);
                  console.log('Audio playing after user interaction');
                }).catch(err => {
                  console.error('Still cannot play audio after user interaction:', err);
                });
              }
              document.removeEventListener('click', enableAudio);
            };
            
            document.addEventListener('click', enableAudio, { once: true });
          }
        });
      }
      
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
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

  const updateProgress = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setIsPlaying(false);
    setIsLoading(true);
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
    setTimeout(() => setIsPlaying(true), 100);
  };

  const handlePrevious = () => {
    setIsPlaying(false);
    setIsLoading(true);
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
    setTimeout(() => setIsPlaying(true), 100);
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
    if (audioRef.current) {
      const seekTime = parseFloat(e.target.value);
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
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
      
      {/* Visualizer */}
      <div className="relative h-16 mb-4 overflow-hidden rounded-lg">
        <div className={`absolute inset-0 bg-gradient-to-r ${tracks[currentTrack].color} opacity-20`}></div>
        
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
                className={`w-1 bg-gradient-to-t ${tracks[currentTrack].color} rounded-t-full`}
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
              {tracks[currentTrack].title}
            </div>
            <div className="text-neutral-400 text-xs">
              {tracks[currentTrack].artist}
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
            background: `linear-gradient(to right, ${isPlaying ? 'rgb(168, 85, 247)' : 'rgb(139, 92, 246)'} 0%, rgb(139, 92, 246) ${(currentTime / duration) * 100}%, rgb(64, 64, 64) ${(currentTime / duration) * 100}%, rgb(64, 64, 64) 100%)`
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
        <div className="text-xs text-neutral-400 mb-2">Tracks</div>
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