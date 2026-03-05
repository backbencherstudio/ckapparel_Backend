import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
	@ApiPropertyOptional({
		description: 'Sender user id (optional for system notifications).',
		example: 'cm8q1n1f50001kq3gn8e7x9mn',
	})
	@IsOptional()
	@IsString()
	sender_id?: string;

	@ApiPropertyOptional({
		description: 'Receiver user id. Can be null for broadcast/system notifications.',
		example: 'cm8q1n1f50000kq3g7d9h2zab',
	})
	@IsOptional()
	@IsString()
	receiver_id?: string;

	@ApiPropertyOptional({
		description: 'Notification event id for template/type.',
		example: 'cm8q1n1f50003kq3g3h2j1pq',
	})
	@IsOptional()
	@IsString()
	notification_event_id?: string;

	@ApiPropertyOptional({
		description: 'Related entity id (message/order/conversation id).',
		example: 'cm8q7i8mp0001xv57kgaf4n23',
	})
	@IsOptional()
	@IsString()
	entity_id?: string;

	@ApiPropertyOptional({
		description: 'Notification read timestamp.',
		example: '2026-03-05T10:20:30.000Z',
	})
	@Type(() => Date)
	@IsOptional()
	@IsDateString()
	read_at?: string;

	@ApiPropertyOptional({
		description: 'Notification status flag.',
		example: 1,
	})
	@Type(() => Number)
	@IsOptional()
	@IsNumber()
	status?: number;
}
