import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateDmDto {
  @ApiProperty({
    description: 'Target user id for direct message creation',
    example: 'cmmlhoxaa0000v83s6kxio16b',
  })
  @IsString()
  otherUserId: string;
}
