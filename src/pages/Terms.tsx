import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';

export default function Terms() {
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
        <h1 className="text-4xl font-display font-bold mb-8">Terms & Conditions</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using EngageXsmm services, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Services Description</h2>
            <p className="text-muted-foreground">
              EngageXsmm provides social media marketing services including but not limited to followers, likes, views, and engagement for various social media platforms. All services are delivered digitally.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You must provide accurate information when placing orders</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You agree not to use our services for any illegal or unauthorized purpose</li>
              <li>You must ensure your social media accounts are set to public when ordering</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Payment Terms</h2>
            <p className="text-muted-foreground">
              All payments are processed securely. Once funds are added to your account, they are non-refundable except as outlined in our Refund Policy. We accept various payment methods as displayed on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Service Delivery</h2>
            <p className="text-muted-foreground">
              We strive to deliver all orders within the estimated timeframe. However, delivery times may vary based on service type and demand. We are not responsible for delays caused by third-party platforms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              EngageXsmm shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.
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
