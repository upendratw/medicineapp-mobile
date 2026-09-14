export type IntakeHistoryItem = Readonly<{
  id: string;
  medicationId: string;
  medicationName: string | null;
  outcome: 'taken' | 'skipped';
  statusText: string;
  eventTime: string;
  recordedAt: string | null;
  scheduledTime: string | null;
}>;

export type IntakeHistoryPage = Readonly<{
  items: readonly IntakeHistoryItem[];
  limit: number;
  offset: number;
}>;
