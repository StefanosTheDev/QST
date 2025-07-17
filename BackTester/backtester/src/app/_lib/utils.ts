import { FormProp } from '../types/types';

export function calculateAlgoConfig(formData: FormProp) {
  // 1) Destructure the four date/time fields, rest is everything else
  const { startDate, startTime, endDate, endTime, ...rest } = formData;

  // 2) Build your ISO-ish strings (with your -04:00 offset)
  const start = `${startDate}T${startTime}:00-04:00`;
  const end = `${endDate}T${endTime}:00-04:00`;

  // 3) Merge them into one plain object
  const merged = { start, end, ...rest };

  // 4) Reduce to drop any null/undefined values
  const cfg = Object.entries(merged).reduce<Record<string, any>>(
    (acc, [key, val]) => {
      if (val != null) {
        acc[key] = val;
      }
      return acc;
    },
    {}
  );

  return cfg;
}
