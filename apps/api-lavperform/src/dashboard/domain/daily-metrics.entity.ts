export class DailyMetricsEntity {
  constructor(
    public readonly day: string,
    public readonly messages: number,
    public readonly clicks: number,
    public readonly sales: number,
    public readonly errors: number = 0,
    public readonly salesAmount: number = 0,
  ) {}
}
