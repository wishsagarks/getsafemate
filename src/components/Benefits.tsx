import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Heart, Zap, Star, Users, Award } from 'lucide-react';
import { HoverEffect } from './ui/card-hover-effect';

export function Benefits() {
  const benefits = [
    {
      title: "24/7 AI Protection",
      description: "Advanced AI companion that never sleeps, providing continuous safety monitoring and instant response to potential threats.",
      icon: <Shield className="h-8 w-8 text-blue-500" />,
    },
    {
      title: "Emotional Wellness",
      description: "Personalized emotional support with mood tracking, meditation guidance, and compassionate AI conversations when you need them most.",
      icon: <Heart className="h-8 w-8 text-pink-500" />,
    },
    {
      title: "Instant SOS Response",
      description: "One-tap emergency alerts with automatic location sharing, video calls to contacts, and integration with local emergency services.",
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
    },
    {
      title: "Gamified Safety",
      description: "Earn XP, unlock achievements, and build your safety profile while making security practices engaging and rewarding.",
      icon: <Star className="h-8 w-8 text-purple-500" />,
    },
    {
      title: "Community Support",
      description: "Connect with other SafeMate users, share experiences, and build a supportive network focused on mutual safety and well-being.",
      icon: <Users className="h-8 w-8 text-green-500" />,
    },
    {
      title: "Premium Features",
      description: "Advanced AI capabilities, unlimited companion time, priority support, and exclusive safety features for enhanced protection.",
      icon: <Award className="h-8 w-8 text-orange-500" />,
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Why Choose SafeMate?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Discover the powerful benefits that make SafeMate the trusted choice for millions seeking safety, comfort, and peace of mind.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <HoverEffect items={benefits} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
        >
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 p-8 rounded-2xl border border-blue-800/30">
            <div className="text-4xl font-bold text-blue-400 mb-2">98%</div>
            <div className="text-white font-semibold mb-2">Safety Success Rate</div>
            <div className="text-gray-400 text-sm">Based on 50,000+ protected journeys</div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 p-8 rounded-2xl border border-purple-800/30">
            <div className="text-4xl font-bold text-purple-400 mb-2">2.3M</div>
            <div className="text-white font-semibold mb-2">AI Conversations</div>
            <div className="text-gray-400 text-sm">Emotional support sessions completed</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/20 to-green-800/20 p-8 rounded-2xl border border-green-800/30">
            <div className="text-4xl font-bold text-green-400 mb-2">4.9★</div>
            <div className="text-white font-semibold mb-2">User Rating</div>
            <div className="text-gray-400 text-sm">From 25,000+ app store reviews</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}