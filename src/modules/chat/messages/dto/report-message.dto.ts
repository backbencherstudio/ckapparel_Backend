import { IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReportMessageDto {
  @ApiPropertyOptional({
    description: 'Reason for reporting message',
    example: 'Spam content',
    minLength: 1,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}
