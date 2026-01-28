import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Clock,
  TrendingUp,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';

interface Order {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  profiles: { email: string } | null;
  services: { name: string } | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  profiles: { email: string } | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    pendingPayments: 0,
    openTickets: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch stats
      const [usersRes, ordersRes, paymentsRes, ticketsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, amount, status'),
        supabase.from('payments').select('id, status').eq('status', 'pending'),
        supabase.from('tickets').select('id').eq('status', 'open'),
      ]);

      const orders = ordersRes.data || [];
      const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + Number(o.amount), 0);
      const pendingOrders = orders.filter(o => o.status === 'pending').length;

      setStats({
        totalUsers: usersRes.count || 0,
        totalOrders: orders.length,
        totalRevenue,
        pendingOrders,
        pendingPayments: paymentsRes.data?.length || 0,
        openTickets: ticketsRes.data?.length || 0,
      });

      // Fetch recent orders with user emails
      const { data: recentOrdersData } = await supabase
        .from('orders')
        .select('id, amount, status, created_at, user_id, services(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentOrdersData) {
        // Get user emails
        const userIds = [...new Set(recentOrdersData.map(o => o.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p.email]) || []);
        
        setRecentOrders(recentOrdersData.map(order => ({
          ...order,
          profiles: { email: profileMap.get(order.user_id) || 'N/A' },
        })));
      }

      // Fetch recent payments with user emails
      const { data: recentPaymentsData } = await supabase
        .from('payments')
        .select('id, amount, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentPaymentsData) {
        const userIds = [...new Set(recentPaymentsData.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p.email]) || []);
        
        setRecentPayments(recentPaymentsData.map(payment => ({
          ...payment,
          profiles: { email: profileMap.get(payment.user_id) || 'N/A' },
        })));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">
            Admin <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your SMM panel performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={ShoppingCart}
            variant="default"
          />
          <StatCard
            title="Revenue"
            value={`₹${stats.totalRevenue.toFixed(0)}`}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Pending Payments"
            value={stats.pendingPayments}
            icon={CreditCard}
            variant="secondary"
          />
          <StatCard
            title="Open Tickets"
            value={stats.openTickets}
            icon={MessageSquare}
            variant="default"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-display font-semibold">Recent Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Service</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        No orders yet
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="text-sm">{order.profiles?.email || 'N/A'}</td>
                        <td className="text-sm max-w-[100px] truncate">
                          {order.services?.name || 'N/A'}
                        </td>
                        <td className="font-semibold">₹{Number(order.amount).toFixed(2)}</td>
                        <td><StatusBadge status={order.status as any} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-display font-semibold">Recent Payments</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        No payments yet
                      </td>
                    </tr>
                  ) : (
                    recentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="text-sm">{payment.profiles?.email || 'N/A'}</td>
                        <td className="font-semibold">₹{Number(payment.amount).toFixed(2)}</td>
                        <td><StatusBadge status={payment.status as any} /></td>
                        <td className="text-sm text-muted-foreground">
                          {format(new Date(payment.created_at), 'MMM d')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
