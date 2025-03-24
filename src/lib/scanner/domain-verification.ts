import { DomainVerificationType, DomainVerificationStatus } from '@/types';

// Generate a verification token
export const generateVerificationToken = (domain: string, userId: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `safestartup-verify-${domain}-${userId}-${timestamp}-${randomString}`;
};

// Generate a DNS TXT record value
export const generateDnsTxtRecord = (token: string): string => {
  return `safestartup-verification=${token}`;
};

// Generate a verification file content
export const generateVerificationFileContent = (token: string): string => {
  return `safestartup-verification=${token}`;
};

// Verify domain ownership via DNS TXT record
export const verifyDomainViaDnsTxt = async (
  domain: string,
  expectedValue: string
): Promise<boolean> => {
  try {
    // Call our API endpoint instead of using DNS module directly
    const response = await fetch('/api/scan/verify-dns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain, expectedValue }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
      console.error('DNS verification API error:', errorData);
      return false;
    }
    
    const data = await response.json();
    return data.status === DomainVerificationStatus.VERIFIED;
  } catch (error) {
    console.error('Error verifying domain via DNS TXT:', error);
    return false;
  }
};

// Verify domain ownership via file upload
export const verifyDomainViaFileUpload = async (
  domain: string,
  expectedValue: string
): Promise<boolean> => {
  try {
    // Construct the URL to the verification file
    const url = `https://${domain}/safestartup-verification.txt`;
    
    // Fetch the file
    const response = await fetch(url);
    
    if (!response.ok) {
      return false;
    }
    
    // Get the file content
    const content = await response.text();
    
    // Check if the content matches the expected value
    return content.trim() === expectedValue;
  } catch (error) {
    console.error('Error verifying domain via file upload:', error);
    return false;
  }
};

// Verify domain ownership
export const verifyDomain = async (
  domain: string,
  verificationType: DomainVerificationType,
  verificationValue: string
): Promise<DomainVerificationStatus> => {
  try {
    let isVerified = false;
    
    if (verificationType === DomainVerificationType.DNS_TXT) {
      isVerified = await verifyDomainViaDnsTxt(domain, verificationValue);
    } else if (verificationType === DomainVerificationType.FILE_UPLOAD) {
      isVerified = await verifyDomainViaFileUpload(domain, verificationValue);
    }
    
    return isVerified
      ? DomainVerificationStatus.VERIFIED
      : DomainVerificationStatus.FAILED;
  } catch (error) {
    console.error('Error verifying domain:', error);
    return DomainVerificationStatus.FAILED;
  }
};

// Extract domain from URL
export const extractDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error('Error extracting domain from URL:', error);
    throw new Error('Invalid URL');
  }
};
