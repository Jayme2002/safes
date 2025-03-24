/**
 * In-memory store for tracking scan progress and console output
 * This replaces the Supabase realtime functionality with a more direct approach
 */

import { ScanProgress, ScanStage } from '@/types';

interface ScanProgressData {
  progress: ScanProgress;
  consoleOutput: string[];
  isComplete: boolean;
  error?: string;
  vulnerabilities?: any[];
}

// In-memory store for scan progress
const progressStore = new Map<string, ScanProgressData>();

/**
 * Initialize progress tracking for a scan
 */
export function initScanProgress(scanId: string) {
  progressStore.set(scanId, {
    progress: {
      stage: ScanStage.INITIAL_CRAWL,
      progress: 0,
      message: 'Starting scan...',
    },
    consoleOutput: [],
    isComplete: false,
  });
  
  console.log(`[Progress Store] Initialized progress tracking for scan ${scanId}`);
}

/**
 * Update the progress of a scan
 */
export function updateScanProgress(
  scanId: string,
  progress: Partial<ScanProgress>
) {
  const data = progressStore.get(scanId);
  
  if (!data) {
    console.warn(`[Progress Store] Attempted to update non-existent scan progress: ${scanId}`);
    return;
  }
  
  // Update only the provided fields
  data.progress = {
    ...data.progress,
    ...progress,
  };
  
  console.log(`[Progress Store] Updated progress for scan ${scanId}: ${JSON.stringify(progress)}`);
}

/**
 * Add console output to a scan
 */
export function addScanConsoleOutput(scanId: string, message: string) {
  const data = progressStore.get(scanId);
  
  if (!data) {
    console.warn(`[Progress Store] Attempted to add console output to non-existent scan: ${scanId}`);
    return;
  }
  
  // Add timestamp to message if it doesn't already have one
  const formattedMessage = message.startsWith('[') 
    ? message 
    : `[${new Date().toISOString()}] ${message}`;
  
  data.consoleOutput.push(formattedMessage);
  
  // Keep only the last 1000 messages to prevent memory issues
  if (data.consoleOutput.length > 1000) {
    data.consoleOutput = data.consoleOutput.slice(-1000);
  }
  
  console.log(`[Progress Store] Added console output for scan ${scanId}`);
}

/**
 * Mark a scan as complete with vulnerabilities
 */
export function completeScan(scanId: string, vulnerabilities: any[]) {
  const data = progressStore.get(scanId);
  
  if (!data) {
    console.warn(`[Progress Store] Attempted to complete non-existent scan: ${scanId}`);
    return;
  }
  
  data.progress = {
    stage: ScanStage.COMPLETED,
    progress: 100,
    message: 'Scan completed successfully',
  };
  
  data.isComplete = true;
  data.vulnerabilities = vulnerabilities;
  
  // Add completion message to console output
  addScanConsoleOutput(
    scanId,
    `Scan completed with ${vulnerabilities.length} vulnerabilities found.`
  );
  
  console.log(`[Progress Store] Marked scan ${scanId} as complete with ${vulnerabilities.length} vulnerabilities`);
}

/**
 * Mark a scan as failed with an error message
 */
export function failScan(scanId: string, error: string) {
  const data = progressStore.get(scanId);
  
  if (!data) {
    console.warn(`[Progress Store] Attempted to fail non-existent scan: ${scanId}`);
    return;
  }
  
  data.isComplete = true;
  data.error = error;
  
  // Add error message to console output
  addScanConsoleOutput(scanId, `Scan failed: ${error}`);
  
  console.log(`[Progress Store] Marked scan ${scanId} as failed: ${error}`);
}

/**
 * Get the current progress of a scan
 */
export function getScanProgress(scanId: string): ScanProgressData | null {
  const data = progressStore.get(scanId);
  
  if (!data) {
    console.warn(`[Progress Store] Attempted to get non-existent scan progress: ${scanId}`);
    return null;
  }
  
  return { ...data };
}

/**
 * Check if a scan exists in the store
 */
export function hasScanProgress(scanId: string): boolean {
  return progressStore.has(scanId);
}

/**
 * Clean up progress data for a scan
 */
export function cleanupScanProgress(scanId: string) {
  progressStore.delete(scanId);
  console.log(`[Progress Store] Cleaned up progress data for scan ${scanId}`);
}

// Cleanup old scans periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
  
  progressStore.forEach((data, scanId) => {
    // If the scan is complete and older than MAX_AGE, clean it up
    if (data.isComplete) {
      const lastMessage = data.consoleOutput[data.consoleOutput.length - 1];
      if (lastMessage) {
        const match = lastMessage.match(/\[(.*?)\]/);
        if (match) {
          const timestamp = new Date(match[1]).getTime();
          if (now - timestamp > MAX_AGE) {
            cleanupScanProgress(scanId);
          }
        }
      }
    }
  });
}, 60 * 60 * 1000); // Run every hour
