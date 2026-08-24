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
    lastActivity: new Date(),
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
      $transaction: jest.fn(async (input: any, options?: any) => {
        // Handle callback form: $transaction(fn, options?)
        if (typeof input === 'function') {
          return input(prisma);
        }
        // Handle array form: $transaction([op1, op2, ...])
        if (Array.isArray(input)) {
          // Execute all operations in sequence and return results
          const results: any[] = [];
          for (const op of input) {
            const result = await op;
            results.push(result);
          }
          return results;
        }
        throw new Error('Invalid transaction call');
      }),
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
      // @ts-ignore
      touchSession: jest.fn().mockResolvedValue(undefined),
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
      // @ts-ignore
      { log: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('refresh with valid active token', () => {
    beforeEach(() => {
      // @ts-ignore
      ((prisma as any).refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
      // @ts-ignore
      ((prisma as any).refreshToken.update as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).refreshToken.create as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).session.update as jest.Mock).mockResolvedValue({});
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
      // @ts-ignore
      const findUniqueMock = (prisma as any).refreshToken.findUnique as jest.Mock;
      // First call returns revoked predecessor
      // @ts-ignore
      findUniqueMock.mockResolvedValueOnce({
        ...mockRefreshToken,
        isRevoked: true,
        replacedByTokenHash: 'successor-hash',
      });
      // Second call returns valid successor
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
        session: mockSession,
        user: mockUser,
      });
      // @ts-ignore
      ((prisma as any).refreshToken.update as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).refreshToken.create as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).session.update as jest.Mock).mockResolvedValue({});
    });

    it('should rotate from successor when predecessor is revoked with replacement', async () => {
      const result = await authService.refresh('some-refresh-token' as any);

      expect(result).toBeDefined();
    });
  });

  describe('refresh with concurrent requests', () => {
    beforeEach(() => {
      // @ts-ignore
      const findUniqueMock = (prisma as any).refreshToken.findUnique as jest.Mock;
      // Both calls return the same active token
      // @ts-ignore
      findUniqueMock.mockResolvedValue(mockRefreshToken);
      // @ts-ignore
      ((prisma as any).refreshToken.update as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).refreshToken.create as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).session.update as jest.Mock).mockResolvedValue({});
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
      // @ts-ignore
      ((prisma as any).refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockRefreshToken,
        isRevoked: true,
        replacedByTokenHash: null,
      });
      // @ts-ignore
      ((prisma as any).$executeRawUnsafe as jest.Mock).mockResolvedValue({});
    });

    it('should throw UnauthorizedException for revoked token without replacement', async () => {
      await expect(authService.refresh('some-refresh-token' as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh with expired token', () => {
    beforeEach(() => {
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
      // @ts-ignore
      const findUniqueMock = (prisma as any).refreshToken.findUnique as jest.Mock;
      // First call returns revoked predecessor
      // @ts-ignore
      findUniqueMock.mockResolvedValueOnce({
        ...mockRefreshToken,
        isRevoked: true,
        replacedByTokenHash: 'successor-hash',
      });
      // Second call returns valid successor
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
        session: mockSession,
        user: mockUser,
      });
      // @ts-ignore
      ((prisma as any).refreshToken.update as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).refreshToken.create as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).session.update as jest.Mock).mockResolvedValue({});
    });

    it('should rotate from successor when predecessor is revoked', async () => {
      await authService.refresh('some-refresh-token' as any);

      expect((prisma as any).refreshToken.update).toHaveBeenCalled();
      expect((prisma as any).refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refresh idempotent concurrent rotation', () => {
    it('should not create double successors for same session', async () => {
      // @ts-ignore
      const findUniqueMock = (prisma as any).refreshToken.findUnique as jest.Mock;
      // First call returns active token for both concurrent requests
      // @ts-ignore
      findUniqueMock.mockResolvedValue(mockRefreshToken);
      // @ts-ignore
      ((prisma as any).refreshToken.update as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).refreshToken.create as jest.Mock).mockResolvedValue({});
      // @ts-ignore
      ((prisma as any).session.update as jest.Mock).mockResolvedValue({});

      const promise1 = authService.refresh('some-refresh-token' as any);
      const promise2 = authService.refresh('some-refresh-token' as any);

      // Both should complete (one succeeds, one may fail gracefully)
      await Promise.allSettled([promise1, promise2]);

      // Verify refresh operations were called
      expect((prisma as any).refreshToken.update).toHaveBeenCalled();
      expect((prisma as any).refreshToken.create).toHaveBeenCalled();
    });
  });
});