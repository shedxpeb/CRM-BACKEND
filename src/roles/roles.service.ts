import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  async create(organizationId: string, dto: CreateRoleDto, createdById: string) {
    const existing = await this.prisma.role.findFirst({
      where: { organizationId, name: dto.name },
    });
    if (existing) throw new BadRequestException(`Role "${dto.name}" already exists`);

    return this.prisma.role.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions || [],
        createdById,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException(`Role with ID ${id} not found`);
    if (existing.isSystem) throw new BadRequestException('System roles cannot be modified');

    return this.prisma.role.update({
      where: { id },
      data: {
        ...dto,
        name: dto.name || existing.name,
      },
    });
  }

  async delete(organizationId: string, id: string) {
    const existing = await this.prisma.role.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException(`Role with ID ${id} not found`);
    if (existing.isSystem) throw new BadRequestException('System roles cannot be deleted');

    await this.prisma.role.delete({ where: { id } });
  }
}
