'use client';

import { Scan, ScanStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface ScanDetailsProps {
  scan: Scan;
  onStartScan: () => void;
}

export function getScanStatusBadge(status: ScanStatus) {
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
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ScanDetails({ scan, onStartScan }: ScanDetailsProps) {
  const router = useRouter();

  const handlePaymentRedirect = () => {
    router.push(`/scan/${scan.id}/payment`);
  };

  return (
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
              onClick={handlePaymentRedirect}
              className="mt-2"
              size="sm"
            >
              Proceed to Payment
            </Button>
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
              onClick={onStartScan}
              className="mt-2"
              size="sm"
            >
              Retry Scan
            </Button>
          </div>
        )}

        {scan.status === ScanStatus.COMPLETED && (
          <div className="bg-green-500/10 p-4 rounded-md">
            <p className="text-sm text-green-500">
              Scan completed successfully.
            </p>
          </div>
        )}
      </CardContent>
      {(scan.status !== ScanStatus.SCANNING && 
        scan.status !== ScanStatus.COMPLETED) && (
        <CardFooter>
          {scan.status === ScanStatus.PAYMENT_REQUIRED ? (
            <Button onClick={handlePaymentRedirect}>
              Proceed to Payment
            </Button>
          ) : (
            <Button 
              onClick={onStartScan}
              disabled={!scan.paid}
            >
              {scan.status === ScanStatus.FAILED ? 'Retry Scan' : 'Start Scan'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
