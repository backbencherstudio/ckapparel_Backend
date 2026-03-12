// external imports
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Prisma } from '@prisma/client';

//internal imports
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { MailService } from '../../mail/mail.service';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { SazedStorage } from '../../common/lib/Disk/SazedStorage';
import { DateHelper } from '../../common/helper/date.helper';
import { StripePayment } from '../../common/lib/Payment/stripe/StripePayment';
import { StringHelper } from '../../common/helper/string.helper';
import { CreateUserDto } from './dto/create-user.dto';
import { NotificationRepository } from '../../common/repository/notification/notification.repository';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  private async createAuthNotification(
    receiverId: string,
    text: string,
    senderId?: string,
  ) {
    try {
      await NotificationRepository.createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        type: 'auth',
        text,
      });
    } catch (error) {
      console.error('Failed to create auth notification:', error);
    }
  }

  // async register({
  //   name,
  //   email,
  //   password,
  //   type,
  //   avatar,
  // }: {
  //   name: string;
  //   email: string;
  //   password: string;
  //   type?: string;
  //   avatar?: Express.Multer.File;
  // }) {
  //   try {
  //     // Check if email already exist
  //     const userEmailExist = await UserRepository.exist({
  //       field: 'email',
  //       value: String(email),
  //     });

  //     if (userEmailExist) {
  //       // Throwing HttpException allows you to set a specific status code (e.g., 409 Conflict)
  //       throw new HttpException('Email already exists', HttpStatus.CONFLICT);
  //     }

  //     let mediaUrl: string | undefined = undefined;

  //     if (avatar?.buffer) {
  //       try {
  //         const safeName = avatar.originalname
  //           .toLowerCase()
  //           .replace(/[^a-z0-9.\s-_]/g, '') // keep only valid chars
  //           .replace(/\s+/g, '-') // spaces → -
  //           .replace(/-+/g, '-'); // remove double dashes

  //         const fileName = `${StringHelper.randomString()}-${safeName}`;

  //         await SazedStorage.put(
  //           `${appConfig().storageUrl.avatar}/${fileName}`,
  //           avatar.buffer,
  //         );

  //         mediaUrl = SazedStorage.url(
  //           encodeURI(`${appConfig().storageUrl.avatar}/${fileName}`),
  //         );
  //       } catch (error) {
  //         console.error('Failed to upload avatar:', error);
  //         throw new Error(`Failed to upload avatar: ${error.message}`);
  //       }
  //     }

  //     const user = await UserRepository.createUser({
  //       name: name,
  //       email: email,
  //       password: password,
  //       type: type,
  //       avatar: mediaUrl,
  //     });

  //     if (user == null && user.success == false) {
  //       return {
  //         success: false,
  //         message: 'Failed to create account',
  //       };
  //     }

  //     // create stripe customer account
  //     const stripeCustomer = await StripePayment.createCustomer({
  //       user_id: user.data.id,
  //       email: email,
  //       name: name,
  //     });

  //     if (stripeCustomer) {
  //       await this.prisma.user.update({
  //         where: {
  //           id: user.data.id,
  //         },
  //         data: {
  //           billing_id: stripeCustomer.id,
  //         },
  //       });
  //     }

  //     // ----------------------------------------------------
  //     // // create otp code
  //     // const token = await UcodeRepository.createToken({
  //     //   userId: user.data.id,
  //     //   isOtp: true,
  //     // });

  //     // // send otp code to email
  //     // await this.mailService.sendOtpCodeToEmail({
  //     //   email: email,
  //     //   name: name,
  //     //   otp: token,
  //     // });

  //     // return {
  //     //   success: true,
  //     //   message: 'We have sent an OTP code to your email',
  //     // };

  //     // ----------------------------------------------------

  //     // // Generate verification token
  //     // const token = await UcodeRepository.createVerificationToken({
  //     //   userId: user.data.id,
  //     //   email: email,
  //     // });

  //     // // Send verification email with token
  //     // await this.mailService.sendVerificationLink({
  //     //   email,
  //     //   name: email,
  //     //   token: token.token,
  //     //   type: type,
  //     // });

  //     return {
  //       success: true,
  //       message: 'Account created successfully',
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: error.message,
  //     };
  //   }
  // }

  // //   {
  // //   "name": "Sazedul Islam",
  // //   "first_name": "Sazedul",
  // //   "last_name": "Islam",
  // //   "email": "sazedulislam9126@gmail.com",
  // //   "password": "123456789",
  // //   "type": "user"
  // // }

  async me(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          avatar: true,
          address: true,
          phone_number: true,
          city: true,
          state: true,
          country: true,
          type: true,
          gender: true,
          date_of_birth: true,
          created_at: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user) {
        return {
          success: true,
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Step 1: Request registration - sends OTP, stores data temporarily
   */
  async requestRegistration({
    name,
    email,
    phone_number,
    date_of_birth,
    password,
    type,
    avatar,
  }: {
    name: string;
    email: string;
    password: string;
    phone_number?: string;
    type?: string;
    date_of_birth?: string;
    avatar?: Express.Multer.File;
  }) {
    try {
      // Check if email already exists
      const userEmailExist = await UserRepository.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        throw new ConflictException('Email already exists');
      }

      const emailAlreadyExistInDB = await this.prisma.user.findUnique({
        where: { email },
      });

      if (emailAlreadyExistInDB) {
        throw new ConflictException('Email already exists');
      }

      // Generate OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString();

      // Store registration data temporarily in Redis (expires in 15 minutes)
      const registrationData = {
        name,
        email,
        phone_number,
        date_of_birth,
        password,
        type,
        avatarBuffer: avatar?.buffer ? avatar.buffer.toString('base64') : null,
        avatarOriginalName: avatar?.originalname || null,
      };

      console.log('Storing registration data for:', email);

      await this.redis.setex(
        `registration_pending:${email}`,
        900, // 15 minutes
        JSON.stringify(registrationData),
      );

      // Store OTP separately
      await this.redis.setex(
        `registration_otp:${email}`,
        900, // 15 minutes
        otp,
      );

      console.log('OTP generated and stored:', otp);

      // Send OTP to email
      await this.mailService.sendOtpCodeToEmail({
        email,
        name,
        otp,
      });

      return {
        success: true,
        message: 'We have sent a verification code to your email',
        otp, // For testing only - remove in production
      };
    } catch (error) {
      const details = error?.message ?? 'Registration request failed';
      throw new BadRequestException(details);
    }
  }

  /**
   * Step 2: Verify OTP and complete registration
   */
  async verifyAndRegister({ email, otp }: { email: string; otp: string }) {
    try {
      // Verify OTP
      const storedOtp = await this.redis.get(`registration_otp:${email}`);

      if (!storedOtp || storedOtp !== otp) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      // Get registration data
      const registrationDataJson = await this.redis.get(
        `registration_pending:${email}`,
      );

      if (!registrationDataJson) {
        throw new BadRequestException(
          'Registration data expired. Please register again',
        );
      }

      const registrationData = JSON.parse(registrationDataJson);

      // Upload avatar if exists
      let mediaUrl: string | undefined = undefined;

      if (
        registrationData.avatarBuffer &&
        registrationData.avatarOriginalName
      ) {
        try {
          const buffer = Buffer.from(registrationData.avatarBuffer, 'base64');
          const safeName = registrationData.avatarOriginalName
            .toLowerCase()
            .replace(/[^a-z0-9.\s-_]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

          const fileName = `${StringHelper.randomString()}-${safeName}`;

          await SazedStorage.put(
            `${appConfig().storageUrl.avatar}/${fileName}`,
            buffer,
          );

          mediaUrl = SazedStorage.url(
            encodeURI(`${appConfig().storageUrl.avatar}/${fileName}`),
          );
        } catch (error) {
          console.error('Failed to upload avatar:', error);
        }
      }

      // Create user
      const user = await UserRepository.createUser({
        name: registrationData.name,
        email: registrationData.email,
        phone_number: registrationData.phone_number,
        date_of_birth: registrationData.date_of_birth
          ? DateHelper.format(registrationData.date_of_birth)
          : undefined,
        password: registrationData.password,
        type: registrationData.type,
        avatar: mediaUrl,
      });

      console.log('User creation result:', user);

      if (!user || !user.data || !user.data.id) {
        console.error('User creation failed. Result:', JSON.stringify(user));
        throw new BadRequestException(
          'Failed to create account. Please try again.',
        );
      }

      // Mark email as verified immediately
      await this.prisma.user.update({
        where: { id: user.data.id },
        data: { email_verified_at: new Date() },
      });

      // Create Stripe customer account
      try {
        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.data.id,
          email: registrationData.email,
          name: registrationData.name,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.data.id },
            data: { billing_id: stripeCustomer.id },
          });
        }
      } catch (error) {
        console.error('Failed to create Stripe customer:', error);
      }

      await this.createAuthNotification(
        user.data.id,
        `Welcome to ${appConfig().app.name}. Your account has been created successfully.`,
      );

      // Clean up Redis
      await this.redis.del(`registration_pending:${email}`);
      await this.redis.del(`registration_otp:${email}`);

      // Auto-login after successful registration verification
      const loginResponse = await this.login({
        email: registrationData.email,
        userId: user.data.id,
      });

      return {
        success: true,
        message:
          'Registration completed successfully. Please setup your profile.',
        authorization: loginResponse.authorization,
        type: loginResponse.type,
      };
    } catch (error) {
      console.error('verifyAndRegister error:', error);
      const details = error?.message ?? 'Registration verification failed';
      throw new BadRequestException(details);
    }
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    avatar?: Express.Multer.File,
  ) {
    try {
      const data: any = {};
      if (updateUserDto.name) {
        data.name = updateUserDto.name;
      }
      if (updateUserDto.phone_number) {
        data.phone_number = updateUserDto.phone_number;
      }
      if (updateUserDto.country) {
        data.country = updateUserDto.country;
      }
      if (updateUserDto.state) {
        data.state = updateUserDto.state;
      }
      if (updateUserDto.city) {
        data.city = updateUserDto.city;
      }
      if (updateUserDto.zip_code) {
        data.zip_code = updateUserDto.zip_code;
      }
      if (updateUserDto.address) {
        data.address = updateUserDto.address;
      }
      if (updateUserDto.gender) {
        data.gender = updateUserDto.gender;
      }
      if (updateUserDto.date_of_birth) {
        data.date_of_birth = DateHelper.format(updateUserDto.date_of_birth);
      }

      let mediaUrl: string | undefined;

      if (avatar?.buffer) {
        try {
          // 1. Upload new avatar
          const safeName = avatar.originalname
            .toLowerCase()
            .replace(/[^a-z0-9.\s-_]/g, '') // keep only valid chars
            .replace(/\s+/g, '-') // spaces → -
            .replace(/-+/g, '-'); // remove double dashes

          const fileName = `${StringHelper.randomString()}-${safeName}`;
          const key = `${appConfig().storageUrl.avatar}/${fileName}`;

          await SazedStorage.put(key, avatar.buffer);
          mediaUrl = SazedStorage.url(encodeURI(key));

          // 2. Get old avatar (if any)
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true },
          });

          // 3. Delete old avatar if exists and is not empty
          if (user?.avatar) {
            try {
              // If avatar stored is a full URL -> extract its path
              const url = new URL(user.avatar);
              const oldKey = url.pathname.replace(/^\/+/, ''); // remove leading slash

              await SazedStorage.delete(oldKey);
            } catch {
              // If it wasn't a URL, assume it is the actual storage key
              await SazedStorage.delete(user.avatar);
            }
          }

          // 4. Update user's avatar
          data.avatar = mediaUrl;
        } catch (err: any) {
          console.warn('Avatar upload failed:', err.message || err);
        }
      }

      const user = await UserRepository.getUserDetails(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...data,
          },
        });

        await this.createAuthNotification(
          user.id,
          'Your account profile information has been updated.',
        );

        return {
          success: true,
          message: 'User updated successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async validateUser(
    email: string,
    pass: string,
    token?: string,
  ): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await UserRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        const { password, ...result } = user;
        if (user.is_two_factor_enabled) {
          if (token) {
            const isValid = await UserRepository.verify2FA(user.id, token);
            if (!isValid) {
              throw new UnauthorizedException('Invalid token');
              // return {
              //   success: false,
              //   message: 'Invalid token',
              // };
            }
          } else {
            throw new UnauthorizedException('Token is required');
            // return {
            //   success: false,
            //   message: 'Token is required',
            // };
          }
        }
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
        // return {
        //   success: false,
        //   message: 'Password not matched',
        // };
      }
    } else {
      throw new UnauthorizedException('Email not found');
      // return {
      //   success: false,
      //   message: 'Email not found',
      // };
    }
  }

  async login({ email, userId }) {
    try {
      const payload = { email: email, sub: userId };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      const user = await UserRepository.getUserDetails(userId);

      // store refreshToken
      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        'EX',
        60 * 60 * 24 * 7, // 7 days in seconds
      );

      await this.createAuthNotification(
        user.id,
        'New login detected on your account.',
      );

      return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        type: user.type,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // google log in using passport.js
  async googleLogin({ email, userId }: { email: string; userId: string }) {
    try {
      const payload = { email: email, sub: userId };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      const user = await UserRepository.getUserDetails(userId);

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        'EX',
        60 * 60 * 24 * 7,
      );

      // create stripe customer account id
      try {
        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { billing_id: stripeCustomer.id },
          });
        }
      } catch (error) {
        return {
          success: false,
          message: 'User created but failed to create billing account',
        };
      }

      return {
        message: 'Logged in successfully',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        type: user.type,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // apple log in using passport.js
  async appleLogin({
    email,
    userId,
    aud,
  }: {
    email: string;
    userId: string;
    aud: string;
  }) {
    try {
      const payload = { email, sub: userId, aud };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      const user = await UserRepository.getUserDetails(userId);

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        'EX',
        60 * 60 * 24 * 7,
      );

      // create stripe customer account id
      try {
        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { billing_id: stripeCustomer.id },
          });
        }
      } catch (error) {
        return {
          success: false,
          message: 'User created but failed to create billing account',
        };
      }

      return {
        message: 'Logged in successfully',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        type: user.type,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async refreshToken(user_id: string, refreshToken: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);

      if (!storedToken || storedToken != refreshToken) {
        return {
          success: false,
          message: 'Refresh token is required',
        };
      }

      if (!user_id) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const userDetails = await UserRepository.getUserDetails(user_id);
      if (!userDetails) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const payload = { email: userDetails.email, sub: userDetails.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

      return {
        success: true,
        authorization: {
          type: 'bearer',
          access_token: accessToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async revokeRefreshToken(user_id: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);
      if (!storedToken) {
        return {
          success: false,
          message: 'Refresh token not found',
        };
      }

      await this.redis.del(`refresh_token:${user_id}`);

      return {
        success: true,
        message: 'Refresh token revoked successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async forgotPassword(email) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        await this.createAuthNotification(
          user.id,
          'Password reset code was requested for your account.',
        );

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
          otp: token, // For testing only - remove in production
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // verify otp
  async verifyOtp({ email, otp }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: otp,
        });

        if (existToken) {
          return {
            success: true,
            message: 'OTP verified successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid OTP',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resetPassword({ email, token, password }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await UserRepository.changePassword({
            email: email,
            password: password,
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: email,
            token: token,
          });

          await this.createAuthNotification(
            user.id,
            'Your account password has been changed successfully.',
          );

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verifyEmail({ email, token }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email_verified_at: new Date(Date.now()),
            },
          });

          // delete otp code
          // await UcodeRepository.deleteToken({
          //   email: email,
          //   token: token,
          // });

          await this.createAuthNotification(
            user.id,
            'Your email has been verified successfully.',
          );

          return {
            success: true,
            message: 'Email verified successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const user = await UserRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a verification code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await UserRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await UserRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          await this.createAuthNotification(
            user.id,
            'Your account password has been changed successfully.',
          );

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid password',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        await this.createAuthNotification(
          user.id,
          `Email change requested to ${email}.`,
        );

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
          otp: token, // For testing only - remove in production
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await UserRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          console.log('Email updated in database for user:', user);

          // delete otp code
          await UcodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          await this.createAuthNotification(
            user.id,
            `Your account email has been changed to ${new_email}.`,
          );

          return {
            success: true,
            message: 'Email updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // --------- 2FA ---------
  async generate2FASecret(user_id: string) {
    try {
      return await UserRepository.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verify2FA(user_id: string, token: string) {
    try {
      const isValid = await UserRepository.verify2FA(user_id, token);
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid token',
        };
      }
      return {
        success: true,
        message: '2FA verified successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async enable2FA(user_id: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        await UserRepository.enable2FA(user_id);
        await this.createAuthNotification(
          user.id,
          'Two-factor authentication has been enabled on your account.',
        );
        return {
          success: true,
          message: '2FA enabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async disable2FA(user_id: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        await UserRepository.disable2FA(user_id);
        await this.createAuthNotification(
          user.id,
          'Two-factor authentication has been disabled on your account.',
        );
        return {
          success: true,
          message: '2FA disabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------

  //  =====================================================================
  async handleGoogleProfile(input: {
    googleId: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  }) {
    const googleId = input.googleId;
    const email = input.email?.toLowerCase?.() ?? undefined;
    const firstName = input.firstName ?? undefined;
    const lastName = input.lastName ?? undefined;
    const avatar = input.avatar ?? undefined;

    if (!googleId) {
      throw new HttpException('googleId is required', HttpStatus.BAD_REQUEST);
    }

    // 1) Try by google_id first
    let user = await this.prisma.user.findUnique({
      where: { google_id: googleId },
    });

    // 2) If not found, try by email and link google_id
    if (!user && email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (byEmail) {
        const enrichData: Prisma.UserUpdateInput = {
          google_id: byEmail.google_id ?? googleId,
          first_name: byEmail.first_name ?? firstName,
          last_name: byEmail.last_name ?? lastName,
          name:
            byEmail.name ??
            ([firstName, lastName].filter(Boolean).join(' ').trim() || null),
          avatar: byEmail.avatar ?? avatar,
          email_verified_at: byEmail.email_verified_at ?? new Date(),
        };

        try {
          user = await this.prisma.user.update({
            where: { id: byEmail.id },
            data: enrichData,
          });
        } catch (e: any) {
          if (e?.code === 'P2002') {
            throw new HttpException(
              'Google account is already linked to another user',
              HttpStatus.CONFLICT,
            );
          }
          throw e;
        }
      }
    }

    // 3) If still not found, create a new user
    if (!user) {
      const baseData: Prisma.UserCreateInput = {
        google_id: googleId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        name: [firstName, lastName].filter(Boolean).join(' ').trim() || null,
        avatar: avatar,
        email_verified_at: email ? new Date() : undefined,
      };

      try {
        user = await this.prisma.user.create({ data: baseData });
      } catch (e: any) {
        // In case of a race (or unique constraint), recover by fetching the existing user.
        if (e?.code === 'P2002') {
          const existing = await this.prisma.user.findUnique({
            where: { google_id: googleId },
          });
          if (existing) {
            user = existing;
          } else {
            throw e;
          }
        } else {
          throw e;
        }
      }
    }

    // IMPORTANT: For mobile login, enforce the same geo rules as normal login.
    const loginResponse = await this.login({
      email: user.email,
      userId: user.id,
    });

    return {
      success: true,
      statusCode: 200,
      message: loginResponse?.message ?? 'Logged in successfully',
      authorization: loginResponse?.authorization,
      type: loginResponse?.type ?? user?.type,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    };
  }

  async handleAppleProfile(input: {
    appleId: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }) {
    const appleId = input.appleId;
    const email = input.email?.toLowerCase?.() ?? undefined;
    const firstName = input.firstName ?? undefined;
    const lastName = input.lastName ?? undefined;

    if (!appleId) {
      throw new HttpException('appleId is required', HttpStatus.BAD_REQUEST);
    }

    // Validate email format if provided
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
    }

    // 1) Try by apple_id first
    let user = await this.prisma.user.findUnique({
      where: { apple_id: appleId },
    });

    // 2) If not found, try by email and link apple_id (best effort)
    if (!user && email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (byEmail) {
        const enrichData: Prisma.UserUpdateInput = {
          apple_id: byEmail.apple_id ?? appleId,
          first_name: byEmail.first_name ?? firstName,
          last_name: byEmail.last_name ?? lastName,
          name:
            byEmail.name ??
            ([firstName, lastName].filter(Boolean).join(' ').trim() || null),
          email_verified_at: byEmail.email_verified_at ?? new Date(),
        };

        try {
          user = await this.prisma.user.update({
            where: { id: byEmail.id },
            data: enrichData,
          });
        } catch (e: any) {
          if (e?.code === 'P2002') {
            throw new HttpException(
              'Apple account is already linked to another user',
              HttpStatus.CONFLICT,
            );
          }
          throw e;
        }
      }
    }

    // 3) If still not found, create a new user
    if (!user) {
      let resolvedEmail = email ?? `apple_${appleId}@appleid.local`;

      // Check if email already exists (for placeholder emails)
      if (!email) {
        const existingWithEmail = await this.prisma.user.findUnique({
          where: { email: resolvedEmail },
        });
        if (existingWithEmail) {
          // Generate unique placeholder email
          resolvedEmail = `apple_${appleId}_${StringHelper.randomString(8)}@appleid.local`;
        }
      }

      const baseData: Prisma.UserCreateInput = {
        apple_id: appleId,
        email: resolvedEmail,
        first_name: firstName,
        last_name: lastName,
        name: [firstName, lastName].filter(Boolean).join(' ').trim() || null,
        email_verified_at: new Date(),
      };

      try {
        user = await this.prisma.user.create({ data: baseData });
      } catch (e: any) {
        if (e?.code === 'P2002') {
          // If this was a race on apple_id, recover by fetching.
          const existing = await this.prisma.user.findUnique({
            where: { apple_id: appleId },
          });
          if (existing) {
            user = existing;
          } else {
            // If the generated placeholder email still collides, make it more unique.
            baseData.email = `apple_${appleId}_${StringHelper.randomString(12)}@appleid.local`;
            user = await this.prisma.user.create({ data: baseData });
          }
        } else {
          throw e;
        }
      }
    }

    const loginResponse = await this.login({
      email: user.email,
      userId: user.id,
    });

    return {
      success: true,
      statusCode: 200,
      message: loginResponse?.message ?? 'Logged in successfully',
      authorization: loginResponse?.authorization,
      type: loginResponse?.type ?? user?.type,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    };
  }
}
