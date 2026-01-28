import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container py-6 flex items-center justify-between border-b">
        <Link to="/" className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          <span className="font-display font-bold text-2xl gradient-text">EngageXsmm</span>
        </Link>
        <Button variant="ghost" asChild>
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
        </Button>
      </header>

      <main className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Account information (email, name)</li>
              <li>Payment information (processed securely through our payment providers)</li>
              <li>Order details and social media links</li>
              <li>Communication records with our support team</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about your account and orders</li>
              <li>Provide customer support</li>
              <li>Improve our services</li>
              <li>Send promotional communications (with your consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell, trade, or rent your personal information to third parties. We may share information with service providers who assist in our operations, subject to confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookies</h2>
            <p className="text-muted-foreground">
              We use cookies and similar technologies to enhance your experience on our platform. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, correct, or delete your personal information. Contact our support team to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please contact us through our <Link to="/contact" className="text-primary hover:underline">Contact page</Link> or via Telegram at <a href="https://t.me/EngageXsmm" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">@EngageXsmm</a>.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Last updated: January 2025
          </p>
        </div>
      </main>
    </div>
  );
}
