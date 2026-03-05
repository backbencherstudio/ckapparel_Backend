import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStripeDto {
	@ApiProperty({
		description: 'Stripe customer identifier.',
		example: 'cus_Rb6h7uS2nD4x4B',
	})
	@IsString()
	@IsNotEmpty()
	customerId: string;

	@ApiProperty({
		description: 'Stripe subscription identifier.',
		example: 'sub_1Rv8m5AbCdEfGhI',
	})
	@IsString()
	@IsNotEmpty()
	subscriptionId: string;

	@ApiProperty({
		description: 'Stripe price identifier linked to the subscription.',
		example: 'price_1Rv8m5AbCdEfGhIJKLMN',
	})
	@IsString()
	@IsNotEmpty()
	priceId: string;

	@ApiPropertyOptional({
		description: 'Provider subscription status.',
		example: 'active',
	})
	@IsOptional()
	@IsString()
	status?: string;

	@ApiPropertyOptional({
		description: 'Current period start datetime in ISO format.',
		example: '2026-03-05T00:00:00.000Z',
	})
	@Type(() => Date)
	@IsOptional()
	@IsDateString()
	currentPeriodStart?: string;

	@ApiPropertyOptional({
		description: 'Current period end datetime in ISO format.',
		example: '2026-04-05T00:00:00.000Z',
	})
	@Type(() => Date)
	@IsOptional()
	@IsDateString()
	currentPeriodEnd?: string;
}
