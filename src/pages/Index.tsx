import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, Instagram, Send, Youtube, Shield, Clock, DollarSign } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen animated-bg">
      {/* Header */}
      <header className="container py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Zap className="h-8 w-8 text-primary" />
            <div className="absolute inset-0 blur-lg bg-primary/40" />
          </div>
          <span className="font-display font-bold text-2xl gradient-text">SMMPanel</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link to="/auth">Login</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-primary to-secondary">
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
            <Zap className="h-4 w-4" />
            #1 SMM Panel for Social Growth
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold leading-tight">
            Boost Your <span className="gradient-text">Social Media</span> Presence
          </h1>
          <p className="text-xl text-muted-foreground">
            Get real engagement for Instagram, Telegram, YouTube, and more. Fast delivery, affordable prices, 24/7 support.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-secondary">
              <Link to="/auth">
                Start Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/services">View Services</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="container py-12">
        <div className="flex flex-wrap items-center justify-center gap-8">
          {[Instagram, Send, Youtube].map((Icon, i) => (
            <div key={i} className="p-4 rounded-xl bg-card/50 hover:bg-card transition-colors">
              <Icon className="h-10 w-10 text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Clock, title: 'Instant Delivery', desc: 'Orders start within minutes of payment' },
            { icon: DollarSign, title: 'Best Prices', desc: 'Most competitive rates in the market' },
            { icon: Shield, title: '24/7 Support', desc: 'Round-the-clock customer assistance' },
          ].map((feature, i) => (
            <div key={i} className="glass-card p-6 text-center hover-scale">
              <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="container py-8 border-t border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 SMMPanel. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
