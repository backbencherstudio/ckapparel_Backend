import { Controller, Get, Param } from '@nestjs/common';
import { FaqService } from './faq.service';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @ApiOperation({
    summary: 'Get all FAQs',
    description: 'Returns all FAQ items ordered by configured sort order.',
  })
  @ApiOkResponse({
    description: 'FAQ list fetched successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'cm8q1n1f50000kq3g7d9h2zab' },
              question: {
                type: 'string',
                example: 'How do I start a free trial?',
              },
              answer: {
                type: 'string',
                example:
                  'Go to the subscription page and click Start Trial to activate your trial plan.',
              },
            },
          },
        },
      },
    },
  })
  @Get()
  async findAll() {
    try {
      const faqs = await this.faqService.findAll();
      return faqs;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get FAQ by id',
    description: 'Returns one FAQ item by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'FAQ unique identifier.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({
    description: 'FAQ fetched successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cm8q1n1f50000kq3g7d9h2zab' },
            question: {
              type: 'string',
              example: 'How do I start a free trial?',
            },
            answer: {
              type: 'string',
              example:
                'Go to the subscription page and click Start Trial to activate your trial plan.',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid FAQ id format.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const faq = await this.faqService.findOne(id);
      return faq;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
