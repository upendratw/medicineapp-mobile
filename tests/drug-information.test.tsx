import { render } from '@testing-library/react-native';
import { DrugInformationView } from '@/components';
import type { DrugInformationResult } from '@/types/drugInformation';

const available: DrugInformationResult = {
  medication: { id: 'med-id', displayName: 'Synthetic Medicine' },
  answerAvailable: true,
  status: 'evidence_available',
  statusText: 'Evidence available',
  answer: 'Approved-source label information: synthetic adverse reaction text.',
  section: 'side_effects',
  freshness: 'current',
  citations: [
    {
      evidenceId: 'evidence-id',
      source: 'dailymed',
      sourceAuthority: 'Approved authority',
      sourceRecordId: 'record-id',
      sourceVersion: 'v1',
      section: 'adverse_reactions',
      sourceReference: 'reference-id',
      retrievedAt: '2026-09-14T00:00:00Z',
      sourceUpdatedAt: null,
    },
  ],
  safety: { evidenceBound: true, personalizedAdvice: false },
};

test('renders E22 evidence, freshness, safety, and citation provenance', async () => {
  const screen = await render(
    <DrugInformationView result={available} loading={false} error={false} />,
  );
  expect(screen.getByText(/synthetic adverse reaction text/)).toBeTruthy();
  expect(screen.getByText('Approved authority')).toBeTruthy();
  expect(screen.getByText('Freshness: current')).toBeTruthy();
  expect(screen.getByText(/not a diagnosis/)).toBeTruthy();
  expect(JSON.stringify(screen.toJSON())).not.toMatch(
    /stop taking|start taking|personalized recommendation/i,
  );
});

test('translation-required state never leaks English citations', async () => {
  const translated = {
    ...available,
    answerAvailable: false,
    status: 'human_translation_required' as const,
    answer: null,
    citations: [],
  };
  const screen = await render(
    <DrugInformationView result={translated} loading={false} error={false} />,
  );
  expect(screen.getByText(/human translation is required/i)).toBeTruthy();
  expect(screen.queryByText('Approved authority')).toBeNull();
});

test('handles unavailable evidence and backend failure safely', async () => {
  const unavailable = {
    ...available,
    answerAvailable: false,
    status: 'insufficient_evidence' as const,
    answer: null,
    citations: [],
  };
  const none = await render(
    <DrugInformationView result={unavailable} loading={false} error={false} />,
  );
  expect(none.getByText('No approved evidence available')).toBeTruthy();
  await none.unmount();
  const failed = await render(
    <DrugInformationView result={null} loading={false} error />,
  );
  expect(failed.getByText(/temporarily unavailable/)).toBeTruthy();
});
