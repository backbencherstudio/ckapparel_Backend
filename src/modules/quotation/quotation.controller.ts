import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { ReplyQuotationDto } from './dto/reply-quotation.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';

@ApiTags('Quotation Requests')
@Controller('quotation')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @ApiOperation({
    summary: 'Submit a quotation request',
    description:
      'User submits a request for custom support or planning assistance. Triggers email notification to admin.',
  })
  @ApiOkResponse({
    description: 'Quotation request submitted successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiBadRequestResponse({
    description: 'Invalid input data.',
  })
  @ApiBearerAuth('user_token')
  @UseGuards(JwtAuthGuard)
  @Post()
  requestQuotation(
    @Body() createQuotationDto: CreateQuotationDto,
    @GetUser('userId') userId: string,
  ) {
    return this.quotationService.requestQuotation(createQuotationDto, userId);
  }

  // ==============================================
  // Admin side
  // ==============================================

  @ApiOperation({
    summary: 'Get all quotation requests (admin)',
    description:
      'Fetch all quotation requests with pagination, filtering by status, and text search. Admin only.',
  })
  @ApiBearerAuth('admin_token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN || Role.SUPER_ADMIN)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status: pending, reviewed, contacted, completed',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search by challenge title, user name, or email (case-insensitive)',
  })
  @ApiOkResponse({
    description: 'Quotations fetched successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @Get()
  getAllQuotations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.quotationService.getAllQuotations(
      Number(page),
      Number(limit),
      status,
      search,
    );
  }

  @ApiOperation({
    summary: 'Get quotation request by ID (admin)',
    description: 'Fetch a specific quotation request. Admin only.',
  })
  @ApiBearerAuth('admin_token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN || Role.SUPER_ADMIN)
  @ApiOkResponse({
    description: 'Quotation fetched successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @ApiBadRequestResponse({ description: 'Invalid quotation id.' })
  @ApiParam({ name: 'id', type: String, description: 'Quotation ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotationService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update quotation status (admin)',
    description: 'Update only the quotation status. Admin only.',
  })
  @ApiBody({
    description: 'Status update with : pending, reviewed, contacted, completed',
    required: true,
    type: UpdateQuotationDto,
  })
  @ApiBearerAuth('admin_token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN || Role.SUPER_ADMIN)
  @ApiOkResponse({
    description: 'Quotation status updated successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @ApiBadRequestResponse({
    description: 'Invalid status value or quotation id.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Quotation ID' })
  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
  ) {
    return this.quotationService.updateStatus(id, updateQuotationDto);
  }

  @ApiOperation({
    summary: 'Reply to quotation by email (admin)',
    description:
      'Send an email reply to a quotation requester with optional file attachment. Admin only.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['message'],
      properties: {
        message: {
          type: 'string',
          description: 'Reply message',
          example:
            'Thanks for reaching out. We can support your challenge and will share a detailed plan shortly.',
        },
        subject: {
          type: 'string',
          description: 'Optional custom email subject',
          example: 'Re: Your quotation request',
        },
        fullName: {
          type: 'string',
          description: 'Optional recipient name override',
          example: 'Jackson Graham',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Optional recipient email override',
          example: 'jackson.graham@example.com',
        },
        attachment: {
          type: 'string',
          format: 'binary',
          description:
            'Optional CSV/XLS/XLSX/PDF attachment (max 10MB). Field name must be attachment.',
        },
      },
    },
  })
  @ApiBearerAuth('admin_token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN || Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: multer.memoryStorage() as any,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOkResponse({
    description: 'Reply email sent successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @ApiBadRequestResponse({
    description:
      'Invalid payload, quotation id, or unsupported attachment type.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Quotation ID' })
  @Post(':id/reply')
  replyQuotation(
    @Param('id') id: string,
    @Body() replyQuotationDto: ReplyQuotationDto,
    @UploadedFile() attachment?: Express.Multer.File,
  ) {
    return this.quotationService.replyQuotation(
      id,
      replyQuotationDto,
      attachment,
    );
  }
}
