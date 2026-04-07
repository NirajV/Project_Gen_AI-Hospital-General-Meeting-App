import React from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Circle,
  PlayCircle,
  CheckCircle2,
  Ban,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

// Status Badge with icons
export function StatusBadge({ status, className, showIcon = true }) {
  const statusConfig = {
    scheduled: {
      label: 'Scheduled',
      icon: Clock,
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    'in_progress': {
      label: 'In Progress',
      icon: PlayCircle,
      className: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle,
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    cancelled: {
      label: 'Cancelled',
      icon: Ban,
      className: 'bg-red-50 text-red-700 border-red-200',
    },
    pending: {
      label: 'Pending',
      icon: Circle,
      className: 'bg-gray-50 text-gray-700 border-gray-200',
    },
    accepted: {
      label: 'Accepted',
      icon: CheckCircle2,
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    maybe: {
      label: 'Maybe',
      icon: AlertCircle,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    declined: {
      label: 'Declined',
      icon: XCircle,
      className: 'bg-red-50 text-red-700 border-red-200',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-sm',
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <span>{config.label}</span>
    </span>
  );
}

// Priority Badge
export function PriorityBadge({ priority, className, showIcon = true }) {
  const priorityConfig = {
    high: {
      label: 'High',
      icon: AlertTriangle,
      className: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-500',
    },
    medium: {
      label: 'Medium',
      icon: AlertCircle,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    low: {
      label: 'Low',
      icon: Circle,
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
    },
  };

  const config = priorityConfig[priority?.toLowerCase()] || priorityConfig.low;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-sm',
        config.className,
        className
      )}
    >
      {showIcon ? (
        <Icon className="h-3.5 w-3.5" />
      ) : (
        <span className={cn('h-2 w-2 rounded-full animate-pulse', config.dot)} />
      )}
      <span>{config.label}</span>
    </span>
  );
}

// Role Badge
export function RoleBadge({ role, className }) {
  const roleConfig = {
    organizer: {
      label: 'Organizer',
      className: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    doctor: {
      label: 'Doctor',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    nurse: {
      label: 'Nurse',
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    admin: {
      label: 'Admin',
      className: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  };

  const config = roleConfig[role?.toLowerCase()] || roleConfig.doctor;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// Count Badge (for notifications, etc.)
export function CountBadge({ count, className, variant = 'default' }) {
  if (!count || count === 0) return null;

  const variantStyles = {
    default: 'bg-blue-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-500 text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold',
        variantStyles[variant],
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

// Meeting Type Badge
export function MeetingTypeBadge({ type, className }) {
  const typeConfig = {
    video: {
      label: 'Video',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    'in-person': {
      label: 'In Person',
      className: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    hybrid: {
      label: 'Hybrid',
      className: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  };

  const config = typeConfig[type?.toLowerCase()] || typeConfig.video;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </span>
  );
}
