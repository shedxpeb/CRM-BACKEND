import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export enum DashboardDateRange {
  Today = 'today',
  Yesterday = 'yesterday',
  Last7Days = 'last_7_days',
  Last30Days = 'last_30_days',
  ThisWeek = 'this_week',
  ThisMonth = 'this_month',
  LastMonth = 'last_month',
  ThisQuarter = 'this_quarter',
  LastQuarter = 'last_quarter',
  ThisYear = 'this_year',
  LastYear = 'last_year',
  AllTime = 'all_time',
  Custom = 'custom',
}

export class GetDashboardDto {
  @IsOptional()
  @IsEnum(DashboardDateRange)
  dateRange?: DashboardDateRange = DashboardDateRange.ThisMonth;

  @IsOptional()
  @IsDateString()
  customFrom?: string;

  @IsOptional()
  @IsDateString()
  customTo?: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}

export interface ResolvedDateRange {
  key: string;
  label: string;
  from: Date | null;
  to: Date | null;
  previousFrom: Date | null;
  previousTo: Date | null;
}

const RANGE_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  last_quarter: 'Last Quarter',
  this_year: 'This Year',
  last_year: 'Last Year',
  all_time: 'All Time',
  custom: 'Custom Range',
};

export function resolveDateRange(dto: GetDashboardDto): ResolvedDateRange {
  const range = dto.dateRange ?? DashboardDateRange.ThisMonth;
  const now = new Date();

  const startOfDay = (d: Date): Date => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const endOfDay = (d: Date): Date => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy;
  };
  const duration = (from: Date | null, to: Date | null): number => {
    if (!from || !to) return 0;
    return to.getTime() - from.getTime();
  };
  const shiftBack = (from: Date, to: Date, ms: number) => {
    return { previousFrom: new Date(from.getTime() - ms), previousTo: new Date(to.getTime() - ms) };
  };

  let from: Date | null = null;
  let to: Date | null = null;

  switch (range) {
    case DashboardDateRange.Today:
      from = startOfDay(now);
      to = endOfDay(now);
      break;
    case DashboardDateRange.Yesterday: {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = startOfDay(y);
      to = endOfDay(y);
      break;
    }
    case DashboardDateRange.Last7Days: {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      from = startOfDay(s);
      to = endOfDay(now);
      break;
    }
    case DashboardDateRange.Last30Days: {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      from = startOfDay(s);
      to = endOfDay(now);
      break;
    }
    case DashboardDateRange.ThisWeek: {
      const s = new Date(now);
      s.setDate(s.getDate() - s.getDay());
      from = startOfDay(s);
      to = endOfDay(now);
      break;
    }
    case DashboardDateRange.ThisMonth:
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      to = endOfDay(now);
      break;
    case DashboardDateRange.LastMonth:
      from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    case DashboardDateRange.ThisQuarter: {
      const q = Math.floor(now.getMonth() / 3);
      from = startOfDay(new Date(now.getFullYear(), q * 3, 1));
      to = endOfDay(now);
      break;
    }
    case DashboardDateRange.LastQuarter: {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3 - 3, 1);
      const end = new Date(now.getFullYear(), q * 3, 0);
      from = startOfDay(start);
      to = endOfDay(end);
      break;
    }
    case DashboardDateRange.ThisYear:
      from = startOfDay(new Date(now.getFullYear(), 0, 1));
      to = endOfDay(now);
      break;
    case DashboardDateRange.LastYear:
      from = startOfDay(new Date(now.getFullYear() - 1, 0, 1));
      to = endOfDay(new Date(now.getFullYear() - 1, 11, 31));
      break;
    case DashboardDateRange.AllTime:
      from = null;
      to = null;
      break;
    case DashboardDateRange.Custom: {
      if (dto.customFrom && dto.customTo) {
        from = startOfDay(new Date(dto.customFrom));
        to = endOfDay(new Date(dto.customTo));
      } else {
        from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        to = endOfDay(now);
      }
      break;
    }
    default:
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      to = endOfDay(now);
  }

  const ms = duration(from, to);
  let previousFrom: Date | null = null;
  let previousTo: Date | null = null;
  if (ms > 0 && from && to) {
    const prev = shiftBack(from, to, ms);
    previousFrom = prev.previousFrom;
    previousTo = prev.previousTo;
  }

  return {
    key: range,
    label: RANGE_LABELS[range] ?? range,
    from,
    to,
    previousFrom,
    previousTo,
  };
}
