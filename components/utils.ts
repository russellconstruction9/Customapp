export const toDate = (d: Date | string): Date => {
    // Correctly handles "YYYY-MM-DD" by replacing hyphens with slashes for the parser
    if (typeof d === 'string') {
        return new Date(d.replace(/-/g, '/'));
    }
    return d instanceof Date ? d : new Date(d);
};

export const startOfDay = (d: Date | string): Date => {
  const date = toDate(d);
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const addDays = (d: Date | string, days: number): Date => {
  const date = toDate(d);
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

export const diffInDays = (d1: Date | string, d2: Date | string): number => {
  const date1 = startOfDay(d1);
  const date2 = startOfDay(d2);
  return Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
};

export const minDate = (d1: Date, d2: Date): Date => (d1 < d2 ? d1 : d2);
export const maxDate = (d1: Date, d2: Date): Date => (d1 > d2 ? d1 : d2);

export const getMidpointDate = (d1: Date, d2: Date): Date => {
    const t1 = d1.getTime();
    const t2 = d2.getTime();
    const midpointTime = t1 + (t2 - t1) / 2;
    return new Date(midpointTime);
};

export const fmtInput = (d: Date): string => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dateLabel = (d: Date): string => {
  const month = (d.getMonth() + 1).toString();
  const day = d.getDate().toString();
  return `${month}/${day}`;
};

export const darkenColor = (hex: string, percent: number): string => {
  try {
    let cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return hex;

    const num = parseInt(cleanHex, 16);
    let r = (num >> 16) & 0xFF;
    let g = (num >> 8) & 0xFF;
    let b = num & 0xFF;

    const amount = 1 - (percent / 100);
    r = Math.floor(r * amount);
    g = Math.floor(g * amount);
    b = Math.floor(b * amount);
    
    r = Math.max(0, r);
    g = Math.max(0, g);
    b = Math.max(0, b);
    
    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch (error) {
    return hex; // Return original color if any error occurs
  }
};