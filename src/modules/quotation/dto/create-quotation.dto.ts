import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuotationDto {
  @ApiProperty({
    description: 'Your challenge or event name',
    example: 'Run across Australia',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  challengeTitle: string;

  @ApiProperty({
    description: 'Description of support needed',
    example: 'Need help with organizing transport, food, crew support...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  supportNeeded: string;
}
