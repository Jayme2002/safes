'use client';

import { useState, useRef, useEffect } from 'react';
import { ScanProgress as ScanProgressType, ScanStage } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface ScanProgressProps {
  scanProgress: ScanProgressType;
  consoleOutput: string[];
  domain: string;
  onComplete?: () => void;
}

export default function ScanProgress({ scanProgress, consoleOutput, domain, onComplete }: ScanProgressProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const completionTriggeredRef = useRef(false);

  // Auto-scroll console to bottom when new messages arrive
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleOutput]);

  // Handle completion animation
  useEffect(() => {
    // Don't trigger completion more than once
    if (scanProgress.progress >= 100 && !completionTriggeredRef.current) {
      console.log("[Scan Progress] Showing completion animation");
      completionTriggeredRef.current = true;
      setShowCompletion(true);
      
      // Wait 3 seconds for completion animation, then call onComplete
      setTimeout(() => {
        console.log("[Scan Progress] Completion animation finished, calling onComplete");
        onComplete?.();
      }, 3000);
    }
  }, [scanProgress.progress, onComplete]);

  // Reset completion trigger when component mounts
  useEffect(() => {
    console.log("[Scan Progress] Component mounted");
    completionTriggeredRef.current = false;
    
    return () => {
      console.log("[Scan Progress] Component unmounted");
    };
  }, []);

  return (
    <div className="min-h-[400px] flex flex-col">
      {/* Main content container */}
      <div className="flex-1 bg-[#2A2D3E] rounded-lg p-6 shadow-xl relative overflow-hidden">
        {/* Completion overlay */}
        <AnimatePresence>
          {showCompletion && (
            <motion.div 
              className="absolute inset-0 bg-[#2A2D3E]/95 flex items-center justify-center z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <motion.div
                  className="inline-block text-green-500 mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 10,
                    delay: 0.5
                  }}
                >
                  <CheckCircle className="w-16 h-16" />
                </motion.div>
                <h2 className="text-2xl font-medium text-white mb-2">Scan Complete!</h2>
                <p className="text-gray-400">Preparing your results...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-white text-xl font-medium">{scanProgress.message}</h2>
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
          <span className="text-white text-sm">{Math.round(scanProgress.progress)}% Complete</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-gray-700 rounded-full mb-8 overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${scanProgress.progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Terminal-like console */}
        <div className="bg-[#1E1F2E] rounded-lg p-4 font-mono text-sm h-[300px] overflow-y-auto">
          <div className="flex items-center mb-2 pb-2 border-b border-gray-700">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="ml-4 text-gray-400">Terminal</span>
          </div>
          <div className="space-y-1 text-gray-300">
            {consoleOutput.map((line, index) => (
              <div key={index} className="font-mono">
                <span className="text-green-400">$</span> {line}
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>

        {/* Status message */}
        <div className="mt-6 flex items-center space-x-2 text-gray-400">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">
            Scanning <span className="text-white font-medium">{domain}</span> for security vulnerabilities...
          </span>
        </div>
      </div>
    </div>
  );
}
