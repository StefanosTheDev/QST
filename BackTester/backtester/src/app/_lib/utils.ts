import { FormProp } from '../types/types';
import { ApiParams } from './algo/src/types';

/**
 * Extended form parameters including ISO start/end strings.
 */
export interface FormParams extends FormProp {
  start: string;
  end: string;
}

/**
 * Build form parameters by adding ISO date-time strings 'start' and 'end'.
 * Returns the original form values plus `start`/`end` for backtesting.
 */
export function buildParams(input: FormProp): FormParams {
  const { startDate, startTime, endDate, endTime, ...rest } = input;
  const start = `${startDate}T${startTime}:00-04:00`;
  const end = `${endDate}T${endTime}:00-04:00`;

  // Filter out any numeric fields with zero value, keep all others
  const filtered = Object.fromEntries(
    Object.entries(rest).filter(([_, v]) => v !== 0)
  ) as Omit<FormProp, 'startDate' | 'startTime' | 'endDate' | 'endTime'>;

  // Return all remaining form fields plus the ISO strings
  return {
    ...filtered,
    start,
    end,
  } as FormParams;
}
