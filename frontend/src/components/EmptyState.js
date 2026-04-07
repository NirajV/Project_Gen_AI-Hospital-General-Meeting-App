import React from 'react';
import { 
  Calendar, 
  Users, 
  UserPlus, 
  ClipboardList, 
  FolderOpen,
  Inbox,
  Search,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const iconMap = {
  meeting: Calendar,
  meetings: Calendar,
  patient: Users,
  patients: Users,
  participant: UserPlus,
  participants: UserPlus,
  agenda: ClipboardList,
  file: FolderOpen,
  files: FolderOpen,
  decision: ClipboardList,
  decisions: ClipboardList,
  inbox: Inbox,
  search: Search,
  default: AlertCircle,
};

export function EmptyState({
  type = 'default',
  title,
  description,
  action,
  className,
  icon: CustomIcon,
}) {
  const Icon = CustomIcon || iconMap[type.toLowerCase()] || iconMap.default;

  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="relative mb-6">
        {/* Background circle */}
        <div className="absolute inset-0 bg-slate-100 rounded-full blur-2xl opacity-50"></div>
        
        {/* Icon container with gradient */}
        <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-full p-8 shadow-sm">
          <Icon className="h-16 w-16 text-slate-400" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {title || 'No items found'}
      </h3>
      
      <p className="text-slate-600 max-w-sm mb-6 leading-relaxed">
        {description || 'Get started by creating your first item'}
      </p>

      {action && (
        <div className="flex gap-3">
          {action.primary && (
            <Button
              onClick={action.primary.onClick}
              className="shadow-sm"
            >
              {action.primary.icon && (
                <action.primary.icon className="mr-2 h-4 w-4" />
              )}
              {action.primary.label}
            </Button>
          )}
          
          {action.secondary && (
            <Button
              variant="outline"
              onClick={action.secondary.onClick}
            >
              {action.secondary.icon && (
                <action.secondary.icon className="mr-2 h-4 w-4" />
              )}
              {action.secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Specialized Empty States
export function EmptyMeetings({ onCreateMeeting }) {
  return (
    <EmptyState
      type="meetings"
      title="No meetings scheduled"
      description="Start by creating your first case meeting to collaborate with your medical team"
      action={{
        primary: {
          label: 'Schedule Meeting',
          onClick: onCreateMeeting,
          icon: Calendar,
        },
      }}
    />
  );
}

export function EmptyPatients({ onAddPatient }) {
  return (
    <EmptyState
      type="patients"
      title="No patients found"
      description="Add patient records to start managing cases and tracking treatment plans"
      action={{
        primary: {
          label: 'Add Patient',
          onClick: onAddPatient,
          icon: Users,
        },
      }}
    />
  );
}

export function EmptyParticipants({ onAddParticipant }) {
  return (
    <EmptyState
      type="participants"
      title="No participants yet"
      description="Invite team members to collaborate on patient cases and meetings"
      action={{
        primary: {
          label: 'Add Participant',
          onClick: onAddParticipant,
          icon: UserPlus,
        },
      }}
    />
  );
}

export function EmptySearch({ query, onClear }) {
  return (
    <EmptyState
      type="search"
      title="No results found"
      description={`We couldn't find any results for "${query}". Try adjusting your search.`}
      action={{
        secondary: {
          label: 'Clear Search',
          onClick: onClear,
        },
      }}
    />
  );
}

export function EmptyFiles() {
  return (
    <EmptyState
      type="files"
      title="No files attached"
      description="Upload medical records, images, or documents to share with the team"
    />
  );
}

export function EmptyDecisions() {
  return (
    <EmptyState
      type="decisions"
      title="No decisions logged"
      description="Record treatment decisions and action items during the meeting"
    />
  );
}

export function EmptyAgenda() {
  return (
    <EmptyState
      type="agenda"
      title="No agenda items"
      description="Add agenda items to organize the meeting discussion"
    />
  );
}
