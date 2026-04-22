import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExcludeController,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { RolesGuard } from '../../../common/guard/role/roles.guard';

@ApiBearerAuth('admin_token')
@ApiTags('Admin Contact')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN || Role.SUPER_ADMIN)
@Controller('admin/contact')
@ApiExcludeController() // Hide from Swagger docs
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @ApiOperation({
    summary: 'Create contact',
    description: 'Creates a new contact submission from admin panel.',
  })
  @ApiBody({ type: CreateContactDto })
  @ApiOkResponse({ description: 'Contact created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid contact payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post()
  async create(@Body() createContactDto: CreateContactDto) {
    try {
      const contact = await this.contactService.create(createContactDto);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get all contacts',
    description:
      'Returns contact submissions with optional search and status filtering.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search text.',
    example: 'john',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status value.',
    example: 1,
    type: Number,
  })
  @ApiOkResponse({ description: 'Contacts fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get()
  async findAll(@Query() query: { q?: string; status?: number }) {
    try {
      const searchQuery = query.q;
      const status = query.status;

      const contacts = await this.contactService.findAll({
        q: searchQuery,
        status: status,
      });
      return contacts;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get contact by id',
    description: 'Returns a single contact submission by id.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Contact fetched successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid contact id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const contact = await this.contactService.findOne(id);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Update contact',
    description: 'Updates an existing contact submission by id.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiBody({ type: UpdateContactDto })
  @ApiOkResponse({ description: 'Contact updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid contact id or payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    try {
      const contact = await this.contactService.update(id, updateContactDto);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Delete contact',
    description: 'Deletes a contact submission by id.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Contact deleted successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid contact id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const contact = await this.contactService.remove(id);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
