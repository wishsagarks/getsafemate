import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Download, Camera } from 'lucide-react';
import { ShareableCard } from './ShareableCard';

interface AchievementShareModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function AchievementShareModal({ 
  isOpen, 
  onClose, 
  level, 
  xp, 
  rank, 
  achievements, 
  stats 
}: AchievementShareModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-gradient-to-r from-green-500 to-blue-500">
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Share Your Achievements</h3>
                <p className="text-gray-300 text-sm">Create a shareable card to show off your progress</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <ShareableCard
              level={level}
              xp={xp}
              rank={rank}
              achievements={achievements}
              stats={stats}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}