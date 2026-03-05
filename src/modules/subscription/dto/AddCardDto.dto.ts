import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddCardDto {
  @ApiProperty({
    description: 'Single-use payment token from payment provider/SDK.',
    example: 'tok_visa',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Product or price identifier used to attach the card in billing flow.',
    example: 'prod_Ra9XfS8Yk2',
  })
  @IsNotEmpty()
  @IsString()
  productId: string;
}
