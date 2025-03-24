'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Scan, ScanProgress, ScanStage, ScanStatus, Vulnerability } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ScanDetails from '@/components/scan/ScanDetails';
import ScanProgressComponent from '@/components/scan/ScanProgress';
import VulnerabilityList from '@/components/scan/VulnerabilityList';
import { ScanSimulation } from '@/lib/scan/simulation';

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
  const unwrappedParams = React.use(params) as { id: string };
  const scanId = unwrappedParams.id;
  
  // EventSource reference for SSE
  const eventSourceRef = useRef<EventSource | null>(null);
  const simulationRef = useRef<ScanSimulation | null>(null);
  
  const [scan, setScan] = useState<Scan | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    stage: ScanStage.INITIAL_CRAWL,
    progress: 0,
    message: 'Preparing scan...',
  });
  
  // State for console output
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  // Load initial scan data
  useEffect(() => {
    if (!user || !scanId) return;

    const fetchScan = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('scans')
          .select('*')
          .eq('id', scanId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          throw error;
        }

        // Check for successful payment redirect from Stripe
        const searchParams = new URLSearchParams(window.location.search);
        const success = searchParams.get('success');
        
        if (success === 'true' && data.status === ScanStatus.PAYMENT_REQUIRED) {
          console.log('Payment successful, updating scan status...');
          
          // Update scan status to paid
          const { error: updateError } = await supabase
            .from('scans')
            .update({
              status: ScanStatus.PAYMENT_PROCESSING,
              paid: true,
            })
            .eq('id', scanId);

          if (updateError) {
            console.error('Error updating scan status:', updateError);
          } else {
            // Update local state
            data.status = ScanStatus.PAYMENT_PROCESSING;
            data.paid = true;
            
            toast.success('Payment successful', {
              description: 'Your payment has been processed successfully. Click "Start Scan" to begin.',
            });
          }
        }

        setScan(data as Scan);

        // If scan is completed, fetch vulnerabilities
        if (data.status === ScanStatus.COMPLETED) {
          const { data: vulnData, error: vulnError } = await supabase
            .from('vulnerabilities')
            .select('*')
            .eq('scan_id', scanId)
            .order('severity', { ascending: false });

          if (vulnError) {
            throw vulnError;
          }

          setVulnerabilities(vulnData as Vulnerability[]);
          
          // Mark scan as completed
          setScanProgress({
            stage: ScanStage.COMPLETED,
            progress: 100,
            message: 'Scan completed successfully'
          });
        }

        // Don't auto-start scan even if state is SCANNING
        // This ensures the user always has to click the Start button
        if (data.status === ScanStatus.SCANNING) {
          // Just update scan status to show the scan button
          setScan({
            ...data,
            status: ScanStatus.PAYMENT_PROCESSING
          });
        }
      } catch (error) {
        console.error('Error fetching scan:', error);
        toast.error('Failed to load scan details', {
          description: 'Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchScan();
  }, [user, scanId]);

  // Connect to SSE endpoint for live updates when scanning is active
  useEffect(() => {
    // Clean up previous event source if it exists
    if (eventSourceRef.current) {
      console.log('[SSE] Closing previous EventSource connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Only connect to SSE if actively scanning and we have required data
    if (!isScanning || !user || !scanId) return;
    
    console.log('[SSE] Setting up EventSource connection for real-time updates');
    
    // Create new EventSource connection
    const eventSource = new EventSource(`/api/scan/events?scanId=${scanId}&userId=${user.id}`);
    eventSourceRef.current = eventSource;
    
    // Connection opened
    eventSource.addEventListener('open', () => {
      console.log('[SSE] Connection established');
    });
    
    // Handle SSE messages for scan updates
    eventSource.addEventListener('scan_update', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Scan update received:', data);
        
        // Update scan status in UI
        if (data.status) {
          setScan(prevScan => ({
            ...prevScan!,
            status: data.status,
            progress_stage: data.progress?.stage,
            progress_percent: data.progress?.progress,
            progress_message: data.progress?.message
          }));
        }
        
        // Update progress display
        if (data.progress && data.progress.stage) {
          const stage = data.progress.stage as ScanStage;
          setScanProgress({
            stage: stage,
            progress: data.progress.progress,
            message: data.progress.message || ''
          });
          
          console.log(`[SSE] Progress update: Stage=${stage}, Progress=${data.progress.progress}%`);
        }
        
        // Update console output if available
        if (data.consoleOutput && Array.isArray(data.consoleOutput)) {
          setConsoleOutput(prevOutput => {
            // Combine previous output with new messages, avoiding duplicates
            const newOutput = [...prevOutput];
            data.consoleOutput.forEach((msg: string) => {
              if (!newOutput.includes(msg)) {
                newOutput.push(msg);
              }
            });
            return newOutput;
          });
        }
      } catch (error) {
        console.error('[SSE] Error parsing scan update:', error);
      }
    });
    
    // Handle scan completion
    eventSource.addEventListener('scan_complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Scan completed:', data);
        
        // Update vulnerabilities
        if (data.vulnerabilities) {
          setVulnerabilities(data.vulnerabilities);
          
          // Mark scan as completed
          setScanProgress({
            stage: ScanStage.COMPLETED,
            progress: 100,
            message: 'Scan completed successfully'
          });
          
          // Update scan status
          setScan(prevScan => ({
            ...prevScan!,
            status: ScanStatus.COMPLETED
          }));
          
          // End scanning mode
          setIsScanning(false);
          
          // Show completion notification
          toast.success('Scan completed', {
            description: `Found ${data.vulnerabilities.length} potential vulnerabilities.`
          });
          
          // Add completion message to console
          setConsoleOutput(prev => [...prev, `[${new Date().toISOString()}] Scan completed with ${data.vulnerabilities.length} vulnerabilities found.`]);
          
          // Close the event source
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        }
      } catch (error) {
        console.error('[SSE] Error parsing scan completion:', error);
      }
    });
    
    // Handle scan failure
    eventSource.addEventListener('scan_failed', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Scan failed:', data);
        
        // Update scan status
        setScan(prevScan => ({
          ...prevScan!,
          status: ScanStatus.FAILED
        }));
        
        // End scanning mode
        setIsScanning(false);
        
        // Show failure notification
        toast.error('Scan failed', {
          description: data.message || 'An error occurred during the scan.'
        });
        
        // Add failure message to console
        setConsoleOutput(prev => [...prev, `[${new Date().toISOString()}] Scan failed: ${data.message || 'Unknown error'}`]);
        
        // Close the event source
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      } catch (error) {
        console.error('[SSE] Error parsing scan failure:', error);
      }
    });
    
    // Handle SSE errors
    eventSource.addEventListener('error', (error) => {
      console.error('[SSE] Error in EventSource connection:', error);
      
      // Add error message to console
      setConsoleOutput(prev => [...prev, `[${new Date().toISOString()}] SSE connection error. Attempting to reconnect...`]);
      
      // Attempt to reconnect if disconnected unexpectedly while scanning
      if (eventSource.readyState === EventSource.CLOSED && isScanning) {
        console.log('[SSE] Connection closed unexpectedly, starting fallback visual simulation');
        // When SSE fails, fall back to visual simulation only
        startVisualSimulation();
      }
    });
    
    // Cleanup function to close the connection when component unmounts
    return () => {
      console.log('[SSE] Closing EventSource connection on cleanup');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Also stop any running simulation
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [isScanning, scanId, user]);

  const startScan = async (scanData: Scan) => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      // Update UI to show scanning state
      if (scanData.status !== ScanStatus.SCANNING) {
        setScan({
          ...scanData,
          status: ScanStatus.SCANNING,
        });
      }

      // Set initial progress state
      setScanProgress({
        stage: ScanStage.INITIAL_CRAWL,
        progress: 0,
        message: 'Starting scan...',
      });

      console.log(`[Scan Page] Starting scan for ${scanData.url} (scan ID: ${scanData.id})`);

      // Start the actual scan in the background
      const scanResponse = await fetch('/api/scan/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanId: scanData.id,
          userId: user?.id,
        }),
      });

      if (!scanResponse.ok) {
        const errorData = await scanResponse.json();
        throw new Error(errorData.error || 'Failed to start scan');
      }

      // Show success message
      toast.success('Scan started successfully', {
        description: 'The scan is now in progress. Results will appear here when complete.'
      });

      // Start visual simulation immediately as a fallback
      // The SSE connection will provide real progress when available
      startVisualSimulation();
      
    } catch (error) {
      console.error('Error starting scan:', error);
      toast.error('Failed to start scan', {
        description: 'Please try again later.'
      });
      setIsScanning(false);
    }
  };
  
  // Visual-only simulation for when real data isn't available yet
  const startVisualSimulation = () => {
    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
    
    // Create a new simulation
    simulationRef.current = new ScanSimulation(
      // Progress update callback
      (progress) => {
        setScanProgress(progress);
      },
      // Has real data callback
      () => {
        // Check if we already have real progress data from the SSE
        return !!(scan?.progress_stage && scan?.progress_percent !== undefined && scan.progress_percent > 0);
      }
    );
    
    // Start the simulation
    simulationRef.current.start();
  };

  const handleStartScan = async () => {
    if (!scan || !user) return;

    // Check if scan is paid
    if (!scan.paid) {
      router.push(`/scan/${scan.id}/payment`);
      return;
    }

    startScan(scan);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="container py-8">
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">Scan Not Found</h2>
          <p className="mb-6">The scan you are looking for does not exist or you do not have permission to access it.</p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Scan Results</h1>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ScanDetails scan={scan} onStartScan={handleStartScan} />
        
        {scan.status === ScanStatus.SCANNING && (
          <ScanProgressComponent 
            scanProgress={scanProgress} 
            consoleOutput={consoleOutput} 
            domain={scan.domain} 
          />
        )}
        
        {scan.status === ScanStatus.COMPLETED && (
          <VulnerabilityList vulnerabilities={vulnerabilities} />
        )}
      </div>
    </div>
  );
}
