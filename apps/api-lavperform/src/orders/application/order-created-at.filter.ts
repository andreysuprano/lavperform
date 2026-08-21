export type CreatedAtFilter =
  | { gte: Date; lt: Date }
  | { gte: Date; lte: Date };

export function resolveCreatedAtFilter(options: {
  period?: string;
  startDate?: string;
  endDate?: string;
  todayStart?: Date;
  todayEnd?: Date;
}): CreatedAtFilter | undefined {
  if (options.period === 'today') {
    if (!options.todayStart || !options.todayEnd) {
      throw new Error('todayStart and todayEnd are required when period is today');
    }
    return { gte: options.todayStart, lt: options.todayEnd };
  }

  if (options.startDate && options.endDate) {
    return {
      gte: new Date(options.startDate),
      lte: new Date(options.endDate),
    };
  }

  return undefined;
}
