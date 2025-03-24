'use client';

import { useState, useRef, useEffect } from 'react';
import { ScanProgress as ScanProgressType, ScanStage } from '@/types';

interface ScanProgressProps {
  scanProgress: ScanProgressType;
  consoleOutput: string[];
  domain: string;
}

export default function ScanProgress({ scanProgress, consoleOutput, domain }: ScanProgressProps) {
  const [showConsole, setShowConsole] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console to bottom when new messages arrive
  useEffect(() => {
    if (consoleEndRef.current && showConsole) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleOutput, showConsole]);

  // Helper function to calculate the progress line width based on scan stage
  const calculateProgressLineWidth = (stage: ScanStage): number => {
    const stages = [
      ScanStage.INITIAL_CRAWL,
      ScanStage.TECHNOLOGY_DETECTION,
      ScanStage.SOURCE_ANALYSIS,
      ScanStage.NETWORK_ANALYSIS,
      ScanStage.ENV_VARIABLE_DETECTION,
      ScanStage.VULNERABILITY_ASSESSMENT,
      ScanStage.REPORT_GENERATION,
      ScanStage.COMPLETED
    ];
    
    const currentIndex = stages.indexOf(stage);
    if (currentIndex === -1) return 0;
    
    // Calculate percentage based on position in stages array
    return Math.min(100, Math.round((currentIndex / (stages.length - 1)) * 100));
  };

  return (
    <div className="py-4">
      {/* Enhanced Scan Progress Container */}
      <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 p-6 shadow-lg relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" style={{ animationDuration: '3s' }}></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-300 blur-3xl opacity-20 animate-blob" style={{ animationDelay: '0s' }}></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-purple-300 blur-3xl opacity-20 animate-blob" style={{ animationDelay: '2s' }}></div>
        </div>
        
        {/* Header with animated dots */}
        <div className="flex items-center mb-6 relative">
          <span className="text-xl font-bold text-indigo-800 mr-3">Security Scan in Progress</span>
          <div className="flex space-x-1">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
            <div className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
            <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: '600ms', animationDuration: '1s' }}></div>
          </div>
        </div>
        
        {/* Current status message with animated icon */}
        <div className="flex items-center mb-6 relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-4 shadow-md animate-pulse" style={{ animationDuration: '2s' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-indigo-800">
              {scanProgress.message}
            </h3>
            <p className="text-sm text-indigo-600">Finding potential security vulnerabilities in your application</p>
          </div>
        </div>
        
        {/* Enhanced progress bar with animated gradient */}
        <div className="mb-8 relative">
          <div className="h-3 bg-indigo-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${scanProgress.progress}%` }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 w-full h-full animate-shine"></div>
            </div>
          </div>
          {/* Percentage indicator */}
          <div className="absolute right-0 -top-6 text-sm font-medium text-indigo-800">
            {Math.round(scanProgress.progress)}%
          </div>
        </div>
        
        {/* Stage indicators - enhanced design */}
        <div className="grid grid-cols-7 gap-1 relative">
          {Object.values(ScanStage).filter(stage => stage !== ScanStage.COMPLETED).map((stage, index) => {
            const stageIndex = Object.values(ScanStage).indexOf(stage);
            const currentIndex = Object.values(ScanStage).indexOf(scanProgress.stage);
            
            // Determine stage status
            let status: 'pending' | 'active' | 'completed' = "pending";
            if (currentIndex > stageIndex) status = "completed";
            else if (currentIndex === stageIndex) status = "active";
            
            // Define colors based on status
            const colors = {
              pending: "bg-indigo-100 text-indigo-400 border-indigo-200",
              active: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-700 shadow-lg",
              completed: "bg-gradient-to-br from-green-400 to-green-600 text-white border-green-600"
            };
            
            return (
              <div key={stage} className="flex flex-col items-center">
                {/* Stage number with status indicator */}
                <div 
                  className={`
                    w-12 h-12 flex items-center justify-center rounded-full mb-2 
                    border ${colors[status]} transition-all duration-500 ease-in-out
                    ${status === "active" ? "scale-110 animate-pulse" : ""}
                  `}
                  style={{ animationDuration: status === "active" ? "2s" : "0s" }}
                >
                  {status === "completed" ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                
                {/* Stage name - more readable */}
                <span className={`
                  text-xs font-medium text-center px-1 transition-all duration-300
                  ${status === "pending" ? "text-indigo-400" : 
                    status === "active" ? "text-indigo-800 font-bold" : 
                    "text-green-600"}
                `}>
                  {stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                </span>
              </div>
            );
          })}
          
          {/* Progress line connecting the stages */}
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-indigo-100 -z-10"></div>
          <div 
            className="absolute top-6 left-6 h-0.5 bg-gradient-to-r from-green-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out -z-10"
            style={{ 
              width: `${calculateProgressLineWidth(scanProgress.stage)}%`
            }}
          >
            {/* Animated pulse at the end of the progress line */}
            <div className="absolute right-0 -top-1.5 h-4 w-4 rounded-full bg-white shadow-md border-2 border-purple-500 animate-pulse"></div>
          </div>
        </div>
        
        {/* Console Output Toggle Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowConsole(!showConsole)}
            className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {showConsole ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Hide Console Output
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Show Console Output
              </>
            )}
          </button>
        </div>
        
        {/* Console Output */}
        {showConsole && (
          <div className="mt-4 bg-gray-900 text-gray-200 p-4 rounded-md overflow-auto max-h-80 font-mono text-xs">
            {consoleOutput.length === 0 ? (
              <div className="text-gray-500 italic">No console output yet...</div>
            ) : (
              consoleOutput.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap mb-1">{line}</div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        )}
        
        {/* Scan Info Box */}
        <div className="mt-8 bg-white bg-opacity-70 backdrop-blur-sm rounded-lg p-4 border border-blue-100 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Scanning <span className="font-medium">{domain}</span> for security vulnerabilities. This process typically takes 2-5 minutes depending on the size of your site.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
