import { ApiProperty } from '@nestjs/swagger';
import { CreateChallengeBaseDto } from './create-challenge-base.dto';

export class CreateCommunityChallengeDto extends CreateChallengeBaseDto {
	// No extra config needed for community challenges
}
