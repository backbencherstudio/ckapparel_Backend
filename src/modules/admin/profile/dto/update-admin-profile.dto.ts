import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateAdminProfileDto {
  @ApiPropertyOptional({
    description: 'Admin display name',
    example: 'Admin Manager',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  @MinLength(2, { message: 'name must be at least 2 characters' })
  @MaxLength(100, { message: 'name cannot exceed 100 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Admin email address',
    example: 'admin@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Admin bio or role description',
    example: 'Platform administrator',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'bio must be a string' })
  @MaxLength(500, { message: 'bio cannot exceed 500 characters' })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Admin phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString({ message: 'phone_number must be a string' })
  @MaxLength(20, { message: 'phone_number cannot exceed 20 characters' })
  phone_number?: string;

  @ApiPropertyOptional({
    description: 'Admin gender',
    example: 'male',
  })
  @IsOptional()
  @IsString({ message: 'gender must be a string' })
  @MaxLength(20, { message: 'gender cannot exceed 20 characters' })
  gender?: string;
}
