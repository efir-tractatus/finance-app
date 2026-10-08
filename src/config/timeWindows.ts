import type { TimeWindow } from '../domain/types';

export interface TimeWindowConfig {
  id: TimeWindow;
  label: string;
  /** Number of calendar days the view covers */
  days: number;
  /** Bar interval, in minutes (used by the mock provider) */
  intervalMinutes: number;
  /** Yahoo Finance chart interval */
  yahooInterval: '15m' | '1h' | '1d';
  /**
   * How far back to request from Yahoo. The day view looks back several days so that weekends
   * and holidays still return the most recent trading session.
   */
  lookbackDays: number;
}

export const TIME_WINDOWS: TimeWindowConfig[] = [
  { id: 'day', label: 'Current day', days: 1, intervalMinutes: 15, yahooInterval: '15m', lookbackDays: 5 },
  { id: 'week', label: 'Last 7 days', days: 7, intervalMinutes: 60, yahooInterval: '1h', lookbackDays: 7 },
  { id: 'quarter', label: 'Last quarter', days: 90, intervalMinutes: 24 * 60, yahooInterval: '1d', lookbackDays: 92 },
];

export function getTimeWindow(id: TimeWindow): TimeWindowConfig {
  const config = TIME_WINDOWS.find((w) => w.id === id);
  if (!config) throw new Error(`Unknown time window: ${id}`);
  return config;
}
