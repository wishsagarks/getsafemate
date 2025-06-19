import React from 'react';
import { motion } from 'framer-motion';
import { Star, Award, Trophy, Shield, Heart, Zap } from 'lucide-react';

export function Gamification() {
  const badges = [
    { name: "Safety Guardian", icon: Shield, color: "text-blue-500", earned: true },
    { name: "Journey Master", icon: Star, color: "text-yellow-500", earned: true },
    { name: "Heart Helper", icon: Heart, color: "text-pink-500", earned: false },
    { name: "Speed Walker", icon: Zap, color: "text-purple-500", earned: true },
    { name: "Community Hero", icon: Award, color: "text-green-500", earned: false },
    { name: "Elite Protector", icon: Trophy, color: "text-orange-500", earned: false },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Level Up Your Safety
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Turn safety into an engaging journey. Earn XP, unlock badges, and climb the leaderboards while building better safety habits.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Progress Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Your Progress</h3>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">Level 12</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Safety Explorer</div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">XP Progress</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">2,450 / 3,000</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "82%" }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">47</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Safe Journeys</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">128</div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Check-ins</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">23</div>
                <div className="text-sm text-green-700 dark:text-green-300">AI Chats</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">12</div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">Streak Days</div>
              </div>
            </div>
          </motion.div>

          {/* Badges Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Achievement Badges</h3>
            
            <div className="grid grid-cols-3 gap-4">
              {badges.map((badge, index) => (
                <motion.div
                  key={badge.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                  className={`p-4 rounded-xl text-center transition-all duration-200 ${
                    badge.earned
                      ? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-2 border-transparent'
                      : 'bg-gray-100 dark:bg-gray-900 opacity-50 border-2 border-dashed border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <badge.icon className={`h-8 w-8 mx-auto mb-2 ${badge.color}`} />
                  <div className="text-xs font-medium text-gray-900 dark:text-white leading-tight">
                    {badge.name}
                  </div>
                  {badge.earned && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Earned</div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Next Goal</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Complete 5 more journeys to unlock Heart Helper badge</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}