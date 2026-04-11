import { CreateCommunityChallengeDto } from 'src/modules/admin/challenges/dto/create-community-challenge.dto';

// User-side submit payload mirrors community challenge creation fields.
export class SubmitCommunityChallengeDto extends CreateCommunityChallengeDto {}
