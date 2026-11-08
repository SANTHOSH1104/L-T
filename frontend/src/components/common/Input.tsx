import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  autoTrim?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  autoTrim = true,
  className = '',
  onBlur,
  onChange,
  ...props
}) => {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (autoTrim && typeof e.target.value === 'string') {
      const trimmed = e.target.value.trim();
      if (trimmed !== e.target.value && onChange) {
        // Trigger synthetic change if trimmed
        const event = Object.create(e, {
          target: { value: { ...e.target, value: trimmed } },
        });
        onChange(event);
      }
    }
    if (onBlur) onBlur(e);
  };

  return (
    <div className="w-full space-y-1">
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative rounded-xl">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full text-xs rounded-xl border bg-white text-slate-900 transition-all outline-hidden font-medium ${
            icon ? 'pl-9 pr-3 py-2' : 'px-3 py-2'
          } ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10'
          } ${className}`}
          onBlur={handleBlur}
          onChange={onChange}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};

