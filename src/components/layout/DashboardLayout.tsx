import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './Sidebar';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardLayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function DashboardLayout({ children, requireAdmin = false }: DashboardLayoutProps) {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  useEffect(() => {
    const checkMaintenance = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['maintenance_mode', 'maintenance_message']);
      
      if (data) {
        const mode = data.find(s => s.key === 'maintenance_mode');
        const message = data.find(s => s.key === 'maintenance_message');
        
        if (mode?.value === 'true' && !isAdmin) {
          setMaintenanceMode(true);
          setMaintenanceMessage(message?.value || 'We are currently under maintenance.');
        }
      }
    };
    
    if (!loading && user) {
      checkMaintenance();
    }
  }, [loading, user, isAdmin]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (requireAdmin && !isAdmin) {
        navigate('/dashboard');
      }
    }
  }, [user, loading, isAdmin, requireAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center animated-bg">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (maintenanceMode) {
    return (
      <div className="flex min-h-screen items-center justify-center animated-bg">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="glass-card p-8">
            <h1 className="text-2xl font-display font-bold mb-4 gradient-text">
              Under Maintenance
            </h1>
            <p className="text-muted-foreground">{maintenanceMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="container py-8 px-4 lg:px-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
