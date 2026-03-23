import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the user',
    example: 'Sazedul Islam',
  })
  name: string;

  @IsNotEmpty()
  @ApiProperty({
    description: 'The email of the user',
    example: 'sazedul.islam@gmail.com',
  })
  email: string;

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
}
