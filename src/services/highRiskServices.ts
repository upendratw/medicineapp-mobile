import { Linking } from 'react-native';
import { ApiClient } from '@/api/client';
import { IntegrationPendingError } from '@/services/integration';

export type SelfReportedSeverity = 'mild' | 'moderate' | 'severe';
export type SymptomInput = Readonly<{
  symptom: string;
  description: string;
  timeframe: string;
  severity: SelfReportedSeverity;
}>;
export type SymptomResult = Readonly<{
  informationalGuidance: string;
  escalationRequired: boolean;
  emergency: boolean;
  reviewed: boolean;
}>;
export interface SymptomAssessmentService {
  assess(input: SymptomInput): Promise<SymptomResult>;
}
export class PendingSymptomAssessmentService implements SymptomAssessmentService {
  async assess(_input: SymptomInput): Promise<SymptomResult> {
    throw new IntegrationPendingError('Validated symptom assessment');
  }
}

export type EmergencyContact = Readonly<{
  id: string;
  name: string;
  phone: string;
  relationship: string;
}>;
export class EmergencyAssistanceService {
  constructor(private readonly client: ApiClient) {}
  listContacts(): Promise<readonly EmergencyContact[]> {
    return this.client.request<readonly EmergencyContact[]>(
      '/api/v1/patients/me/emergency-contacts',
      {},
      true,
    );
  }
}
export interface DeviceCommunicationService {
  openDialer(phone: string): Promise<void>;
}
export class LinkingDeviceCommunicationService implements DeviceCommunicationService {
  async openDialer(phone: string): Promise<void> {
    if (!/^\+?[0-9]{3,15}$/.test(phone))
      throw new Error('Invalid phone target');
    await Linking.openURL(`tel:${phone}`);
  }
}

export interface VoiceInputService {
  listen(): Promise<{ transcript: string; confidence: number | null }>;
}
export class PendingVoiceInputService implements VoiceInputService {
  async listen(): Promise<{ transcript: string; confidence: number | null }> {
    throw new IntegrationPendingError('Voice recognition');
  }
}

export type VoiceIntent =
  | {
      kind: 'NAVIGATE';
      route:
        | '/home'
        | '/medicines'
        | '/schedule'
        | '/medication-history'
        | '/medication-information';
    }
  | {
      kind: 'CONFIRM_REQUIRED';
      action: 'OPEN_SOS' | 'MEDICATION_ACTION';
      description: string;
    }
  | { kind: 'BLOCKED_CLINICAL'; description: string }
  | { kind: 'UNKNOWN' };

export class VoiceCommandResolver {
  resolve(raw: string): VoiceIntent {
    const text = raw.trim().toLowerCase();
    if (
      /stop (my )?medicine|double (my )?(next )?dose|change (my )?dose|diagnos|what should i take/.test(
        text,
      )
    )
      return {
        kind: 'BLOCKED_CLINICAL',
        description: 'This request cannot be performed by voice.',
      };
    if (/call emergency|emergency services|\bsos\b/.test(text))
      return {
        kind: 'CONFIRM_REQUIRED',
        action: 'OPEN_SOS',
        description: 'Open emergency help options',
      };
    if (/mark .*taken|skip .*medicine|record .*taken/.test(text))
      return {
        kind: 'CONFIRM_REQUIRED',
        action: 'MEDICATION_ACTION',
        description: 'Open the medication action for visual confirmation',
      };
    if (/medicine list|my medicines/.test(text))
      return { kind: 'NAVIGATE', route: '/medicines' };
    if (/schedule/.test(text)) return { kind: 'NAVIGATE', route: '/schedule' };
    if (/history/.test(text))
      return { kind: 'NAVIGATE', route: '/medication-history' };
    if (/side effect|drug information|medicine information/.test(text))
      return { kind: 'NAVIGATE', route: '/medication-information' };
    if (/home|dashboard/.test(text))
      return { kind: 'NAVIGATE', route: '/home' };
    return { kind: 'UNKNOWN' };
  }
}
