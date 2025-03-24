import { ScanProgress, ScanStage } from '@/types';

// Define the stages and their durations (in seconds)
const stageDurations: Record<ScanStage, number> = {
  [ScanStage.INITIAL_CRAWL]: 3,
  [ScanStage.TECHNOLOGY_DETECTION]: 4,
  [ScanStage.SOURCE_ANALYSIS]: 8,
  [ScanStage.NETWORK_ANALYSIS]: 5,
  [ScanStage.ENV_VARIABLE_DETECTION]: 4,
  [ScanStage.VULNERABILITY_ASSESSMENT]: 8,
  [ScanStage.REPORT_GENERATION]: 3,
  [ScanStage.COMPLETED]: 0, // Add COMPLETED stage with 0 duration
};

// Define messages for each stage
const stageMessages = {
  [ScanStage.INITIAL_CRAWL]: "Initializing security scan...",
  [ScanStage.TECHNOLOGY_DETECTION]: "Detecting technologies and frameworks...",
  [ScanStage.SOURCE_ANALYSIS]: "Analyzing source code for vulnerabilities...",
  [ScanStage.NETWORK_ANALYSIS]: "Performing network security analysis...",
  [ScanStage.ENV_VARIABLE_DETECTION]: "Scanning for exposed environment variables...",
  [ScanStage.VULNERABILITY_ASSESSMENT]: "Assessing security vulnerabilities...",
  [ScanStage.REPORT_GENERATION]: "Generating security report...",
  [ScanStage.COMPLETED]: "Scan completed"
};

const consoleMessages: Partial<Record<ScanStage, string[]>> = {
  [ScanStage.INITIAL_CRAWL]: [
    "Initializing scan environment...",
    "Setting up secure connection...",
    "Starting web crawler...",
    "Mapping site structure...",
    "Identifying entry points..."
  ],
  [ScanStage.TECHNOLOGY_DETECTION]: [
    "Analyzing HTTP headers...",
    "Detecting frontend frameworks...",
    "Identifying backend technologies...",
    "Checking for known CMS systems...",
    "Mapping technology stack..."
  ],
  [ScanStage.SOURCE_ANALYSIS]: [
    "Scanning JavaScript files...",
    "Analyzing API endpoints...",
    "Checking for exposed secrets...",
    "Reviewing security headers...",
    "Validating CSP configuration..."
  ],
  [ScanStage.NETWORK_ANALYSIS]: [
    "Performing port scan...",
    "Checking SSL/TLS configuration...",
    "Analyzing DNS records...",
    "Testing CORS policies...",
    "Validating network security..."
  ],
  [ScanStage.ENV_VARIABLE_DETECTION]: [
    "Scanning for .env files...",
    "Checking for exposed credentials...",
    "Analyzing configuration files...",
    "Reviewing deployment scripts...",
    "Validating security tokens..."
  ],
  [ScanStage.VULNERABILITY_ASSESSMENT]: [
    "Running XSS vulnerability tests...",
    "Checking for SQL injection...",
    "Testing CSRF protection...",
    "Analyzing authentication flows...",
    "Validating access controls..."
  ],
  [ScanStage.REPORT_GENERATION]: [
    "Collecting scan results...",
    "Analyzing vulnerability impact...",
    "Generating recommendations...",
    "Preparing security report...",
    "Finalizing documentation..."
  ]
};

export class ScanSimulation {
  private stages: ScanStage[];
  private currentStageIndex: number = 0;
  private currentStage: ScanStage;
  private currentStageElapsed: number = 0;
  private simulationActive: boolean = true;
  private progressInterval: NodeJS.Timeout | null = null;
  private completionInterval: NodeJS.Timeout | null = null;
  private onProgressUpdate: (progress: ScanProgress) => void;
  private onConsoleUpdate: (message: string) => void;
  private hasRealDataCallback: () => boolean;
  private currentMessageIndex: { [key in ScanStage]: number } = Object.values(ScanStage).reduce((acc, stage) => ({
    ...acc,
    [stage]: 0
  }), {} as { [key in ScanStage]: number });

  constructor(
    onProgressUpdate: (progress: ScanProgress) => void,
    onConsoleUpdate: (message: string) => void,
    hasRealDataCallback: () => boolean
  ) {
    this.stages = Object.values(ScanStage).filter(stage => stage !== ScanStage.COMPLETED);
    this.currentStage = this.stages[0];
    this.onProgressUpdate = onProgressUpdate;
    this.onConsoleUpdate = onConsoleUpdate;
    this.hasRealDataCallback = hasRealDataCallback;
  }

  private getNextConsoleMessage(stage: ScanStage): string | null {
    const messages = consoleMessages[stage];
    if (!messages || this.currentMessageIndex[stage] >= messages.length) {
      return null;
    }
    return messages[this.currentMessageIndex[stage]++];
  }

