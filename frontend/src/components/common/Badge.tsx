import React from 'react';
import { AttendanceStatus } from '../../types/attendance';

export interface BadgeProps {
  status?: AttendanceStatus | 'OT' | 'LATE' | 'EARLY' | 'PENALTY' | 'PP' | 'PA' | 'AP' | 'AA' | 'WO' | 'WW' | 'HP' | 'HL';
  label?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, dot = true }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  let defaultText = label || status || '';

  switch (status) {
    case 'PRESENT':
    case 'PP':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
      defaultText = label || (status === 'PP' ? 'PP (Present)' : 'Full Day');
      break;
    case 'HALF_DAY':
    case 'PA':
    case 'AP':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
      dotColor = 'bg-amber-500';
      defaultText = label || (status === 'PA' ? 'PA (Half Day)' : status === 'AP' ? 'AP (Half Day)' : 'Half Day');
      break;
    case 'ABSENT':
    case 'AA':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
      dotColor = 'bg-rose-500';
      defaultText = label || (status === 'AA' ? 'AA (Absent)' : 'Absent');
      break;
    case 'WO':
    case 'WW':
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      dotColor = 'bg-indigo-500';
      defaultText = label || (status === 'WW' ? 'WW' : 'WO');
      break;
    case 'HOLIDAY':
    case 'HL':
      badgeStyle = 'bg-teal-50 text-teal-800 border-teal-200';
      dotColor = 'bg-teal-500';
      defaultText = label || (status === 'HL' ? 'HL (Holiday)' : 'Holiday');
      break;
    case 'HP':
      badgeStyle = 'bg-cyan-50 text-cyan-800 border-cyan-200';
      dotColor = 'bg-cyan-500';
      defaultText = label || 'HP (Holiday Work)';
      break;
    case 'MISSED_PUNCH':
      badgeStyle = 'bg-orange-50 text-orange-700 border-orange-200';
      dotColor = 'bg-orange-500';
      defaultText = label || 'Missed Punch';
      break;
    case 'OT':
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
      dotColor = 'bg-purple-500';
      defaultText = label || 'Overtime';
      break;
    case 'LATE':
      badgeStyle = 'bg-amber-100/70 text-amber-800 border-amber-300';
      dotColor = 'bg-amber-600';
      defaultText = label || 'Late In';
      break;
    case 'PENALTY':
      badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300';
      dotColor = 'bg-rose-600';
      defaultText = label || 'Penalty Cut';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`}></span>}
      <span>{defaultText}</span>
    </span>
  );
};

