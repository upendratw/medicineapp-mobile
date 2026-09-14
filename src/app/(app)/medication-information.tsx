import { useState } from 'react';
import {
  AppButton,
  AppHeader,
  AppScreen,
  AppTextInput,
  DrugInformationView,
} from '@/components';
import { drugInformationService } from '@/services/registry';
import type {
  DrugInformationResult,
  DrugInformationSection,
} from '@/types/drugInformation';
export default function MedicationInformationScreen() {
  const [query, setQuery] = useState('');
  const [section, setSection] =
    useState<DrugInformationSection>('side_effects');
  const [result, setResult] = useState<DrugInformationResult | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const search = async () => {
    if (query.trim().length < 2 || loading) return;
    setLoading(true);
    setError(false);
    try {
      setResult(await drugInformationService.query(query, section));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <AppScreen>
      <AppHeader
        title="Medication information"
        subtitle="Approved-source evidence from MedicineApp."
      />
      <AppTextInput
        label="Medication name"
        value={query}
        onChangeText={setQuery}
        maxLength={200}
      />
      <AppButton
        variant={section === 'side_effects' ? 'primary' : 'secondary'}
        label="Side effects and adverse reactions"
        onPress={() => setSection('side_effects')}
      />
      <AppButton
        variant={section === 'warnings' ? 'primary' : 'secondary'}
        label="Warnings"
        onPress={() => setSection('warnings')}
      />
      <AppButton
        label="Search approved sources"
        loading={loading}
        disabled={query.trim().length < 2}
        onPress={search}
      />
      <DrugInformationView result={result} loading={loading} error={error} />
    </AppScreen>
  );
}
