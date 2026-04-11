import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { ReplyQuotationDto } from './dto/reply-quotation.dto';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

@Injectable()
export class QuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private async createQuotationNotification(
    receiverId: string | undefined,
    text: string,
    senderId?: string,
    quotationId?: string,
  ) {
    try {
      await NotificationRepository.createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        type: 'quotation',
        text,
        entity_id: quotationId,
      });
    } catch (error) {
      console.error('Failed to create quotation notification:', error);
    }
  }

  async requestQuotation(
    createQuotationDto: CreateQuotationDto,
    userId?: string,
  ) {
    try {
      const userExists = userId
        ? await this.prisma.user.findUnique({
            where: { id: userId },
          })
        : null;

      if (!userExists && userId) {
        throw new BadRequestException('User not found. please login again');
      }

      if (!userExists) {
        throw new BadRequestException('Authenticated user is required');
      }

      const quotation = await this.prisma.quotation.create({
        data: {
          challenge_title: createQuotationDto.challengeTitle,
          support_needed: createQuotationDto.supportNeeded,
          user_email: userExists.email,
          user_name: userExists.name || null,
          phone_number: userExists.phone_number || null,
          user_id: userId || null,
          status: 'pending',
        },
      });

      // Send email notification to admin
      try {
        await this.mailService.sendQuotationRequestEmail({
          challengeTitle: createQuotationDto.challengeTitle,
          supportNeeded: createQuotationDto.supportNeeded,
          userEmail: userExists.email,
          userName: userExists.name || null,
          phoneNumber: userExists.phone_number || null,
          quotationId: quotation.id,
        });
      } catch (emailError) {
        console.error('Failed to send quotation email:', emailError);
      }

      await this.createQuotationNotification(
        userId,
        `Your quotation request for "${createQuotationDto.challengeTitle}" has been submitted successfully.`,
        undefined,
        quotation.id,
      );

      // Notify admins as a broadcast notification for dashboards.
      await this.createQuotationNotification(
        undefined,
        `New quotation request submitted: "${createQuotationDto.challengeTitle}".`,
        userId,
        quotation.id,
      );

      return {
        success: true,
        message:
          'Quotation request submitted successfully. We will get back to you soon.',
        data: quotation,
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to create quotation request',
      );
    }
  }

  async getAllQuotations(
    page = 1,
    limit = 10,
    status?: string,
    search?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Text search across challenge_title, user_name, and user_email
      if (search) {
        where.OR = [
          { challenge_title: { contains: search, mode: 'insensitive' } },
          { user_name: { contains: search, mode: 'insensitive' } },
          { user_email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [quotations, total] = await Promise.all([
        this.prisma.quotation.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        }),
        this.prisma.quotation.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'Quotations fetched successfully',
        data: quotations,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch quotations',
      );
    }
  }

  async findOne(id: string) {
    try {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              country: true,
            },
          },
        },
      });

      if (!quotation) {
        throw new BadRequestException('Quotation not found');
      }

      return {
        success: true,
        message: 'Quotation fetched successfully',
        data: quotation,
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch quotation',
      );
    }
  }

  async updateStatus(id: string, updateQuotationDto: UpdateQuotationDto) {
    try {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id },
      });

      if (!quotation) {
        throw new BadRequestException('Quotation not found');
      }

      const updated = await this.prisma.quotation.update({
        where: { id },
        data: {
          status: updateQuotationDto.status,
        },
      });

      if (quotation.user_id) {
        await this.createQuotationNotification(
          quotation.user_id,
          `Your quotation request status has been updated to "${updateQuotationDto.status}".`,
          undefined,
          quotation.id,
        );
      }

      return {
        success: true,
        message: 'Quotation updated successfully',
        data: updated,
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to update quotation',
      );
    }
  }

  async replyQuotation(
    id: string,
    replyQuotationDto: ReplyQuotationDto,
    attachment?: Express.Multer.File,
  ) {
    try {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id },
      });

      if (!quotation) {
        throw new BadRequestException('Quotation not found');
      }

      if (attachment) {
        const allowedMimeTypes = [
          'text/csv',
          'application/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/pdf',
        ];

        if (!allowedMimeTypes.includes(attachment.mimetype)) {
          throw new BadRequestException(
            'Unsupported attachment type. Only CSV, XLS, XLSX, and PDF are allowed.',
          );
        }
      }

      const recipientEmail = replyQuotationDto.email || quotation.user_email;
      const recipientName =
        replyQuotationDto.fullName || quotation.user_name || 'Athlete';

      await this.mailService.sendQuotationReplyEmail({
        to: recipientEmail,
        fullName: recipientName,
        message: replyQuotationDto.message,
        subject: replyQuotationDto.subject,
        challengeTitle: quotation.challenge_title,
        quotationId: quotation.id,
        attachment: attachment
          ? {
              filename: attachment.originalname,
              contentType: attachment.mimetype,
              contentBase64: attachment.buffer.toString('base64'),
            }
          : undefined,
      });

      const updated = await this.prisma.quotation.update({
        where: { id },
        data: {
          status: 'contacted',
        },
      });

      if (quotation.user_id) {
        await this.createQuotationNotification(
          quotation.user_id,
          `You received a reply for your quotation request "${quotation.challenge_title}".`,
          undefined,
          quotation.id,
        );
      }

      return {
        success: true,
        message: 'Quotation reply sent successfully',
        data: updated,
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to send quotation reply',
      );
    }
  }
}
