'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/auth-context';

export default function Home() {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-background to-background/80">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Secure Your Web Applications from Hidden Vulnerabilities
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Scan your website for exposed API keys, environment variables, and other security risks. Get AI-powered fix suggestions to protect your application.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={user ? "/scan/new" : "/auth/signup"}>
                <Button size="lg" className="text-white">
                  Start Scanning Now
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline">
                  Learn How It Works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Comprehensive Security Scanning
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Our advanced scanning engine detects a wide range of security vulnerabilities in your web applications.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <Card>
              <CardHeader>
                <CardTitle>API Key Exposure</CardTitle>
                <CardDescription>
                  Detect exposed API keys, tokens, and credentials in your source code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our scanner identifies hardcoded API keys for services like Stripe, AWS, OpenAI, and more, preventing unauthorized access to your accounts.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>
                  Find exposed environment variables that should be kept secret.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Detect leaked environment variables in your frontend code that could expose sensitive configuration details to attackers.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>XSS Vulnerabilities</CardTitle>
                <CardDescription>
                  Identify potential cross-site scripting vulnerabilities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Detect unsafe patterns like innerHTML, dangerouslySetInnerHTML, and eval() that could lead to XSS attacks.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Insecure Cookies</CardTitle>
                <CardDescription>
                  Check for cookies missing security flags.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Identify cookies missing Secure and HttpOnly flags, which could expose your users to session hijacking attacks.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>CSRF Vulnerabilities</CardTitle>
                <CardDescription>
                  Detect forms without proper CSRF protection.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Find forms that lack CSRF tokens, making your application vulnerable to cross-site request forgery attacks.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Fixes</CardTitle>
                <CardDescription>
                  Get intelligent fix suggestions for each vulnerability.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our AI analyzes each vulnerability and provides tailored fix suggestions with code examples and best practices.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                How It Works
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Securing your web application is just a few steps away.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-16">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-xl font-bold">1</div>
              <h3 className="mt-4 text-xl font-bold">Enter Your URL</h3>
              <p className="mt-2 text-muted-foreground">
                Provide the URL of the website you want to scan for vulnerabilities.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-xl font-bold">2</div>
              <h3 className="mt-4 text-xl font-bold">Verify Ownership</h3>
              <p className="mt-2 text-muted-foreground">
                Prove you own the domain by adding a DNS TXT record or uploading a verification file.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-xl font-bold">3</div>
              <h3 className="mt-4 text-xl font-bold">Scan Website</h3>
              <p className="mt-2 text-muted-foreground">
                Our advanced scanner analyzes your website for security vulnerabilities and exposed secrets.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-xl font-bold">4</div>
              <h3 className="mt-4 text-xl font-bold">Get Results & Fixes</h3>
              <p className="mt-2 text-muted-foreground">
                Review detailed findings and AI-generated fix suggestions for each vulnerability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Simple, Transparent Pricing
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Pay only for what you need, with no hidden fees or subscriptions.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mt-16 max-w-md mx-auto">
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-2xl">Single Scan</CardTitle>
                <CardDescription>
                  One-time comprehensive security scan
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$10</span>
                  <span className="text-muted-foreground ml-2">per scan</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-primary mr-2"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Full security vulnerability scan</span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-primary mr-2"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>AI-powered fix suggestions</span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-primary mr-2"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Detailed vulnerability report</span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-primary mr-2"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Access to results for 30 days</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={user ? "/scan/new" : "/auth/signup"} className="w-full">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Frequently Asked Questions
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Find answers to common questions about our security scanning service.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
            <div className="space-y-2">
              <h3 className="text-xl font-bold">How does the domain verification work?</h3>
              <p className="text-muted-foreground">
                We offer two methods to verify domain ownership: adding a DNS TXT record or uploading a verification file to your web server. This ensures that only authorized users can scan a domain.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Is my website data kept private?</h3>
              <p className="text-muted-foreground">
                Yes, all scan data is encrypted and only accessible to you. We do not store or share your website's source code or vulnerabilities with third parties.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Can I scan any type of website?</h3>
              <p className="text-muted-foreground">
                Our scanner works best with JavaScript and TypeScript web applications, including React, Vue, Angular, and Node.js backends. It can detect vulnerabilities in any publicly accessible website.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">How accurate are the AI fix suggestions?</h3>
              <p className="text-muted-foreground">
                Our AI-powered fix suggestions are highly accurate and tailored to your specific vulnerabilities. However, we recommend reviewing them before implementation to ensure they fit your application's architecture.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Will the scan affect my website's performance?</h3>
              <p className="text-muted-foreground">
                No, our scanning process is designed to be non-intrusive and won't impact your website's performance or availability. We use techniques that minimize server load.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">How long does a scan take?</h3>
              <p className="text-muted-foreground">
                Most scans complete within 5-10 minutes, depending on the size and complexity of your website. You'll receive real-time progress updates during the scan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/10">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Ready to Secure Your Web Application?
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Start scanning your website for vulnerabilities today and protect your users' data.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={user ? "/scan/new" : "/auth/signup"}>
                <Button size="lg" className="text-white">
                  Get Started Now
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
