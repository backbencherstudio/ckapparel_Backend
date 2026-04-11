import { PartialType } from '@nestjs/mapped-types';
import { CreateSupportPlanDto } from './create-support-plan.dto';

export class UpdateSupportPlanDto extends PartialType(CreateSupportPlanDto) {}
