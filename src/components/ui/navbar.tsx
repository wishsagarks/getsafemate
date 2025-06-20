"use client";
import React, { useState } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { Shield, Menu, X, Sun, Moon } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTheme } from "../ThemeProvider";
import { useAuth } from "../../contexts/AuthContext";

export const Navbar = ({
  navItems,
  className,
  onAuthClick,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: JSX.Element;
  }[];
  className?: string;
  onAuthClick?: (mode: 'signin' | 'signup') => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      onAuthClick?.('signin');
    }
  };

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ 
        y: 0,
        borderRadius: isScrolled ? "0 0 32px 32px" : "0px",
      }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500",
        // Enhanced modern glass effect with superior translucency
        isScrolled 
          ? "bg-white/10 dark:bg-black/10 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl shadow-black/10 dark:shadow-black/30" 
          : "bg-white/5 dark:bg-black/5 backdrop-blur-lg backdrop-saturate-100",
        isScrolled && "mx-3 mt-3 rounded-b-[32px]",
        className
      )}
      style={{
        // Advanced glass morphism effect
        background: isScrolled 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)' 
          : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: isScrolled ? 'blur(40px) saturate(180%)' : 'blur(20px) saturate(120%)',
        WebkitBackdropFilter: isScrolled ? 'blur(40px) saturate(180%)' : 'blur(20px) saturate(120%)',
        borderImage: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1)) 1',
      }}
    >
      {/* Subtle gradient overlay for depth */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          isScrolled ? "opacity-100" : "opacity-50"
        )}
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.03) 0%, rgba(147,51,234,0.03) 100%)',
          borderRadius: isScrolled ? '0 0 32px 32px' : '0px',
        }}
      />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with enhanced glass reflection effect */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 cursor-pointer relative"
          >
            <motion.div
              animate={{ rotate: isScrolled ? 360 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="relative"
            >
              <Shield className="h-8 w-8 text-blue-500 drop-shadow-lg" />
              {/* Glass reflection effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent rounded-full"
                animate={{ opacity: isScrolled ? 0.6 : 0.3 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
            <motion.span
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm"
              animate={{ 
                backgroundPosition: isScrolled ? "200% center" : "0% center",
                textShadow: isScrolled ? "0 0 20px rgba(59,130,246,0.3)" : "none"
              }}
              transition={{ duration: 0.6 }}
              style={{ backgroundSize: "200% 100%" }}
            >
              SafeMate
            </motion.span>
          </motion.div>

          {/* Desktop Navigation with frosted glass effect */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item, index) => (
              <motion.a
                key={index}
                href={item.link}
                whileHover={{ 
                  y: -3,
                  scale: 1.05,
                  transition: { type: "spring", stiffness: 400, damping: 10 }
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="relative flex items-center space-x-2 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 font-semibold group px-3 py-2 rounded-xl"
                style={{
                  textShadow: isScrolled ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {/* Hover glass background */}
                <motion.div
                  className="absolute inset-0 bg-white/10 dark:bg-white/5 rounded-xl backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
                
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="relative z-10 text-gray-800 dark:text-gray-200"
                >
                  {item.icon}
                </motion.div>
                <span className="relative z-10 text-sm font-medium">{item.name}</span>
              </motion.a>
            ))}
          </div>

          {/* Desktop Theme Toggle and Auth Button */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle for Desktop */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="relative p-2.5 rounded-xl transition-all duration-300 overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
              <motion.div
                animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                {theme === 'light' ? 
                  <Moon className="h-5 w-5 text-blue-400" /> : 
                  <Sun className="h-5 w-5 text-yellow-500" />
                }
              </motion.div>
            </motion.button>

            {/* Enhanced Auth Button with glass morphism */}
            <motion.button
              onClick={handleAuthAction}
              whileHover={{ 
                scale: 1.05,
                boxShadow: user ? "0 25px 50px -12px rgba(239, 68, 68, 0.4)" : "0 25px 50px -12px rgba(59, 130, 246, 0.4), 0 0 30px rgba(147, 51, 234, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="relative px-6 py-2.5 rounded-full font-semibold text-sm overflow-hidden group shadow-xl"
              style={{
                background: user 
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.9) 0%, rgba(220,38,38,0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(147,51,234,0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {/* Glass reflection overlay */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-white/30 via-white/10 to-transparent"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
              />
              
              {/* Animated background */}
              <motion.div
                className={`absolute inset-0 ${user ? 'bg-gradient-to-r from-red-600/80 to-red-700/80' : 'bg-gradient-to-r from-purple-600/80 to-blue-600/80'}`}
                initial={{ x: "100%" }}
                whileHover={{ x: "0%" }}
                transition={{ duration: 0.4 }}
              />
              
              <span className="relative z-10 text-white font-medium">
                {user ? 'Sign Out' : 'Get Started'}
              </span>
            </motion.button>
          </div>

          {/* Enhanced Mobile Menu Button with glass effect */}
          <div className="md:hidden">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsOpen(!isOpen)}
              className="p-3 rounded-xl text-gray-900 dark:text-gray-100 transition-all duration-300 relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {/* Glass reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
              
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile Menu with superior glass morphism */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="md:hidden mx-3 rounded-b-[32px] shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderTop: 'none',
            }}
          >
            {/* Gradient overlay for depth */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(147,51,234,0.05) 100%)',
              }}
            />
            
            <div className="relative px-6 py-6 space-y-2">
              {navItems.map((item, index) => (
                <motion.a
                  key={index}
                  href={item.link}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  whileHover={{ x: 8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 font-semibold py-3 px-4 rounded-xl relative overflow-hidden group"
                >
                  {/* Hover glass background */}
                  <motion.div
                    className="absolute inset-0 bg-white/10 dark:bg-white/5 rounded-xl"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      backdropFilter: 'blur(10px)',
                    }}
                  />
                  
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="relative z-10 text-gray-800 dark:text-gray-200"
                  >
                    {item.icon}
                  </motion.div>
                  <span className="relative z-10 text-base font-medium">{item.name}</span>
                </motion.a>
              ))}
              
              {/* Theme Toggle for Mobile */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: navItems.length * 0.1, duration: 0.3 }}
                className="flex items-center justify-between py-3 px-4 rounded-xl relative overflow-hidden group"
              >
                <div className="flex items-center space-x-3">
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="relative z-10 text-gray-800 dark:text-gray-200"
                  >
                    {theme === 'light' ? 
                      <Moon className="h-5 w-5 text-blue-400" /> : 
                      <Sun className="h-5 w-5 text-yellow-500" />
                    }
                  </motion.div>
                  <span className="relative z-10 text-base font-medium text-gray-900 dark:text-gray-100">
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="relative p-2 rounded-lg transition-all duration-300 overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
                  <motion.div
                    animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    {theme === 'light' ? 
                      <Moon className="h-4 w-4 text-blue-400" /> : 
                      <Sun className="h-4 w-4 text-yellow-500" />
                    }
                  </motion.div>
                </motion.button>
              </motion.div>
              
              <motion.button
                onClick={handleAuthAction}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: (navItems.length + 1) * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-6 px-6 py-3 rounded-full font-semibold relative overflow-hidden group shadow-xl"
                style={{
                  background: user 
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.9) 0%, rgba(220,38,38,0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(147,51,234,0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {/* Glass reflection */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-tr from-white/30 via-white/10 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
                
                <motion.div
                  className={`absolute inset-0 ${user ? 'bg-gradient-to-r from-red-600/80 to-red-700/80' : 'bg-gradient-to-r from-purple-600/80 to-blue-600/80'}`}
                  initial={{ x: "100%" }}
                  whileHover={{ x: "0%" }}
                  transition={{ duration: 0.4 }}
                />
                
                <span className="relative z-10 text-white font-medium">
                  {user ? 'Sign Out' : 'Get Started'}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};