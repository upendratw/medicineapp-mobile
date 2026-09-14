export class IntegrationPendingError extends Error {
  constructor(public readonly feature: string) {
    super(`${feature} awaits backend support.`);
    this.name = 'IntegrationPendingError';
  }
}
