import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { GetDashboardDto, DashboardDateRange } from './dto/get-dashboard.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../common/types';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get executive dashboard overview' })
  @ApiQuery({ name: 'dateRange', required: false, enum: DashboardDateRange })
  @ApiQuery({ name: 'customFrom', required: false, type: String })
  @ApiQuery({ name: 'customTo', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  async getOverview(
    @Query() dto: GetDashboardDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.dashboardService.getOverview(dto, organizationId, user?.id);
    return { message: 'Dashboard overview fetched successfully.', data };
  }

  @Get('gantt')
  @ApiOperation({ summary: 'Get project gantt chart data' })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  async getGantt(
    @Query() dto: GetDashboardDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.dashboardService.getGantt(dto, organizationId);
    return { message: 'Dashboard gantt data fetched successfully.', data };
  }
}
