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
export const stageMessages: Record<ScanStage, string> = {
  [ScanStage.INITIAL_CRAWL]: 'Crawling website and analyzing structure...',
  [ScanStage.TECHNOLOGY_DETECTION]: 'Detecting technologies and frameworks...',
  [ScanStage.SOURCE_ANALYSIS]: 'Analyzing source code for vulnerabilities...',
  [ScanStage.NETWORK_ANALYSIS]: 'Examining network requests and responses...',
  [ScanStage.ENV_VARIABLE_DETECTION]: 'Searching for exposed environment variables...',
  [ScanStage.VULNERABILITY_ASSESSMENT]: 'Assessing security vulnerabilities...',
  [ScanStage.REPORT_GENERATION]: 'Generating security report...',
  [ScanStage.COMPLETED]: 'Scan completed successfully',
};

export class ScanSimulation {
  private stages: ScanStage[];
  private currentStageIndex: number = 0;
  private currentStage: ScanStage;
  private currentStageElapsed: number = 0;
  private simulationActive: boolean = true;
  private progressInterval: NodeJS.Timeout | null = null;
  private onProgressUpdate: (progress: ScanProgress) => void;
  private hasRealDataCallback: () => boolean;

  constructor(
    onProgressUpdate: (progress: ScanProgress) => void,
    hasRealDataCallback: () => boolean
  ) {
    this.stages = Object.values(ScanStage).filter(stage => stage !== ScanStage.COMPLETED);
    this.currentStage = this.stages[0];
    this.onProgressUpdate = onProgressUpdate;
    this.hasRealDataCallback = hasRealDataCallback;
  }

  start() {
    console.log('[Scan Simulation] Starting visual simulation until real data arrives');
    
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
        console.log(`[Scan Simulation] Visual update: Stage=${this.currentStage}, Progress=${Math.min(99, overallProgress)}%`);
        
        this.onProgressUpdate({
          stage: this.currentStage,
          progress: Math.min(99, overallProgress),
          message: stageMessages[this.currentStage]
        });
      }
      
      // Check if current stage is complete
      if (stageProgress >= 100) {
        this.currentStageIndex++;
        
        // If we've completed all stages
        if (this.currentStageIndex >= this.stages.length) {
          // Hold at the last stage at 99%
          this.currentStageIndex = this.stages.length - 1;
          this.currentStage = this.stages[this.currentStageIndex];
          this.currentStageElapsed = 0;
        } else {
          // Move to next stage
          this.currentStage = this.stages[this.currentStageIndex];
          this.currentStageElapsed = 0;
        }
      }
    }, 100); // Run the update more frequently for smoother animation
    
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
    this.simulationActive = false;
  }
}
