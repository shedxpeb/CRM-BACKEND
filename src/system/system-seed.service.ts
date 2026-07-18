import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapOrganizationSystem } from '../common/system-bootstrap';

export type SeedAdminDto = {
  email: string;
  password: string;
  name?: string;
  companyName?: string;
};

@Injectable()
export class SystemSeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private requireSeedSecret(provided?: string) {
    const expected =
      this.config.get<string>('SEED_ADMIN_SECRET')?.trim() || process.env.SEED_ADMIN_SECRET?.trim();
    if (!expected) {
      // Hidden when not configured — looks like missing route
      throw new NotFoundException();
    }
    if (!provided || provided !== expected) {
      throw new ForbiddenException('Invalid seed secret');
    }
  }

  async seedAdmin(dto: SeedAdminDto, seedSecretHeader?: string) {
    this.requireSeedSecret(seedSecretHeader);

    const email = dto.email?.trim().toLowerCase();
    const password = dto.password || '';
    const name = (dto.name || 'Admin').trim();
    const companyName = (dto.companyName || 'PEB CRM').trim();

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }
    if (password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }

    const hash = await bcrypt.hash(password, 12);
    let user = await this.prisma.user.findUnique({ where: { email } });
    let created = false;

    if (!user) {
      const org = await this.prisma.organization.create({
        data: { name: companyName, email },
      });
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          password: hash,
          role: 'OWNER',
          organizationType: 'COMPANY',
          organizationId: org.id,
          isVerified: true,
          isActive: true,
        },
      });
      created = true;
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hash,
          name,
          isVerified: true,
          isActive: true,
          isLocked: false,
          lockedUntil: null,
        },
      });
    }

    if (user.organizationId) {
      await bootstrapOrganizationSystem(this.prisma, user.organizationId, user.id);
    }

    return {
      ok: true,
      created,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      message:
        'Admin ready. Login with this email/password (no OTP). Remove SEED_ADMIN_SECRET from Render after use.',
    };
  }
}
