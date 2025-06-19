import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Heart, MapPin, Phone, MessageCircle, Camera } from 'lucide-react';
import { BentoGrid, BentoGridItem } from './ui/bento-grid';

export function AppModes() {
  const modes = [
    {
      title: "Safe Walk",
      description: "Real-time protection with AI companion during travels. GPS tracking, SOS alerts, and smart route optimization.",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 items-center justify-center">
          <Shield className="h-12 w-12 text-blue-500" />
        </div>
      ),
      icon: <Shield className="h-4 w-4 text-blue-500" />,
      className: "md:col-span-2",
    },
    {
      title: "HeartMate",
      description: "Emotional support and wellness companion. AI-powered conversations, mood tracking, and personalized comfort.",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 items-center justify-center">
          <Heart className="h-12 w-12 text-pink-500" />
        </div>
      ),
      icon: <Heart className="h-4 w-4 text-pink-500" />,
      className: "md:col-span-1",
    },
    {
      title: "Smart Tracking",
      description: "Advanced location services with predictive safety scoring and route recommendations.",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 items-center justify-center">
          <MapPin className="h-12 w-12 text-green-500" />
        </div>
      ),
      icon: <MapPin className="h-4 w-4 text-green-500" />,
      className: "md:col-span-1",
    },
    {
      title: "Emergency Response",
      description: "Instant SOS alerts with video calling, location sharing, and automated emergency contact notifications.",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 items-center justify-center">
          <Phone className="h-12 w-12 text-red-500" />
        </div>
      ),
      icon: <Phone className="h-4 w-4 text-red-500" />,
      className: "md:col-span-1",
    },
    {
      title: "AI Avatar Support",
      description: "Personalized AI companion with video chat, voice interaction, and emotional intelligence for comfort and guidance.",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 items-center justify-center">
          <Camera className="h-12 w-12 text-purple-500" />
        </div>
      ),
      icon: <Camera className="h-4 w-4 text-purple-500" />,
      className: "md:col-span-1",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Two Modes, Complete Protection
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            SafeMate adapts to your needs with specialized modes for safety and emotional well-being, powered by cutting-edge AI technology.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <BentoGrid className="max-w-4xl mx-auto">
            {modes.map((item, i) => (
              <BentoGridItem
                key={i}
                title={item.title}
                description={item.description}
                header={item.header}
                icon={item.icon}
                className={item.className}
              />
            ))}
          </BentoGrid>
        </motion.div>
      </div>
    </section>
  );
}