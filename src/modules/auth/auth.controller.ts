import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { AppleAuthGuard } from './guards/apple-auth.guard';
import { AppleMobileDto } from './dto/apple-mobile.dto';
import { GoogleMobileDto } from './dto/google-mobile.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GetUser } from './decorators/get-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns authenticated user profile data from the access token context.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiOkResponse({ description: 'User profile fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    try {
      // console.log(req.user);
      const user_id = req.user.userId;

      const response = await this.authService.me(user_id);

      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch user details',
      };
    }
  }

  @ApiOperation({
    summary: 'Step 1: Request registration (send OTP)',
    description:
      'Creates a pending registration and sends OTP to the email. Frontend should call /register/verify after receiving OTP.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: { type: 'string', example: 'Sazedul Islam' },
        email: { type: 'string', example: 'sazedul.islam@example.com' },
        password: { type: 'string', example: 'password123' },
        type: { type: 'string', example: 'user' },
      },
    },
  })
  @ApiOkResponse({ description: 'OTP sent successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid registration input.' })
  @Post('register/request')
  async requestRegistration(@Body() data: CreateUserDto) {
    try {
      if (!data.name) {
        throw new HttpException('Name not provided', HttpStatus.BAD_REQUEST);
      }
      if (!data.email) {
        throw new HttpException('Email not provided', HttpStatus.BAD_REQUEST);
      }
      if (!data.password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await this.authService.requestRegistration({
        name: data.name,
        email: data.email,
        password: data.password,
        type: data.type,
      });

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({
    summary: 'Step 2: Verify OTP and complete registration',
    description:
      'Verifies OTP and creates the account. Frontend should store returned authorization tokens after success.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiOkResponse({ description: 'Registration completed successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid or expired OTP, or registration creation failed.',
  })
  @Post('register/verify')
  async verifyAndRegister(@Body() data: VerifyOtpDto) {
    try {
      if (!data.email) {
        throw new HttpException('Email not provided', HttpStatus.BAD_REQUEST);
      }
      if (!data.otp) {
        throw new HttpException('OTP not provided', HttpStatus.BAD_REQUEST);
      }

      const response = await this.authService.verifyAndRegister({
        email: data.email,
        otp: data.otp,
      });

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticates user with email/password and returns access + refresh tokens.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login successful.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, @Res() res: Response) {
    try {
      // console.log("user", req.user);
      const user_id = req.user.id;

      const user_email = req.user.email;

      const response = await this.authService.login({
        userId: user_id,
        email: user_email,
      });

      // store to secure cookies
      res.cookie('refresh_token', response.authorization.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      res.json(response);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Refresh token',
    description:
      'Issues a new access token using an existing valid refresh token.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ description: 'Token refreshed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid user token context.' })
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(@Req() req: Request, @Body() body: RefreshTokenDto) {
    try {
      console.log('hit');
      const user_id = req.user.userId;

      console.log('Refresh token request for user_id:', user_id);

      const response = await this.authService.refreshToken(
        user_id,
        body.refresh_token,
      );

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Logout user',
    description: 'Revokes refresh token for current authenticated user.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiOkResponse({ description: 'Logged out successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      const response = await this.authService.revokeRefreshToken(userId);
      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // update user
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Updates profile fields for authenticated user. Avatar should be sent as multipart file.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        username: { type: 'string', example: 'john_doe' },
        country: { type: 'string', example: 'Bangladesh' },
        gender: { type: 'string', example: 'male' },
        age: { type: 'number', example: 30 },
        bio: { type: 'string', example: 'Software Engineer' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'User updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
    }),
  )
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.updateUser(user_id, data, avatar);

      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update user',
      };
    }
  }

  // --------------change password---------

  @ApiOperation({
    summary: 'Forgot password',
    description: 'Sends an OTP/token to email for password reset flow.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'sazedul.islam@example.com' },
      },
    },
  })
  @ApiOkResponse({ description: 'Password reset OTP/token sent.' })
  @ApiBadRequestResponse({ description: 'Email is missing or invalid.' })
  @Post('forgot-password')
  async forgotPassword(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.forgotPassword(email);
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  // verify email to verify the email
  @ApiOperation({
    summary: 'Verify email',
    description: 'Verifies email using OTP/token sent to the user email.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'otp'],
      properties: {
        email: { type: 'string', example: 'sazedul.islam@example.com' },
        otp: { type: 'string', example: '123456' },
      },
    },
  })
  @ApiOkResponse({ description: 'Email verified successfully.' })
  @ApiBadRequestResponse({ description: 'Email/token missing or invalid.' })
  @Post('verify-email')
  async verifyEmail(@Body() data: VerifyEmailDto) {
    try {
      const email = data.email;
      const token = data.otp;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyEmail({
        email: email,
        token: token,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Failed to verify email',
      };
    }
  }

  // resend verification email to verify the email
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Resends email verification OTP/token to the provided email.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'sazedul.islam@example.com' },
      },
    },
  })
  @ApiOkResponse({ description: 'Verification code resent successfully.' })
  @ApiBadRequestResponse({ description: 'Email is missing or invalid.' })
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendVerificationEmail(email);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to resend verification email',
      };
    }
  }

  // reset password if user forget the password
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets password using email + OTP/token + new password.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'otp', 'new_password'],
      properties: {
        email: { type: 'string', example: 'sazedul.islam@example.com' },
        otp: { type: 'string', example: '123456' },
        new_password: { type: 'string', example: 'NewPassword123!' },
      },
    },
  })
  @ApiOkResponse({ description: 'Password reset successful.' })
  @ApiBadRequestResponse({ description: 'Invalid payload or token.' })
  @Post('reset-password')
  async resetPassword(
    @Body() data: { email: string; otp: string; new_password: string },
  ) {
    try {
      const email = data.email;
      const token = data.otp;
      const password = data.new_password;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.resetPassword({
        email: email,
        token: token,
        password: password,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  // change password if user want to change the password
  @ApiOperation({
    summary: 'Change password',
    description: 'Changes password for currently authenticated user.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['old_password', 'new_password'],
      properties: {
        old_password: { type: 'string', example: 'CurrentPassword123!' },
        new_password: { type: 'string', example: 'NewPassword123!' },
      },
    },
  })
  @ApiOkResponse({ description: 'Password changed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({ description: 'Missing or invalid password values.' })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() data: { email: string; old_password: string; new_password: string },
  ) {
    try {
      // const email = data.email;
      const user_id = req.user.userId;

      const oldPassword = data.old_password;
      const newPassword = data.new_password;
      // if (!email) {
      //   throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      // }
      if (!oldPassword) {
        throw new HttpException(
          'Old password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!newPassword) {
        throw new HttpException(
          'New password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.changePassword({
        // email: email,
        user_id: user_id,
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }

  // --------------end change password---------

  // -------change email address------
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Request email change',
    description: 'Sends verification token/code for changing account email.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'new.user@example.com' },
      },
    },
  })
  @ApiOkResponse({ description: 'Email change verification token sent.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  async requestEmailChange(
    @Req() req: Request,
    @Body() data: { email: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.requestEmailChange(user_id, email);
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Confirm email change',
    description: 'Applies email change using verification token/code.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'token'],
      properties: {
        email: { type: 'string', example: 'new.user@example.com' },
        token: { type: 'string', example: '123456' },
      },
    },
  })
  @ApiOkResponse({ description: 'Email changed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({ description: 'Email/token missing or invalid.' })
  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(
    @GetUser('userId') user_id: string,
    @Body() data: { email: string; token: string },
  ) {
    try {
      const email = data.email;

      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.changeEmail({
        user_id: user_id,
        new_email: email,
        token: token,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }
  // -------end change email address------

  // --------- 2FA ---------
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Generate 2FA secret',
    description: 'Returns 2FA setup secret/QR payload for authenticator apps.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiOkResponse({ description: '2FA secret generated.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Post('generate-2fa-secret')
  async generate2FASecret(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Verify 2FA code',
    description: 'Verifies one-time token generated by authenticator app.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', example: '123456' },
      },
    },
  })
  @ApiOkResponse({ description: '2FA token verified.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Post('verify-2fa')
  async verify2FA(@Req() req: Request, @Body() data: { token: string }) {
    try {
      const user_id = req.user.userId;
      const token = data.token;
      return await this.authService.verify2FA(user_id, token);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Enable 2FA',
    description: 'Enables two-factor authentication for current user.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiOkResponse({ description: '2FA enabled.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  async enable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.enable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Disable 2FA',
    description: 'Disables two-factor authentication for current user.',
  })
  @ApiBearerAuth('user_token')
  @ApiBearerAuth('admin_token')
  @ApiOkResponse({ description: '2FA disabled.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  async disable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.disable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------

  // ======================================== Web only social google & apple login ==============================================

  // google login
  @ApiOperation({
    summary: 'Google login (web)',
    description:
      'Starts Google OAuth redirect flow. Frontend should navigate browser to this URL, not call it via XHR.',
  })
  @ApiOkResponse({ description: 'Redirects to Google OAuth consent screen.' })
  @ApiExcludeEndpoint() // Hide from Swagger docs since it's a redirect callback
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin(): Promise<any> {
    return HttpStatus.OK;
  }

  @ApiOperation({
    summary: 'Google OAuth callback (web)',
    description:
      'OAuth callback endpoint. Usually called by Google after consent, returns app auth payload.',
  })
  @ApiOkResponse({
    description: 'Google login completed and auth payload returned.',
  })
  @ApiExcludeEndpoint() // Hide from Swagger docs since it's a redirect callback
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const { user, loginResponse } = req.user;

    // Now, return the JWT tokens and the user info
    return res.json({
      message: 'Logged in successfully via Google',
      authorization: loginResponse.authorization,
      user: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
      },
    });
  }

  // apple login
  @ApiOperation({
    summary: 'Apple login (web)',
    description:
      'Starts Apple OAuth redirect flow. Frontend should navigate browser to this URL, not call it via XHR.',
  })
  @ApiOkResponse({ description: 'Redirects to Apple sign-in page.' })
  @ApiExcludeEndpoint() // Hide from Swagger docs since it's a redirect callback
  @Get('apple')
  @UseGuards(AppleAuthGuard)
  async appleAuth(@Req() req) {
    return HttpStatus.OK;
  }

  @ApiOperation({
    summary: 'Apple OAuth callback (web)',
    description:
      'OAuth callback endpoint. Usually called by Apple after consent, returns app auth payload.',
  })
  @ApiOkResponse({
    description: 'Apple login completed and auth payload returned.',
  })
  @ApiExcludeEndpoint() // Hide from Swagger docs since it's a redirect callback
  @Get('apple/redirect')
  @UseGuards(AppleAuthGuard)
  @ApiExcludeEndpoint() // Hide from Swagger docs since it's a redirect callback
  async appleAuthRedirect(@Req() req, @Res() res: Response) {
    const { user, loginResponse } = req.user;

    return res.json({
      message: 'Logged in successfully via Apple',
      authorization: loginResponse.authorization,
      user: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
      },
    });
  }

  // ======================================== mobile only google login (Flutter) ==============================================
  @ApiOperation({
    summary: 'Google login (mobile)',
    description:
      'Accepts Google ID token from mobile client (Flutter/Android/iOS) and returns application auth payload.',
  })
  @ApiBody({ type: GoogleMobileDto })
  @ApiOkResponse({ description: 'Mobile Google login successful.' })
  @ApiBadRequestResponse({ description: 'Missing or invalid Google token.' })
  @Post('google/mobile')
  @UseGuards(AuthGuard('google-mobile'))
  async googleMobile(@Req() req: Request, @Body() _body: GoogleMobileDto) {
    // passport-custom strategy returns the final payload as req.user
    return req.user;
  }

  @ApiOperation({
    summary: 'Apple login (mobile)',
    description:
      'Accepts Apple identity token from mobile client (Flutter/iOS) and returns application auth payload.',
  })
  @ApiBody({ type: AppleMobileDto })
  @ApiOkResponse({ description: 'Mobile Apple login successful.' })
  @ApiBadRequestResponse({
    description: 'Missing or invalid Apple identity token.',
  })
  @Post('apple/mobile')
  @UseGuards(AuthGuard('apple-mobile'))
  async appleMobile(@Req() req: Request, @Body() _body: AppleMobileDto) {
    // passport-custom strategy returns the final payload as req.user
    return req.user;
  }
}
