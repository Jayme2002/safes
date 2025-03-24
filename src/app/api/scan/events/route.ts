import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';
import { ScanProgress, ScanStatus } from '@/types';
import { 
  getScanProgress, 
  hasScanProgress, 
  initScanProgress, 
  updateScanProgress 
} from '@/lib/scanner/progress-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Create a function that generates SSE-formatted data
const formatSSE = (event: string, data: any) => {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const scanId = url.searchParams.get('scanId');
  const userId = url.searchParams.get('userId');

  if (!scanId) {
    return new Response(
      formatSSE('error', { error: 'Missing required scanId parameter' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }

  const supabase = createAdminClient();

  // Create a response with appropriate SSE headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send an initial connection message
      controller.enqueue(encoder.encode(formatSSE('open', { message: 'SSE connection established' })));

      // Get initial scan data
      const { data: scanData, error: scanError } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (scanError || !scanData) {
        controller.enqueue(encoder.encode(formatSSE('error', { error: 'Failed to retrieve scan' })));
        controller.close();
        return;
      }

      // Check if we have progress data in the store
      let progressData = getScanProgress(scanId);
      
      // If no progress data in store, initialize it
      if (!progressData && scanData.status === ScanStatus.SCANNING) {
        initScanProgress(scanId);
        
        // Initialize with data from database
        if (scanData.progress_stage) {
          updateScanProgress(
            scanId,
            {
              stage: scanData.progress_stage,
              progress: scanData.progress_percent || 0,
              message: scanData.progress_message || 'Processing...'
            }
          );
        }
        
        progressData = getScanProgress(scanId);
      }

      // Send initial state
      controller.enqueue(encoder.encode(formatSSE('scan_update', {
        status: scanData.status,
        progress: progressData ? progressData.progress : {
          stage: scanData.progress_stage || null,
          progress: scanData.progress_percent || 0,
          message: scanData.progress_message || 'Processing...'
        },
        consoleOutput: progressData ? progressData.consoleOutput.slice(-5) : []
      })));

      // If the scan is already completed, send the vulnerabilities data and close
      if (scanData.status === ScanStatus.COMPLETED) {
        const { data: vulnData } = await supabase
          .from('vulnerabilities')
          .select('*')
          .eq('scan_id', scanId)
          .order('severity', { ascending: false });

        controller.enqueue(encoder.encode(formatSSE('scan_complete', {
          vulnerabilities: vulnData || []
        })));
        
        controller.close();
        return;
      }

      // Set up polling for progress updates
      let lastProgressUpdate = Date.now();
      let lastConsoleLength = progressData ? progressData.consoleOutput.length : 0;
      
      const progressInterval = setInterval(() => {
        if (!hasScanProgress(scanId)) {
          clearInterval(progressInterval);
          return;
        }
        
        const currentProgress = getScanProgress(scanId);
        if (!currentProgress) return;
        
        // Check if there are new console messages
        const hasNewConsole = currentProgress.consoleOutput.length > lastConsoleLength;
        
        // Send update if there's new progress or console output
        if (hasNewConsole) {
          // Get the new console messages
          const newConsoleMessages = currentProgress.consoleOutput.slice(lastConsoleLength);
          lastConsoleLength = currentProgress.consoleOutput.length;
          
          // Send the update
          controller.enqueue(encoder.encode(formatSSE('scan_update', {
            status: ScanStatus.SCANNING,
            progress: currentProgress.progress,
            consoleOutput: newConsoleMessages
          })));
          
          lastProgressUpdate = Date.now();
        }
        
        // If scan is complete, send completion event
        if (currentProgress.isComplete) {
          if (currentProgress.error) {
            // Send failure event
            controller.enqueue(encoder.encode(formatSSE('scan_failed', {
              message: currentProgress.error
            })));
          } else {
            // Send completion event
            controller.enqueue(encoder.encode(formatSSE('scan_complete', {
              vulnerabilities: currentProgress.vulnerabilities || []
            })));
          }
          
          // Clean up and close
          clearInterval(progressInterval);
          clearInterval(statusCheckInterval);
          controller.close();
        }
      }, 1000); // Check every second
      
      // Set up polling for scan status changes in case the scan is completed outside of our progress tracking
      const statusCheckInterval = setInterval(async () => {
        try {
          const { data: currentScanData, error } = await supabase
            .from('scans')
            .select('status, progress_stage, progress_percent, progress_message')
            .eq('id', scanId)
            .single();
          
          if (error || !currentScanData) {
            console.error('[SSE] Error checking scan status:', error);
            return;
          }
          
          // If scan is completed or failed in the database but not in our store
          if (
            (currentScanData.status === ScanStatus.COMPLETED || 
             currentScanData.status === ScanStatus.FAILED) && 
            hasScanProgress(scanId)
          ) {
            const progressData = getScanProgress(scanId);
            if (progressData && !progressData.isComplete) {
              if (currentScanData.status === ScanStatus.COMPLETED) {
                // Fetch vulnerabilities
                const { data: vulnData } = await supabase
                  .from('vulnerabilities')
                  .select('*')
                  .eq('scan_id', scanId)
                  .order('severity', { ascending: false });
                
                // Send completion event
                controller.enqueue(encoder.encode(formatSSE('scan_complete', {
                  vulnerabilities: vulnData || []
                })));
              } else {
                // Send failure event
                controller.enqueue(encoder.encode(formatSSE('scan_failed', {
                  message: 'Scan failed'
                })));
              }
              
              // Clean up and close
              clearInterval(statusCheckInterval);
              clearInterval(progressInterval);
              controller.close();
            }
          }
        } catch (error) {
          console.error('[SSE] Error in status check interval:', error);
        }
      }, 5000); // Check every 5 seconds
      
      // Set a timeout to eventually close the connection (e.g., 10 minutes)
      setTimeout(() => {
        clearInterval(statusCheckInterval);
        clearInterval(progressInterval);
        controller.close();
      }, 10 * 60 * 1000);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
