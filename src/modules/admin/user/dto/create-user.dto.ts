import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserAdminDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
  })
  name: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'The email of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @ApiProperty({
    description: 'The password of the user',
    example: 'password',
  })
  password: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The type of the user',
    example: 'user',
  })
  type?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The avatar of the user',
    example: 'avatar.png',
  })
  avatar?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The date of birth of the user',
    example: '1990-01-01',
  })
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The gender of the user',
    example: 'male',
  })
  gender?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'The location of the user',
    example: 'New York, USA',
  })
  address?: string;
}
