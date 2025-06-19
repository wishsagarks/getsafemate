"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  const paths = [
    "M -5 -5 Q 50 50 105 -5",
    "M -5 105 Q 50 50 105 105",
    "M 105 -5 Q 150 50 205 -5",
    "M 105 105 Q 150 50 205 105"
  ];

  return (
    <div
      className={cn(
        "absolute inset-0 h-full w-full bg-gradient-to-br from-blue-50 via-transparent to-cyan-50 dark:from-blue-950/20 dark:via-transparent dark:to-cyan-950/20",
        className
      )}
      // Move the entire background animation down to avoid navbar overlap
      style={{ paddingTop: '80px' }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        width="100%"
        height="100%"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        // Additional positioning to ensure spiral animations are visible
        style={{ marginTop: '40px' }}
      >
        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.1)" />
            <stop offset="50%" stopColor="rgba(147, 197, 253, 0.2)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
          </linearGradient>
        </defs>
        {paths.map((path, index) => (
          <motion.path
            key={index}
            d={path}
            stroke="url(#beam-gradient)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: 2,
              delay: index * 0.5,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent animate-pulse" />
    </div>
  );
};