export default function PrivacyPage() {
  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p>Last updated: March 23, 2025</p>

          <h2>1. Introduction</h2>
          <p>
            At SafeStartup.dev, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services.
          </p>

          <h2>2. Information We Collect</h2>
          <p>
            We collect the following types of information:
          </p>
          <ul>
            <li><strong>Personal Information:</strong> Email address, name, and payment information when you create an account or make a purchase.</li>
            <li><strong>Website Data:</strong> When you use our scanning service, we collect information about the website you scan, including URLs, domain names, and security vulnerabilities detected.</li>
            <li><strong>Usage Data:</strong> Information about how you use our website, including IP address, browser type, pages visited, and time spent on the site.</li>
            <li><strong>Cookies and Similar Technologies:</strong> We use cookies to enhance your experience on our website. You can control cookies through your browser settings.</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>
            We use your information for the following purposes:
          </p>
          <ul>
            <li>To provide and maintain our Service</li>
            <li>To process payments and manage your account</li>
            <li>To perform security scans on websites you own or have permission to scan</li>
            <li>To generate reports and provide AI-powered fix suggestions</li>
            <li>To communicate with you about your account or our Service</li>
            <li>To improve our Service and develop new features</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Scan results are retained for 30 days after the scan is completed, after which they are automatically deleted.
          </p>

          <h2>6. Third-Party Services</h2>
          <p>
            We use the following third-party services to operate our Service:
          </p>
          <ul>
            <li><strong>Supabase:</strong> For database and authentication services</li>
            <li><strong>Stripe:</strong> For payment processing</li>
            <li><strong>OpenAI:</strong> For generating AI-powered fix suggestions</li>
          </ul>
          <p>
            These third-party services have their own privacy policies, and we recommend that you review them.
          </p>

          <h2>7. Your Rights</h2>
          <p>
            Depending on your location, you may have the following rights regarding your personal information:
          </p>
          <ul>
            <li>The right to access your personal information</li>
            <li>The right to rectify inaccurate or incomplete information</li>
            <li>The right to erasure (the "right to be forgotten")</li>
            <li>The right to restrict processing</li>
            <li>The right to data portability</li>
            <li>The right to object to processing</li>
            <li>The right to withdraw consent</li>
          </ul>
          <p>
            To exercise these rights, please contact us at privacy@safestartup.dev.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us.
          </p>

          <h2>9. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at privacy@safestartup.dev.
          </p>
        </div>
      </div>
    </div>
  );
}
