import { useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppHeader,
  AppScreen,
  AppTextInput,
  MedicationCard,
} from '@/components';
import { medicationCatalogService } from '@/services/registry';
import type { MedicationSummary } from '@/types/medication';
export default function MedicationInformationScreen() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<readonly MedicationSummary[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const search = async () => {
    if (query.trim().length < 2) {
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      setItems(await medicationCatalogService.search(query));
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
        subtitle="Search reviewed backend catalog entries. Information is educational, not prescribing advice."
      />
      <AppTextInput
        label="Medication name"
        value={query}
        onChangeText={setQuery}
        maxLength={100}
      />
      <AppButton
        label="Search medication catalog"
        loading={loading}
        onPress={search}
      />
      {error ? (
        <AppAlert
          tone="error"
          message="Medication information is unavailable or the search is too short."
        />
      ) : null}
      {items.map((item) => (
        <MedicationCard key={item.id} medication={item} />
      ))}
    </AppScreen>
  );
}
