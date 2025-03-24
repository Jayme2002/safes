export default function TermsPage() {
  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p>Last updated: March 23, 2025</p>

          <h2>1. Introduction</h2>
          <p>
            Welcome to SafeStartup.dev. These Terms of Service govern your use of our website and services. By using SafeStartup.dev, you agree to these terms. Please read them carefully.
          </p>

          <h2>2. Definitions</h2>
          <p>
            <strong>"Service"</strong> refers to the SafeStartup.dev website and the security scanning services we provide.
            <br />
            <strong>"User"</strong> refers to individuals who use our Service.
            <br />
            <strong>"Scan"</strong> refers to the security vulnerability scanning process performed on a website.
          </p>

          <h2>3. Account Registration</h2>
          <p>
            To use our Service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>

          <h2>4. Domain Verification</h2>
          <p>
            Before scanning a website, you must verify that you own or have permission to scan the domain. We provide two verification methods: DNS TXT record verification and file upload verification. You must not attempt to scan domains that you do not own or have permission to scan.
          </p>

          <h2>5. Payment Terms</h2>
          <p>
            Our Service charges a fee of $10 per scan. Payment is processed through Stripe. By making a payment, you agree to Stripe's terms of service. All payments are non-refundable unless otherwise required by law.
          </p>

          <h2>6. Service Usage</h2>
          <p>
            You agree to use our Service only for lawful purposes and in accordance with these Terms. You agree not to:
          </p>
          <ul>
            <li>Use the Service to scan websites you do not own or have permission to scan</li>
            <li>Attempt to bypass the domain verification process</li>
            <li>Use the Service to harm, threaten, or harass others</li>
            <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>

          <h2>7. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are owned by SafeStartup.dev and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            In no event shall SafeStartup.dev, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
          </p>
          <ul>
            <li>Your use of or inability to use the Service</li>
            <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
            <li>Any interruption or cessation of transmission to or from the Service</li>
            <li>Any bugs, viruses, trojan horses, or the like, which may be transmitted to or through the Service by any third party</li>
          </ul>

          <h2>9. Disclaimer</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We do not guarantee that the Service will identify all security vulnerabilities in your website. The use of the Service is at your own risk.
          </p>

          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at support@safestartup.dev.
          </p>
        </div>
      </div>
    </div>
  );
}
