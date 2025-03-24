// Follow this setup guide to integrate the Deno runtime successfully: https://deno.com/manual/runtime/manual/getting_started
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Stripe } from "https://esm.sh/stripe@17.6.0?target=deno";

// Initialize Stripe with the latest API version
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-01-27.acacia",
  httpClient: Stripe.createFetchHttpClient()
});

const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // Get the signature from the header
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature provided");
    }

    // Get the request body
    const body = await req.text();
    
    console.log("Received webhook with signature:", signature);

    try {
      // Verify the webhook signature asynchronously using Stripe's method
      const event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
      
      // Initialize Supabase client with service role key
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
      const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY");
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Missing Supabase environment variables");
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

      console.log("Handling Stripe event:", event.type);

      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const { userId, scanId } = session.metadata;

          if (!userId || !scanId) {
            console.error("Missing userId or scanId in session metadata");
            break;
          }

          // Update scan status to PAYMENT_PROCESSING instead of SCANNING
          const { error: scanError } = await supabase
            .from("scans")
            .update({
              status: "payment_processing",
              paid: true,
              payment_id: session.id,
            })
            .eq("id", scanId)
            .eq("user_id", userId);

          if (scanError) {
            console.error("Error updating scan:", scanError);
            break;
          }

          // Create payment record
          const { error: paymentError } = await supabase
            .from("payments")
            .insert({
              user_id: userId,
              scan_id: scanId,
              stripe_payment_id: session.id,
              status: "succeeded",
              amount: session.amount_total / 100, // Convert from cents to dollars
            });

          if (paymentError) {
            console.error("Error creating payment record:", paymentError);
          }

          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object;
          const { userId, scanId } = paymentIntent.metadata;

          if (!userId || !scanId) {
            console.error("Missing userId or scanId in payment intent metadata");
            break;
          }

          // Update scan status to PAYMENT_REQUIRED (so user can try again)
          const { error } = await supabase
            .from("scans")
            .update({
              status: "payment_required",
            })
            .eq("id", scanId)
            .eq("user_id", userId);

          if (error) {
            console.error("Error updating scan:", error);
          }

          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("Stripe webhook verification failed:", err.message);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("Error processing webhook:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 