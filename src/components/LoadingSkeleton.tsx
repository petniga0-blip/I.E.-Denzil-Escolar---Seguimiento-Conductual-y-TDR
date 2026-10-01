import React from 'react';
import { UserPlus, Users } from 'lucide-react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full bg-white dark:bg-[#131f42] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden animate-pulse">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-40" />
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-24" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-64" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ReportSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="bg-white dark:bg-[#131f42] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="space-y-2">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-48" />
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-80" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-96" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-28" />
        </div>
      </div>

      {/* Document Sheet Skeleton */}
      <div className="flex justify-center w-full">
        <div className="bg-white text-black w-full max-w-[800px] min-h-[600px] p-8 border border-slate-300 rounded-lg space-y-6">
          <div className="flex items-center gap-4 border-b pb-4">
            <div className="w-16 h-16 bg-slate-200 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-slate-200 rounded w-3/4 mx-auto" />
              <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-5/6" />
            <div className="h-4 bg-slate-100 rounded w-4/6" />
          </div>
          <div className="h-40 bg-slate-50 border border-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
};

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDataYacita?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionDataYacita,
}) => {
  return (
    <div className="text-center py-12 px-4 max-w-md mx-auto space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-xs">
        {icon || <Users className="w-8 h-8" />}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            data-yacita={actionDataYacita || 'students_btn_add'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
          >
            <UserPlus className="w-4 h-4" />
            <span>{actionLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TableSkeleton;
