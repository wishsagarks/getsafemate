import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  Shield, 
  Heart, 
  Star, 
  Calendar, 
  Trophy, 
  Download, 
  Share2, 
  CheckCircle,
  Camera
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import html2canvas from 'html2canvas';

interface ShareableCardProps {
  level: number;
  xp: number;
  rank: string;
  achievements: any[];
  stats: {
    safeJourneys: number;
    aiChats: number;
    streakDays: number;
    activitiesCompleted: number;
  };
}

export function ShareableCard({ level, xp, rank, achievements, stats }: ShareableCardProps) {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Get achievement icon component
  const getAchievementIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'shield': return Shield;
      case 'heart': return Heart;
      case 'star': return Star;
      case 'calendar': return Calendar;
      default: return Award;
    }
  };

  // Get achievement color
  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'safety': return 'text-blue-400';
      case 'wellness': return 'text-pink-400';
      case 'streak': return 'text-indigo-400';
      case 'milestone': return 'text-emerald-400';
      case 'social': return 'text-green-400';
      default: return 'text-yellow-400';
    }
  };

  // Get featured achievements (max 3)
  const featuredAchievements = achievements
    .filter(a => a.is_featured)
    .slice(0, 3);

  // Generate shareable image
  const generateImage = async () => {
    if (!cardRef.current) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#000000',
        logging: false,
        allowTaint: true,
        useCORS: true
      });
      
      const image = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.href = image;
      link.download = `safemate-level-${level}-card.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy image to clipboard
  const copyToClipboard = async (imageDataUrl: string) => {
    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      return true;
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      return false;
    }
  };

  // Share card
  const shareCard = async () => {
    if (!cardRef.current) return;
    
    setIsSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#000000',
        logging: false,
        allowTaint: true,
        useCORS: true
      });
      
      const image = canvas.toDataURL('image/png');
      
      // Try Web Share API first (only if supported and likely to work)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(image)).blob();
          const file = new File([blob], 'safemate-card.png', { type: 'image/png' });
          
          // Check if files can be shared
          const shareData = {
            title: 'My SafeMate Achievements',
            text: `Check out my SafeMate level ${level} achievements! I'm a ${rank} with ${xp} XP.`,
            files: [file]
          };
          
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return; // Success, exit early
          }
        } catch (shareError) {
          console.log('Web Share API failed, trying clipboard fallback');
          // Continue to clipboard fallback
        }
      }
      
      // Fallback 1: Try clipboard
      const clipboardSuccess = await copyToClipboard(image);
      if (clipboardSuccess) {
        alert('Card copied to clipboard! You can now paste it in your favorite app.');
        return;
      }
      
      // Fallback 2: Download the image
      const link = document.createElement('a');
      link.href = image;
      link.download = `safemate-level-${level}-card.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Card downloaded to your device!');
      
    } catch (error) {
      console.error('Error sharing card:', error);
      alert('Unable to share card. Please try downloading instead.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Shareable Card */}
      <div 
        ref={cardRef}
        className="w-full max-w-md mx-auto bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden border border-gray-800"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">SafeMate</h2>
                <p className="text-xs text-blue-300">AI-Powered Safety Companion</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">Level {level}</div>
                <div className="text-xs text-yellow-300">{rank}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="p-6 border-b border-gray-800">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-xl font-bold text-white">{stats.safeJourneys}</div>
              <div className="text-xs text-blue-300">Journeys</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{stats.aiChats}</div>
              <div className="text-xs text-pink-300">AI Chats</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{stats.streakDays}</div>
              <div className="text-xs text-indigo-300">Streak</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{achievements.length}</div>
              <div className="text-xs text-yellow-300">Badges</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-neutral-400">XP Progress</span>
              <span className="text-xs text-neutral-400">{xp} XP</span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                style={{ width: '60%' }}
              />
            </div>
          </div>
        </div>
        
        {/* Achievements */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-white mb-4">Featured Achievements</h3>
          
          {featuredAchievements.length > 0 ? (
            <div className="space-y-3">
              {featuredAchievements.map((achievement) => {
                const IconComponent = getAchievementIcon(achievement.badge_icon);
                
                return (
                  <div 
                    key={achievement.id}
                    className="flex items-center space-x-3 p-3 bg-black/30 rounded-lg border border-gray-800"
                  >
                    <div className="p-2 rounded-lg bg-black/50">
                      <IconComponent className={`h-4 w-4 ${getAchievementColor(achievement.achievement_type)}`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{achievement.achievement_name}</div>
                      <div className="text-xs text-neutral-500">{achievement.achievement_description}</div>
                    </div>
                    <div className="ml-auto">
                      <div className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                        +{achievement.points_earned} XP
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-4 bg-black/30 rounded-lg border border-gray-800">
              <Award className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-neutral-400 text-sm">Complete more activities to earn achievements</p>
            </div>
          )}
          
          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between">
            <div className="text-xs text-neutral-500">
              {user?.email?.split('@')[0] || 'SafeMate User'}
            </div>
            <div className="text-xs text-neutral-500">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <motion.button
          onClick={generateImage}
          disabled={isGenerating}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Download Card</span>
            </>
          )}
        </motion.button>
        
        <motion.button
          onClick={shareCard}
          disabled={isSharing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          {isSharing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sharing...</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>Share Card</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}