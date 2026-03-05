import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentTransactionDto {
	@ApiPropertyOptional({
		description: 'Payment provider name.',
		example: 'stripe',
	})
	@IsOptional()
	@IsString()
	provider?: string;

	@ApiPropertyOptional({
		description: 'Provider reference number or transaction id.',
		example: 'pi_3Rv8m5AbCdEfGhI',
	})
	@IsOptional()
	@IsString()
	reference_number?: string;

	@ApiPropertyOptional({
		description: 'Transaction status.',
		example: 'succeeded',
	})
	@IsOptional()
	@IsString()
	status?: string;

	@ApiPropertyOptional({
		description: 'Requested amount.',
		example: 49.99,
	})
	@Type(() => Number)
	@IsOptional()
	@IsNumber()
	amount?: number;

	@ApiPropertyOptional({
		description: 'Requested amount currency code.',
		example: 'USD',
	})
	@IsOptional()
	@IsString()
	currency?: string;

	@ApiPropertyOptional({
		description: 'Final paid amount.',
		example: 49.99,
	})
	@Type(() => Number)
	@IsOptional()
	@IsNumber()
	paid_amount?: number;

	@ApiPropertyOptional({
		description: 'Final paid amount currency code.',
		example: 'USD',
	})
	@IsOptional()
	@IsString()
	paid_currency?: string;
}
