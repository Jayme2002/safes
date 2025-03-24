// User type
export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  last_sign_in?: string;
}

// Scan type
export interface Scan {
  id: string;
  user_id: string;
  url: string;
  domain: string;
  status: ScanStatus;
  created_at: string;
  completed_at?: string;
  paid: boolean;
  payment_id?: string;
  progress_stage?: ScanStage;
  progress_percent?: number;
  progress_message?: string;
  updated_at?: string;
}

// Scan status enum
export enum ScanStatus {
  PENDING = 'pending',
  VERIFYING = 'verifying',
  PAYMENT_REQUIRED = 'payment_required',
  PAYMENT_PROCESSING = 'payment_processing',
  SCANNING = 'scanning',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Vulnerability type
export interface Vulnerability {
  id: string;
  scan_id: string;
  type: VulnerabilityType;
  severity: VulnerabilitySeverity;
  location?: string;
  description: string;
  ai_fix?: string;
  created_at: string;
  code_snippet?: string;
}

// Vulnerability type enum
export enum VulnerabilityType {
  API_KEY_EXPOSURE = 'api_key_exposure',
  ENV_VARIABLE_EXPOSURE = 'env_variable_exposure',
  INSECURE_DEPENDENCY = 'insecure_dependency',
  XSS_VULNERABILITY = 'xss_vulnerability',
  INSECURE_CONFIGURATION = 'insecure_configuration',
  SENSITIVE_DATA_EXPOSURE = 'sensitive_data_exposure',
  INSECURE_AUTHENTICATION = 'insecure_authentication',
  INSECURE_CORS = 'insecure_cors',
  OTHER = 'other',
}

// Vulnerability severity enum
export enum VulnerabilitySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Payment type
export interface Payment {
  id: string;
  user_id: string;
  scan_id: string;
  stripe_payment_id: string;
  status: PaymentStatus;
  amount: number;
  created_at: string;
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// Scan progress type
export interface ScanProgress {
  stage: ScanStage;
  progress: number;
  message: string;
}

// Scan stage enum
export enum ScanStage {
  INITIAL_CRAWL = 'initial_crawl',
  TECHNOLOGY_DETECTION = 'technology_detection',
  SOURCE_ANALYSIS = 'source_analysis',
  NETWORK_ANALYSIS = 'network_analysis',
  ENV_VARIABLE_DETECTION = 'env_variable_detection',
  VULNERABILITY_ASSESSMENT = 'vulnerability_assessment',
  REPORT_GENERATION = 'report_generation',
  COMPLETED = 'completed',
}

// Domain verification type
export interface DomainVerification {
  id: string;
  user_id: string;
  domain: string;
  verification_type: DomainVerificationType;
  verification_value: string;
  status: DomainVerificationStatus;
  created_at: string;
  verified_at?: string;
}

// Domain verification type enum
export enum DomainVerificationType {
  DNS_TXT = 'dns_txt',
  FILE_UPLOAD = 'file_upload',
}

// Domain verification status enum
export enum DomainVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}
