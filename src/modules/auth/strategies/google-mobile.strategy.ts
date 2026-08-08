import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as CustomStrategy } from 'passport-custom';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthService } from '../auth.service';

const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const googleJwks = createRemoteJWKSet(GOOGLE_JWKS_URL);

@Injectable()
export class GoogleMobileStrategy extends PassportStrategy(
  CustomStrategy,
  'google-mobile',
) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const body: any = req?.body ?? {};
    const idToken: string | undefined =
      body.idToken ?? body.id_token ?? body.token ?? body.credential;

    if (!idToken || typeof idToken !== 'string') {
      throw new UnauthorizedException('idToken is required');
    }

    const audiences = [
      process.env.GOOGLE_ANDROID_APP_ID,
      process.env.GOOGLE_IOS_APP_ID,
      process.env.GOOGLE_MOBILE_APP_IDS,
    ]
      .filter(Boolean)
      .flatMap((v) => String(v).split(','))
      .map((s) =>
        s
          .trim()
          .replace(/^https?:\/\//, '')
          .replace(/\/+$/, ''),
      ) // strip accidental protocol + trailing slash
      .filter(Boolean);

    const uniqueAudiences = [...new Set(audiences)];

    if (uniqueAudiences.length === 0) {
      throw new UnauthorizedException(
        'Google client id (audience) is not configured',
      );
    }

    console.log('Google audiences:', uniqueAudiences);
    console.log('Received idToken length:', idToken?.length);

    try {
      // Verify with jose and clock tolerance
      const { payload } = await jwtVerify(idToken, googleJwks, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: uniqueAudiences,
        clockTolerance: 7300, // 2 hours + 100 seconds tolerance
      });

      console.log('✅ Token verified successfully with jose!');

      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid Google token');
      }

      console.log('Google payload:', {
        sub: payload.sub,
        email: payload.email,
        aud: payload.aud,
      });

      return this.authService.handleGoogleProfile({
        googleId: payload.sub,
        email: payload.email as string,
        firstName: payload.given_name as string,
        lastName: payload.family_name as string,
        avatar: payload.picture as string,
      });
    } catch (error) {
      console.error('❌ Google verification error:', error.message);
      console.error('Full error:', error);
      throw new UnauthorizedException(
        `Google verification failed: ${error.message}`,
      );
    }
  }
}
