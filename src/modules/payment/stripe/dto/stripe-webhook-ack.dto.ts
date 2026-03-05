import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StripeWebhookAckDto {
  @ApiProperty({
    description: 'Indicates whether webhook was accepted and processed.',
    example: true,
  })
  received: boolean;

  @ApiPropertyOptional({
    description: 'Stripe event type processed by backend.',
    example: 'customer.subscription.updated',
  })
  eventType?: string;
}
