import { PartialType } from '@nestjs/mapped-types';
import { CreateSponsorshipDto } from './create-sponsorship.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateSponsorshipDto extends PartialType(CreateSponsorshipDto) {
  @ApiProperty({
    description: 'Sponsorship Id',
    example: 'sponsorship-123',
  })
  @IsString({ message: 'Sponsorship id must be a string' })
  @IsNotEmpty({ message: 'Sponsorship id is required' })
  id: string;
}
