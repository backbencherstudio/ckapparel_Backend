import { Controller, Get, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { PaymentTransactionService } from './payment-transaction.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Request } from 'express';

@ApiBearerAuth('admin_token')
@ApiTags('Admin Payment transaction')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/payment-transaction')
export class PaymentTransactionController {
  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
  ) {}

  @ApiOperation({
    summary: 'Get all payment transactions',
    description: 'Returns all payment transactions visible to authenticated admin user.',
  })
  @ApiOkResponse({ description: 'Payment transactions fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get()
  async findAll(@Req() req: Request) {
    try {
      const user_id = req.user.userId;

      const paymentTransactions =
        await this.paymentTransactionService.findAll(user_id);

      return paymentTransactions;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get payment transaction by id',
    description: 'Returns one payment transaction by id.',
  })
  @ApiParam({ name: 'id', description: 'Payment transaction id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
  @ApiOkResponse({ description: 'Payment transaction fetched successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid payment transaction id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    try {
      const user_id = req.user.userId;

      const paymentTransaction = await this.paymentTransactionService.findOne(
        id,
        user_id,
      );

      return paymentTransaction;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Delete payment transaction',
    description: 'Deletes a payment transaction by id.',
  })
  @ApiParam({ name: 'id', description: 'Payment transaction id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
  @ApiOkResponse({ description: 'Payment transaction deleted successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid payment transaction id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    try {
      const user_id = req.user.userId;

      const paymentTransaction = await this.paymentTransactionService.remove(
        id,
        user_id,
      );

      return paymentTransaction;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
