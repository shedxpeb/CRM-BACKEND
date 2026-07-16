import { Controller, Post, Body, Get, Req, UseInterceptors, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import {
  ResetPasswordDto,
  ResendOtpDto,
  ChangePasswordDto,
  ChangeEmailDto,
  VerifyChangeEmailDto,
  SendEmailVerificationDto,
  VerifyEmailDto,
  SendRegistrationOtpDto,
  SendForgotPasswordOtpDto,
  VerifyForgotPasswordOtpDto,
} from './dto/auth-extended.dto';
import { Public } from './decorators/public.decorator';
import { CookieInterceptor } from './cookie.interceptor';

interface RequestWithUser extends FastifyRequest {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    organizationId?: string;
    sessionId: string;
  };
}

@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(private authService: AuthService) {}

  private refreshFromCookie(req: FastifyRequest): string | undefined {
    return req.cookies?.refreshToken || (req as any).cookies?.['refreshToken'];
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  register(@Body() dto: RegisterDto, @Req() req: FastifyRequest) {
    return this.authService.register(dto, req.requestId);
  }

  @Public()
  @Post('send-registration-otp')
  @ApiOperation({ summary: 'Send registration OTP' })
  sendRegistrationOtp(@Body() dto: SendRegistrationOtpDto, @Req() req: FastifyRequest) {
    return this.authService.sendRegistrationOtp(dto, req.requestId);
  }

  @Public()
  @Post('verify-registration-otp')
  @UseInterceptors(CookieInterceptor)
  @ApiOperation({ summary: 'Verify registration OTP' })
  verifyRegistrationOtp(@Body() dto: VerifyOtpDto, @Req() req: FastifyRequest) {
    return this.authService.verifyRegistrationOtp(dto, req.ip, req.headers['user-agent'] as string);
  }

  /** Legacy alias */
  @Public()
  @Post('verify-otp')
  @UseInterceptors(CookieInterceptor)
  @ApiOperation({ summary: 'Verify registration OTP (legacy alias)' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: FastifyRequest) {
    return this.authService.verifyOtp(dto, req.ip, req.headers['user-agent'] as string);
  }

  @Public()
  @Post('login')
  @UseInterceptors(CookieInterceptor)
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto, @Req() req: FastifyRequest) {
    return this.authService.login(dto, req.ip, req.headers['user-agent'] as string);
  }

  @Public()
  @Post('refresh')
  @UseInterceptors(CookieInterceptor)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Req() req: FastifyRequest) {
    const refreshToken = this.refreshFromCookie(req);
    if (!refreshToken) throw new UnauthorizedException('Refresh token not found');
    return this.authService.refresh(refreshToken, req.ip, req.headers['user-agent'] as string);
  }

  @Post('logout')
  @UseInterceptors(CookieInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke session' })
  async logout(@Req() req: RequestWithUser) {
    if (req.user?.sessionId) {
      await this.authService.logout(req.user.sessionId, req.user.id, req.ip, req.headers['user-agent'] as string);
    }
    return { message: 'Logged out successfully.', clearRefreshCookie: true };
  }

  @Post('revoke-all-sessions')
  @UseInterceptors(CookieInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all devices' })
  async revokeAll(@Req() req: RequestWithUser) {
    await this.authService.revokeAllSessions(
      req.user.id,
      req.user.sessionId,
      req.ip,
      req.headers['user-agent'] as string,
    );
    return { message: 'All sessions have been revoked.', clearRefreshCookie: true };
  }

  @Public()
  @Post('send-forgot-password-otp')
  @ApiOperation({ summary: 'Send forgot-password OTP' })
  sendForgotPasswordOtp(@Body() dto: SendForgotPasswordOtpDto, @Req() req: FastifyRequest) {
    return this.authService.sendForgotPasswordOtp(dto, req.requestId);
  }

  /** Legacy alias */
  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP (legacy alias)' })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: FastifyRequest) {
    return this.authService.forgotPassword(dto, req.requestId);
  }

  @Public()
  @Post('verify-forgot-password-otp')
  @ApiOperation({ summary: 'Verify forgot-password OTP' })
  verifyForgotPasswordOtp(@Body() dto: VerifyForgotPasswordOtpDto) {
    return this.authService.verifyForgotPasswordOtp(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP' })
  resendOtp(@Body() dto: ResendOtpDto, @Req() req: FastifyRequest) {
    return this.authService.resendOtp(dto, req.requestId);
  }

  @Post('send-email-verification')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email verification OTP' })
  sendEmailVerification(@Req() req: RequestWithUser, @Body() dto: SendEmailVerificationDto) {
    return this.authService.sendEmailVerification(req.user.id, dto);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with OTP' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  changePassword(@Req() req: RequestWithUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto, req.ip, req.headers['user-agent'] as string);
  }

  @Post('change-email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request email change OTP' })
  changeEmail(@Req() req: RequestWithUser, @Body() dto: ChangeEmailDto) {
    return this.authService.changeEmail(req.user.id, dto);
  }

  @Post('verify-change-email')
  @UseInterceptors(CookieInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify email change OTP' })
  async verifyChangeEmail(@Req() req: RequestWithUser, @Body() dto: VerifyChangeEmailDto) {
    const result = await this.authService.verifyChangeEmail(
      req.user.id,
      dto,
      req.ip,
      req.headers['user-agent'] as string,
    );
    return { ...result, clearRefreshCookie: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Req() req: RequestWithUser) {
    return this.authService.getProfile(req.user.id);
  }
}
