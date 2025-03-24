'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/auth/protected-route';
import { DomainVerificationType, DomainVerificationStatus, ScanStatus } from '@/types';
import { extractDomainFromUrl, generateDnsTxtRecord, generateVerificationFileContent, generateVerificationToken, verifyDomain } from '@/lib/scanner/domain-verification';

export default function NewScanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainParam = searchParams.get('domain');
  
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [domain, setDomain] = useState('');
  const [step, setStep] = useState<'url' | 'verification' | 'payment'>('url');
  const [verificationType, setVerificationType] = useState<DomainVerificationType>(DomainVerificationType.DNS_TXT);
  const [verificationToken, setVerificationToken] = useState('');
  const [verificationValue, setVerificationValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [scanId, setScanId] = useState('');
  const [testMode, setTestMode] = useState(false);

  // Handle domain parameter if present
  useEffect(() => {
    if (domainParam) {
      // Try to construct a valid URL from the domain
      const urlWithProtocol = domainParam.startsWith('http') ? domainParam : `https://${domainParam}`;
      setUrl(urlWithProtocol);
      
      // Validate the URL
      if (validateUrl(urlWithProtocol)) {
        setIsValidUrl(true);
        setDomain(extractDomainFromUrl(urlWithProtocol));
      }
    }
  }, [domainParam]);

  const validateUrl = (input: string) => {
    try {
      new URL(input);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setUrl(input);
    setIsValidUrl(validateUrl(input));

    if (validateUrl(input)) {
      try {
        const extractedDomain = extractDomainFromUrl(input);
        setDomain(extractedDomain);
      } catch (error) {
        setDomain('');
      }
    } else {
      setDomain('');
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl || !user) return;

    setIsLoading(true);

    try {
      // First, check if the user has already verified this domain
      const { data: verifiedDomains, error: verifiedDomainsError } = await supabase
        .from('domain_verifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', domain)
        .eq('status', DomainVerificationStatus.VERIFIED)
        .order('verified_at', { ascending: false })
        .limit(1);

      if (verifiedDomainsError) {
        console.error("Error checking verified domains:", verifiedDomainsError);
        throw new Error(`Failed to check verified domains: ${verifiedDomainsError.message}`);
      }

      // If domain is already verified by this user, skip verification
      if (verifiedDomains && verifiedDomains.length > 0) {
        console.log("Domain already verified:", domain);

        // Set scan status based on test mode
        const scanStatus = testMode ? ScanStatus.SCANNING : ScanStatus.PAYMENT_REQUIRED;

        // Create scan record with appropriate status
        const { data: scanData, error: scanError } = await supabase
          .from('scans')
          .insert({
            user_id: user.id,
            url,
            domain,
            status: scanStatus,
          })
          .select()
          .single();

        if (scanError) {
          console.error("Supabase scan creation error:", scanError);
          throw new Error(`Failed to create scan: ${scanError.message}`);
        }

        setScanId(scanData.id);
        
        toast.success('Domain ownership already verified', {
          description: 'Your domain was previously verified.',
        });
        
        if (testMode) {
          // Start the scan immediately in test mode
          toast.success('Test mode enabled', {
            description: 'Starting scan immediately without payment.',
          });
          
          // Call the scan API directly
          try {
            const response = await fetch('/api/scan/start', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                scanId: scanData.id,
                userId: user.id,
              }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to start scan');
            }
            
            // Redirect to the scan page
            router.push(`/scan/${scanData.id}`);
            return;
          } catch (error) {
            console.error('Error starting scan in test mode:', error);
            toast.error('Failed to start scan in test mode', {
              description: 'Please try again or proceed to payment.',
            });
          }
        } else {
          // Proceed to payment step
          setStep('payment');
        }
        
        setIsLoading(false);
        return;
      }

      // Check if a verification record for this domain and user already exists
      const { data: existingVerifications, error: fetchError } = await supabase
        .from('domain_verifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', domain)
        .eq('status', DomainVerificationStatus.PENDING)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error("Error fetching existing verifications:", fetchError);
        throw new Error(`Failed to check existing verifications: ${fetchError.message}`);
      }

      let verificationData;
      
      if (existingVerifications && existingVerifications.length > 0) {
        // Reuse existing verification
        verificationData = existingVerifications[0];
        setVerificationToken(verificationData.verification_value.split('=')[1]); // Extract token from value
        setVerificationValue(verificationData.verification_value);
        setVerificationId(verificationData.id);

        console.log("Reusing existing verification:", verificationData);
      } else {
        // Generate verification token
        const token = generateVerificationToken(domain, user.id);
        setVerificationToken(token);

        // Generate verification value based on type
        const value = verificationType === DomainVerificationType.DNS_TXT
          ? generateDnsTxtRecord(token)
          : generateVerificationFileContent(token);
        setVerificationValue(value);

        // Create domain verification record
        const { data: newVerificationData, error: verificationError } = await supabase
          .from('domain_verifications')
          .insert({
            user_id: user.id,
            domain,
            verification_type: verificationType,
            verification_value: value,
            status: DomainVerificationStatus.PENDING,
          })
          .select()
          .single();

        if (verificationError) {
          console.error("Supabase domain verification error:", verificationError);
          throw new Error(`Failed to create domain verification: ${verificationError.message}`);
        }

        verificationData = newVerificationData;
        setVerificationId(verificationData.id);
      }

      // Check if a scan record for this domain and user already exists
      const { data: existingScans, error: scanFetchError } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', domain)
        .eq('status', ScanStatus.VERIFYING)
        .order('created_at', { ascending: false })
        .limit(1);

      if (scanFetchError) {
        console.error("Error fetching existing scans:", scanFetchError);
        throw new Error(`Failed to check existing scans: ${scanFetchError.message}`);
      }

      let scanData;

      if (existingScans && existingScans.length > 0) {
        // Reuse existing scan
        scanData = existingScans[0];
        setScanId(scanData.id);
        
        console.log("Reusing existing scan:", scanData);
      } else {
        // Create scan record
        const { data: newScanData, error: scanError } = await supabase
          .from('scans')
          .insert({
            user_id: user.id,
            url,
            domain,
            status: ScanStatus.VERIFYING,
          })
          .select()
          .single();

        if (scanError) {
          console.error("Supabase scan creation error:", scanError);
          throw new Error(`Failed to create scan: ${scanError.message}`);
        }

        scanData = newScanData;
        setScanId(scanData.id);
      }

      setStep('verification');
    } catch (error) {
      console.error('Error setting up verification:', error);
      toast.error('Failed to set up domain verification', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationId || !scanId || !user) return;

    setIsLoading(true);

    try {
      // Verify domain ownership
      const status = await verifyDomain(domain, verificationType, verificationValue);

      // Update domain verification status
      await supabase
        .from('domain_verifications')
        .update({
          status,
          verified_at: status === DomainVerificationStatus.VERIFIED ? new Date().toISOString() : null,
        })
        .eq('id', verificationId);

      if (status === DomainVerificationStatus.VERIFIED) {
        // If test mode is enabled, update scan status to SCANNING instead of PAYMENT_REQUIRED
        const newScanStatus = testMode ? ScanStatus.SCANNING : ScanStatus.PAYMENT_REQUIRED;
        
        // Update scan status
        await supabase
          .from('scans')
          .update({
            status: newScanStatus,
          })
          .eq('id', scanId);

        toast.success('Domain verification successful', {
          description: 'Your domain has been verified.',
        });

        if (testMode) {
          // Start the scan immediately in test mode
          toast.success('Test mode enabled', {
            description: 'Starting scan immediately without payment.',
          });
          
          // Call the scan API directly
          try {
            const response = await fetch('/api/scan/start', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                scanId,
                userId: user.id,
              }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to start scan');
            }
            
            // Redirect to the scan page
            router.push(`/scan/${scanId}`);
            return;
          } catch (error) {
            console.error('Error starting scan in test mode:', error);
            toast.error('Failed to start scan in test mode', {
              description: 'Please try again or proceed to payment.',
            });
          }
        }

        setStep('payment');
      } else {
        toast.error('Domain verification failed', {
          description: 'Please check your DNS configuration and try again. Note that DNS changes can take time to propagate (up to 48 hours in some cases).',
        });
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Failed to verify domain', {
        description: 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!scanId) return;
    router.push(`/scan/${scanId}/payment`);
  };

  return (
    <ProtectedRoute>
      <div className="container py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">New Security Scan</h1>

          <div className="mb-8">
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === 'url' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                } mr-2`}
              >
                1
              </div>
              <div className="h-1 w-16 bg-muted mx-2"></div>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === 'verification' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                } mr-2`}
              >
                2
              </div>
              <div className="h-1 w-16 bg-muted mx-2"></div>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === 'payment' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                3
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span>Enter URL</span>
              <span>Verify Domain</span>
              <span>Payment</span>
            </div>
          </div>

          {step === 'url' && (
            <Card>
              <CardHeader>
                <CardTitle>Enter Website URL</CardTitle>
                <CardDescription>
                  Provide the URL of the website you want to scan for security vulnerabilities
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleUrlSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Website URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={handleUrlChange}
                      required
                    />
                    {url && !isValidUrl && (
                      <p className="text-sm text-red-500">
                        Please enter a valid URL (e.g., https://example.com)
                      </p>
                    )}
                    {domain && (
                      <p className="text-sm text-muted-foreground">
                        Domain to verify: <span className="font-medium">{domain}</span>
                      </p>
                    )}
                    
                    {/* Add note about previously verified domains */}
                    {domain && (
                      <p className="text-sm text-green-600 mt-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="inline-block mr-1"
                        >
                          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                          <path d="m9 12 2 2 4-4"></path>
                        </svg>
                        If you've previously verified this domain, you'll skip the verification step.
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="testMode"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="testMode" className="text-sm font-normal">
                      Enable test mode (bypass payment for testing)
                    </Label>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={!isValidUrl || isLoading}>
                    {isLoading ? 'Processing...' : 'Continue'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {step === 'verification' && (
            <Card>
              <CardHeader>
                <CardTitle>Verify Domain Ownership</CardTitle>
                <CardDescription>
                  Prove that you own the domain by completing one of the verification methods below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="dns" onValueChange={(value) => setVerificationType(value as DomainVerificationType)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value={DomainVerificationType.DNS_TXT}>DNS TXT Record</TabsTrigger>
                    <TabsTrigger value={DomainVerificationType.FILE_UPLOAD}>File Upload</TabsTrigger>
                  </TabsList>
                  <TabsContent value={DomainVerificationType.DNS_TXT} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Add a DNS TXT Record</h3>
                      <p className="text-sm text-muted-foreground">
                        Add the following TXT record to your domain&apos;s DNS configuration:
                      </p>
                      <div className="bg-muted p-4 rounded-md">
                        <p className="text-sm font-mono break-all">{verificationValue}</p>
                      </div>
                      <div className="space-y-1 mt-4">
                        <p className="text-sm font-medium">Instructions:</p>
                        <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                          <li>Log in to your domain registrar or DNS provider</li>
                          <li>Navigate to the DNS settings for {domain}</li>
                          <li>Add a new TXT record with the value above</li>
                          <li>Save your changes and wait for DNS propagation (may take up to 24 hours)</li>
                          <li>Click the Verify button below to check if the record is properly set up</li>
                        </ol>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value={DomainVerificationType.FILE_UPLOAD} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Upload a Verification File</h3>
                      <p className="text-sm text-muted-foreground">
                        Create a file named <span className="font-mono">safestartup-verification.txt</span> with the following content and upload it to the root directory of your website:
                      </p>
                      <div className="bg-muted p-4 rounded-md">
                        <p className="text-sm font-mono break-all">{verificationValue}</p>
                      </div>
                      <div className="space-y-1 mt-4">
                        <p className="text-sm font-medium">Instructions:</p>
                        <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                          <li>Create a new text file named <span className="font-mono">safestartup-verification.txt</span></li>
                          <li>Copy and paste the content above into the file</li>
                          <li>Upload the file to the root directory of your website</li>
                          <li>Ensure the file is accessible at <span className="font-mono">https://{domain}/safestartup-verification.txt</span></li>
                          <li>Click the Verify button below to check if the file is properly uploaded</li>
                        </ol>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter>
                <Button onClick={handleVerify} disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify Domain'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 'payment' && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Required</CardTitle>
                <CardDescription>
                  Complete the payment to start your security scan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Security Scan</p>
                      <p className="text-sm text-muted-foreground">
                        Comprehensive security scan for {domain}
                      </p>
                    </div>
                    <p className="font-medium">$10.00</p>
                  </div>
                </div>
                <div className="flex justify-between border-t pt-4">
                  <p className="font-medium">Total</p>
                  <p className="font-medium">$10.00</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleProceedToPayment}>
                  Proceed to Payment
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
