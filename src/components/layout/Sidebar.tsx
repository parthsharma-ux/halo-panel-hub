import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  Wallet,
  MessageSquare,
  Settings,
  Users,
  BarChart3,
  CreditCard,
  Megaphone,
  Server,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const userNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Services', href: '/services', icon: Package },
  { name: 'New Order', href: '/order', icon: ShoppingCart },
  { name: 'Order History', href: '/orders', icon: History },
  { name: 'Add Funds', href: '/funds', icon: Wallet },
  { name: 'Support', href: '/support', icon: MessageSquare },
];

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Services', href: '/admin/services', icon: Package },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Tickets', href: '/admin/tickets', icon: MessageSquare },
  { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { name: 'API Providers', href: '/admin/api', icon: Server },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, signOut, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
            <div className="relative">
              <Zap className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 blur-lg bg-primary/30" />
            </div>
            {!collapsed && (
              <span className="font-display font-bold text-xl gradient-text">
                SMMPanel
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'nav-item',
                  isActive(item.href) && 'active'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-sidebar-border space-y-3">
            {/* Balance card */}
            {!isAdmin && profile && !collapsed && (
              <div className="glass-card p-3 mb-3">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-lg font-bold text-primary">
                  ₹{Number(profile.balance).toFixed(2)}
                </p>
              </div>
            )}

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              onClick={toggleTheme}
              className="w-full justify-start gap-3"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              {!collapsed && (theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
            </Button>

            {/* Collapse button (desktop only) */}
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              onClick={() => setCollapsed(!collapsed)}
              className="w-full justify-start gap-3 hidden lg:flex"
            >
              <Menu className="h-5 w-5" />
              {!collapsed && 'Collapse'}
            </Button>

            {/* Sign out */}
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              onClick={signOut}
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && 'Sign Out'}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
