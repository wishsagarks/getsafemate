import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

export function SocialProof() {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "College Student",
      content: "SafeMate has completely changed how I feel about walking alone at night. The AI companion feels like having a friend with me, and my parents love the peace of mind.",
      rating: 5,
      image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    },
    {
      name: "Michael Rodriguez",
      role: "Working Professional",
      content: "The gamification aspect is brilliant. I actually look forward to my daily walks now, earning XP and unlocking badges. It's made safety fun and engaging.",
      rating: 5,
      image: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    },
    {
      name: "Priya Sharma",
      role: "Healthcare Worker",
      content: "Working late shifts, SafeMate's HeartMate mode has been invaluable for emotional support. The AI really understands and provides comfort when I need it most.",
      rating: 5,
      image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    }
  ];

  const stats = [
    { number: "500K+", label: "Active Users", sublabel: "Growing daily" },
    { number: "2.3M", label: "Safe Journeys", sublabel: "Completed successfully" },
    { number: "4.9★", label: "App Rating", sublabel: "Based on 25K+ reviews" },
    { number: "98%", label: "Safety Rate", sublabel: "Incident-free journeys" }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Trusted by Thousands
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Join a growing community of users who have transformed their safety and well-being with SafeMate's AI-powered protection.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2"
              >
                {stat.number}
              </motion.div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{stat.label}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{stat.sublabel}</div>
            </div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 relative"
            >
              <Quote className="h-8 w-8 text-blue-500 mb-4" />
              
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <div className="flex items-center space-x-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Story Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-20 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-8 md:p-12 rounded-2xl text-center"
        >
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Story</h3>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
            SafeMate was born from a simple belief: everyone deserves to feel safe and supported. 
            Our team of AI researchers, safety experts, and mental health professionals came together 
            to create more than just an app—we built a companion that truly cares. With cutting-edge 
            technology and deep empathy, SafeMate represents the future of personal safety and emotional well-being.
          </p>
        </motion.div>
      </div>
    </section>
  );
}