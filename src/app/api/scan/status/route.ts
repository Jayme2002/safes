import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Get scanId from the URL
    const url = new URL(request.url);
    const scanId = url.searchParams.get('scanId');
    const userId = url.searchParams.get('userId');

    if (!scanId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the scan with latest progress
    const { data: scanData, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single();

    if (scanError || !scanData) {
      console.error('Error retrieving scan status:', scanError);
      return NextResponse.json(
        { error: 'Failed to retrieve scan status' },
        { status: 500 }
      );
    }

    // Return current scan status with progress data
    return NextResponse.json({
      status: scanData.status,
      progress: {
        stage: scanData.progress_stage || null,
        progress: scanData.progress_percent || 0,
        message: scanData.progress_message || 'Processing...'
      }
    });
  } catch (error) {
    console.error('Error in scan status API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
