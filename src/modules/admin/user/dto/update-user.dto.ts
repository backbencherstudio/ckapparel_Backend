import { PartialType } from '@nestjs/swagger';
import { CreateUserAdminDto } from './create-user.dto';

export class UpdateUserAdminDto extends PartialType(CreateUserAdminDto) {}
