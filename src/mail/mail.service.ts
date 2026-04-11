import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import appConfig from '../config/app.config';

export interface SendQuotationRequestEmailParams {
  challengeTitle: string;
  supportNeeded: string;
  userEmail: string;
  userName?: string | null;
  phoneNumber?: string | null;
  quotationId: string;
}

export interface SendQuotationReplyEmailParams {
  to: string;
  fullName: string;
  message: string;
  subject?: string;
  challengeTitle: string;
  quotationId: string;
  attachment?: {
    filename: string;
    contentType: string;
    contentBase64: string;
  };
}

@Injectable()
export class MailService {
  constructor(
    @InjectQueue('mail-queue') private queue: Queue,
    private mailerService: MailerService,
  ) {}

  async sendMemberInvitation({ user, member, url }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = `${user.fname} is inviting you to ${appConfig().app.name}`;

      // add to queue
      await this.queue.add('sendMemberInvitation', {
        to: member.email,
        from: from,
        subject: subject,
        template: 'member-invitation.ejs',
        context: {
          user: user,
          member: member,
          url: url,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  // send otp code for email verification
  async sendOtpCodeToEmail({ name, email, otp }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = 'Email Verification';

      // add to queue
      await this.queue.add('sendOtpCodeToEmail', {
        to: email,
        from: from,
        subject: subject,
        template: 'email-verification.ejs',
        context: {
          name: name,
          otp: otp,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendVerificationLink(params: {
    email: string;
    name: string;
    token: string;
    type: string;
  }) {
    try {
      const verificationLink = `${appConfig().app.client_app_url}/verify-email?token=${params.token}&email=${params.email}&type=${params.type}`;

      // add to queue
      await this.queue.add('sendVerificationLink', {
        to: params.email,
        subject: 'Verify Your Email',
        template: 'verification-link.ejs',
        context: {
          name: params.name,
          verificationLink,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendQuotationRequestEmail(params: SendQuotationRequestEmailParams) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const to =
        process.env.MAIL_QUOTATION_TO ||
        process.env.MAIL_ADMIN_TO ||
        appConfig().mail.from;
      const subject = `New quotation request - ${params.challengeTitle}`;

      await this.queue.add('sendQuotationRequestEmail', {
        to,
        from,
        subject,
        template: 'quotation-request.ejs',
        context: {
          challengeTitle: params.challengeTitle,
          supportNeeded: params.supportNeeded,
          userEmail: params.userEmail,
          userName: params.userName || 'Not provided',
          phoneNumber: params.phoneNumber || 'Not provided',
          quotationId: params.quotationId,
          submittedAt: new Date().toISOString(),
          appName: process.env.APP_NAME,
        },
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async sendQuotationReplyEmail(params: SendQuotationReplyEmailParams) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = params.subject || 'Reply to your quotation request';

      await this.queue.add('sendQuotationReplyEmail', {
        to: params.to,
        from,
        subject,
        template: 'quotation-reply.ejs',
        context: {
          fullName: params.fullName,
          message: params.message,
          challengeTitle: params.challengeTitle,
          quotationId: params.quotationId,
          appName: process.env.APP_NAME,
        },
        attachment: params.attachment,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
