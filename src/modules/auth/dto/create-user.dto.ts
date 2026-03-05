import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
  })
  name?: string;

  @IsNotEmpty()
  @ApiProperty({
    description: 'The email of the user',
    example: 'john.doe@example.com',
  })
  email?: string;

  @IsOptional()
  @ApiProperty({
    description: 'The phone number of the user',
    example: '+1234567890',
  })
  phone_number?: string;

  @IsOptional()
  @ApiProperty({
    description: 'The date of birth of the user',
    example: '1990-01-01',
  })
  date_of_birth?: string; // ISO string format (e.g., '1990-01-01')

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8' })
  @ApiProperty({
    description: 'The password of the user',
    example: 'password123',
  })
  password: string;

  @ApiProperty({
    description: 'The type of the user',
    example: 'user',
  })
  type?: string;

  // avatar will be set in controller after file upload
  @IsOptional()
  @ApiProperty({
    description: 'The avatar of the user',
    example: 'uploads/avatar12345.png',
  })
  avatar?: string;
  example: 'uploads/avatar12345.png';
}
