import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all select-none cursor-pointer focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-4 py-2 gap-2 sm:text-sm',
    lg: 'text-sm px-5 py-2.5 gap-2.5 font-bold',
  };

  const variantClasses = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/30 active:scale-98',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 active:scale-98',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-600/30 active:scale-98',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/30 active:scale-98',
    outline:
      'border border-slate-300 hover:bg-slate-50 text-slate-700 bg-white active:scale-98',
    ghost:
      'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

