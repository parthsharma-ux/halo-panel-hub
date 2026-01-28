import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning';
}

const variantStyles = {
  default: 'border-border',
  primary: 'border-primary/30',
  secondary: 'border-secondary/30',
  success: 'border-success/30',
  warning: 'border-warning/30',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className,
  variant = 'default' 
}: StatCardProps) {
  return (
    <div className={cn('stat-card', variantStyles[variant], className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-display font-bold">{value}</p>
          {trend && (
            <p className={cn(
              'text-xs mt-2',
              trend.positive ? 'text-success' : 'text-destructive'
            )}>
              {trend.positive ? '+' : ''}{trend.value}% from last week
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
