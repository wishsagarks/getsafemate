import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, Shield, Heart, Zap } from 'lucide-react';
import { Timeline } from './ui/timeline';

export function HowItWorks() {
  const timelineData = [
    {
      title: "Login & Get Started",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Access SafeMate instantly through your web browser. No downloads, no installations - just secure login and you're ready to go.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 p-4 rounded-lg"
            >
              <LogIn className="h-8 w-8 text-blue-500 mb-2" />
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Instant Access</h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">Web-based, no downloads</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 p-4 rounded-lg"
            >
              <Shield className="h-8 w-8 text-green-500 mb-2" />
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-200">Secure Login</h4>
              <p className="text-xs text-green-700 dark:text-green-300">Privacy-first authentication</p>
            </motion.div>
          </div>
        </div>
      ),
    },
    {
      title: "Choose Your Mode",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Select Safe Walk for journey protection or HeartMate for emotional support. Switch between modes anytime based on your current needs.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-lg border border-purple-100 dark:border-purple-800"
            >
              <div className="flex items-center space-x-4 mb-3">
                <Shield className="h-6 w-6 text-purple-500" />
                <span className="font-semibold text-purple-900 dark:text-purple-200">Safe Walk Mode</span>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">GPS tracking, route optimization, SOS alerts</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 p-6 rounded-lg border border-pink-100 dark:border-pink-800"
            >
              <div className="flex items-center space-x-4 mb-3">
                <Heart className="h-6 w-6 text-pink-500" />
                <span className="font-semibold text-pink-900 dark:text-pink-200">HeartMate Mode</span>
              </div>
              <p className="text-sm text-pink-700 dark:text-pink-300">AI companion, mood tracking, emotional support</p>
            </motion.div>
          </div>
        </div>
      ),
    },
    {
      title: "AI Companion Activates",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Your personalized AI avatar becomes active, providing real-time support, safety monitoring, and companionship throughout your journey.
          </p>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-lg">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">AI Avatar Active</h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">Real-time companion support</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/50 dark:bg-black/20 p-2 rounded text-center">
                <div className="font-semibold text-indigo-600 dark:text-indigo-400">Voice Chat</div>
              </div>
              <div className="bg-white/50 dark:bg-black/20 p-2 rounded text-center">
                <div className="font-semibold text-purple-600 dark:text-purple-400">Video Call</div>
              </div>
              <div className="bg-white/50 dark:bg-black/20 p-2 rounded text-center">
                <div className="font-semibold text-pink-600 dark:text-pink-400">Mood Support</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Earn & Grow",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Complete safe journeys and wellness activities to earn XP, unlock badges, and level up your safety profile. Track your progress and celebrate milestones.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">+250 XP</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">Safe Journey Complete</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">🏆</div>
              <div className="text-sm text-green-700 dark:text-green-300">Safety Guardian Badge</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            How SafeMate Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Four simple steps to transform your safety and well-being journey with our AI-powered web companion - no downloads required.
          </p>
        </motion.div>
      </div>
      
      <Timeline data={timelineData} />
    </section>
  );
}