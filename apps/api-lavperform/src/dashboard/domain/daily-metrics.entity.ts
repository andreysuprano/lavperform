export class DailyMetricsEntity {
  constructor(
    public readonly day: string,
    public readonly messages: number,
    public readonly clicks: number,
    public readonly sales: number,
  ) {}
}
