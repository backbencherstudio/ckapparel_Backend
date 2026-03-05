import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Target subscription plan for user subscription lifecycle.',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.FREE,
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}

