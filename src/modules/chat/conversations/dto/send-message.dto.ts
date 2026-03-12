import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { MessageKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiPropertyOptional({
    enum: MessageKind,
    description: 'Message type. Defaults to TEXT when omitted.',
    default: MessageKind.TEXT,
  })
  @IsEnum(MessageKind)
  @IsOptional()
  kind?: MessageKind = MessageKind.TEXT;

  @ApiPropertyOptional({
    description: 'Structured message payload (text, file metadata, etc.)',
    type: Object,
    example: { text: 'hello world' },
  })
  @IsObject()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  content?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Pre-existing media url if file was already uploaded',
    example: 'https://cdn.example.com/media/abc.png',
  })
  @IsOptional()
  @IsString()
  media_Url?: string;
}