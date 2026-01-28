import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Zap, Send, Mail, MessageCircle } from 'lucide-react';

export default function Contact() {
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-muted-foreground">
            We're here to help! Reach out through any of the channels below.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Send className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Telegram</CardTitle>
                  <CardDescription>Fastest response time</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Join our Telegram channel for updates, announcements, and quick support.
              </p>
              <Button asChild className="w-full">
                <a href="https://t.me/EngageXsmm" target="_blank" rel="noopener noreferrer">
                  <Send className="mr-2 h-4 w-4" /> Join @EngageXsmm
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Support Ticket</CardTitle>
                  <CardDescription>For account-specific issues</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Have an issue with your order or account? Open a support ticket for personalized assistance.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/support">
                  <MessageCircle className="mr-2 h-4 w-4" /> Open Support Ticket
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Business Inquiries</CardTitle>
                  <CardDescription>For partnerships and bulk orders</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                For business partnerships, reseller inquiries, or bulk order requests, please reach out via our Telegram channel. We typically respond within 24 hours.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Response Times</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-primary">~5 min</p>
              <p className="text-sm text-muted-foreground">Telegram</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-primary">~2 hrs</p>
              <p className="text-sm text-muted-foreground">Support Tickets</p>
            </div>
            <div className="p-4 rounded-lg bg-muted md:col-span-1 col-span-2">
              <p className="text-2xl font-bold text-primary">24/7</p>
              <p className="text-sm text-muted-foreground">Availability</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
