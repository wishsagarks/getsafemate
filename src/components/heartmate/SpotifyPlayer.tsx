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
  AlertCircle,
  LogIn,
  Loader,
  RefreshCw
} from 'lucide-react';

interface SpotifyPlayerProps {
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function SpotifyPlayer({ onPlayStateChange }: SpotifyPlayerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const spotifyScriptLoaded = useRef(false);
  const authWindow = useRef<Window | null>(null);
  const authCheckInterval = useRef<number | null>(null);

  // Spotify meditation playlists
  const meditationPlaylists = [
    { id: '37i9dQZF1DX9uKNf5jGX6m', name: 'Meditation Music' },
    { id: '37i9dQZF1DWZqd5JICZI0u', name: 'Peaceful Meditation' },
    { id: '37i9dQZF1DX3PIPIT6lEg5', name: 'Relaxing Mindfulness' },
    { id: '37i9dQZF1DWU0ScTcjJBdj', name: 'Yoga & Meditation' }
  ];

  useEffect(() => {
    // Check if device is mobile
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    };
    
    setIsMobileDevice(checkMobileDevice());

    // Load Spotify Web Playback SDK script
    if (!spotifyScriptLoaded.current) {
      loadSpotifyScript();
    }

    // Check for existing tokens in localStorage
    const storedAccessToken = localStorage.getItem('spotify_access_token');
    const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
    const storedExpiry = localStorage.getItem('spotify_token_expiry');

    if (storedAccessToken && storedExpiry && Number(storedExpiry) > Date.now()) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setTokenExpiry(Number(storedExpiry));
      setIsAuthenticated(true);
    } else if (storedRefreshToken) {
      // Token expired but we have refresh token
      refreshAccessToken(storedRefreshToken);
    }

    // Check for authentication response in URL (redirect flow)
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const urlAccessToken = urlParams.get('access_token');
    const urlExpiresIn = urlParams.get('expires_in');
    
    if (urlAccessToken && urlExpiresIn) {
      const expiryTime = Date.now() + Number(urlExpiresIn) * 1000;
      setAccessToken(urlAccessToken);
      setTokenExpiry(expiryTime);
      setIsAuthenticated(true);
      
      // Store tokens
      localStorage.setItem('spotify_access_token', urlAccessToken);
      localStorage.setItem('spotify_token_expiry', expiryTime.toString());
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      // Cleanup
      if (player) {
        player.disconnect();
      }
      
      if (authCheckInterval.current) {
        window.clearInterval(authCheckInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      if (!isMobileDevice) {
        initializePlayer();
      }
      fetchPlaylists();
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (selectedPlaylist && accessToken) {
      fetchPlaylistTracks(selectedPlaylist);
    }
  }, [selectedPlaylist, accessToken]);

  useEffect(() => {
    // Notify parent component about play state change
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying);
    }
  }, [isPlaying, onPlayStateChange]);

  const loadSpotifyScript = () => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    
    script.onload = () => {
      spotifyScriptLoaded.current = true;
      console.log('Spotify Web Playback SDK loaded');
    };
    
