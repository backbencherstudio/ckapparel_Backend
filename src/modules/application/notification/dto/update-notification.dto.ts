import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @ApiPropertyOptional({
    description: 'Notification id to update.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @IsOptional()
  @IsString()
  id?: string;
}
