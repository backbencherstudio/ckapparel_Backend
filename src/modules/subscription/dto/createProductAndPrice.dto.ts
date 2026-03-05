import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { SubscriptionPlan } from '@prisma/client';

export enum IntervalEnum {
  MONTH = 'month',
  YEAR = 'year',
}

export class CreateProductAndPriceDto {
  @ApiProperty({
    description: 'Display name of the subscription product.',
    example: 'Pro Coaching Plan',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Price amount in major currency unit.',
    example: 49.99,
  })
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiPropertyOptional({
    description: 'ISO currency code.',
    example: 'usd',
    default: 'usd',
  })
  @IsOptional()
  @IsString()
  currency: string;

  @ApiPropertyOptional({
    description: 'Billing interval for recurring subscription.',
    enum: IntervalEnum,
    example: IntervalEnum.MONTH,
  })
  @IsOptional()
  @IsEnum(IntervalEnum)
  interval: IntervalEnum;

  @ApiPropertyOptional({
    description: 'Number of intervals between billings.',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  interval_count: number;

  @ApiPropertyOptional({
    description: 'Optional product description shown in billing UI.',
    example: 'Access to all coaching sessions and premium content.',
  })
  @IsOptional()
  @IsString()
  product_description: string;

  @ApiPropertyOptional({
    description: 'Optional price description shown in billing UI.',
    example: 'Billed monthly. Cancel anytime.',
  })
  @IsOptional()
  @IsString()
  price_description: string;

  @ApiPropertyOptional({
    description: 'Trial duration in days.',
    example: 14,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  trialDays: number;

  @ApiPropertyOptional({
    description: 'Internal subscription plan type.',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.FREE,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  type: SubscriptionPlan;
}
