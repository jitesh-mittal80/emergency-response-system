import React from 'react';

interface Props {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; class: string }> = {
  AVAILABLE:             { label: 'Available',      class: 'status-available' },
  ASSIGNED:              { label: 'Assigned',       class: 'status-assigned' },
  EN_ROUTE:              { label: 'En Route',       class: 'status-en_route' },
  ON_SCENE:              { label: 'On Scene',       class: 'status-on_scene' },
  OFFLINE:               { label: 'Offline',        class: 'status-offline' },
  PENDING:               { label: 'Pending',        class: 'status-pending' },
  COMPLETED:             { label: 'Completed',      class: 'status-completed' },
  CANCELLED:             { label: 'Cancelled',      class: 'status-cancelled' },
  FAILED:                { label: 'Failed',         class: 'status-failed' },
  WAITING_FOR_AMBULANCE: { label: 'Waiting',        class: 'status-waiting' },
};

export default function StatusBadge({ status, className = '' }: Props) {
  const cfg = statusConfig[status] || { label: status, class: 'status-offline' };
  return (
    <span className={`status-badge ${cfg.class} ${className}`}>
      {cfg.label}
    </span>
  );
}
