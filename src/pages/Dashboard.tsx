import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  LayoutDashboard, 
  Package, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  ShoppingCart,
  AlertCircle,
  Send,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Order {
  id: string;
  link: string;
  quantity: number;
  amount: number;
  status: string;
  created_at: string;
  services: {
    name: string;
  } | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
}

interface Service {
  id: string;
  name: string;
  price_per_1000: number;
  min_quantity: number;
  max_quantity: number;
  category_id: string | null;
  service_categories: {
    name: string;
  } | null;
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [popularServices, setPopularServices] = useState<Service[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    processing: 0,
  });
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, link, quantity, amount, status, created_at, services(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (ordersData) {
        setOrders(ordersData);
        
        // Calculate stats
        const allOrders = await supabase
          .from('orders')
          .select('status')
          .eq('user_id', user.id);
        
        if (allOrders.data) {
          setStats({
            total: allOrders.data.length,
            completed: allOrders.data.filter(o => o.status === 'completed').length,
            pending: allOrders.data.filter(o => o.status === 'pending').length,
            processing: allOrders.data.filter(o => o.status === 'processing').length,
          });
        }
      }

      // Fetch active announcement
      const { data: announcementData } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setAnnouncement(announcementData);

      // Fetch popular services (first 6 active services)
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name, price_per_1000, min_quantity, max_quantity, category_id, service_categories(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(6);

      if (servicesData) {
        setPopularServices(servicesData);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleQuickOrder = (serviceId: string) => {
    navigate(`/order?service=${serviceId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">
              Welcome back, <span className="gradient-text">{profile?.full_name || 'User'}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your orders today.
            </p>
          </div>
          <Button asChild className="bg-gradient-to-r from-primary to-secondary">
            <Link to="/order">
              <ShoppingCart className="mr-2 h-4 w-4" />
              New Order
            </Link>
          </Button>
        </div>

        {/* Telegram Channel Banner */}
        <div className="glass-card p-4 border-l-4 border-secondary animate-slide-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-secondary flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Join our Telegram Channel</h3>
                <p className="text-sm text-muted-foreground">Stay updated with latest offers and announcements!</p>
              </div>
            </div>
            <a 
              href="https://t.me/EngageXsmm" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Join Now
            </a>
          </div>
        </div>

        {/* Announcement Banner */}
        {announcement && (
          <div className="glass-card p-4 border-l-4 border-primary animate-slide-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">{announcement.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Available Balance"
            value={`₹${Number(profile?.balance || 0).toFixed(2)}`}
            icon={TrendingUp}
            variant="primary"
          />
          <StatCard
            title="Total Orders"
            value={stats.total}
            icon={Package}
            variant="default"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="In Progress"
            value={stats.pending + stats.processing}
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Quick Order Services */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-display font-semibold">Quick Order</h2>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/services" className="gap-1">
                  View All Services
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Select a service to place an order quickly
            </p>
          </div>
          
          <div className="p-6">
            {popularServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No services available yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularServices.map((service) => (
                  <div 
                    key={service.id}
                    className="group p-4 rounded-xl border border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-all duration-200 cursor-pointer"
                    onClick={() => handleQuickOrder(service.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {service.service_categories?.name || 'General'}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        ₹{Number(service.price_per_1000).toFixed(2)}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Min: {service.min_quantity.toLocaleString()}</span>
                      <span>Max: {service.max_quantity.toLocaleString()}</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Order Now
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Recent Orders</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/orders">View All</Link>
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Service</th>
                  <th>Link</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">Loading...</div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        No orders yet. 
                        <Link to="/order" className="text-primary ml-1 hover:underline">
                          Place your first order
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="animate-fade-in">
                      <td className="font-mono text-sm">{order.id.slice(0, 8)}</td>
                      <td>{order.services?.name || 'N/A'}</td>
                      <td className="max-w-[200px] truncate">{order.link}</td>
                      <td>{order.quantity.toLocaleString()}</td>
                      <td className="font-semibold">₹{Number(order.amount).toFixed(2)}</td>
                      <td>
                        <StatusBadge status={order.status as any} />
                      </td>
                      <td className="text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
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
