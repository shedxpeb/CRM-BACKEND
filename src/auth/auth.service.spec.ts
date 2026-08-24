import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService.refresh - concurrency fix', () => {
  let prisma: PrismaService;
  let authService: AuthService;
  let tokenService: TokenService;
  let sessionService: SessionService;
  let configService: ConfigService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashed-password',
    role: 'USER',
    organizationId: 'org-1',
    isActive: true,
    isVerified: true,
  };

  const mockSession = {
    id: 'session-1',
    userId: 'user-123',
    organizationId: 'org-1',
    refreshToken: 'old-refresh-hash',
    isRevoked: false,
    isRememberMe: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    idleExpiresAt: new Date(Date.now() + 120 * 60 * 1000),
  };

  const mockRefreshToken = {
    id: 'token-1',
    tokenHash: 'abc123...hashed',
    sessionId: 'session-1',
    userId: 'user-123',
    organizationId: 'org-1',
    isRevoked: false,
    revokedAt: null,
    replacedByTokenHash: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    session: mockSession,
    user: mockUser,
  };

  const mockRefreshTokenData = {
    id: 'token-1',
    tokenHash: 'abc123...hashed',
    sessionId: 'session-1',
    userId: 'user-123',
    organizationId: 'org-1',
    isRevoked: false,
    revokedAt: null,
    replacedByTokenHash: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      $queryRawUnsafe: jest.fn(),
      refreshToken: {
        findUnique: jest.fn() as jest.Mock,
        create: jest.fn() as jest.Mock,
        update: jest.fn() as jest.Mock,
      },
      session: {
        findUnique: jest.fn() as jest.Mock,
        update: jest.fn() as jest.Mock,
      },
      $executeRawUnsafe: jest.fn() as jest.Mock,
    } as any;

    tokenService = {
      hashRefreshToken: jest.fn((token: string) => 'hashed-' + token),
      generateRefreshToken: jest.fn(() => ({ token: 'new-token', hash: 'new-hash' })),
      generateAccessToken: jest.fn(() => 'access-token-123'),
    } as any;

    sessionService = {
      touchSession: jest.fn(),
      txTouchSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllUserSessions: jest.fn(),
    } as any;

    configService = {
      get: jest.fn((key: string) => {
        const mockConfig: Record<string, string | number | boolean> = {
          'jwt.accessExpiresIn': '30m',
          'session.rememberMeDays': '30',
          'session.absoluteDays': '1',
          'session.idleMinutes': '120',
          'security.bcryptRounds': '12',
          'session.multiDevice': 'true',
        };
        return mockConfig[key];
      }),
    } as any;

    authService = new AuthService(
      prisma,
      configService,
      {} as any,
      tokenService,
      sessionService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('refresh with valid active token', () => {
    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn(prisma),
      );
      // @ts-ignore
      ((prisma as any).refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
    });

    it('should successfully rotate a valid refresh token', async () => {
      await authService.refresh('some-refresh-token' as any);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect((prisma as any).refreshToken.update).toHaveBeenCalled();
      expect((prisma as any).refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refresh with revoked predecessor and valid successor', () => {
    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn(prisma),
      );
      // @ts-ignore
      const findUniqueMock = (prisma as any).refreshToken.findUnique as jest.Mock;
      // @ts-ignore
      findUniqueMock.mockResolvedValue({
        ...mockRefreshToken,
        isRevoked: true,
        replacedByTokenHash: 'successor-hash',
      });
      // @ts-ignore
      (findUniqueMock as any).mockResolvedValueOnce(mockRefreshTokenData);
    });

    it('should rotate from successor when predecessor is revoked with replacement', async () => {
      const result = await authService.refresh('some-refresh-token' as any);

      expect(result).toBeDefined();
    });
  });

  describe('refresh with concurrent requests', () => {
    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn(prisma),
      );
      // @ts-ignore
      ((prisma as any).refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
    });

    it('should handle single request properly', async () => {
      const promise1 = authService.refresh('some-refresh-token' as any);
      const promise2 = authService.refresh('some-refresh-token' as any);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('refresh with revoked token without replacement', () => {
    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn(prisma),
      );
      // @ts-ignore
      ((prisma as any).refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockRefreshToken,
        isRevoked: true,
        replacedByTokenHash: null,
      });
    });

    it('should throw UnauthorizedException for revoked token without replacement', async () => {
      await expect(authService.refresh('some-refresh-token' as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh with expired token', () => {
    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn(prisma),
      );
      // @ts-ignore
      ((prisma as any).refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // expired
      });
    });

    it('should throw UnauthorizedException for expired token', async () => {
      await expect(authService.refresh('some-refresh-token' as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh with token not found', () => {
    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn(prisma),
      );
      // @ts-ignore
      ((prisma as any).refreshToken.findUnique as jest.Mock).mockResolvedValue(null);
    });

    it('should throw UnauthorizedException for missing token', async () => {
      await expect(authService.refresh('some-refresh-token' as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh successor family resolution', () => {
    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn(prisma),
      );
      // @ts-ignore
      const findUniqueMock = (prisma as any).refreshToken.findUnique as jest.Mock;
      // @ts-ignore
      findUniqueMock.mockResolvedValue({
        ...mockRefreshToken,
        isRevoked: true,
        replacedByTokenHash: 'successor-hash',
      });
      // @ts-ignore
      (findUniqueMock as any).mockResolvedValueOnce({
        id: 'token-2',
        tokenHash: 'successor-hash',
        sessionId: 'session-1',
        userId: 'user-123',
        organizationId: 'org-1',
        isRevoked: false,
        revokedAt: null,
        replacedByTokenHash: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    });

    it('should rotate from successor when predecessor is revoked', async () => {
      await authService.refresh('some-refresh-token' as any);

      expect((prisma as any).refreshToken.update).toHaveBeenCalled();
      expect((prisma as any).refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refresh idempotent concurrent rotation', () => {
    it('should not create double successors for same session', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn(prisma),
      );
      // @ts-ignore
      ((prisma as any).refreshToken.findUnique as jest.Mock)
        // @ts-ignore
        .mockResolvedValueOnce(mockRefreshToken) // first call - active token
        // @ts-ignore
        .mockResolvedValueOnce({ ...mockRefreshToken, isRevoked: true }); // second call after rotation

      const promise1 = authService.refresh('some-refresh-token' as any);
      const promise2 = authService.refresh('some-refresh-token' as any);

      await Promise.all([promise1, promise2]);

      // Verify only one refresh token was created/updated in the transaction
      expect((prisma as any).refreshToken.update).toHaveBeenCalledTimes(1);
      expect((prisma as any).refreshToken.create).toHaveBeenCalledTimes(1);
    });
  });
});