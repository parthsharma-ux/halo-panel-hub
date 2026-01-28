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
import { Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: string;
  link: string;
  quantity: number;
  amount: number;
  status: string;
  start_count: number | null;
  remains: number | null;
  created_at: string;
  user_id: string;
  user_email?: string;
  service_name?: string;
}

export default function AdminOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, services(name)')
      .order('created_at', { ascending: false });

    if (ordersData) {
      const userIds = [...new Set(ordersData.map(o => o.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);
      
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p.email]) || []);
      
      setOrders(ordersData.map(order => ({
        ...order,
        user_email: profileMap.get(order.user_id) || 'N/A',
        service_name: order.services?.name || 'N/A',
      })));
    }
    setLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: 'pending' | 'processing' | 'completed' | 'partial' | 'cancelled') => {
    setUpdating(orderId);
    
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
      toast({
        title: 'Status Updated',
        description: `Order status changed to ${newStatus}.`,
      });
    }
    setUpdating(null);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !search || 
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.link.toLowerCase().includes(search.toLowerCase()) ||
      order.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Orders Management</h1>
          <p className="text-muted-foreground mt-1">View and manage all orders.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-card">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Service</th>
                  <th>Link</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono text-xs">{order.id.slice(0, 8)}</td>
                      <td className="text-sm">{order.user_email}</td>
                      <td className="text-sm max-w-[100px] truncate">{order.service_name}</td>
                      <td className="max-w-[150px] truncate text-sm">
                        <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {order.link}
                        </a>
                      </td>
                      <td>{order.quantity.toLocaleString()}</td>
                      <td className="font-semibold">₹{Number(order.amount).toFixed(2)}</td>
                      <td><StatusBadge status={order.status as any} /></td>
                      <td className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.created_at), 'MMM d, HH:mm')}
                      </td>
                      <td>
                        <Select
                          value={order.status}
                          onValueChange={(value: 'pending' | 'processing' | 'completed' | 'partial' | 'cancelled') => updateStatus(order.id, value)}
                          disabled={updating === order.id}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
