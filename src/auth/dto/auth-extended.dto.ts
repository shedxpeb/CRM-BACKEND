import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendRegistrationOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class VerifyRegistrationOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class SendForgotPasswordOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class VerifyForgotPasswordOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;

  @ApiProperty()
  @IsString()
  confirmPassword: string;
}

export class ChangeEmailDto {
  @ApiProperty()
  @IsEmail()
  newEmail: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class VerifyChangeEmailDto {
  @ApiProperty()
  @IsEmail()
  newEmail: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class SendEmailVerificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class ResendOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: ['REGISTRATION', 'FORGOT_PASSWORD', 'EMAIL_VERIFICATION', 'CHANGE_EMAIL'] })
  @IsOptional()
  @IsString()
  purpose?: 'REGISTRATION' | 'FORGOT_PASSWORD' | 'EMAIL_VERIFICATION' | 'CHANGE_EMAIL';
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;

  @ApiProperty()
  @IsString()
  confirmPassword: string;
}
