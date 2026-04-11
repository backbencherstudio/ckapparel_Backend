import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class AddSponsorDto {
  @ApiProperty({
    description:
      'The ID of the sponsorship to which the sponsor is being added',
    example: 'sponsorship-123',
  })
  @IsString({ message: 'Sponsorship ID must be a string' })
  @IsNotEmpty({ message: 'Sponsorship ID is required' })
  sponsorshipId: string;

  @ApiProperty({
    description: 'The name of the sponsor',
    example: 'Acme Corporation',
  })
  @IsString({ message: 'Sponsor name must be a string' })
  @IsNotEmpty({ message: 'Sponsor name is required' })
  sponsorName: string;

  @ApiProperty({
    description: 'The contact email of the sponsor',
    example: 'contact@acmecorp.com',
  })
  @IsEmail({}, { message: 'Sponsor email must be a valid email address' })
  @IsNotEmpty({ message: 'Sponsor email is required' })
  sponsorEmail: string;

  @ApiProperty({
    description: 'The phone number of the sponsor',
    example: '+1-555-123-4567',
  })
  @IsString({ message: 'Sponsor phone number must be a string' })
  @IsOptional({ message: 'Sponsor phone number is optional' })
  sponsorPhone?: string;

  @ApiProperty({
    description: 'The sponsorship amount provided by the sponsor',
    example: 5000,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Sponsorship amount must be a number' })
  @IsPositive({ message: 'Sponsorship amount must be greater than 0' })
  @IsNotEmpty({ message: 'Sponsorship amount is required' })
  sponsorshipAmount: number;

  @ApiProperty({
    description: 'Message or note from the sponsor',
    example: 'We are excited to support this cause!',
  })
  @IsString({ message: 'Sponsor message must be a string' })
  @IsOptional({ message: 'Sponsor message is optional' })
  sponsorMessage?: string;
}
