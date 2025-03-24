'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/auth/protected-route';
import { Scan, ScanProgress, ScanStage, ScanStatus, Vulnerability, VulnerabilitySeverity } from '@/types';

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scan, setScan] = useState<Scan | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    stage: ScanStage.INITIAL_CRAWL,
    progress: 0,
    message: 'Preparing scan...',
  });
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params) as { id: string };
  const scanId = unwrappedParams.id;
  
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null);

  // Define the stages and their durations (in seconds)
  const stageDurations = {
    [ScanStage.INITIAL_CRAWL]: 5,
    [ScanStage.TECHNOLOGY_DETECTION]: 4,
    [ScanStage.SOURCE_ANALYSIS]: 8,
    [ScanStage.NETWORK_ANALYSIS]: 6,
    [ScanStage.ENV_VARIABLE_DETECTION]: 5,
    [ScanStage.VULNERABILITY_ASSESSMENT]: 7,
    [ScanStage.REPORT_GENERATION]: 5,
    [ScanStage.COMPLETED]: 0,
  };

  // Helper function to calculate progress line width for visualization
  const calculateProgressLineWidth = (currentStage: ScanStage): number => {
    const stages = Object.values(ScanStage).filter(stage => stage !== ScanStage.COMPLETED);
    // Find the index in the filtered list
    const currentIndex = stages.findIndex(stage => stage === currentStage);
    const totalSegments = stages.length - 1;
    
    // If stage not found or is COMPLETED, show 100%
    if (currentIndex === -1 || currentStage === ScanStage.COMPLETED) {
      return 100;
    }
    
    // If we're at the first stage, calculate partial progress
    if (currentIndex === 0) {
      return Math.min(100, (scanProgress.progress / 100) * (100 / totalSegments));
    }
    
    // For later stages, fill all previous segments plus partial current segment
    const segmentWidth = 100 / totalSegments;
    const completedSegments = currentIndex * segmentWidth;
    const currentSegmentProgress = (scanProgress.progress / 100) * segmentWidth;
    
    return Math.min(100, completedSegments + currentSegmentProgress);
  };

  // Define stage messages
  const stageMessages = {
    [ScanStage.INITIAL_CRAWL]: 'Crawling website pages...',
    [ScanStage.TECHNOLOGY_DETECTION]: 'Detecting technologies used...',
    [ScanStage.SOURCE_ANALYSIS]: 'Analyzing source code for vulnerabilities...',
    [ScanStage.NETWORK_ANALYSIS]: 'Analyzing network requests and responses...',
    [ScanStage.ENV_VARIABLE_DETECTION]: 'Checking for exposed environment variables...',
    [ScanStage.VULNERABILITY_ASSESSMENT]: 'Assessing security vulnerabilities...',
    [ScanStage.REPORT_GENERATION]: 'Generating security report...',
    [ScanStage.COMPLETED]: 'Scan completed successfully',
  };

  // Subscribe to realtime updates for this scan
  useEffect(() => {
    if (!user || !scanId) return;

    console.log(`[Scan Page] Setting up realtime subscription for scan ${scanId}`);

    // Create a realtime subscription to the scans table for this specific scan
    const subscription = supabase
      .channel(`scan:${scanId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scans',
          filter: `id=eq.${scanId}`
        },
        async (payload) => {
          console.log('Scan updated via realtime:', payload);
          const updatedScan = payload.new as Scan;
          
          // Log detailed information about the scan update
          console.log(`[Scan Page] Received update for scan ${scanId}:`, {
            status: updatedScan.status,
            progress_stage: updatedScan.progress_stage,
            progress_percent: updatedScan.progress_percent,
            progress_message: updatedScan.progress_message
          });
          
          // Always update the scan state with latest data
          setScan(updatedScan);
          
          // If scan is completed, fetch vulnerabilities immediately
          if (updatedScan.status === ScanStatus.COMPLETED) {
            // Set scanning to false after we load the vulnerabilities, not before
            
            const { data: vulnData, error: vulnError } = await supabase
              .from('vulnerabilities')
              .select('*')
              .eq('scan_id', scanId)
              .order('severity', { ascending: false });

            if (!vulnError && vulnData) {
              console.log(`[Scan Page] Found ${vulnData.length} vulnerabilities for scan ${scanId}`);
              setVulnerabilities(vulnData as Vulnerability[]);
              
              // Mark the scan as completed only *after* we've loaded the vulnerabilities
              setScanProgress({
                stage: ScanStage.COMPLETED,
                progress: 100,
                message: 'Scan completed successfully'
              });
              
              // Important: Only stop scanning after all data is loaded and displayed
              setIsScanning(false);
              
              toast.success('Scan completed', {
                description: `Found ${vulnData.length} potential vulnerabilities.`
              });
            } else {
              console.error('Error fetching vulnerabilities:', vulnError);
              toast.error('Error fetching vulnerabilities', {
                description: 'Could not retrieve vulnerability data.'
              });
              setIsScanning(false);
            }
          } else if (updatedScan.status === ScanStatus.FAILED) {
            // Only set scanning to false if actually failed
            setIsScanning(false);
            toast.error('Scan failed', {
              description: 'An error occurred during the scan.'
            });
          } else if (updatedScan.status === ScanStatus.PAYMENT_PROCESSING && updatedScan.paid) {
            toast.success('Payment processed successfully', {
              description: 'You can now start your security scan.'
            });
          }
        }
      )
      .subscribe();

    console.log(`[Scan Page] Subscription created: ${subscription.topic}`);

    // Save the subscription for cleanup
    setRealtimeSubscription(subscription);

    // Cleanup function to unsubscribe
    return () => {
      console.log(`[Scan Page] Unsubscribing from realtime updates for scan ${scanId}`);
      subscription.unsubscribe();
    };
  }, [user, scanId]);

  useEffect(() => {
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

        setScan(data as Scan);

        // Check for successful payment redirect from Stripe
        const success = searchParams.get('success');
        if (success === 'true' && data.status === ScanStatus.PAYMENT_REQUIRED) {
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
            return;
          }

          // Update local state
          setScan({
            ...data,
            status: ScanStatus.PAYMENT_PROCESSING,
            paid: true,
          });

          toast.success('Payment successful', {
            description: 'Your payment has been processed successfully. Click "Start Scan" to begin.',
          });
          
          return;
        }

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
        }

        // Don't auto-start scan even if state is SCANNING
        // This ensures the user always has to click the Start button
        if (data.status === ScanStatus.SCANNING && !success) {
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
  }, [user, scanId, searchParams]);

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
      const scanPromise = fetch('/api/scan/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanId: scanData.id,
          userId: user?.id,
        }),
      }).then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || 'Failed to start scan');
          });
        }
        return response.json();
      });

      // Show success message
      toast.success('Scan started successfully', {
        description: 'The scan is now in progress. Results will appear here when complete.'
      });

      // Run simulation separately from the actual scan
      runScanSimulation(scanPromise);
      
    } catch (error) {
      console.error('Error starting scan:', error);
      toast.error('Failed to start scan', {
        description: 'Please try again later.'
      });
      setIsScanning(false);
    }
  };
  
  // Simulate the scan progress independently from the backend
  const runScanSimulation = (scanPromise: Promise<any>) => {
    // Simulate progress updates while the scan runs in the background
    const stages = Object.values(ScanStage).filter(stage => stage !== ScanStage.COMPLETED);
    let currentStageIndex = 0;
    let currentStage = stages[currentStageIndex];
    let currentStageDuration = stageDurations[currentStage] * 1000; // convert to ms
    let currentStageElapsed = 0;
    let scanCompleted = false;
    
    // Track if the backend has completed the scan
    let backendScanCompleted = false;
    
    // Listen for scan completion
    scanPromise
      .then(() => {
        console.log('[Scan Simulation] Backend scan completed');
        backendScanCompleted = true;
        // Don't set scanCompleted = true here, we'll let the animation finish naturally
      })
      .catch((error) => {
        console.error('Scan error:', error);
        backendScanCompleted = true;
        scanCompleted = true; // On error, we can stop the animation
      });

    // Create interval to update the progress UI
    const progressInterval = setInterval(() => {
      // If the user navigated away, we can stop the simulation
      if (!isScanning) {
        clearInterval(progressInterval);
        return;
      }
      
      // If backend is done but we're not at the last stage, speed up animation
      if (backendScanCompleted && currentStageIndex < stages.length - 1) {
        currentStageElapsed += 1000; // Speed up dramatically to get to the end faster
      } else if (backendScanCompleted && currentStageIndex === stages.length - 1) {
        // If we're at the last stage and backend is done, move at a moderate pace
        currentStageElapsed += 500;
      } else {
        // Normal pace if backend isn't done yet
        currentStageElapsed += 250;
      }
      
      // Calculate progress percentage for current stage
      const stageProgress = Math.min(100, (currentStageElapsed / currentStageDuration) * 100);
      
      // Calculate overall progress based on completed stages + current stage
      const overallProgress = 
        ((currentStageIndex / stages.length) * 100) + 
        ((1 / stages.length) * stageProgress);
      
      // Update the UI - always use whole numbers
      setScanProgress(prevProgress => {
        // Don't update if we've already reached COMPLETED stage
        if (prevProgress.stage === ScanStage.COMPLETED) {
          return prevProgress;
        }
        
        return {
          stage: currentStage,
          progress: Math.floor(Math.min(99, overallProgress)),
          message: stageMessages[currentStage]
        };
      });
      
      // Move to next stage if current one is complete
      if (currentStageElapsed >= currentStageDuration) {
        currentStageIndex++;
        
        // If all stages complete, wait a bit longer for results
        if (currentStageIndex >= stages.length) {
          // Instead of clearing immediately, keep showing progress at 99% until backend completes
          if (backendScanCompleted) {
            // Only clear if backend is actually done
            clearInterval(progressInterval);
          } else {
            // Otherwise, hold at 99% on the last stage
            currentStageIndex = stages.length - 1;
            currentStage = stages[currentStageIndex];
            setScanProgress({
              stage: currentStage,
              progress: 99,
              message: 'Finalizing scan results...'
            });
          }
          return;
        }
        
        // Otherwise, move to next stage
        currentStage = stages[currentStageIndex];
        currentStageDuration = stageDurations[currentStage] * 1000;
        currentStageElapsed = 0;
      }
    }, 250);
    
    // Set a timeout to ensure the simulation doesn't run forever
    // This is a safety mechanism in case the backend never responds
    const maxSimulationTime = 2 * 60 * 1000; // 2 minutes maximum
    setTimeout(() => {
      if (progressInterval) {
        clearInterval(progressInterval);
        // Only update if we're still scanning
        if (isScanning) {
          console.log('[Scan Simulation] Force completing simulation after timeout');
          // Don't mark as COMPLETED, just stop the animation
          // The real backend status will be reflected when it eventually completes
        }
      }
    }, maxSimulationTime);
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

  const getSeverityBadge = (severity: VulnerabilitySeverity) => {
    const severityClasses = {
      [VulnerabilitySeverity.LOW]: 'bg-blue-500/10 text-blue-500',
      [VulnerabilitySeverity.MEDIUM]: 'bg-yellow-500/10 text-yellow-500',
      [VulnerabilitySeverity.HIGH]: 'bg-orange-500/10 text-orange-500',
      [VulnerabilitySeverity.CRITICAL]: 'bg-red-500/10 text-red-500',
    };

    const severityText = {
      [VulnerabilitySeverity.LOW]: 'Low',
      [VulnerabilitySeverity.MEDIUM]: 'Medium',
      [VulnerabilitySeverity.HIGH]: 'High',
      [VulnerabilitySeverity.CRITICAL]: 'Critical',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          severityClasses[severity]
        }`}
      >
        {severityText[severity]}
      </span>
    );
  };

  const getScanStatusBadge = (status: ScanStatus) => {
    const statusClasses = {
      [ScanStatus.PENDING]: 'bg-yellow-500/10 text-yellow-500',
      [ScanStatus.VERIFYING]: 'bg-yellow-500/10 text-yellow-500',
      [ScanStatus.PAYMENT_REQUIRED]: 'bg-blue-500/10 text-blue-500',
      [ScanStatus.PAYMENT_PROCESSING]: 'bg-blue-500/10 text-blue-500',
      [ScanStatus.SCANNING]: 'bg-blue-500/10 text-blue-500',
      [ScanStatus.COMPLETED]: 'bg-green-500/10 text-green-500',
      [ScanStatus.FAILED]: 'bg-red-500/10 text-red-500',
    };

    const statusText = {
      [ScanStatus.PENDING]: 'Pending',
      [ScanStatus.VERIFYING]: 'Verifying Domain',
      [ScanStatus.PAYMENT_REQUIRED]: 'Payment Required',
      [ScanStatus.PAYMENT_PROCESSING]: 'Processing Payment',
      [ScanStatus.SCANNING]: 'Scanning',
      [ScanStatus.COMPLETED]: 'Completed',
      [ScanStatus.FAILED]: 'Failed',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusClasses[status]
        }`}
      >
        {statusText[status]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const VulnerabilityCard = ({ vulnerability, onClick }: { vulnerability: Vulnerability; onClick: () => void }) => {
    const severityBadge = getSeverityBadge(vulnerability.severity);
    
    return (
      <div
        className="p-4 border rounded-lg mb-2 hover:bg-gray-50 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {severityBadge}
              <span className="text-sm font-medium text-gray-500">{vulnerability.type.replace(/_/g, ' ')}</span>
            </div>
            <div className="text-sm text-gray-700">{vulnerability.description}</div>
          </div>
          <div className="text-xs text-gray-500">{vulnerability.location}</div>
        </div>
      </div>
    );
  };

  const VulnerabilityDetailDialog = ({ vulnerability, isOpen, onClose }: { 
    vulnerability: Vulnerability | null; 
    isOpen: boolean; 
    onClose: () => void 
  }) => {
    if (!vulnerability) return null;
    
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getSeverityBadge(vulnerability.severity)}
              <span>
                {vulnerability.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </DialogTitle>
            <DialogDescription>{vulnerability.description}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Location</h3>
              <p className="text-sm bg-gray-100 p-2 rounded">{vulnerability.location}</p>
            </div>
            
            {vulnerability.code_snippet && (
              <div>
                <h3 className="text-sm font-medium mb-1">Code Snippet</h3>
                <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
                  {vulnerability.code_snippet}
                </pre>
              </div>
            )}
            
            {vulnerability.ai_fix && (
              <div>
                <h3 className="text-sm font-medium mb-1">Suggested Fix</h3>
                <div className="text-sm bg-blue-50 border border-blue-100 p-3 rounded">
                  {vulnerability.ai_fix}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
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
        <Card>
          <CardHeader>
            <CardTitle>Scan Not Found</CardTitle>
            <CardDescription>
              The scan you are looking for does not exist or you do not have permission to access it.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Scan Results</h1>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Scan Details</CardTitle>
                  <CardDescription>
                    Information about your security scan
                  </CardDescription>
                </div>
                <div>{getScanStatusBadge(scan.status)}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">URL</p>
                  <p className="font-medium truncate">{scan.url}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Domain</p>
                  <p className="font-medium">{scan.domain}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(scan.created_at)}</p>
                </div>
                {scan.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-medium">{formatDate(scan.completed_at)}</p>
                  </div>
                )}
              </div>

              {scan.status === ScanStatus.PAYMENT_REQUIRED && (
                <div className="bg-blue-500/10 p-4 rounded-md">
                  <p className="text-sm text-blue-500">
                    Payment is required to start the scan.
                  </p>
                  <Button
                    onClick={() => router.push(`/scan/${scan.id}/payment`)}
                    className="mt-2"
                    size="sm"
                  >
                    Proceed to Payment
                  </Button>
                </div>
              )}

              {scan.status === ScanStatus.SCANNING && (
                <div className="py-4">
                  {/* Modern Scan Progress Container */}
                  <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 shadow-sm">
                    {/* Header with animated dots */}
                    <div className="flex items-center mb-6">
                      <span className="text-xl font-bold text-blue-800 mr-3">Security Scan in Progress</span>
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '600ms' }}></div>
                      </div>
                    </div>
                    
                    {/* Current status message with icon */}
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-blue-800">{scanProgress.message}</h3>
                        <p className="text-sm text-blue-600">Finding potential security vulnerabilities in your application</p>
                      </div>
                    </div>
                    
                    {/* Improved progress bar */}
                    <div className="mb-8">
                      <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${scanProgress.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Stage indicators - redesigned */}
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
                          pending: "bg-blue-100 text-blue-400 border-blue-200",
                          active: "bg-blue-600 text-white border-blue-700 shadow-md",
                          completed: "bg-green-500 text-white border-green-600"
                        };
                        
                        return (
                          <div key={stage} className="flex flex-col items-center">
                            {/* Stage number with status indicator */}
                            <div 
                              className={`
                                w-10 h-10 flex items-center justify-center rounded-full mb-2 
                                border ${colors[status]} transition-all duration-300 ease-in-out
                                ${status === "active" ? "scale-110" : ""}
                              `}
                            >
                              {status === "completed" ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <span className="text-sm font-medium">{index + 1}</span>
                              )}
                            </div>
                            
                            {/* Stage name - more readable */}
                            <span className={`
                              text-xs font-medium text-center px-1 transition-all duration-300
                              ${status === "pending" ? "text-blue-400" : 
                                status === "active" ? "text-blue-800 font-bold" : 
                                "text-green-600"}
                            `}>
                              {stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                            </span>
                          </div>
                        );
                      })}
                      
                      {/* Progress line connecting the stages */}
                      <div className="absolute top-5 left-5 right-5 h-0.5 bg-blue-100 -z-10"></div>
                      <div 
                        className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-green-500 to-blue-600 transition-all duration-500 ease-out -z-10"
                        style={{ 
                          width: `${calculateProgressLineWidth(scanProgress.stage)}%`
                        }}
                      ></div>
                    </div>
                    
                    {/* Scan Info Box */}
                    <div className="mt-8 bg-white bg-opacity-60 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            Scanning <span className="font-medium">{scan.domain}</span> for security vulnerabilities. This process typically takes 2-5 minutes depending on the size of your site.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {scan.status === ScanStatus.PAYMENT_PROCESSING && scan.paid && (
                <div className="bg-green-500/10 p-4 rounded-md">
                  <p className="text-sm text-green-500">
                    Payment successful! Click the "Start Scan" button below to begin your security scan.
                  </p>
                </div>
              )}

              {scan.status === ScanStatus.FAILED && (
                <div className="bg-red-500/10 p-4 rounded-md">
                  <p className="text-sm text-red-500">
                    The scan failed to complete. Please try again.
                  </p>
                  <Button
                    onClick={handleStartScan}
                    className="mt-2"
                    size="sm"
                  >
                    Retry Scan
                  </Button>
                </div>
              )}

              {(scan.status === ScanStatus.VERIFYING || scan.status === ScanStatus.PENDING) && (
                <div className="bg-yellow-500/10 p-4 rounded-md">
                  <p className="text-sm text-yellow-500">
                    Domain verification is required before scanning.
                  </p>
                  <Button
                    onClick={() => router.push(`/scan/new`)}
                    className="mt-2"
                    size="sm"
                  >
                    Verify Domain
                  </Button>
                </div>
              )}

              {scan.status === ScanStatus.COMPLETED && vulnerabilities.length === 0 && (
                <div className="bg-green-500/10 p-4 rounded-md">
                  <p className="text-sm text-green-500">
                    No vulnerabilities were found in your website. Great job!
                  </p>
                </div>
              )}
            </CardContent>
            {(scan.status !== ScanStatus.SCANNING && 
              scan.status !== ScanStatus.COMPLETED && 
              (scan.paid || scan.status === ScanStatus.PAYMENT_REQUIRED)) && (
              <CardFooter>
                <Button onClick={handleStartScan}>
                  {scan.status === ScanStatus.FAILED ? 'Retry Scan' : 'Start Scan'}
                </Button>
              </CardFooter>
            )}
          </Card>

          {scan.status === ScanStatus.COMPLETED && vulnerabilities.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Vulnerabilities</CardTitle>
                <CardDescription>
                  {vulnerabilities.length} potential vulnerabilities found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {vulnerabilities.map((vulnerability) => (
                    <VulnerabilityCard
                      key={vulnerability.id}
                      vulnerability={vulnerability}
                      onClick={() => setSelectedVulnerability(vulnerability)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {scan.status === ScanStatus.COMPLETED && vulnerabilities.length === 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Vulnerabilities</CardTitle>
                <CardDescription>
                  No vulnerabilities found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 text-center">
                  <p className="text-green-500">Good job! No vulnerabilities were found in your website.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <VulnerabilityDetailDialog
          vulnerability={selectedVulnerability}
          isOpen={!!selectedVulnerability}
          onClose={() => setSelectedVulnerability(null)}
        />
      </div>
    </ProtectedRoute>
  );
}
