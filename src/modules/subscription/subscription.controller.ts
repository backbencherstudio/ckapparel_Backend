import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExcludeController,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateProductAndPriceDto } from './dto/createProductAndPrice.dto';
import { AddCardDto } from './dto/AddCardDto.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('user_token')
@ApiBearerAuth('admin_token')
@ApiExcludeController() // Hide from Swagger docs 
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // @ApiOperation({ summary: 'Create Stripe Checkout Session for Subscription' })
  // @Post('checkout')
  // createCheckoutSession(
  //   @Req() req,
  //   @Body() createSubscriptionDto: CreateSubscriptionDto,
  // ) {
  //   return this.subscriptionService.createCheckoutSession(
  //     req.user,
  //     createSubscriptionDto,
  //   );
  // }

  @ApiOperation({
    summary: 'Start trial subscription',
    description:
      'Starts a trial subscription for the authenticated user using a plan ID.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['planId'],
      properties: {
        planId: {
          type: 'string',
          example: 'plan_monthly_basic',
          description: 'Internal or provider plan identifier.',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Trial subscription started successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid plan ID or trial not allowed.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Post('start-trial')
  startTrial(@GetUser() user, @Body('planId') planId: string) {
    return this.subscriptionService.startTrial(user, planId);
  }

  @ApiOperation({
    summary: 'Create product and price',
    description:
      'Creates a subscription product and price configuration (typically for admin/internal setup).',
  })
  @ApiBody({ type: CreateProductAndPriceDto })
  @ApiOkResponse({ description: 'Product and price created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid product/price payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Post('create-product-price')
  createProductAndPrice(@Body() dto: CreateProductAndPriceDto) {
    return this.subscriptionService.createProductAndPrice(dto);
  }

  @ApiOperation({
    summary: 'Add payment card',
    description:
      'Adds/attaches a card to authenticated user payment profile using provider token.',
  })
  @ApiBody({ type: AddCardDto })
  @ApiOkResponse({ description: 'Card added successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid card token or product reference.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Post('add/cards')
  addCard(@Req() req, @Body() addCardDto: AddCardDto) {
    return this.subscriptionService.addCard(req.user, addCardDto);
  }

  @ApiOperation({
    summary: 'Get current user subscription status',
    description:
      'Returns active/trial/cancelled status and relevant subscription metadata for authenticated user.',
  })
  @ApiOkResponse({ description: 'Subscription status fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Get('status')
  getSubscriptionStatus(@GetUser() user) {
    return this.subscriptionService.getSubscriptionStatus(user.userId);
  }

  @ApiOperation({
    summary: 'Get all plans',
    description: 'Returns all available subscription plans for purchase/trial.',
  })
  @ApiOkResponse({ description: 'Plans fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Get('plans')
  getAllPlans() {
    return this.subscriptionService.getAllPlans();
  }

  @ApiOperation({
    summary: 'Cancel current subscription',
    description:
      'Cancels subscription for the authenticated user. Cancellation timing depends on billing settings.',
  })
  @ApiOkResponse({ description: 'Subscription cancelled successfully.' })
  @ApiBadRequestResponse({ description: 'No cancellable subscription found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Post('cancel')
  cancelSubscription(@GetUser('userId') userId: string) {
    return this.subscriptionService.cancelSubscription(userId);
  }
}
