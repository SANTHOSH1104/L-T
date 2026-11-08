/**
 * Professional formatting utilities
 */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatHours(hours: number): string {
  if (hours === 0 || isNaN(hours)) return '0.0h';
  return `${hours.toFixed(1)}h`;
}

export function formatDateReadable(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Clean & trim all string properties of an object recursively
 */
export function sanitizeInputs<T extends Record<string, any>>(obj: T): T {
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = value.trim();
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      result[key] = sanitizeInputs(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

