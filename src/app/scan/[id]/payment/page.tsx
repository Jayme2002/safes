'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase } from '@/lib/supabase/client';
import { createCheckoutSession, getStripe } from '@/lib/stripe/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/auth/protected-route';
import { Scan, ScanStatus } from '@/types';
import { Loader2 } from 'lucide-react';

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params) as { id: string };
  const scanId = unwrappedParams.id;
  
  const [scan, setScan] = useState<Scan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

        // If scan is already paid, redirect to scan page
        if (data.paid) {
          router.push(`/scan/${scanId}`);
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
  }, [user, scanId, router]);

  const handleCheckout = async () => {
    if (!scan || !user) {
      toast.error('Missing scan or user information');
      return;
    }

    setIsLoading(true);
    
    try {
      // Use the imported helper function instead of direct fetch
      const data = await createCheckoutSession(user.id, scan.id);
      
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
      setIsLoading(false);
    }
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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Complete Payment</h1>

          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                Complete the payment to start your security scan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Scan Information</h3>
                <div className="bg-muted p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">URL</p>
                      <p className="font-medium truncate">{scan.url}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Domain</p>
                      <p className="font-medium">{scan.domain}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Order Summary</h3>
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Security Scan</p>
                      <p className="text-sm text-muted-foreground">
                        Comprehensive security scan for {scan.domain}
                      </p>
                    </div>
                    <p className="font-medium">$10.00</p>
                  </div>
                </div>
                <div className="flex justify-between border-t pt-4">
                  <p className="font-medium">Total</p>
                  <p className="font-medium">$10.00</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">What&apos;s Included</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Full security vulnerability scan
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      AI-powered fix suggestions
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Detailed vulnerability report
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Access to results for 30 days
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Pay & Start Scan'
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By clicking the button above, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
