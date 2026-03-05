import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'User id of the conversation creator.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  creator_id: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'User id of the conversation participant.',
    example: 'cm8q1n1f50001kq3gn8e7x9mn',
  })
  participant_id: string;
}
