import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/supabase/client';
import { ScanStatus } from '@/types';

export async function POST(req: NextRequest) {
  const body = await req.text();
  // Get the Stripe signature from the request headers
  const signature = req.headers.get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session: any) {
  const { userId, scanId } = session.metadata;

  if (!userId || !scanId) {
    console.error('Missing userId or scanId in session metadata');
    return;
  }

  const supabase = createAdminClient();

  try {
    // Update scan status and payment information
    await supabase
      .from('scans')
      .update({
        status: ScanStatus.PAYMENT_PROCESSING,
        paid: true,
        payment_id: session.payment_intent,
      })
      .eq('id', scanId)
      .eq('user_id', userId);

    // Create payment record
    await supabase.from('payments').insert({
      user_id: userId,
      scan_id: scanId,
      stripe_payment_id: session.payment_intent,
      status: 'succeeded',
      amount: session.amount_total / 100, // Convert from cents to dollars
    });
  } catch (error) {
    console.error('Error updating scan after payment:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  // This is handled by checkout.session.completed for our use case
  // But we can add additional logic here if needed
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  // Find the scan associated with this payment intent
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('payment_id', paymentIntent.id)
      .single();

    if (error || !data) {
      console.error('Error finding scan for failed payment:', error);
      return;
    }

    // Update scan status
    await supabase
      .from('scans')
      .update({
        status: ScanStatus.PAYMENT_REQUIRED,
        paid: false,
      })
      .eq('id', data.id);

    // Create payment record
    await supabase.from('payments').insert({
      user_id: data.user_id,
      scan_id: data.id,
      stripe_payment_id: paymentIntent.id,
      status: 'failed',
      amount: paymentIntent.amount / 100, // Convert from cents to dollars
    });
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}
