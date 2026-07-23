import React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

interface AnimatedLogoProps {
  size?: "sm" | "lg";
}

export default function AnimatedLogo({ size = "lg" }: AnimatedLogoProps) {
  const isLg = size === "lg";

  // Particle variations for celebration/magic feel
  const particles = [
    { delay: 0, x: -18, y: -18, scale: 0.8, color: "bg-pink-400" },
    { delay: 0.2, x: 20, y: -16, scale: 0.6, color: "bg-purple-400" },
    { delay: 0.4, x: -16, y: 18, scale: 0.7, color: "bg-indigo-400" },
    { delay: 0.6, x: 18, y: 18, scale: 0.5, color: "bg-blue-400" },
  ];

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Immersive ambient glow beneath the logo */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 blur-xl pointer-events-none ${
          isLg ? "w-28 h-28 opacity-75" : "w-10 h-10 opacity-60"
        }`}
      />

      {/* Rotating outer orbit ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
        className={`absolute rounded-full border border-dashed border-white/20 flex items-center justify-center ${
          isLg ? "w-24 h-24" : "w-10 h-10"
        }`}
      >
        {/* Tiny orbital node */}
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`absolute rounded-full bg-indigo-400 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
            isLg
              ? "w-2.5 h-2.5 shadow-[0_0_8px_#818cf8]"
              : "w-1 h-1 shadow-[0_0_4px_#818cf8]"
          }`}
        />
      </motion.div>

      {/* Main Core Button/Insignia */}
      <motion.div
        whileHover={{
          scale: 1.08,
          rotate: 5,
          boxShadow: isLg
            ? "0 0 25px rgba(129, 140, 248, 0.4)"
            : "0 0 12px rgba(129, 140, 248, 0.3)",
        }}
        whileTap={{ scale: 0.95 }}
        className={`relative z-10 rounded-2xl bg-gradient-to-tr from-indigo-900/80 via-purple-900/80 to-[#1f1638]/90 border border-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-xl ${
          isLg ? "w-16 h-16 p-4" : "w-8.5 h-8.5 p-1.5"
        }`}
      >
        {/* Pulsing inner gradient border */}
        <motion.div
          animate={{
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500/10 via-purple-500/20 to-pink-500/10 pointer-events-none"
        />
        {/* Central spark/magic icon */}{" "}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Sparkles
            className={`text-indigo-100 hover:text-white drop-shadow-[0_0_10px_#a855f7] ${
              isLg ? "w-8 h-8" : "w-4 h-4"
            }`}
          />
        </motion.div>
      </motion.div>

      {/* Floating Magic Sparks (Lg size only for visual balance) */}
      {isLg &&
        particles.map((p, idx) => (
          <motion.div
            key={idx}
            animate={{
              x: [p.x, p.x * 1.25, p.x],
              y: [p.y, p.y * 1.25, p.y],
              scale: [p.scale, p.scale * 1.3, p.scale],
              opacity: [0.3, 0.85, 0.3],
            }}
            transition={{
              duration: 3 + idx,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay,
            }}
            className={`absolute rounded-full pointer-events-none shadow-md ${p.color}`}
            style={{
              width: `${isLg ? 6 : 3}px`,
              height: `${isLg ? 6 : 3}px`,
            }}
          />
        ))}
    </div>
  );
}
