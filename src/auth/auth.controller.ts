import { Controller, Post, Body, Get, Req, UseInterceptors, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { Public } from './decorators/public.decorator';
import { CookieInterceptor } from './cookie.interceptor';

interface RequestWithUser extends FastifyRequest {
  user: { id: string; email: string; name?: string; role: string; organizationId?: string; sessionId: string; };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-otp')
  @UseInterceptors(CookieInterceptor)
  @ApiOperation({ summary: 'Verify email with OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: RequestWithUser) {
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
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    return this.authService.refresh(refreshToken, req.ip, req.headers['user-agent'] as string);
  }

  @Post('logout')
  @UseInterceptors(CookieInterceptor)
  @ApiOperation({ summary: 'Logout and revoke session' })
  async logout(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
    const sessionId = req.user?.sessionId;
    if (sessionId) {
      await this.authService.logout(sessionId, userId, req.ip, req.headers['user-agent'] as string);
    }
    return { message: 'Logged out successfully.', clearRefreshCookie: true };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend verification OTP' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Req() req: RequestWithUser) {
    return this.authService.getProfile(req.user.id);
  }
}
