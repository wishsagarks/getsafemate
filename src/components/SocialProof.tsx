import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

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
    },
    {
      name: "David Johnson",
      role: "Graduate Student",
      content: "The emergency features saved me when I felt unsafe walking home. One tap and my contacts were notified with my location. This app is a game-changer for personal safety.",
      rating: 5,
      image: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    },
    {
      name: "Aisha Patel",
      role: "Nurse",
      content: "I use SafeMate every night after my hospital shift. The AI companion's voice is so calming, and the safety tracking gives me confidence walking to my car at 2 AM.",
      rating: 5,
      image: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
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

        {/* Animated Testimonials */}
        <AnimatedTestimonials testimonials={testimonials} />

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

interface AnimatedTestimonialsProps {
  testimonials: {
    name: string;
    role: string;
    content: string;
    rating: number;
    image: string;
  }[];
}

function AnimatedTestimonials({ testimonials }: AnimatedTestimonialsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handlePrevious = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className="relative overflow-hidden bg-black py-20 px-6 rounded-3xl shadow-xl">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 opacity-50" />
      
      {/* Animated dots background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative max-w-5xl mx-auto">
        {/* Navigation controls */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
          <button
            onClick={handlePrevious}
            disabled={isAnimating}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        </div>
        
        <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
          <button
            onClick={handleNext}
            disabled={isAnimating}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Testimonial content */}
        <div className="relative h-[400px] md:h-[350px] overflow-hidden">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={`${testimonial.name}-${idx}`}
              className={cn(
                "absolute top-0 left-0 w-full h-full flex flex-col md:flex-row items-center justify-center md:justify-between gap-8 p-6",
                activeIndex === idx ? "block" : "hidden"
              )}
              initial={{ 
                opacity: 0, 
                x: direction > 0 ? 100 : -100 
              }}
              animate={{ 
                opacity: activeIndex === idx ? 1 : 0,
                x: activeIndex === idx ? 0 : direction > 0 ? -100 : 100
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {/* Quote icon */}
              <div className="absolute top-0 left-0 opacity-20">
                <Quote className="h-24 w-24 text-blue-400" />
              </div>
              
              {/* Testimonial text */}
              <div className="md:w-2/3 text-center md:text-left z-10">
                <div className="flex items-center space-x-1 mb-4 justify-center md:justify-start">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <blockquote className="text-xl md:text-2xl font-medium text-white mb-6 leading-relaxed">
                  "{testimonial.content}"
                </blockquote>
                
                <div className="flex items-center space-x-4 justify-center md:justify-start">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                  />
                  <div>
                    <div className="font-semibold text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-blue-300">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative element */}
              <div className="hidden md:block w-1/3">
                <div className="relative">
                  <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 opacity-75 blur"></div>
                  <div className="relative bg-black rounded-lg p-5">
                    <div className="h-40 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                          SafeMate
                        </div>
                        <div className="text-sm text-gray-400">
                          AI-Powered Protection
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center space-x-2 mt-8">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (isAnimating) return;
                setIsAnimating(true);
                setDirection(idx > activeIndex ? 1 : -1);
                setActiveIndex(idx);
                setTimeout(() => setIsAnimating(false), 500);
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                activeIndex === idx 
                  ? "bg-blue-500 w-6" 
                  : "bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}