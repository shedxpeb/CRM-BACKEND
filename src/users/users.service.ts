import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: GetUsersDto) {
    const {
      page = 1,
      pageSize = 25,
      search,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          mobile: true,
          avatar: true,
          department: true,
          designation: true,
          role: true,
          isActive: true,
          isVerified: true,
          isLocked: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
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

  async findById(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        mobile: true,
        avatar: true,
        department: true,
        designation: true,
        role: true,
        isActive: true,
        isVerified: true,
        isLocked: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async create(
    organizationId: string,
    dto: CreateUserDto,
    createdById: string,
    actorRole?: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('A user with this email already exists');

    if (dto.role === 'OWNER' && actorRole !== 'OWNER' && actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only an owner can assign the owner role');
    }

    const password = dto.password || this.generateTempPassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email,
        name: dto.name,
        mobile: dto.mobile,
        department: dto.department,
        designation: dto.designation,
        role: dto.role as any,
        password: passwordHash,
        isActive: dto.isActive ?? true,
        isVerified: true,
        organizationType: 'COMPANY',
      },
      select: {
        id: true,
        email: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    this.logger.log(`User created: ${user.email} (${user.id}) by ${createdById}`);

    return user;
  }

  async update(organizationId: string, id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException(`User with ID ${id} not found`);

    const updateData: any = { ...dto };
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 12);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        mobile: true,
        department: true,
        designation: true,
        role: true,
        isActive: true,
        isLocked: true,
      },
    });
  }

  async softDelete(organizationId: string, id: string) {
    const existing = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException(`User with ID ${id} not found`);

    // Cannot delete the last OWNER
    if (existing.role === 'OWNER') {
      const ownerCount = await this.prisma.user.count({ where: { organizationId, role: 'OWNER' } });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot delete the last owner of the organization');
      }
    }

    // Soft delete by deactivating
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private generateTempPassword(): string {
    const crypto = require('crypto');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const arr = crypto.randomBytes(12);
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars[arr[i] % chars.length];
    }
    return password + 'Aa1';
  }
}
