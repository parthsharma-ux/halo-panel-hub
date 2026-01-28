import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Ban, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  balance: number;
  is_banned: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAdjust, setBalanceAdjust] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setUsers(data);
    setLoading(false);
  };

  const toggleBan = async (user: User) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !user.is_banned })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, is_banned: !u.is_banned } : u
      ));
      toast({
        title: user.is_banned ? 'User Unbanned' : 'User Banned',
        description: `${user.email} has been ${user.is_banned ? 'unbanned' : 'banned'}.`,
      });
    }
  };

  const adjustBalance = async () => {
    if (!selectedUser || !balanceAdjust) return;
    
    setProcessing(true);
    const adjustment = Number(balanceAdjust);
    const newBalance = Number(selectedUser.balance) + adjustment;

    if (newBalance < 0) {
      toast({
        title: 'Error',
        description: 'Balance cannot be negative.',
        variant: 'destructive',
      });
      setProcessing(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', selectedUser.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, balance: newBalance } : u
      ));
      toast({
        title: 'Balance Updated',
        description: `${adjustment >= 0 ? 'Added' : 'Deducted'} ₹${Math.abs(adjustment)} ${adjustment >= 0 ? 'to' : 'from'} ${selectedUser.email}`,
      });
      setSelectedUser(null);
      setBalanceAdjust('');
    }
    setProcessing(false);
  };

  const filteredUsers = users.filter((user) =>
    !search || 
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage users and their balances.</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        {/* Users Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          {user.full_name && (
                            <p className="text-sm text-muted-foreground">{user.full_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="font-semibold text-primary">
                        ₹{Number(user.balance).toFixed(2)}
                      </td>
                      <td>
                        {user.is_banned ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-destructive/20 text-destructive">
                            Banned
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-success/20 text-success">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setBalanceAdjust('');
                            }}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={user.is_banned ? 'text-success' : 'text-destructive'}
                            onClick={() => toggleBan(user)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Balance Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Balance</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="glass-card p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <p className="text-2xl font-bold">
                    Current: <span className="text-primary">₹{Number(selectedUser.balance).toFixed(2)}</span>
                  </p>
                </div>
                
                <div>
                  <Label>Adjustment Amount</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Use positive to add, negative to deduct
                  </p>
                  <Input
                    type="number"
                    value={balanceAdjust}
                    onChange={(e) => setBalanceAdjust(e.target.value)}
                    placeholder="e.g. 100 or -50"
                  />
                </div>

                {balanceAdjust && (
                  <p className="text-sm">
                    New balance: <span className="font-bold text-primary">
                      ₹{(Number(selectedUser.balance) + Number(balanceAdjust)).toFixed(2)}
                    </span>
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={adjustBalance}
                  disabled={processing || !balanceAdjust}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Update Balance
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
