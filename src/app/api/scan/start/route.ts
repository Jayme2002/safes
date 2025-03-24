import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';
import { ScanProgress, ScanStatus } from '@/types';
import Scanner from '@/lib/scanner';

export async function POST(request: NextRequest) {
  try {
    const { scanId, userId } = await request.json();

    if (!scanId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the scan
    const { data: scanData, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single();

    if (scanError || !scanData) {
      console.error('Error retrieving scan:', scanError);
      return NextResponse.json(
        { error: 'Failed to retrieve scan' },
        { status: 500 }
      );
    }

    // Update scan status to scanning
    await supabase
      .from('scans')
      .update({
        status: ScanStatus.SCANNING,
      })
      .eq('id', scanId);

    console.log(`[Scanner API] Starting REAL scan for URL: ${scanData.url}`);
    
    // Create progress callback function that updates Supabase in real-time
    const progressCallback = async (progress: ScanProgress) => {
      console.log(`[Scanner API] Progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
      
      try {
        // Update the scan with progress information
        const { data, error } = await supabase
          .from('scans')
          .update({
            progress_stage: progress.stage,
            progress_percent: progress.progress,
            progress_message: progress.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', scanId);
        
        if (error) {
          console.error('[Scanner API] Error updating progress:', error);
        } else {
          console.log(`[Scanner API] Progress updated successfully: ${progress.stage} - ${progress.progress}%`);
        }
      } catch (error) {
        console.error('[Scanner API] Exception in progress callback:', error);
      }
    };
    
    // Create scanner instance
    const scanner = new Scanner(scanData.url, progressCallback);
    
    console.log('[SCAN DEBUG] Scan started successfully');
    // Run the actual scan - this will crawl and analyze the real website
    let vulnerabilities;
    try {
      vulnerabilities = await scanner.scan();
      console.log(`[SCAN DEBUG] Scan completed with ${vulnerabilities.length} unique vulnerabilities found`);
      console.log(`[SCAN DEBUG] Duplicate vulnerabilities removed: ${scanner.getDuplicatesRemoved()}`);
    } catch (scannerError) {
      console.error('[SCAN DEBUG] Error during scanner.scan():', scannerError);
      throw new Error(`Scanner error: ${scannerError instanceof Error ? scannerError.message : String(scannerError)}`);
    }
    
    // Set scan_id for each vulnerability
    const vulnerabilitiesWithScanId = vulnerabilities.map(vuln => ({
      ...vuln,
      scan_id: scanId
    }));

    // Insert vulnerabilities in batches of 10 to avoid potential issues with large payloads
    const BATCH_SIZE = 10;
    let insertErrors = [];

    // Process vulnerabilities in batches
    for (let i = 0; i < vulnerabilitiesWithScanId.length; i += BATCH_SIZE) {
      const batch = vulnerabilitiesWithScanId.slice(i, i + BATCH_SIZE);
      console.log(`[Scanner API] Inserting batch ${i/BATCH_SIZE + 1} of ${Math.ceil(vulnerabilitiesWithScanId.length/BATCH_SIZE)}, size: ${batch.length}`);
      
      const { error } = await supabase
        .from('vulnerabilities')
        .insert(batch);
      
      if (error) {
        console.error(`[Scanner API] Error inserting batch ${i/BATCH_SIZE + 1}:`, error);
        insertErrors.push(error);
      }
    }

    if (insertErrors.length > 0) {
      console.error(`[Scanner API] Encountered ${insertErrors.length} errors while inserting vulnerabilities.`);
      console.error('First error:', insertErrors[0]);
      
      // Still update the scan status to completed, but with a warning
      console.warn('[Scanner API] Some vulnerabilities may not have been saved.');
    }

    // Update scan status to completed
    await supabase
      .from('scans')
      .update({
        status: ScanStatus.COMPLETED,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);

    return NextResponse.json({ 
      success: true, 
      message: 'Scan completed successfully',
      vulnerabilitiesCount: vulnerabilities.length,
      warningsCount: insertErrors.length
    });
  } catch (error) {
    console.error('[Scanner API] Error during scan:', error);
    
    try {
      // Try to update the scan status to failed
      if (typeof error === 'object' && error !== null && 'scanId' in error) {
        const scanId = (error as any).scanId;
        const supabase = createAdminClient();
        
        await supabase
          .from('scans')
          .update({
            status: ScanStatus.FAILED,
          })
          .eq('id', scanId);
      }
    } catch (updateError) {
      console.error('[Scanner API] Failed to update scan status to FAILED:', updateError);
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
