import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFaqDto {
	@ApiProperty({
		description: 'FAQ question shown to end users.',
		example: 'How do I start a free trial?',
	})
	@IsString()
	@IsNotEmpty()
	question: string;

	@ApiProperty({
		description: 'FAQ answer content shown to end users.',
		example:
			'Go to the subscription page and click Start Trial to activate your trial plan.',
	})
	@IsString()
	@IsNotEmpty()
	answer: string;

	@ApiPropertyOptional({
		description: 'Display order for sorting FAQs (ascending).',
		example: 1,
	})
	@Type(() => Number)
	@IsOptional()
	@IsNumber()
	sort_order?: number;
}
