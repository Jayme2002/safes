# SafeStartup.dev

A SaaS application that scans websites for security vulnerabilities and provides AI-powered fix suggestions.

## Features

- **Security Scanning**: Scan websites for exposed API keys, environment variables, and other security vulnerabilities
- **Domain Verification**: Verify domain ownership via DNS TXT records or file upload
- **AI-Powered Fix Suggestions**: Get intelligent fix suggestions for each vulnerability using OpenAI
- **User Authentication**: Secure user authentication with Supabase Auth
- **Payment Processing**: Process payments with Stripe
- **Beautiful UI**: Dark mode UI with Shadcn UI and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js with TypeScript
- **UI**: Shadcn UI, Tailwind CSS, Framer Motion
- **Backend**: Next.js API routes (serverless functions)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **AI**: OpenAI API
- **Scanning**: Puppeteer, Cheerio

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Stripe account
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/safestartup.dev.git
cd safestartup.dev
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your API keys:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
SCAN_PRICE_ID=your_stripe_price_id
```

4. Set up the Supabase database by running the SQL migration:

```bash
# Log in to Supabase CLI
npx supabase login

# Link your project
npx supabase link --project-ref your-project-ref

# Apply the migration
npx supabase db push
```

Alternatively, you can manually run the SQL in `supabase/migrations/20250323_create_initial_tables.sql` in the Supabase SQL editor.

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Production

### 1. Set Up Supabase

1. Create a new Supabase project
2. Run the SQL migration in `supabase/migrations/20250323_create_initial_tables.sql`
3. Set up authentication providers in the Supabase dashboard
4. Configure email templates for authentication

### 2. Set Up Stripe

1. Create a Stripe account
2. Set up a product and price for the scan service
3. Note the price ID for your environment variables
4. Configure webhook endpoints for payment events

### 3. Deploy to Vercel

1. Push your code to a GitHub repository
2. Create a new project in Vercel
3. Connect your GitHub repository
4. Configure the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_production_stripe_publishable_key
STRIPE_SECRET_KEY=your_production_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_production_stripe_webhook_secret
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
SCAN_PRICE_ID=your_production_stripe_price_id
```

5. Deploy the application

### 4. Set Up Stripe Webhooks

1. In the Stripe dashboard, go to Developers > Webhooks
2. Add an endpoint for `https://your-production-domain.com/api/webhook/stripe`
3. Select the following events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Get the webhook signing secret and add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

### 5. Configure DNS and SSL

1. Set up your custom domain in Vercel
2. Configure DNS settings with your domain provider
3. Vercel will automatically provision SSL certificates

## Additional Configuration

### Email Templates

Customize the email templates in Supabase for:
- Welcome emails
- Password reset emails
- Email verification

### Stripe Products

Configure your Stripe products and prices:
1. Create a product for the security scan
2. Set the price to $10 USD
3. Update the `SCAN_PRICE_ID` environment variable with the price ID

## License

This project is licensed under the MIT License - see the LICENSE file for details.
