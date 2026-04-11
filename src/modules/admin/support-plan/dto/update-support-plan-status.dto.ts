import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

export class UpdateSupportPlanStatusDto {
  @ApiProperty({
    description: 'Support plan status: 1 = active, 0 = inactive',
    example: 1,
    enum: [0, 1],
  })
  @Transform(({ value }) => Number(value))
  @IsIn([0, 1])
  status: number;
}