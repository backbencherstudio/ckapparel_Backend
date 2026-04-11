import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  controllers: [QuotationController],
  providers: [QuotationService],
  imports: [PrismaModule, MailModule],
})
export class QuotationModule {}
