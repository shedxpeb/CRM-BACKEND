import { SetMetadata } from '@nestjs/common';

export const SKIP_ORG_KEY = 'skipOrgScope';
export const SkipOrgScope = () => SetMetadata(SKIP_ORG_KEY, true);
