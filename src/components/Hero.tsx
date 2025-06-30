import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Heart, Zap } from 'lucide-react';
import { HeroHighlight, Highlight } from './ui/hero-highlight';
import { BackgroundBeams } from './ui/background-beams';
import { useTheme } from './ThemeProvider';

interface HeroProps {
  onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  const { theme } = useTheme();
  
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <BackgroundBeams />
      
      {/* Hackathon Badge - Added at the top right corner */}
      <a 
        href="https://worldslargesthackathon.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="absolute top-4 right-4 z-20 md:top-8 md:right-8"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          whileHover={{ scale: 1.05, rotate: 5 }}
        >
          <img 
            src={theme === 'dark' ? "/images/white_circle_360x360.png" : "/images/black_circle_360x360.png"} 
            alt="Circle Background" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <img 
            src="/images/WLHACK_BADGE_PARTICIPANT.png" 
            alt="World's Largest Hackathon Participant" 
            className="relative z-10 w-24 md:w-32 h-auto"
          />
        </motion.div>
      </a>
      
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center space-x-2 mb-8"
        >
          <Shield className="h-8 w-8 text-blue-500" />
          <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SafeMate
          </span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
        >
          The <Highlight className="text-black dark:text-white px-1 mx-1">guardian</Highlight> you trust,
          <br />
          <br />
          the <Highlight className="text-black dark:text-white px-1 mx-1">companion</Highlight> you need
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto"
        >
          AI-powered safety companion with real-time protection, emotional support, and gamified wellness tracking. Your journey, our priority.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
        >
          <motion.button
            onClick={onGetStarted}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.3), 0 10px 10px -5px rgba(59, 130, 246, 0.1)"
            }}
            whileTap={{ scale: 0.95 }}
            className="relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg overflow-hidden group"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600"
              initial={{ x: "100%" }}
              whileHover={{ x: "0%" }}
              transition={{ duration: 0.3 }}
            />
            <span className="relative z-10">Get Started Free</span>
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Join Waitlist
            <motion.div
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Zap className="ml-2 h-5 w-5 group-hover:text-yellow-500 transition-colors" />
            </motion.div>
          </motion.button>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto"
        >
          <motion.div 
            whileHover={{ y: -5 }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">98%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Safety Success Rate</div>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">24/7</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">AI Companion Support</div>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">50K+</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Protected Journeys</div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}