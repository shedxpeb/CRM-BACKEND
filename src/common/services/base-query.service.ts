import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationResult, PaginationMeta } from '../types';

export interface QueryConfig {
  model: string;
  searchFields: string[];
  filterFields: string[];
  sortColumns: string[];
  defaultSort?: string;
  defaultPageSize?: number;
  orgScoped?: boolean;
}

export interface WhereClause {
  [key: string]: any;
  OR?: any[];
  AND?: any[];
}

export class BaseQueryService {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly config: QueryConfig,
  ) {
    this.logger = new Logger(config.model);
  }

  get client(): any {
    return (this.prisma as any)[this.config.model];
  }

  async findAll(
    query: Record<string, any>,
    organizationId?: string,
    extraWhere?: WhereClause,
  ): Promise<PaginationResult<any>> {
    const startTime = Date.now();
    const {
      page = 1,
      pageSize = this.config.defaultPageSize || 25,
      search,
      sortBy = this.config.defaultSort || 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      ...filters
    } = query;

    const skip = (page - 1) * pageSize;
    const where: WhereClause = { isDeleted: false };

    if (this.config.orgScoped && organizationId) {
      where.organizationId = organizationId;
    }

    if (search && search.length >= 2) {
      where.OR = this.config.searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;

      if (this.config.filterFields.includes(key)) {
        if (typeof value === 'string' && !this.isEnumFilter(key)) {
          where[key] = { contains: value, mode: 'insensitive' };
        } else {
          where[key] = value;
        }
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (extraWhere) {
      Object.assign(where, extraWhere);
    }

    if (sortBy && !this.config.sortColumns.includes(sortBy)) {
      throw new BadRequestException(`Invalid sortBy column: ${sortBy}`);
    }

    const [rows, total] = await Promise.all([
      this.client.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.client.count({ where }),
    ]);

    const pagination: PaginationMeta = {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrevious: page > 1,
    };

    const executionTime = Date.now() - startTime;
    this.logger.log(
      `GET /${this.config.model.toLowerCase()} - Rows: ${rows.length}, Total: ${total}, Time: ${executionTime}ms`,
    );

    return { rows, pagination };
  }

  async findById(id: string, extraInclude?: any, organizationId?: string): Promise<any> {
    const where: any = { id, isDeleted: false };
    if (this.config.orgScoped && organizationId) {
      where.organizationId = organizationId;
    }
    const options: any = { where };
    if (extraInclude) options.include = extraInclude;

    const record = await this.client.findFirst(options);
    if (!record) {
      throw new NotFoundException(`${this.config.model} with ID ${id} not found`);
    }
    return record;
  }

  async softDelete(id: string, deletedById?: string, organizationId?: string): Promise<any> {
    const where: any = { id, isDeleted: false };
    if (this.config.orgScoped && organizationId) {
      where.organizationId = organizationId;
    }

    const record = await this.client.findFirst({ where });
    if (!record) {
      throw new NotFoundException(`${this.config.model} with ID ${id} not found`);
    }

    return this.client.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });
  }

  async bulkDelete(ids: string[], deletedById?: string, organizationId?: string): Promise<{ count: number }> {
    const where: any = { id: { in: ids }, isDeleted: false };
    if (this.config.orgScoped && organizationId) {
      where.organizationId = organizationId;
    }

    const result = await this.client.updateMany({
      where,
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });
    return { count: result.count };
  }

  async bulkStatusUpdate(
    ids: string[],
    status: string,
    organizationId?: string,
  ): Promise<{ count: number }> {
    const where: any = { id: { in: ids }, isDeleted: false };
    if (this.config.orgScoped && organizationId) {
      where.organizationId = organizationId;
    }

    const result = await this.client.updateMany({
      where,
      data: { status },
    });
    return { count: result.count };
  }

  async restore(id: string, organizationId?: string): Promise<any> {
    const where: any = { id, isDeleted: true };
    if (this.config.orgScoped && organizationId) {
      where.organizationId = organizationId;
    }

    const record = await this.client.findFirst({ where });
    if (!record) {
      throw new NotFoundException(`${this.config.model} with ID ${id} not found or not deleted`);
    }

    return this.client.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
      },
    });
  }

  async getStats(organizationId?: string, extraWhere?: WhereClause): Promise<Record<string, any>> {
    const where: WhereClause = { isDeleted: false };

    if (this.config.orgScoped && organizationId) {
      where.organizationId = organizationId;
    }

    if (extraWhere) {
      Object.assign(where, extraWhere);
    }

    const total = await this.client.count({ where });
    return { total };
  }

  async getCombobox(
    query: Record<string, any>,
    organizationId?: string,
    selectFields?: string[],
  ): Promise<PaginationResult<any>> {
    const { page = 1, pageSize = 50, search } = query;

    const defaultSelect = selectFields || ['id', 'name'];
    const select: Record<string, boolean> = {};
    defaultSelect.forEach((f) => (select[f] = true));

    const where: WhereClause = { isDeleted: false };

    if (this.config.orgScoped && organizationId) {
      where.organizationId = organizationId;
    }

    if (search && search.length >= 1) {
      const searchField = this.config.searchFields[0] || 'name';
      where.OR = [{ [searchField]: { contains: search, mode: 'insensitive' } }];
    }

    const [rows, total] = await Promise.all([
      this.client.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select,
      }),
      this.client.count({ where }),
    ]);

    return {
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrevious: page > 1,
      },
    };
  }

  private isEnumFilter(key: string): boolean {
    const enumFilters = [
      'status', 'priority', 'source', 'role', 'stage',
      'projectType', 'structureType', 'industry', 'businessType',
    ];
    return enumFilters.includes(key);
  }
}

