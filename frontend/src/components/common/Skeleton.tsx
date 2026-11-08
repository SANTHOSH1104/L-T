import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  width,
  height,
}) => {
  const variantStyles = {
    text: 'rounded-sm h-3.5',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      style={style}
      className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 ${variantStyles[variant]} ${className}`}
    />
  );
};

// 1. KPI Metric / Stat Card Skeleton
export const SkeletonStatCard: React.FC = () => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-4" />
        <Skeleton variant="circular" className="w-10 h-10" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="w-20 h-7" />
        <Skeleton className="w-32 h-3.5" />
      </div>
      <Skeleton className="w-full h-1.5 rounded-full" />
    </div>
  );
};

// 2. Tabular Skeleton for Data Tables
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showSearchHeader?: boolean;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 8,
  columns = 8,
  showSearchHeader = true,
}) => {
  return (
    <div className="space-y-4">
      {showSearchHeader && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <Skeleton className="w-full sm:w-64 h-9" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-20 h-9" />
            <Skeleton className="w-24 h-9" />
            <Skeleton className="w-28 h-9" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <Skeleton className="w-36 h-4" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/70">
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="py-3.5 px-4">
                    <Skeleton className={`h-3 ${i === 0 ? 'w-24' : 'w-16'}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: rows }).map((_, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/50">
                  {Array.from({ length: columns }).map((_, cIdx) => (
                    <td key={cIdx} className="py-3.5 px-4">
                      {cIdx === 0 ? (
                        <div className="space-y-1.5">
                          <Skeleton className="w-28 h-3.5" />
                          <Skeleton className="w-16 h-2.5" />
                        </div>
                      ) : cIdx === columns - 1 ? (
                        <Skeleton className="w-12 h-6 rounded-lg ml-auto" />
                      ) : (
                        <Skeleton className={`h-3 ${cIdx % 2 === 0 ? 'w-14' : 'w-10'}`} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 3. Grid of Cards Skeleton (e.g. Overview or Analytics)
export const SkeletonCardGrid: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
};

// 4. Banner Skeleton
export const SkeletonBanner: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
      <Skeleton className="w-40 h-4" />
      <Skeleton className="w-72 h-8" />
      <Skeleton className="w-96 max-w-full h-4" />
    </div>
  );
};

