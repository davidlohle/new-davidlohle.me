export const fmtMonthYear = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();

export const fmtMonthYearLong = (d: Date | null): string =>
  d ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';

export const fmtFullDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const fmtPhotoDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export const postNumber = (i: number): string => `№ ${String(i + 1).padStart(3, '0')}`;
