import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Music, 
  AlertCircle,
  Calendar,
  Bell,
  Heart,
  Waves
} from 'lucide-react';

interface SpotifyPlayerProps {
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function SpotifyPlayer({ onPlayStateChange }: SpotifyPlayerProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Notify parent that we're not playing
  if (onPlayStateChange) {
    onPlayStateChange(false);
  }

  return (
    <div className="bg-black border border-white/20 rounded-xl p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Music className="h-5 w-5 text-green-400" />
          <h3 className="text-white font-medium">Spotify Integration</h3>
        </div>
      </div>
      
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <Music className="h-8 w-8 text-green-400" />
        </div>
        
        <h4 className="text-white font-semibold text-lg mb-2">Coming Soon</h4>
        <p className="text-neutral-400 mb-6">
          We're working on integrating Spotify to enhance your wellness experience. 
          This feature will be available in a future update.
        </p>
        
        {/* Email notification signup */}
        <div className="max-w-sm mx-auto">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
            <h5 className="text-green-400 text-sm font-medium mb-2">Get notified when it's ready</h5>
            <div className="flex items-center space-x-2">
              <input 
                type="email"
                placeholder="Your email address"
                className="flex-1 px-3 py-2 bg-black/50 border border-green-500/30 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSubscribed(true)}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
              >
                {isSubscribed ? <Bell className="h-4 w-4" /> : "Notify Me"}
              </motion.button>
            </div>
            {isSubscribed && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-green-400 text-xs mt-2"
              >
                Thanks! We'll let you know when Spotify integration is ready.
              </motion.p>
            )}
          </div>
        </div>
        
        {/* Coming soon features */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mt-6">
          <div className="p-3 bg-white/5 rounded-lg text-left">
            <Heart className="h-4 w-4 text-pink-400 mb-1" />
            <div className="text-white text-xs font-medium">Favorite Playlists</div>
            <div className="text-neutral-500 text-[10px]">Access your Spotify playlists</div>
          </div>
          
          <div className="p-3 bg-white/5 rounded-lg text-left">
            <Calendar className="h-4 w-4 text-blue-400 mb-1" />
            <div className="text-white text-xs font-medium">Scheduled Sessions</div>
            <div className="text-neutral-500 text-[10px]">Plan your wellness routines</div>
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
      
      {/* Coming soon badge */}
      <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
          <div>
            <h5 className="text-blue-300 text-sm font-medium">Coming Soon</h5>
            <p className="text-blue-400 text-xs mt-1">
              We're working hard to bring you Spotify integration. In the meantime, you can use our basic music player for your wellness activities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}