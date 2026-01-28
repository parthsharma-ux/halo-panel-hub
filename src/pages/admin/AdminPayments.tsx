import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Payment {
  id: string;
  amount: number;
  utr: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  user_id: string;
  user_email?: string;
}

export default function AdminPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);
      
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p.email]) || []);
      
      setPayments(data.map(payment => ({
        ...payment,
        user_email: profileMap.get(payment.user_id) || 'N/A',
      })));
    }
    setLoading(false);
  };

  const handleApprove = async (payment: Payment) => {
    setProcessing(payment.id);
    
    try {
      // Update payment status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ 
          status: 'approved',
          admin_note: adminNote || null,
        })
        .eq('id', payment.id);

      if (paymentError) throw paymentError;

      // Get current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', payment.user_id)
        .single();

      // Update user balance
      const newBalance = Number(profile?.balance || 0) + Number(payment.amount);
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('user_id', payment.user_id);

      if (balanceError) throw balanceError;

      setPayments(payments.map(p => 
        p.id === payment.id ? { ...p, status: 'approved', admin_note: adminNote } : p
      ));
      
      toast({
        title: 'Payment Approved',
        description: `₹${payment.amount} added to user balance.`,
      });
      
      setSelectedPayment(null);
      setAdminNote('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (payment: Payment) => {
    setProcessing(payment.id);
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: 'rejected',
          admin_note: adminNote || null,
        })
        .eq('id', payment.id);

      if (error) throw error;

      setPayments(payments.map(p => 
        p.id === payment.id ? { ...p, status: 'rejected', admin_note: adminNote } : p
      ));
      
      toast({ title: 'Payment Rejected' });
      setSelectedPayment(null);
      setAdminNote('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = !search || 
      payment.utr.toLowerCase().includes(search.toLowerCase()) ||
      payment.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Payment Verification</h1>
          <p className="text-muted-foreground mt-1">Verify and approve user payments.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by UTR or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payments Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>UTR</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="text-sm">{payment.user_email}</td>
                      <td className="font-semibold text-lg">₹{Number(payment.amount).toFixed(2)}</td>
                      <td className="font-mono text-sm">{payment.utr}</td>
                      <td><StatusBadge status={payment.status as any} /></td>
                      <td className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(payment.created_at), 'MMM d, HH:mm')}
                      </td>
                      <td>
                        {payment.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success hover:bg-success/10"
                              onClick={() => setSelectedPayment(payment)}
                              disabled={processing === payment.id}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setAdminNote('');
                              }}
                              disabled={processing === payment.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {payment.admin_note && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                            {payment.admin_note}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Dialog */}
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify Payment</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="glass-card p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User</span>
                    <span>{selectedPayment.user_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-lg">₹{Number(selectedPayment.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UTR</span>
                    <span className="font-mono">{selectedPayment.utr}</span>
                  </div>
                </div>
                
                <div>
                  <Label>Admin Note (Optional)</Label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add a note..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => handleApprove(selectedPayment)}
                    disabled={processing === selectedPayment.id}
                  >
                    {processing === selectedPayment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(selectedPayment)}
                    disabled={processing === selectedPayment.id}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
