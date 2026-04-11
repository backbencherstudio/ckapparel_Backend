import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateQuotationDto {
  @ApiProperty({
    description: 'Admin status: pending, reviewed, contacted, completed',
    enum: ['pending', 'reviewed', 'contacted', 'completed'],
  })
  @IsNotEmpty()
  @IsEnum(['pending', 'reviewed', 'contacted', 'completed'])
  status?: string;
}
