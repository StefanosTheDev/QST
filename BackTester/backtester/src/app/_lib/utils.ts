import { FormProp } from '../types/types';

// NEED TO REVIEW. THis is way to complicated.
// 1) Define the one‐liner return type: drop the 4 raw fields, add start/end
type ApiParams = Omit<
  FormProp,
  'startDate' | 'startTime' | 'endDate' | 'endTime'
> & { start: string; end: string };

// 2) Use it and cast at the end
export function buildParams(input: FormProp): ApiParams {
  const { startDate, startTime, endDate, endTime, ...rest } = input;
  const start = `${startDate}T${startTime}:00-04:00`;
  const end = `${endDate}T${endTime}:00-04:00`;

  const cleanParams = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== 0)
  );

  const merged = { start, end, ...cleanParams };
  return merged as ApiParams;
}
