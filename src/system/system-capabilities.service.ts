import { Injectable } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import type { CapabilityModuleConstructor } from './capability.metadata';

export interface SystemCapabilities {
  version: string;
  apiVersion: string;
  modules: Record<string, boolean>;
  resources: string[];
}

@Injectable()
export class SystemCapabilitiesService {
  constructor(private readonly modules: ModulesContainer) {}

  getCapabilities(): SystemCapabilities {
    const capabilities = new Set<string>();
    const resources = new Set<string>();

    for (const moduleRef of this.modules.values()) {
      const moduleType = moduleRef.metatype as CapabilityModuleConstructor | undefined;
      const capability = moduleType?.moduleCapability?.capability;
      if (capability) capabilities.add(capability);

      for (const controller of moduleRef.controllers.values()) {
        if (!controller.metatype) continue;
        const path = Reflect.getMetadata(PATH_METADATA, controller.metatype) as string | string[] | undefined;
        const paths = Array.isArray(path) ? path : [path];
        for (const value of paths) {
          const normalized = value?.replace(/^\/+|\/+$/g, '');
          if (normalized) resources.add(normalized);
        }
      }
    }

    return {
      version: process.env.APP_VERSION || process.env.npm_package_version || '',
      apiVersion: process.env.API_VERSION || '',
      modules: Object.fromEntries([...capabilities].sort().map((capability) => [capability, true])),
      resources: [...resources].sort(),
    };
  }
}
