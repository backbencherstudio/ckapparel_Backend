import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Country',
    example: 'Bangladesh',
  })
  country?: string;

  @IsOptional()
  @ApiProperty({
    description: 'State',
    example: 'Dhaka',
  })
  state?: string;

  @IsOptional()
  @ApiProperty({
    description: 'City',
    example: 'Dhaka',
  })
  city?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Zip code',
    example: '123456',
  })
  zip_code?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Phone number',
    example: '+91 9876543210',
  })
  phone_number?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Address',
    example: 'Dhaka, Bangladesh',
  })
  address?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Gender',
    example: 'male',
  })
  gender?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Date of birth',
    example: '14/11/2001',
  })
  date_of_birth?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Profile image',
    example: 'http://localhost:4000/api/users/avatar/1234567890',
  })
  avatar?: string;
}
