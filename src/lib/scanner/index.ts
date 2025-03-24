import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScanProgress, ScanStage, Vulnerability, VulnerabilityType, VulnerabilitySeverity } from '@/types';
import { generateFixSuggestion } from '@/lib/openai/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  initScanProgress, 
  updateScanProgress, 
  addScanConsoleOutput, 
  completeScan, 
  failScan 
} from './progress-store';

// Regular expressions for detecting sensitive information
const API_KEY_PATTERNS = [
  /['"]?([a-zA-Z0-9_-]+)_?api_?key['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]+)['"]/gi,
  /['"]?api_?key['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]+)['"]/gi,
  /['"]?(sk|pk)_(test|live)_([a-zA-Z0-9]+)['"]/gi, // Stripe API keys
  /['"]?AKIA[0-9A-Z]{16}['"]?/gi, // AWS Access Keys
  /['"]?ghp_[a-zA-Z0-9]{36}['"]?/gi, // GitHub Personal Access Tokens
  /['"]?sk-[a-zA-Z0-9]{48}['"]?/gi, // OpenAI API Keys
];

const ENV_VAR_PATTERNS = [
  /['"]?REACT_APP_[A-Z0-9_]+['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi,
  /['"]?NEXT_PUBLIC_[A-Z0-9_]+['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi,
  /['"]?VUE_APP_[A-Z0-9_]+['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi,
  /['"]?GATSBY_[A-Z0-9_]+['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi,
];

const XSS_PATTERNS = [
  /innerHTML\s*=\s*[^;]+/gi,
  /dangerouslySetInnerHTML\s*=\s*\{\s*\{[^}]+\}\s*\}/gi,
  /document\.write\s*\([^)]+\)/gi,
  /eval\s*\([^)]+\)/gi,
];

// Custom console logger that captures output
class CaptureConsole {
  private originalConsoleLog: any;
  private originalConsoleError: any;
  private originalConsoleWarn: any;
  private originalConsoleInfo: any;
  private scanId: string;

  constructor(scanId: string) {
    this.scanId = scanId;
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleInfo = console.info;
  }

  // Start capturing console output
  start() {
    console.log = (...args: any[]) => {
      // Call original console.log
      this.originalConsoleLog(...args);
      
      // Capture the output
      const output = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Send to progress store if it's related to scanning
      if (output.includes('[Scanner]') || output.includes('[Scan') || output.includes('Scan')) {
        addScanConsoleOutput(this.scanId, output);
      }
    };

    console.error = (...args: any[]) => {
      // Call original console.error
      this.originalConsoleError(...args);
      
      // Capture the output
      const output = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Send to progress store
      addScanConsoleOutput(this.scanId, `ERROR: ${output}`);
    };

    console.warn = (...args: any[]) => {
      // Call original console.warn
      this.originalConsoleWarn(...args);
      
      // Capture the output
      const output = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Send to progress store if it's related to scanning
      if (output.includes('[Scanner]') || output.includes('[Scan') || output.includes('Scan')) {
        addScanConsoleOutput(this.scanId, `WARNING: ${output}`);
      }
    };

    console.info = (...args: any[]) => {
      // Call original console.info
      this.originalConsoleInfo(...args);
      
      // Capture the output
      const output = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Send to progress store if it's related to scanning
      if (output.includes('[Scanner]') || output.includes('[Scan') || output.includes('Scan')) {
        addScanConsoleOutput(this.scanId, `INFO: ${output}`);
      }
    };
  }

  // Stop capturing and restore original console methods
  stop() {
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
    console.info = this.originalConsoleInfo;
  }
}

// Scanner class
export class Scanner {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private url: string;
  private vulnerabilities: Vulnerability[] = [];
  private progressCallback: (progress: ScanProgress) => void;
  private filesScanned: number = 0;
  private fileTypeStats: Record<string, number> = {};
  // Global tracking of vulnerabilities to prevent duplicates across files
  private globalVulnerabilityKeys: Set<string> = new Set<string>();
  private totalVulnerabilitiesDetected: number = 0;
  private scanId: string = '';
  private userId: string = '';
  private consoleCapture: CaptureConsole | null = null;

  constructor(url: string, progressCallback: (progress: ScanProgress) => void, scanId?: string, userId?: string) {
    this.url = url;
    this.progressCallback = progressCallback;
    
    // Store scan ID and user ID if provided
    if (scanId) {
      this.scanId = scanId;
      this.userId = userId || '';
      
      // Initialize progress store
      initScanProgress(scanId);
      
      // Set up console capture
      this.consoleCapture = new CaptureConsole(scanId);
    }
  }

  // Update scan progress
  private updateProgress(stage: ScanStage, progress: number, message: string) {
    const progressData = {
      stage,
      progress,
      message,
    };
    
    // Call the original callback
    this.progressCallback(progressData);
    
    // Also update the progress store if we have scan ID
    if (this.scanId) {
      updateScanProgress(this.scanId, progressData);
    }
  }

  // Track scanned file
  private trackScannedFile(fileType: string, location: string) {
    this.filesScanned++;
    
    // Track file type statistics
    this.fileTypeStats[fileType] = (this.fileTypeStats[fileType] || 0) + 1;
    
    console.log(`[Scanner] Scanned file ${this.filesScanned}: ${fileType} - ${location}`);
  }

  // Helper to create a vulnerability key
  private createVulnerabilityKey(type: VulnerabilityType, location: string | undefined, description: string): string {
    return `${type}:${location || 'unknown-location'}:${description}`;
  }
  
  // Helper to check if a vulnerability already exists
  private vulnerabilityExists(type: VulnerabilityType, location: string, description: string): boolean {
    const key = this.createVulnerabilityKey(type, location, description);
    return this.globalVulnerabilityKeys.has(key);
  }
  
  // Get the number of duplicates removed during scanning
  public getDuplicatesRemoved(): number {
    return this.totalVulnerabilitiesDetected - this.vulnerabilities.length;
  }

  // Helper to add a vulnerability with deduplication
  private addVulnerabilityIfNew(vulnerability: {
    type: VulnerabilityType;
    severity: VulnerabilitySeverity;
    location: string;
    description: string;
    code_snippet: string;
    created_at?: string;
  }): void {
    // Count every vulnerability detected
    this.totalVulnerabilitiesDetected++;
    
    const key = this.createVulnerabilityKey(
      vulnerability.type, 
      vulnerability.location, 
      vulnerability.description
    );
    
    if (!this.globalVulnerabilityKeys.has(key)) {
      this.globalVulnerabilityKeys.add(key);
      
      this.vulnerabilities.push({
        id: uuidv4(),
        scan_id: '',
        created_at: vulnerability.created_at || new Date().toISOString(),
        ...vulnerability
      });
    }
  }

  // Initialize the browser
  private async initBrowser() {
    this.updateProgress(ScanStage.INITIAL_CRAWL, 0, 'Initializing browser...');
    try {
      console.log('[Scanner] Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: true, // Use headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--disable-web-security', // Allow cross-origin requests
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--safebrowsing-disable-auto-update',
          '--ignore-certificate-errors', // Ignore HTTPS errors
        ],
      });
      console.log('[Scanner] Browser launched successfully');
      
      this.page = await this.browser.newPage();
      console.log('[Scanner] Created new page');
      
      // Set default timeout to 30 seconds
      await this.page.setDefaultNavigationTimeout(30000);
      await this.page.setDefaultTimeout(30000);

      // Set viewport
      await this.page.setViewport({
        width: 1280,
        height: 800
      });

      // Track network requests
      if (this.page) {
        console.log('[Scanner] Setting up request interception...');
        await this.page.setRequestInterception(true);
        
        this.page.on('request', request => {
          const resourceType = request.resourceType();
          console.log(`[Scanner] Request: ${resourceType} - ${request.url().substring(0, 100)}...`);
          // We'll track these later when we actually process them
          request.continue();
        });
        
        this.page.on('response', async response => {
          const request = response.request();
          const resourceType = request.resourceType();
          const url = request.url();
          
          // Only track successful responses
          if (response.ok()) {
            // Skip tracking for data URLs and about:blank
            if (!url.startsWith('data:') && url !== 'about:blank') {
              this.trackScannedFile(`Network:${resourceType}`, url);
            }
          }
        });
        
        // Monitor console messages
        this.page.on('console', (msg) => {
          console.log(`[Browser Console] ${msg.type()}: ${msg.text().substring(0, 150)}${msg.text().length > 150 ? '...' : ''}`);
          // Check for sensitive information in console logs
          const text = msg.text();
          this.checkForSensitiveInfo(text, 'Console log');
        });
        
        // Track errors
        this.page.on('pageerror', error => {
          console.error(`[Browser PageError] ${error.message}`);
        });
        
        // Track dialog events (alerts, confirms, prompts)
        this.page.on('dialog', async dialog => {
          console.log(`[Browser Dialog] ${dialog.type()}: ${dialog.message()}`);
          await dialog.dismiss();
        });
      }

      this.updateProgress(ScanStage.INITIAL_CRAWL, 10, 'Browser initialized');
    } catch (error) {
      console.error('Error initializing browser:', error);
      this.updateProgress(ScanStage.INITIAL_CRAWL, 100, `Error initializing browser: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to initialize browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Navigate to the URL
  private async navigateToUrl() {
    if (!this.page) throw new Error('Browser not initialized');

    this.updateProgress(ScanStage.INITIAL_CRAWL, 20, 'Navigating to website...');
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`[Scanner] Navigating to URL: ${this.url} (attempt ${retryCount + 1}/${maxRetries + 1})`);
        
        // Set a more reasonable timeout for initial navigation
        const response = await this.page.goto(this.url, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 // 30 seconds timeout
        });
        
        if (!response) {
          console.warn(`[Scanner] No response received when navigating to ${this.url}`);
          // Continue anyway as some sites might not return a proper response
        } else if (!response.ok()) {
          console.warn(`[Scanner] Received non-OK response (${response.status()}) when navigating to ${this.url}`);
          // Continue anyway to analyze what we can
        }
        
        // Wait a bit for any lazy-loaded content or scripts
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`[Scanner] Successfully navigated to ${this.url}`);
        this.updateProgress(ScanStage.INITIAL_CRAWL, 30, 'Successfully loaded website');
        return;
        
      } catch (error) {
        retryCount++;
        console.error(`[Scanner] Error navigating to URL (attempt ${retryCount}/${maxRetries + 1}):`, error);
        
        if (retryCount <= maxRetries) {
          console.log(`[Scanner] Retrying navigation (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
          
          // Try a different waitUntil strategy on retries
          try {
            await this.page.goto(this.url, { 
              waitUntil: retryCount === 1 ? 'domcontentloaded' : 'load', 
              timeout: 30000 
            });
            console.log(`[Scanner] Retry successful with alternate strategy`);
            this.updateProgress(ScanStage.INITIAL_CRAWL, 30, 'Successfully loaded website (after retry)');
            return;
          } catch (retryError) {
            console.error(`[Scanner] Retry failed with alternate strategy:`, retryError);
          }
        } else {
          this.updateProgress(ScanStage.INITIAL_CRAWL, 100, `Error accessing website: ${error instanceof Error ? error.message : String(error)}`);
          throw new Error(`Failed to navigate to URL after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  // Extract and analyze JavaScript
  private async extractAndAnalyzeJavaScript() {
    if (!this.page) throw new Error('Browser not initialized');

    this.updateProgress(ScanStage.SOURCE_ANALYSIS, 0, 'Extracting JavaScript...');

    // Get all script tags
    const scripts = await this.page.evaluate(() => {
      const scriptElements = Array.from(document.querySelectorAll('script'));
      return scriptElements.map((script) => {
        return {
          src: script.src || '',
          content: script.innerHTML,
        };
      });
    });

    this.updateProgress(ScanStage.SOURCE_ANALYSIS, 30, 'Analyzing JavaScript for vulnerabilities...');

    // Analyze inline scripts
    scripts.forEach((script, index) => {
      if (script.content) {
        this.trackScannedFile('Inline JavaScript', `Inline script #${index + 1}`);
        this.checkForApiKeys(script.content, `Inline script #${index + 1}`);
        this.checkForEnvVariables(script.content, `Inline script #${index + 1}`);
        this.checkForXssVulnerabilities(script.content, `Inline script #${index + 1}`);
      }
    });

    // Analyze external scripts
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.src && script.src.startsWith('http')) {
        try {
          const response = await fetch(script.src);
          const content = await response.text();
          this.trackScannedFile('External JavaScript', script.src);
          this.checkForApiKeys(content, script.src);
          this.checkForEnvVariables(content, script.src);
          this.checkForXssVulnerabilities(content, script.src);
        } catch (error) {
          console.error(`Error fetching script ${script.src}:`, error);
        }
      }
    }
  }

  // Helper function to limit snippet size
  private limitSnippetSize(snippet: string, maxLength: number = 250): string {
    if (snippet.length <= maxLength) return snippet;
    
    const halfLength = Math.floor(maxLength / 2);
    const start = snippet.substring(0, halfLength);
    const end = snippet.substring(snippet.length - halfLength);
    
    return `${start}...${end}`;
  }

  // Check for API keys
  private checkForApiKeys(content: string, location: string) {
    // Create a hash set to track already found vulnerabilities at this location
    const foundVulnerabilities = new Set<string>();
    
    API_KEY_PATTERNS.forEach((pattern) => {
      let match;
      // Reset the regex lastIndex to ensure we start from the beginning
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(content)) !== null) {
        const matchedText = match[0];
        const startIndex = Math.max(0, match.index - 20);
        const endIndex = Math.min(content.length, match.index + matchedText.length + 20);
        const snippet = content.substring(startIndex, endIndex);
        
        // Create a unique key for this vulnerability
        const limitedSnippet = this.limitSnippetSize(snippet);
        const vulnKey = `${VulnerabilityType.API_KEY_EXPOSURE}:${location}:${limitedSnippet}`;
        
        // Only add if we haven't seen this exact vulnerability before
        if (!foundVulnerabilities.has(vulnKey)) {
          foundVulnerabilities.add(vulnKey);
          this.addVulnerabilityIfNew({
            type: VulnerabilityType.API_KEY_EXPOSURE,
            severity: VulnerabilitySeverity.CRITICAL,
            location,
            description: `Potential API key exposed in ${location}`,
            code_snippet: limitedSnippet,
            created_at: new Date().toISOString()
          });
        }
      }
    });
  }

  // Check for environment variables
  private checkForEnvVariables(content: string, location: string) {
    // Create a hash set to track already found vulnerabilities at this location
    const foundVulnerabilities = new Set<string>();
    
    ENV_VAR_PATTERNS.forEach((pattern) => {
      let match;
      // Reset the regex lastIndex to ensure we start from the beginning
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(content)) !== null) {
        const matchedText = match[0];
        const startIndex = Math.max(0, match.index - 20);
        const endIndex = Math.min(content.length, match.index + matchedText.length + 20);
        const snippet = content.substring(startIndex, endIndex);
        
        // Create a unique key for this vulnerability
        const limitedSnippet = this.limitSnippetSize(snippet);
        const vulnKey = `${VulnerabilityType.ENV_VARIABLE_EXPOSURE}:${location}:${limitedSnippet}`;
        
        // Only add if we haven't seen this exact vulnerability before
        if (!foundVulnerabilities.has(vulnKey)) {
          foundVulnerabilities.add(vulnKey);
          this.addVulnerabilityIfNew({
            type: VulnerabilityType.ENV_VARIABLE_EXPOSURE,
            severity: VulnerabilitySeverity.HIGH,
            location,
            description: `Environment variable exposed in ${location}`,
            created_at: new Date().toISOString(),
            code_snippet: limitedSnippet,
          });
        }
      }
    });
  }

  // Check for XSS vulnerabilities
  private checkForXssVulnerabilities(content: string, location: string) {
    // Create a hash set to track already found vulnerabilities at this location
    const foundVulnerabilities = new Set<string>();
    
    XSS_PATTERNS.forEach((pattern) => {
      let match;
      // Reset the regex lastIndex to ensure we start from the beginning
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(content)) !== null) {
        const matchedText = match[0];
        const startIndex = Math.max(0, match.index - 20);
        const endIndex = Math.min(content.length, match.index + matchedText.length + 20);
        const snippet = content.substring(startIndex, endIndex);
        
        // Create a unique key for this vulnerability
        const limitedSnippet = this.limitSnippetSize(snippet);
        const vulnKey = `${VulnerabilityType.XSS_VULNERABILITY}:${location}:${limitedSnippet}`;
        
        // Only add if we haven't seen this exact vulnerability before
        if (!foundVulnerabilities.has(vulnKey)) {
          foundVulnerabilities.add(vulnKey);
          this.addVulnerabilityIfNew({
            type: VulnerabilityType.XSS_VULNERABILITY,
            severity: VulnerabilitySeverity.HIGH,
            location,
            description: `Potential XSS vulnerability in ${location}`,
            created_at: new Date().toISOString(),
            code_snippet: limitedSnippet,
          });
        }
      }
    });
  }

  // Check for sensitive information in any text
  private checkForSensitiveInfo(content: string, location: string) {
    this.checkForApiKeys(content, location);
    this.checkForEnvVariables(content, location);
  }

  // Analyze HTML for insecure patterns
  private async analyzeHtml() {
    if (!this.page) throw new Error('Browser not initialized');

    this.updateProgress(ScanStage.SOURCE_ANALYSIS, 60, 'Analyzing HTML...');

    const html = await this.page.content();
    this.trackScannedFile('HTML', this.url);
    const $ = cheerio.load(html);

    // Track and analyze CSS files
    $('link[rel="stylesheet"]').each((i, link) => {
      const href = $(link).attr('href');
      if (href) {
        this.trackScannedFile('CSS', href);
      }
    });

    // Track inline styles
    $('style').each((i, style) => {
      this.trackScannedFile('Inline CSS', `Inline style #${i + 1}`);
    });

    // Track image files
    $('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src) {
        this.trackScannedFile('Image', src);
      }
    });

    // Track audio and video files
    $('audio source, video source').each((i, media) => {
      const src = $(media).attr('src');
      if (src) {
        const parent = $(media).parent().get(0);
        const tagName = parent ? parent.tagName.toLowerCase() : 'media';
        this.trackScannedFile(tagName === 'audio' ? 'Audio' : 'Video', src);
      }
    });

    // Track other resource files (fonts, etc.)
    $('link[rel="preload"], link[rel="icon"], link[rel="manifest"]').each((i, link) => {
      const href = $(link).attr('href');
      if (href) {
        const fileType = $(link).attr('as') || $(link).attr('rel') || 'Resource';
        this.trackScannedFile(fileType, href);
      }
    });

    // Track iframes
    $('iframe').each((i, iframe) => {
      const src = $(iframe).attr('src');
      if (src) {
        this.trackScannedFile('iframe', src);
      }
    });

    // Create a hash set to track already found vulnerabilities
    const foundVulnerabilities = new Set<string>();

    // Check for forms without CSRF protection
    $('form').each((i, form) => {
      const hasCsrfToken = $(form).find('input[name*="csrf" i], input[name*="token" i]').length > 0;
      if (!hasCsrfToken) {
        const location = `Form #${i + 1}`;
        const snippet = $(form).toString().substring(0, 200) + '...';
        const limitedSnippet = this.limitSnippetSize(snippet);
        
        // Create a unique key for this vulnerability
        const vulnKey = `${VulnerabilityType.INSECURE_AUTHENTICATION}:${location}:${limitedSnippet}`;
        
        // Only add if we haven't seen this exact vulnerability before
        if (!foundVulnerabilities.has(vulnKey)) {
          foundVulnerabilities.add(vulnKey);
          this.addVulnerabilityIfNew({
            type: VulnerabilityType.INSECURE_AUTHENTICATION,
            severity: VulnerabilitySeverity.MEDIUM,
            location,
            description: 'Form without CSRF protection',
            created_at: new Date().toISOString(),
            code_snippet: limitedSnippet,
          });
        }
      }
    });

    // Check for insecure cookies
    const cookies = await this.page.cookies();
    const cookieVulnerabilities = new Map<string, Set<string>>();
    
    cookies.forEach((cookie) => {
      const cookieStr = JSON.stringify(cookie, null, 2);
      const limitedSnippet = this.limitSnippetSize(cookieStr);
      
      if (!cookie.secure) {
        // Track insecure cookie vulnerabilities
        if (!cookieVulnerabilities.has(cookie.name)) {
          cookieVulnerabilities.set(cookie.name, new Set<string>());
        }
        cookieVulnerabilities.get(cookie.name)!.add('secure');
      }
      
      if (!cookie.httpOnly) {
        // Track httpOnly cookie vulnerabilities
        if (!cookieVulnerabilities.has(cookie.name)) {
          cookieVulnerabilities.set(cookie.name, new Set<string>());
        }
        cookieVulnerabilities.get(cookie.name)!.add('httpOnly');
      }
    });
    
    // Add cookie vulnerabilities
    for (const [cookieName, issues] of cookieVulnerabilities.entries()) {
      const cookie = cookies.find(c => c.name === cookieName);
      if (!cookie) continue;
      
      const cookieStr = JSON.stringify(cookie, null, 2);
      const limitedSnippet = this.limitSnippetSize(cookieStr);
      
      if (issues.has('secure')) {
        const vulnKey = `${VulnerabilityType.INSECURE_CONFIGURATION}:Cookies:${cookieName}:secure`;
        
        if (!foundVulnerabilities.has(vulnKey)) {
          foundVulnerabilities.add(vulnKey);
          this.addVulnerabilityIfNew({
            type: VulnerabilityType.INSECURE_CONFIGURATION,
            severity: VulnerabilitySeverity.MEDIUM,
            location: 'Cookies',
            description: `Cookie '${cookieName}' is not secure (missing 'Secure' flag)`,
            created_at: new Date().toISOString(),
            code_snippet: limitedSnippet,
          });
        }
      }
      
      if (issues.has('httpOnly')) {
        const vulnKey = `${VulnerabilityType.INSECURE_CONFIGURATION}:Cookies:${cookieName}:httpOnly`;
        
        if (!foundVulnerabilities.has(vulnKey)) {
          foundVulnerabilities.add(vulnKey);
          this.addVulnerabilityIfNew({
            type: VulnerabilityType.INSECURE_CONFIGURATION,
            severity: VulnerabilitySeverity.MEDIUM,
            location: 'Cookies',
            description: `Cookie '${cookieName}' is not HttpOnly (accessible via JavaScript)`,
            created_at: new Date().toISOString(),
            code_snippet: limitedSnippet,
          });
        }
      }
    }
  }

  // Generate AI fix suggestions for vulnerabilities
  private async generateFixSuggestions() {
    this.updateProgress(ScanStage.REPORT_GENERATION, 0, 'Generating fix suggestions...');

    for (let i = 0; i < this.vulnerabilities.length; i++) {
      const vulnerability = this.vulnerabilities[i];
      const progress = Math.floor((i / this.vulnerabilities.length) * 100);
      
      this.updateProgress(
        ScanStage.REPORT_GENERATION,
        progress,
        `Generating fix suggestion for vulnerability ${i + 1} of ${this.vulnerabilities.length}...`
      );

      try {
        const fixSuggestion = await generateFixSuggestion(
          vulnerability.type,
          vulnerability.description,
          vulnerability.code_snippet || ''
        ) || '';
        
        this.vulnerabilities[i] = {
          ...vulnerability,
          ai_fix: fixSuggestion,
        };
      } catch (error) {
        console.error('Error generating fix suggestion:', error);
      }
    }
  }

  // Run the scan
  public async scan(): Promise<Vulnerability[]> {
    try {
      // Start console capture if available
      if (this.consoleCapture) {
        this.consoleCapture.start();
      }
      
      // Reset tracking variables
      this.vulnerabilities = [];
      this.globalVulnerabilityKeys.clear();
      this.totalVulnerabilitiesDetected = 0;
      this.filesScanned = 0;
      this.fileTypeStats = {};

      // Initialize browser - 10% progress
      this.updateProgress(ScanStage.INITIAL_CRAWL, 0, 'Starting scan...');
      await this.initBrowser();
      this.updateProgress(ScanStage.INITIAL_CRAWL, 10, 'Browser initialized');

      // Navigate to URL - 20% progress
      await this.navigateToUrl();
      this.updateProgress(ScanStage.INITIAL_CRAWL, 30, 'Website loaded successfully');

      // Extract and analyze JavaScript - 40% progress
      this.updateProgress(ScanStage.SOURCE_ANALYSIS, 35, 'Analyzing JavaScript code...');
      await this.extractAndAnalyzeJavaScript();
      this.updateProgress(ScanStage.SOURCE_ANALYSIS, 45, 'JavaScript analysis complete');

      // Analyze HTML - 50% progress
      this.updateProgress(ScanStage.SOURCE_ANALYSIS, 50, 'Analyzing HTML structure...');
      await this.analyzeHtml();
      this.updateProgress(ScanStage.SOURCE_ANALYSIS, 60, 'HTML analysis complete');

      // Network analysis - 60% progress
      this.updateProgress(ScanStage.NETWORK_ANALYSIS, 65, 'Analyzing network requests...');
      // Network analysis is done through request interception during navigation
      this.updateProgress(ScanStage.NETWORK_ANALYSIS, 70, 'Network analysis complete');

      // Environment variable detection - 70% progress
      this.updateProgress(ScanStage.ENV_VARIABLE_DETECTION, 75, 'Checking for exposed environment variables...');
      // This is done as part of JavaScript analysis
      this.updateProgress(ScanStage.ENV_VARIABLE_DETECTION, 80, 'Environment variable check complete');

      // Vulnerability assessment - 80% progress
      this.updateProgress(ScanStage.VULNERABILITY_ASSESSMENT, 85, 'Assessing vulnerabilities...');
      // This is done throughout the scan
      this.updateProgress(ScanStage.VULNERABILITY_ASSESSMENT, 90, 'Vulnerability assessment complete');

      // Generate fix suggestions - 90% progress
      this.updateProgress(ScanStage.REPORT_GENERATION, 95, 'Generating fix suggestions...');
      await this.generateFixSuggestions();

      // Complete the scan - 100% progress
      this.updateProgress(ScanStage.COMPLETED, 100, 'Scan completed successfully');
      
      // Log total files scanned
      console.log('\n' + '='.repeat(50));
      console.log(`[Scanner] SCAN COMPLETED - ${this.url}`);
      console.log('-'.repeat(50));
      console.log(`Total files scanned: ${this.filesScanned}`);
      console.log('File type breakdown:');
      
      // Sort file types by count
      const sortedFileTypes = Object.entries(this.fileTypeStats)
        .sort(([, countA], [, countB]) => countB - countA);
      
      sortedFileTypes.forEach(([fileType, count]) => {
        console.log(`  - ${fileType}: ${count} (${Math.round(count / this.filesScanned * 100)}%)`);
      });
      
      console.log(`Unique vulnerabilities found: ${this.vulnerabilities.length}`);
      console.log(`Total vulnerabilities detected: ${this.globalVulnerabilityKeys.size}`);
      console.log('='.repeat(50) + '\n');

      // Update progress store with completion status if we have scan ID
      if (this.scanId) {
        completeScan(this.scanId, this.vulnerabilities);
      }

      return this.vulnerabilities;
    } catch (error) {
      console.error('Error during scan:', error);
      
      // Update progress store with error if we have scan ID
      if (this.scanId) {
        failScan(
          this.scanId, 
          error instanceof Error ? error.message : String(error)
        );
      }
      
      throw error;
    } finally {
      // Stop console capture
      if (this.consoleCapture) {
        this.consoleCapture.stop();
      }
      
      // Close the browser
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

export default Scanner;
