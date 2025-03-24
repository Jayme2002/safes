import dns from 'dns';
import { promisify } from 'util';
import { NextRequest, NextResponse } from 'next/server';
import { DomainVerificationStatus } from '@/types';

const resolveTxt = promisify(dns.resolveTxt);

export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let domain, expectedValue;
    try {
      const body = await request.json();
      domain = body.domain;
      expectedValue = body.expectedValue;
    } catch (error) {
      console.error('Error parsing request JSON:', error);
      return NextResponse.json(
        { status: DomainVerificationStatus.FAILED, error: 'Invalid request format' },
        { status: 400 }
      );
    }

    if (!domain || !expectedValue) {
      return NextResponse.json(
        { 
          status: DomainVerificationStatus.FAILED, 
          error: 'Missing domain or expectedValue',
          received: { domain, expectedValue } 
        },
        { status: 400 }
      );
    }

    console.log(`Verifying DNS TXT record for domain: ${domain}, expecting value: ${expectedValue}`);

    // Verify domain via DNS TXT record
    try {
      const records = await resolveTxt(domain);
      
      // Log records for debugging
      console.log(`DNS TXT records for ${domain}:`, JSON.stringify(records));
      
      // Flatten the array of arrays
      const flatRecords = records.flat();
      
      // Check if any record matches the expected value
      const isVerified = flatRecords.some((record) => record === expectedValue);
      
      return NextResponse.json({
        status: isVerified ? DomainVerificationStatus.VERIFIED : DomainVerificationStatus.FAILED,
        records: flatRecords // Include records in response for debugging
      });
    } catch (error) {
      console.error('Error verifying domain via DNS TXT:', error);
      return NextResponse.json(
        { 
          status: DomainVerificationStatus.FAILED, 
          error: error instanceof Error ? error.message : 'DNS resolution failed',
          domain
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in DNS verification API:', error);
    return NextResponse.json(
      { 
        status: DomainVerificationStatus.FAILED, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 