  private smoothProgressToCompletion(startProgress: number = 0) {
    // Ensure we start from a valid progress value
    const currentProgress = Math.max(startProgress, 0);
    console.log(`[Scan Simulation] Starting completion from ${currentProgress}% to 100%`);
    
    const targetProgress = 100;
    const duration = 10000; // 10 seconds for completion (extended for more smoothness)
    const steps = 120; // More steps for smoother animation
    const stepDuration = duration / steps;

    // Log start of completion phase
    console.log('[Scanner] Starting completion phase...');
    this.onConsoleUpdate("Finalizing scan results...");

    // For more natural easing, we'll track progress from 0-1
    let animationProgress = 0;
    
    this.completionInterval = setInterval(() => {
      // Increment animation progress
      animationProgress += 1/steps;
      
      // Apply a cubic easing function for smooth progress
      // This will start slow, speed up in the middle, and slow down at the end
      const easedProgress = this.easeInOutCubic(animationProgress);
      
      // Calculate the actual progress value
      const newProgress = currentProgress + (easedProgress * (targetProgress - currentProgress));
      
      this.onProgressUpdate({
        stage: ScanStage.COMPLETED,
        progress: Math.round(newProgress * 100) / 100, // Round to 2 decimal places
        message: "Completing security scan..."
      });

      // Log progress for debugging
      if (animationProgress % 0.1 < 0.02) {
        console.log(`[Scan Simulation] Progress: ${Math.round(newProgress)}%`);
      }

      if (animationProgress >= 1) {
        if (this.completionInterval) {
          clearInterval(this.completionInterval);
          this.completionInterval = null;
        }
        
        // Ensure we hit exactly 100%
        this.onProgressUpdate({
          stage: ScanStage.COMPLETED,
          progress: 100,
          message: "Scan completed successfully"
        });
        
        // Final messages
        console.log('[Scanner] Scan completed successfully');
        this.onConsoleUpdate("\n=== Scan Summary ===");
        this.onConsoleUpdate("✓ All security checks completed");
        this.onConsoleUpdate("✓ Analysis finished successfully");
        this.onConsoleUpdate("✓ Report generation complete");
        this.onConsoleUpdate("\nSecurity scan completed successfully. Preparing to display results...");
      }
    }, stepDuration);
  }

  // Improved easing function for smoother animation
  private easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  start() {
    console.log('[Scan Simulation] Starting visual simulation until real data arrives');
    
    // Initial console message
    this.onConsoleUpdate("Starting security scan...");
    
    // Pre-fill the progress update to ensure initial state is correct
    this.onProgressUpdate({
      stage: this.currentStage,
      progress: 0,
      message: stageMessages[this.currentStage]
    });
    
    // Small delay before starting the simulation to avoid initial flicker
    setTimeout(() => {
      // Create interval to update the progress UI
      this.progressInterval = setInterval(() => {
        if (!this.simulationActive) {
          this.stop();
          return;
        }
        
        // Update elapsed time
        this.currentStageElapsed += 200;
        
        // Calculate stage progress (0-100)
        const stageProgress = Math.min(100, (this.currentStageElapsed / (stageDurations[this.currentStage] * 1000)) * 100);
        
        // Calculate overall progress (0-100)
        const overallProgress = Math.floor(
          ((this.currentStageIndex * 100) / this.stages.length) +
          (stageProgress / this.stages.length)
        );
        
        // Check if we already have real data
        const hasRealData = this.hasRealDataCallback();
        
        // If we already have real data, stop simulation
        if (hasRealData && this.simulationActive) {
          console.log('[Scan Simulation] Real data detected, stopping simulation');
          this.simulationActive = false;
          return;
        }
        
        // Only update if we don't have real data yet
        if (!hasRealData) {
          // Add console messages periodically
          if (this.currentStageElapsed % 2000 === 0) {
            const nextMessage = this.getNextConsoleMessage(this.currentStage);
            if (nextMessage) {
              this.onConsoleUpdate(nextMessage);
            }
          }
          
          // If we're at 85% or higher, start smooth completion
          if (overallProgress >= 85 && this.simulationActive) {
            this.simulationActive = false;
            if (this.progressInterval) {
              clearInterval(this.progressInterval);
              this.progressInterval = null;
            }
            
            console.log(`[Scan Simulation] Transitioning to completion phase at ${overallProgress}%`);
            this.smoothProgressToCompletion(overallProgress);
            return;
          }
          
          this.onProgressUpdate({
            stage: this.currentStage,
            progress: Math.min(85, overallProgress), // Cap at 85% before smooth completion
            message: stageMessages[this.currentStage]
          });
        }
        
        // Check if current stage is complete
        if (stageProgress >= 100) {
          this.currentStageIndex++;
          
          // If we've completed all stages
          if (this.currentStageIndex >= this.stages.length) {
            // Start smooth completion
            this.simulationActive = false;
            if (this.progressInterval) {
              clearInterval(this.progressInterval);
              this.progressInterval = null;
            }
            this.smoothProgressToCompletion(85);
          } else {
            // Move to next stage
            this.currentStage = this.stages[this.currentStageIndex];
            this.currentStageElapsed = 0;
            // Add stage transition message
            this.onConsoleUpdate(`\nStarting ${this.currentStage.toLowerCase().replace(/_/g, ' ')}...`);
          }
        }
      }, 100);
    }, 100);
    
    // Safety timeout after 3 minutes
    setTimeout(() => {
      this.stop();
    }, 3 * 60 * 1000);
  }

  stop() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    if (this.completionInterval) {
      clearInterval(this.completionInterval);
      this.completionInterval = null;
    }
    this.simulationActive = false;
  }
}
