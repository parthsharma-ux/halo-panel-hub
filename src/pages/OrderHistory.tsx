import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
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
  services: {
    name: string;
  } | null;
}

export default function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('orders')
        .select('*, services(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setOrders(data);
      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !search || 
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.link.toLowerCase().includes(search.toLowerCase()) ||
      order.services?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Order History</h1>
          <p className="text-muted-foreground mt-1">
            View and track all your orders.
          </p>
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
                  <th>Order ID</th>
                  <th>Service</th>
                  <th>Link</th>
                  <th>Quantity</th>
                  <th>Start</th>
                  <th>Remains</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div className="text-muted-foreground">Loading orders...</div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div className="text-muted-foreground">No orders found.</div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="animate-fade-in">
                      <td className="font-mono text-sm">{order.id.slice(0, 8)}</td>
                      <td className="max-w-[150px] truncate">
                        {order.services?.name || 'N/A'}
                      </td>
                      <td className="max-w-[200px] truncate">
                        <a 
                          href={order.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {order.link}
                        </a>
                      </td>
                      <td>{order.quantity.toLocaleString()}</td>
                      <td>{order.start_count ?? '-'}</td>
                      <td>{order.remains ?? '-'}</td>
                      <td className="font-semibold">₹{Number(order.amount).toFixed(2)}</td>
                      <td>
                        <StatusBadge status={order.status as any} />
                      </td>
                      <td className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-display font-bold">{orders.length}</p>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-display font-bold text-success">
              {orders.filter(o => o.status === 'completed').length}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-display font-bold text-warning">
              {orders.filter(o => o.status === 'processing').length}
            </p>
            <p className="text-sm text-muted-foreground">Processing</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-display font-bold text-primary">
              {orders.filter(o => o.status === 'pending').length}
            </p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
