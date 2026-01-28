import { cn } from '@/lib/utils';

type Status = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'partial' 
  | 'cancelled' 
  | 'approved' 
  | 'rejected'
  | 'open'
  | 'closed';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('status-badge', `status-${status}`, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
