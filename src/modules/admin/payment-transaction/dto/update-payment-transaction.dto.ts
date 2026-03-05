import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreatePaymentTransactionDto } from './create-payment-transaction.dto';

export class UpdatePaymentTransactionDto extends PartialType(
  CreatePaymentTransactionDto,
) {
  @ApiPropertyOptional({
    description: 'Payment transaction id to update.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @IsOptional()
  @IsString()
  id?: string;
}
