import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Name of the contact sender',
    example: 'John Doe',
  })
  name: string;


  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Email address of the contact sender',
    example: 'john.doe@example.com',
  })
  email: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Phone number of the contact sender',
    example: '+1234567890',
  })
  phone_number?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Message from the contact sender',
    example: 'Hello, I have a question about your product.',
  })
  message: string;
}
