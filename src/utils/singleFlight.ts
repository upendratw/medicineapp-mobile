export class SingleFlight {
  private active = false;

  async run<T>(operation: () => Promise<T>): Promise<T | undefined> {
    if (this.active) return undefined;
    this.active = true;
    try {
      return await operation();
    } finally {
      this.active = false;
    }
  }
}
