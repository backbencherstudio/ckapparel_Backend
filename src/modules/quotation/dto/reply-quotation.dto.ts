import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ReplyQuotationDto {
  @ApiProperty({
    description: 'Reply message to send to the quotation requester',
    example:
      'Thanks for your request. We can support your challenge with planning and coaching guidance.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  message: string;

  @ApiPropertyOptional({
    description: 'Optional custom subject line',
    example: 'Re: Your quotation request',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Optional recipient name override',
    example: 'Jackson Graham',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Optional recipient email override',
    example: 'jackson.graham@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
