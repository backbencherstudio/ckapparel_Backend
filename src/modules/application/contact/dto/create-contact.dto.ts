import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({
    required: false,
    description: 'Contact sender name.',
    example: 'John Doe',
  })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Contact sender email address.',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    required: false,
    description: 'Contact phone number.',
    example: '+1234567890',
  })
  phone_number?: string;

  @IsNotEmpty()
  @ApiProperty({
    description: 'Contact request message body.',
    example: 'Hi, I need help with my subscription billing.',
  })
  message: string;
}
