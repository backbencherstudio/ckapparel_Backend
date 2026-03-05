import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { BatchCreateFaqDto, CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { RolesGuard } from '../../../common/guard/role/roles.guard';

@ApiBearerAuth()
@ApiTags('Faq')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @ApiOperation({
    summary: 'Create FAQ',
    description: 'Creates a single FAQ entry.',
  })
  @ApiBody({ type: CreateFaqDto })
  @ApiOkResponse({ description: 'FAQ created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid FAQ payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post()
  async create(@Body() createFaqDto: CreateFaqDto) {
    try {
      const faq = await this.faqService.create(createFaqDto);
      return faq;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Batch create or update FAQs',
    description: 'Creates new FAQs and updates existing FAQs in a single request.',
  })
  @ApiBody({ type: BatchCreateFaqDto })
  @ApiOkResponse({ description: 'Batch FAQ operation completed successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid batch FAQ payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post('batch-create')
  async batchCreate(@Body() batchCreateFaqDto: BatchCreateFaqDto) {
    try {
      const faq = await this.faqService.batchCreate(batchCreateFaqDto);
      return faq;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get all FAQs',
    description: 'Returns all FAQ entries.',
  })
  @ApiOkResponse({ description: 'FAQs fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
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
    description: 'Returns a single FAQ by its id.',
  })
  @ApiParam({ name: 'id', description: 'FAQ id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
  @ApiOkResponse({ description: 'FAQ fetched successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid FAQ id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
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

  @ApiOperation({
    summary: 'Update FAQ',
    description: 'Updates an existing FAQ by id.',
  })
  @ApiParam({ name: 'id', description: 'FAQ id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
  @ApiBody({ type: UpdateFaqDto })
  @ApiOkResponse({ description: 'FAQ updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid FAQ id or payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    try {
      const faq = await this.faqService.update(id, updateFaqDto);
      return faq;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Delete FAQ',
    description: 'Deletes an FAQ by id.',
  })
  @ApiParam({ name: 'id', description: 'FAQ id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
  @ApiOkResponse({ description: 'FAQ deleted successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid FAQ id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const faq = await this.faqService.remove(id);
      return faq;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