    document.body.appendChild(script);
  };

  const initializePlayer = () => {
    if (!window.Spotify || !accessToken) return;
    
    const player = new window.Spotify.Player({
      name: 'SafeMate Wellness Player',
      getOAuthToken: cb => { cb(accessToken); },
      volume: volume
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('Initialization error:', message);
      setError(`Spotify player initialization error: ${message}`);
    });
    
    player.addListener('authentication_error', ({ message }) => {
      console.error('Authentication error:', message);
      setError(`Spotify authentication error: ${message}`);
      setIsAuthenticated(false);
    });
    
    player.addListener('account_error', ({ message }) => {
      console.error('Account error:', message);
      setError(`Spotify account error: ${message}. Premium account may be required.`);
    });
    
    player.addListener('playback_error', ({ message }) => {
      console.error('Playback error:', message);
      setError(`Spotify playback error: ${message}`);
    });

    // Playback status updates
    player.addListener('player_state_changed', state => {
      if (state) {
        setCurrentTrack({
          name: state.track_window.current_track.name,
          artist: state.track_window.current_track.artists[0].name,
          album: state.track_window.current_track.album.name,
          albumArt: state.track_window.current_track.album.images[0]?.url,
          duration: state.duration,
          position: state.position
        });
        setIsPlaying(!state.paused);
      }
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify player ready with device ID:', device_id);
      setDeviceId(device_id);
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
      setDeviceId('');
    });

    // Connect to the player
    player.connect();
    setPlayer(player);
  };

  const authenticateWithSpotify = () => {
    const clientId = '1a2b3c4d5e6f7g8h9i0j'; // Replace with your Spotify Client ID
    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
    const scopes = encodeURIComponent('streaming user-read-email user-read-private user-library-read user-library-modify');
    
    // For mobile, use redirect flow
    if (isMobileDevice) {
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}&show_dialog=true`;
      window.location.href = authUrl;
      return;
    }
    
    // For desktop, use popup flow
    const width = 450;
    const height = 730;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}&show_dialog=true`;
    
    authWindow.current = window.open(
      authUrl,
      'Spotify Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Check for auth completion
    if (authCheckInterval.current) {
      window.clearInterval(authCheckInterval.current);
    }
    
    authCheckInterval.current = window.setInterval(() => {
      try {
        if (!authWindow.current || authWindow.current.closed) {
          window.clearInterval(authCheckInterval.current!);
          return;
        }
        
        const currentUrl = authWindow.current.location.href;
        
        if (currentUrl.includes('access_token=')) {
          window.clearInterval(authCheckInterval.current!);
          
          const hashParams = new URLSearchParams(
            authWindow.current.location.hash.substring(1)
          );
          
          const accessToken = hashParams.get('access_token');
          const expiresIn = hashParams.get('expires_in');
          
          if (accessToken && expiresIn) {
            const expiryTime = Date.now() + Number(expiresIn) * 1000;
            
            setAccessToken(accessToken);
            setTokenExpiry(expiryTime);
            setIsAuthenticated(true);
            
            // Store tokens
            localStorage.setItem('spotify_access_token', accessToken);
            localStorage.setItem('spotify_token_expiry', expiryTime.toString());
          }
          
          authWindow.current.close();
        }
      } catch (e) {
        // Ignore cross-origin errors when checking location
      }
    }, 500);
  };

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real implementation, you would call your backend endpoint that handles token refresh
      // For demo purposes, we'll simulate a successful refresh
      console.log('Refreshing access token...');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo, we'll just authenticate again
      setIsLoading(false);
      setError('Session expired. Please log in again.');
      setIsAuthenticated(false);
      
    } catch (error) {
      console.error('Error refreshing token:', error);
      setError('Failed to refresh authentication. Please log in again.');
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    if (!accessToken) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // For demo purposes, we'll use predefined meditation playlists
      setPlaylists(meditationPlaylists);
      setSelectedPlaylist(meditationPlaylists[0].id);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setError('Failed to load playlists');
      setIsLoading(false);
    }
  };

  const fetchPlaylistTracks = async (playlistId: string) => {
    if (!accessToken) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // For demo purposes, we'll create mock tracks
      const mockTracks = [
        { id: '1', name: 'Peaceful Meditation', artist: 'Mindful Sounds', duration: 180000 },
        { id: '2', name: 'Ocean Waves', artist: 'Nature Sounds', duration: 240000 },
        { id: '3', name: 'Forest Ambience', artist: 'Relaxation Music', duration: 210000 },
        { id: '4', name: 'Gentle Rain', artist: 'Sleep Sounds', duration: 300000 },
        { id: '5', name: 'Tibetan Bowls', artist: 'Meditation Masters', duration: 270000 }
      ];
      
      setTracks(mockTracks);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setError('Failed to load tracks');
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!player && !isMobileDevice) {
      setError('Spotify player not initialized');
      return;
    }
    
    if (isPlaying) {
      if (player) player.pause();
      setIsPlaying(false);
    } else {
      if (player) player.resume();
      setIsPlaying(true);
    }
    
    // For mobile or when player isn't available, we'll just toggle the state
    if (isMobileDevice || !player) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    if (player) player.nextTrack();
  };

  const handlePrevious = () => {
    if (player) player.previousTrack();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (player) player.setVolume(newVolume);
  };

  const playTrack = async (trackId: string) => {
    if (!accessToken || !deviceId) {
      setError('Spotify player not ready');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // In a real implementation, you would call the Spotify API to play the track
      console.log(`Playing track ${trackId} on device ${deviceId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error playing track:', error);
      setError('Failed to play track');
      setIsLoading(false);
    }
  };

  const playPlaylist = async (playlistId: string) => {
    if (!accessToken || !deviceId) {
      setError('Spotify player not ready');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // In a real implementation, you would call the Spotify API to play the playlist
      console.log(`Playing playlist ${playlistId} on device ${deviceId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error playing playlist:', error);
      setError('Failed to play playlist');
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // If not authenticated, show login button
  if (!isAuthenticated) {
    return (
      <div className="bg-black border border-white/20 rounded-xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Music className="h-5 w-5 text-purple-400" />
            <h3 className="text-white font-medium">Spotify Integration</h3>
          </div>
        </div>
        
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Music className="h-8 w-8 text-green-400" />
          </div>
          
          <h4 className="text-white font-semibold text-lg mb-2">Connect to Spotify</h4>
          <p className="text-neutral-400 mb-6">
            Enhance your wellness experience with your own Spotify music. Log in to access your playlists and favorite tracks.
          </p>
          
          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}
          
          <motion.button
            onClick={authenticateWithSpotify}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all shadow-lg flex items-center space-x-2 mx-auto"
          >
            {isLoading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>Connect with Spotify</span>
              </>
            )}
          </motion.button>
          
          <p className="text-xs text-neutral-500 mt-4">
            You'll need a Spotify account to use this feature. 
            {isMobileDevice ? ' You will be redirected to Spotify to log in.' : ' A popup will open for you to log in.'}
          </p>
        </div>
        
        {/* Demo Mode Notice */}
        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
            <div>
              <h5 className="text-blue-300 text-sm font-medium">Demo Mode</h5>
              <p className="text-blue-400 text-xs mt-1">
                This is a demonstration of Spotify integration. In a production environment, you would connect to your actual Spotify account.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black border border-white/20 rounded-xl p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Music className="h-5 w-5 text-green-400" />
          <h3 className="text-white font-medium">Spotify Music</h3>
        </div>
        <div className="text-xs text-neutral-400">Enhance your wellness experience</div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      )}
      
      {/* Now Playing */}
      <div className="relative h-16 mb-4 overflow-hidden rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-end justify-center space-x-1 h-full w-full px-4">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-green-500 to-blue-500 rounded-t-full"
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
        </div>
        
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-between items-center">
            <div className="text-white text-xs font-medium truncate max-w-[150px]">
              {currentTrack?.name || (isPlaying ? 'Peaceful Meditation' : 'Not Playing')}
            </div>
            <div className="text-neutral-400 text-xs">
              {currentTrack?.artist || 'Mindful Sounds'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
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
                ? 'bg-green-600 hover:bg-green-700' 
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
          <Volume2 className="h-4 w-4 text-white" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(34, 197, 94) 0%, rgb(34, 197, 94) ${volume * 100}%, rgb(64, 64, 64) ${volume * 100}%, rgb(64, 64, 64) 100%)`
            }}
          />
        </div>
      </div>
      
      {/* Playlists */}
      <div className="mb-4">
        <div className="text-xs text-neutral-400 mb-2">Meditation Playlists</div>
        <div className="grid grid-cols-2 gap-2">
          {playlists.map((playlist) => (
            <motion.button
              key={playlist.id}
              onClick={() => {
                setSelectedPlaylist(playlist.id);
                playPlaylist(playlist.id);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-2 text-xs rounded-lg text-left transition-all ${
                selectedPlaylist === playlist.id
                  ? 'bg-green-500/20 border border-green-500/30'
                  : 'bg-white/5 hover:bg-white/10 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Play className="h-3 w-3 text-white" />
                <span className="text-white truncate">{playlist.name}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Tracks */}
      <div className="max-h-32 overflow-y-auto pr-2 mb-4">
        <div className="text-xs text-neutral-400 mb-2">Tracks</div>
        <div className="space-y-1">
          {tracks.map((track) => (
            <motion.button
              key={track.id}
              onClick={() => playTrack(track.id)}
              whileHover={{ x: 5 }}
              className="w-full flex items-center justify-between p-2 rounded-lg text-left bg-white/5 hover:bg-white/10"
            >
              <div className="flex items-center space-x-2">
                <Play className="h-3 w-3 text-white" />
                <div>
                  <div className="text-xs text-white">{track.name}</div>
                  <div className="text-[10px] text-neutral-400">{track.artist}</div>
                </div>
              </div>
              <div className="text-[10px] text-neutral-400">
                {formatTime(track.duration)}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Demo Notice */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
          <div>
            <h5 className="text-blue-300 text-xs font-medium">Demo Mode</h5>
            <p className="text-blue-400 text-xs mt-1">
              This is a demonstration of Spotify integration. In a production environment, you would connect to your actual Spotify account and play real tracks.
            </p>
          </div>
        </div>
      </div>
      
      {/* Benefits */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center space-x-2 text-xs text-neutral-400">
          <Heart className="h-3 w-3 text-pink-400" />
          <span>Music enhances meditation and mindfulness practices</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-1">
          <Waves className="h-3 w-3 text-blue-400" />
          <span>Personalized playlists for your wellness journey</span>
        </div>
      </div>
    </div>
  );
}

// Add Spotify Player type definitions
declare global {
  interface Window {
    Spotify: {
      Player: new (options: any) => Spotify.Player;
    };
  }
}

namespace Spotify {
  export interface Player {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: string, callback: (data: any) => void): void;
    removeListener(event: string, callback: (data: any) => void): void;
    getCurrentState(): Promise<any>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
  }
}