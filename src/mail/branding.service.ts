import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface BrandingContext {
  companyName: string;
  companyLogo: string;
  primaryColor: string;
  supportEmail: string;
  website: string;
  address: string;
  phone: string;
  year: number;
  socialLinks: { linkedin?: string; twitter?: string; facebook?: string };
}

@Injectable()
export class BrandingService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async resolve(organizationId?: string | null): Promise<BrandingContext> {
    const defaults = this.config.get('branding') as BrandingContext;
    const year = new Date().getFullYear();

    if (!organizationId) {
      return { ...defaults, year, socialLinks: { ...defaults.socialLinks } };
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, isDeleted: false },
      select: {
        name: true,
        email: true,
        website: true,
        address: true,
        mobile: true,
        settings: true,
      },
    });

    if (!org) {
      return { ...defaults, year, socialLinks: { ...defaults.socialLinks } };
    }

    const settings = (
      org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (org.settings as Record<string, any>)
        : {}
    ) as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branding = (settings.branding || {}) as Record<string, any>;

    return {
      companyName: branding.companyName || org.name || defaults.companyName,
      companyLogo: branding.companyLogo || defaults.companyLogo || '',
      primaryColor: branding.primaryColor || defaults.primaryColor,
      supportEmail: branding.supportEmail || org.email || defaults.supportEmail,
      website: branding.website || org.website || defaults.website,
      address: branding.address || org.address || defaults.address || '',
      phone: branding.phone || org.mobile || defaults.phone || '',
      year,
      socialLinks: {
        linkedin: branding.socialLinks?.linkedin || defaults.socialLinks?.linkedin,
        twitter: branding.socialLinks?.twitter || defaults.socialLinks?.twitter,
        facebook: branding.socialLinks?.facebook || defaults.socialLinks?.facebook,
      },
    };
  }
}
