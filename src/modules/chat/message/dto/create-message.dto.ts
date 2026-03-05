import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Receiver user id for the message.',
    example: 'cm8q1n1f50001kq3gn8e7x9mn',
  })
  receiver_id: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Conversation id where the message should be posted.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  conversation_id: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'Message text content.',
    example: 'Hello, are you available for a session tomorrow?',
  })
  message?: string;
}
