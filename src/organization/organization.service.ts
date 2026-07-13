import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organization.findMany({
      where: { isDeleted: false },
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, isDeleted: false },
      include: { _count: { select: { users: true, leads: true, customers: true, projects: true } } },
    });
    if (!org) throw new NotFoundException(`Organization with ID ${id} not found`);
    return org;
  }

  async create(dto: CreateOrganizationDto, createdById?: string) {
    return this.prisma.organization.create({
      data: { ...dto, createdById },
    });
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const existing = await this.prisma.organization.findFirst({ where: { id, isDeleted: false } });
    if (!existing) throw new NotFoundException(`Organization with ID ${id} not found`);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    const existing = await this.prisma.organization.findFirst({ where: { id, isDeleted: false } });
    if (!existing) throw new NotFoundException(`Organization with ID ${id} not found`);
    return this.prisma.organization.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}
