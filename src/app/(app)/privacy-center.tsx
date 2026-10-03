import { AppHeader, AppScreen } from '@/components';
import { PrivacyCenter } from '@/components/PrivacyCenter';
import { useTranslation } from '@/localization';
import { privacyService } from '@/services/registry';

export default function PrivacyCenterScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppHeader title={t('privacyCenter')} subtitle={t('privacyCenterHelp')} />
      <PrivacyCenter service={privacyService} />
    </AppScreen>
  );
}
