import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExcludeController,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { StripeWebhookAckDto } from './dto/stripe-webhook-ack.dto';

@ApiTags('payment-stripe')
@Controller('payment/stripe')
@ApiExcludeController() // Hide from Swagger docs
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @ApiOperation({
    summary: 'Stripe webhook receiver',
    description:
      'Receives Stripe webhook events. This endpoint is called by Stripe servers and validates `stripe-signature` before processing.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    required: true,
    description:
      'Stripe webhook signature header used for payload verification.',
    example: 't=1710000000,v1=3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      example: {
        id: 'evt_1Rv9MrAbCdEfGhI',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1Rv8m5AbCdEfGhI',
            customer: 'cus_Rb6h7uS2nD4x4B',
            status: 'active',
          },
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Webhook accepted and processed.',
    type: StripeWebhookAckDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid webhook payload or missing/invalid stripe signature.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = (req as any).rawBody;
    const body = (req as any).body;

    let payload = '';

    if (Buffer.isBuffer(rawBody)) {
      payload = rawBody.toString('utf8');
    } else if (Buffer.isBuffer(body)) {
      payload = body.toString('utf8');
    } else if (typeof body === 'string') {
      payload = body;
    } else if (body && typeof body === 'object') {
      payload = JSON.stringify(body);
    }

    if (!payload) {
      throw new BadRequestException('Missing webhook payload');
    }

    try {
      return await this.stripeService.handleWebhook(payload, signature);
    } catch (error) {
      throw new BadRequestException(
        'Invalid Stripe webhook payload or signature',
      );
    }
  }
}
