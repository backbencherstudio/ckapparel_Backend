import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @ApiProperty({
    description: 'The email of the user',
    example: 'fahim.devx@gmail.com',
  })
  email: string;

  @IsNotEmpty()
  @ApiProperty({
    description: 'The password of the user',
    example: 'password123',
  })
  password: string;
}
