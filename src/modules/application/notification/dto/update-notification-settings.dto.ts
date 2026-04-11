import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({
    description: 'Master switch for general push notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable sponsorship-related alerts',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  sponsorshipAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable chat/message notifications',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  chatNotifications?: boolean;
}
