import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebsiteInfoDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The name of the website',
    example: 'My Website',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The phone number of the website',
    example: '081234567890',
  })
  phone_number?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The email of the website',
    example: 'mywebsite@gmail.com',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The address of the website',
    example: 'Jl. Raya No. 123, Jakarta, Indonesia',
  })
  address?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'The logo of the website',
    type: 'string',
    format: 'binary',
  })
  logo?: Express.Multer.File[];

  @IsOptional()
  @ApiPropertyOptional({
    description: 'The favicon of the website',
    type: 'string',
    format: 'binary',
  })
  favicon?: Express.Multer.File[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The copyright of the website',
    example: '© 2025 My Website. All rights reserved.',
  })
  copyright?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The cancellation policy of the website',
  })
  cancellation_policy?: string;
}
