import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api')
@Public()
export class StubsController {
  @Get('projects/stats')
  projectsStats() {
    return { totalProjects: 0, activeProjects: 0, completedProjects: 0, monthlyProjects: 0, yearlyProjects: 0, changePercent: 0 };
  }

  @Get('customers/stats')
  customersStats() {
    return { totalCustomers: 0, newThisMonth: 0, totalCustomersYear: 0, changePercent: 0 };
  }

  @Get('inventory/stats')
  inventoryStats() {
    return { totalValue: 0, monthlyValue: 0, yearlyValue: 0, changePercent: 0 };
  }

  @Get('finance/stats')
  financeStats() {
    return { totalRevenue: 0, monthlyRevenue: 0, yearlyRevenue: 0, changePercent: 0 };
  }

  @Get('quotations/stats')
  quotationStats() {
    return { total: 0, monthly: 0, yearly: 0, changePercent: 0 };
  }

  @Get('projects')
  projectsList(@Query('page') page: number, @Query('pageSize') pageSize: number) {
    return { data: [], pagination: { page: page || 1, pageSize: pageSize || 100, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } };
  }

  @Get('projects/:id/activities')
  projectActivities() {
    return [];
  }
}
