import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { Wallet, Loader2, QrCode, Copy, CheckCircle, Clock } from 'lucide-react';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { z } from 'zod';

interface Payment {
  id: string;
  amount: number;
  utr: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const paymentSchema = z.object({
  amount: z.number().min(100, 'Minimum amount is ₹100'),
  utr: z.string().min(10, 'Please enter a valid UTR/Transaction ID'),
});

export default function AddFunds() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [upiId, setUpiId] = useState('example@upi');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch UPI ID
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'upi_id')
        .maybeSingle();
      
      if (settingsData?.value) setUpiId(settingsData.value);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentsData) setPayments(paymentsData);
    };

    fetchData();
  }, [user]);

  const copyUpiId = async () => {
    await navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'UPI ID copied to clipboard.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const amountNum = Number(amount);

    const result = paymentSchema.safeParse({ amount: amountNum, utr });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.from('payments').insert({
        user_id: user!.id,
        amount: amountNum,
        utr,
        status: 'pending',
      }).select().single();

      if (error) throw error;

      setPayments([data, ...payments]);
      setAmount('');
      setUtr('');

      toast({
        title: 'Payment Submitted!',
        description: 'Your payment is pending approval. Balance will be updated once verified.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Add Funds</h1>
          <p className="text-muted-foreground mt-1">
            Add balance to your account using UPI payment.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="space-y-6">
            {/* Current Balance */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-3xl font-display font-bold gradient-text">
                    ₹{Number(profile?.balance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-primary/10">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>

            {/* UPI Details */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Pay via UPI</h3>
              
              <div className="flex items-center justify-center p-6 bg-white rounded-xl mb-4">
                <div className="text-center">
                  <QrCode className="h-32 w-32 mx-auto text-gray-800" />
                  <p className="text-xs text-gray-500 mt-2">Scan QR to pay</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="flex-1 font-mono text-sm">{upiId}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyUpiId}
                  className="text-primary"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Payment Form */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Submit Payment Details</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-background/50"
                  />
                  {errors.amount && (
                    <p className="text-xs text-destructive">{errors.amount}</p>
                  )}
                  
                  {/* Quick amounts */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {quickAmounts.map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(amt.toString())}
                        className={amount === amt.toString() ? 'border-primary text-primary' : ''}
                      >
                        ₹{amt}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>UTR / Transaction ID</Label>
                  <Input
                    type="text"
                    placeholder="Enter 12-digit UTR number"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    className="bg-background/50"
                  />
                  {errors.utr && (
                    <p className="text-xs text-destructive">{errors.utr}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    You can find UTR in your payment app's transaction history
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  disabled={submitting || !amount || !utr}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Payment'
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Payment History */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-display font-semibold">Recent Payments</h2>
            </div>
            
            <div className="divide-y divide-border">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment history yet</p>
                </div>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">₹{Number(payment.amount).toFixed(2)}</span>
                      <StatusBadge status={payment.status as any} />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="font-mono">{payment.utr}</span>
                      <span>{format(new Date(payment.created_at), 'MMM d, HH:mm')}</span>
                    </div>
                    {payment.admin_note && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Note: {payment.admin_note}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
