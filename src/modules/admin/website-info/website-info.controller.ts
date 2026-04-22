import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  ParseFilePipe,
  UploadedFiles,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExcludeController,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { WebsiteInfoService } from './website-info.service';
import { CreateWebsiteInfoDto } from './dto/create-website-info.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { Role } from '../../../common/guard/role/role.enum';

@ApiBearerAuth('admin_token')
@ApiTags('Admin Website Info')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN || Role.SUPER_ADMIN)
@Controller('admin/website-info')
@ApiExcludeController() // Hide from Swagger docs
export class WebsiteInfoController {
  constructor(private readonly websiteInfoService: WebsiteInfoService) {}

  @ApiOperation({
    summary: 'Create or update website info',
    description:
      'Creates or updates website information and optionally uploads logo/favicon files.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'My Website' },
        phone_number: { type: 'string', example: '081234567890' },
        email: { type: 'string', example: 'mywebsite@gmail.com' },
        address: {
          type: 'string',
          example: 'Jl. Raya No. 123, Jakarta, Indonesia',
        },
        copyright: {
          type: 'string',
          example: '© 2026 My Website. All rights reserved.',
        },
        cancellation_policy: { type: 'string' },
        logo: { type: 'string', format: 'binary' },
        favicon: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'Website info saved successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid website info payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'favicon', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
      },
    ),
  )
  async create(
    @Req() req: Request,
    @Body() createWebsiteInfoDto: CreateWebsiteInfoDto,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
      }),
    )
    files: {
      logo?: Express.Multer.File;
      favicon?: Express.Multer.File;
    },
  ) {
    try {
      const websiteInfo = await this.websiteInfoService.create(
        createWebsiteInfoDto,
        files,
      );
      return websiteInfo;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get website info',
    description: 'Returns current website information settings.',
  })
  @ApiOkResponse({ description: 'Website info fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get()
  async findAll() {
    try {
      const websiteInfo = await this.websiteInfoService.findAll();
      return websiteInfo;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
