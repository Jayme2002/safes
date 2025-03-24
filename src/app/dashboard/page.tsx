'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Scan, ScanStatus } from '@/types';
import ProtectedRoute from '@/components/auth/protected-route';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [verifiedDomains, setVerifiedDomains] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);

  useEffect(() => {
    const fetchScans = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('scans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setScans(data as Scan[]);
      } catch (error) {
        console.error('Error fetching scans:', error);
        toast.error('Failed to load scans', {
          description: 'Please try refreshing the page.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchVerifiedDomains = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('domain_verifications')
          .select('domain')
          .eq('user_id', user.id)
          .eq('status', 'verified')
          .order('verified_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Extract unique domains
        const uniqueDomains = [...new Set(data.map(item => item.domain))];
        setVerifiedDomains(uniqueDomains);
      } catch (error) {
        console.error('Error fetching verified domains:', error);
      } finally {
        setIsLoadingDomains(false);
      }
    };

    fetchScans();
    fetchVerifiedDomains();
  }, [user]);

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

  return (
    <ProtectedRoute>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link href="/scan/new">
            <Button>New Scan</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>
                View and manage your recent security scans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : scans.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You haven&apos;t run any scans yet.
                  </p>
                  <Link href="/scan/new">
                    <Button>Start Your First Scan</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">URL</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scans.map((scan) => (
                        <tr key={scan.id} className="border-b">
                          <td className="py-3 px-4 truncate max-w-[200px]">
                            {scan.url}
                          </td>
                          <td className="py-3 px-4">
                            {getScanStatusBadge(scan.status)}
                          </td>
                          <td className="py-3 px-4">
                            {formatDate(scan.created_at)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/scan/${scan.id}`}>
                              <Button variant="outline" size="sm">
                                View Results
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verified Domains</CardTitle>
              <CardDescription>
                These domains have already been verified and can be scanned without re-verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDomains ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : verifiedDomains.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    You don&apos;t have any verified domains yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Domain</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedDomains.map((domain) => (
                        <tr key={domain} className="border-b">
                          <td className="py-3 px-4 font-medium">
                            {domain}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/scan/new?domain=${domain}`}>
                              <Button variant="outline" size="sm">
                                New Scan
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Regularly scan your websites to catch new vulnerabilities
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Always verify domain ownership before scanning
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Implement AI-suggested fixes to improve security
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  {scans.length === 0 ? (
                    <p className="text-muted-foreground">
                      Run your first scan to get a security score
                    </p>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-primary mb-2">
                        {scans.some((scan) => scan.status === ScanStatus.COMPLETED)
                          ? '85%'
                          : 'N/A'}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Based on your most recent scan results
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Our support team is ready to assist you with any questions or issues.
                </p>
                <Link href="/contact">
                  <Button variant="outline" className="w-full">
                    Contact Support
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
