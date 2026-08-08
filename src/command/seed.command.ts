import { Command, CommandRunner } from 'nest-commander';
import appConfig from '../config/app.config';
import { StringHelper } from '../common/helper/string.helper';
import { UserRepository } from '../common/repository/user/user.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionPlan,
  PlanCategory,
  TrainingPlansCategory,
  ChallengePath,
  ChallengeCategory,
  ChallengeDifficulty,
  MetricType,
  ConversationType,
  MessageStatus,
  MessageKind,
  CallKind,
  ReportStatus,
  FitnessProvider,
  SyncedActivityStatus,
  ChallengeStatus,
  ParticipationStatus,
  CheckpointStatus,
  SponsorshipStatus,
  NeedCategory,
  Interval,
  MemberRole,
} from '@prisma/client';

@Command({ name: 'seed', description: 'prisma db seed' })
export class SeedCommand extends CommandRunner {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async run(passedParam: string[]): Promise<void> {
    await this.seed(passedParam);
  }

  async seed(param: string[]) {
    try {
      console.log(`Prisma Env: ${process.env.PRISMA_ENV}`);
      console.log('Seeding started...');

      // Seed in deterministic order to maintain referential integrity
      await this.plantypesSeed();
      await this.roleSeed();
      await this.permissionSeed();
      await this.settingSeed();
      await this.notificationEventSeed();
      await this.subsPlanSeed();
      await this.userSeed();
      await this.permissionRoleSeed();
      await this.faqSeed();
      await this.contactSeed();
      await this.socialMediaSeed();
      await this.websiteInfoSeed();
      await this.planTypeSupportSeed();
      await this.challengeSeed();
      await this.conversationAndMessageSeed();

      console.log('Seeding done.');
    } catch (error) {
      console.error('Seeding error:', error);
      throw error;
    }
  }

  //---- User Section ----
  async userSeed() {
    const defaultAdminEmail = appConfig().defaultUser.system.email;

    const existingSystemUser = await this.prisma.user.findUnique({
      where: { email: defaultAdminEmail },
      select: { id: true },
    });

    // default admin user
    const systemUser =
      existingSystemUser ||
      (await UserRepository.createSuAdminUser({
        username: appConfig().defaultUser.system.username,
        email: defaultAdminEmail,
        password: appConfig().defaultUser.system.password,
      }));

    await this.prisma.roleUser.createMany({
      data: [
        {
          role_id: '1',
          user_id: systemUser.id,
        },
      ],
      skipDuplicates: true,
    });

    // Create additional users for testing
    const userDataList = [
      {
        username: 'john_doe',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        name: 'John Doe',
        password: 'password123',
        status: 1,
        type: 'user',
        country: 'USA',
        state: 'California',
        city: 'Los Angeles',
        gender: 'male',
        age: 28,
        bio: 'Fitness enthusiast and marathon runner',
        phone_number: '+1234567890',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      },
      {
        username: 'jane_smith',
        email: 'jane@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        name: 'Jane Smith',
        password: 'password123',
        status: 1,
        type: 'user',
        country: 'UK',
        state: 'London',
        city: 'London',
        gender: 'female',
        age: 32,
        bio: 'Cycling coach and nutritionist',
        phone_number: '+447890123456',
        avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
      },
      {
        username: 'mike_wilson',
        email: 'mike@example.com',
        first_name: 'Mike',
        last_name: 'Wilson',
        name: 'Mike Wilson',
        password: 'password123',
        status: 1,
        type: 'user',
        country: 'Canada',
        state: 'Ontario',
        city: 'Toronto',
        gender: 'male',
        age: 35,
        bio: 'Ultra-marathon runner and triathlete',
        phone_number: '+14165551234',
        avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
      },
      {
        username: 'sarah_johnson',
        email: 'sarah@example.com',
        first_name: 'Sarah',
        last_name: 'Johnson',
        name: 'Sarah Johnson',
        password: 'password123',
        status: 1,
        type: 'user',
        country: 'Australia',
        state: 'NSW',
        city: 'Sydney',
        gender: 'female',
        age: 27,
        bio: 'Swimmer and fitness blogger',
        phone_number: '+61412345678',
        avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      },
      {
        username: 'alex_brown',
        email: 'alex@example.com',
        first_name: 'Alex',
        last_name: 'Brown',
        name: 'Alex Brown',
        password: 'password123',
        status: 1,
        type: 'user',
        country: 'Germany',
        state: 'Berlin',
        city: 'Berlin',
        gender: 'other',
        age: 30,
        bio: 'CrossFit athlete and personal trainer',
        phone_number: '+4915123456789',
        avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
      },
      {
        username: 'emma_davis',
        email: 'emma@example.com',
        first_name: 'Emma',
        last_name: 'Davis',
        name: 'Emma Davis',
        password: 'password123',
        status: 1,
        type: 'user',
        country: 'France',
        state: 'Île-de-France',
        city: 'Paris',
        gender: 'female',
        age: 29,
        bio: 'Yoga instructor and wellness advocate',
        phone_number: '+33123456789',
        avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
      },
    ];

    for (const userData of userDataList) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userData.email },
        select: { id: true },
      });

      let user;
      if (!existingUser) {
        const result = await UserRepository.createUser({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          type: userData.type,
          phone_number: userData.phone_number,
          avatar: userData.avatar,
        });

        if (!result.success) {
          console.error(
            `Failed to create user ${userData.email}: ${result.message}`,
          );
          continue;
        }

        user = result.data;

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name,
            status: userData.status,
            country: userData.country,
            state: userData.state,
            city: userData.city,
            gender: userData.gender,
            age: userData.age,
            bio: userData.bio,
            email_verified_at: new Date(),
            lastSeenAt: new Date(),
          },
        });

        await this.prisma.roleUser.create({
          data: {
            role_id: '2',
            user_id: user.id,
          },
        });

        await this.prisma.userSetting.createMany({
          data: [
            {
              user_id: user.id,
              setting_id: '1',
              value: 'dark',
            },
            {
              user_id: user.id,
              setting_id: '2',
              value: 'en',
            },
          ],
        });

        await this.prisma.ucode.create({
          data: {
            user_id: user.id,
            token: `token_${user.id}`,
            email: userData.email,
            expired_at: new Date(Date.now() + 86400000),
          },
        });

        await this.prisma.notification.createMany({
          data: [
            {
              receiver_id: user.id,
              sender_id: systemUser.id,
              notification_event_id: '1',
              entity_id: user.id,
            },
            {
              receiver_id: user.id,
              sender_id: systemUser.id,
              notification_event_id: '3',
              entity_id: 'challenge_1',
            },
          ],
        });
      }
    }

    const allUsers = await this.prisma.user.findMany({
      where: {
        email: {
          in: ['john@example.com', 'jane@example.com', 'mike@example.com'],
        },
      },
      select: { id: true },
    });

    for (const user of allUsers) {
      const existingConn = await this.prisma.externalConnection.findFirst({
        where: { user_id: user.id, provider: FitnessProvider.STRAVA },
      });

      if (!existingConn) {
        await this.prisma.externalConnection.create({
          data: {
            user_id: user.id,
            provider: FitnessProvider.STRAVA,
            provider_user_id: `strava_${user.id}`,
            access_token: `strava_token_${user.id}`,
            refresh_token: `strava_refresh_${user.id}`,
            token_expires_at: new Date(Date.now() + 3600000),
            scope: 'read,activity:read_all',
            is_active: true,
            last_sync_at: new Date(),
          },
        });
      }
    }

    for (const user of allUsers.slice(0, 2)) {
      const existingSub = await this.prisma.subscription.findFirst({
        where: { userId: user.id },
      });

      if (!existingSub) {
        await this.prisma.subscription.create({
          data: {
            userId: user.id,
            planId: '2',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 86400000),
            status: 'active',
            type: 'PREMIUM',
            isActive: true,
            cancelAtPeriodEnd: false,
            isTrial: false,
          },
        });
      }
    }

    console.log('Users seeded successfully');
  }

  //---- Role Section ----
  async roleSeed() {
    await this.prisma.role.createMany({
      data: [
        {
          id: '1',
          title: 'Admin',
          name: 'admin',
          status: 1,
        },
        {
          id: '2',
          title: 'Normal User',
          name: 'user',
          status: 1,
        },
        {
          id: '3',
          title: 'Content Manager',
          name: 'content_manager',
          status: 1,
        },
        {
          id: '4',
          title: 'Challenge Moderator',
          name: 'challenge_moderator',
          status: 1,
        },
      ],
      skipDuplicates: true,
    });
    console.log('Roles seeded successfully');
  }

  //---- Permission Section ----
  async permissionSeed() {
    let i = 0;
    const permissions = [];
    const permissionGroups = [
      { title: 'system_tenant_management', subject: 'SystemTenant' },
      { title: 'user_management', subject: 'User' },
      { title: 'role_management', subject: 'Role' },
      { title: 'Project', subject: 'Project' },
      {
        title: 'Task',
        subject: 'Task',
        scope: ['read', 'create', 'update', 'show', 'delete', 'assign'],
      },
      { title: 'Comment', subject: 'Comment' },
      {
        title: 'Challenge',
        subject: 'Challenge',
        scope: [
          'read',
          'create',
          'update',
          'show',
          'delete',
          'approve',
          'manage',
        ],
      },
      {
        title: 'Subscription',
        subject: 'Subscription',
        scope: ['read', 'create', 'update', 'show', 'delete'],
      },
      {
        title: 'Report',
        subject: 'Report',
        scope: ['read', 'update', 'show', 'delete', 'review'],
      },
    ];

    for (const permissionGroup of permissionGroups) {
      if (permissionGroup['scope']) {
        for (const permission of permissionGroup['scope']) {
          permissions.push({
            id: String(++i),
            title: permissionGroup.title + '_' + permission,
            action: StringHelper.cfirst(permission),
            subject: permissionGroup.subject,
            status: 1,
          });
        }
      } else {
        for (const permission of [
          'read',
          'create',
          'update',
          'show',
          'delete',
        ]) {
          permissions.push({
            id: String(++i),
            title: permissionGroup.title + '_' + permission,
            action: StringHelper.cfirst(permission),
            subject: permissionGroup.subject,
            status: 1,
          });
        }
      }
    }

    await this.prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });
    console.log('Permissions seeded successfully');
  }

  //---- Permission Role Section ----
  async permissionRoleSeed() {
    const all_permissions = await this.prisma.permission.findMany();

    const adminPermissionRoleArray = [];
    for (const admin_permission of all_permissions) {
      adminPermissionRoleArray.push({
        role_id: '1',
        permission_id: admin_permission.id,
      });
    }
    await this.prisma.permissionRole.createMany({
      data: adminPermissionRoleArray,
      skipDuplicates: true,
    });

    const contentManagerPermissions = all_permissions.filter(
      function (permission) {
        return (
          permission.title.includes('Challenge') ||
          permission.title.includes('Project') ||
          permission.title.includes('Task') ||
          permission.title.includes('Comment') ||
          permission.title.includes('Report_read') ||
          permission.title.includes('Report_show')
        );
      },
    );

    const contentManagerPermissionRoleArray = [];
    for (const permission of contentManagerPermissions) {
      contentManagerPermissionRoleArray.push({
        role_id: '3',
        permission_id: permission.id,
      });
    }
    await this.prisma.permissionRole.createMany({
      data: contentManagerPermissionRoleArray,
      skipDuplicates: true,
    });

    const user_permissions = all_permissions.filter(function (permission) {
      return (
        permission.title == 'Project_read' ||
        permission.title == 'Project_show' ||
        permission.title == 'Task_read' ||
        permission.title == 'Task_show' ||
        permission.title == 'Comment_read' ||
        permission.title == 'Challenge_read' ||
        permission.title == 'Challenge_show' ||
        permission.title == 'Report_read' ||
        permission.title == 'Report_show'
      );
    });

    const userPermissionRoleArray = [];
    for (const user_permission of user_permissions) {
      userPermissionRoleArray.push({
        role_id: '2',
        permission_id: user_permission.id,
      });
    }
    await this.prisma.permissionRole.createMany({
      data: userPermissionRoleArray,
      skipDuplicates: true,
    });

    console.log('Permission roles seeded successfully');
  }

  //---- Subscription Plans Section ----
  async subsPlanSeed() {
    const plans = [
      {
        id: '1',
        name: 'Free',
        slug: 'free',
        description: 'Basic plan with limited features',
        isFree: true,
        type: SubscriptionPlan.FREE,
        trialDays: 0,
      },
      {
        id: '2',
        name: 'Premium Monthly',
        slug: 'premium_monthly',
        description: 'Full access with monthly billing',
        isFree: false,
        price: 9.99,
        currency: 'USD',
        interval: Interval.MONTH,
        intervalCount: 1,
        type: SubscriptionPlan.PREMIUM,
        trialDays: 7,
        stripeProductId: 'prod_monthly_1',
        stripePriceId: 'price_monthly_1',
      },
      {
        id: '3',
        name: 'Premium Yearly',
        slug: 'premium_yearly',
        description: 'Full access with yearly billing (save 20%)',
        isFree: false,
        price: 99.99,
        currency: 'USD',
        interval: Interval.YEAR,
        intervalCount: 1,
        type: SubscriptionPlan.PREMIUM,
        trialDays: 7,
        stripeProductId: 'prod_yearly_1',
        stripePriceId: 'price_yearly_1',
      },
    ];

    await this.prisma.subsPlan.createMany({
      data: plans,
      skipDuplicates: true,
    });
    console.log('Subscription plans seeded successfully');
  }

  //---- Settings Section ----
  async settingSeed() {
    const settings = [
      {
        id: '1',
        category: 'Appearance',
        label: 'Theme',
        description: 'Application theme preference',
        key: 'appearance_theme',
        default_value: 'light',
      },
      {
        id: '2',
        category: 'Localization',
        label: 'Language',
        description: 'Preferred language',
        key: 'locale_language',
        default_value: 'en',
      },
      {
        id: '3',
        category: 'Notifications',
        label: 'Email Notifications',
        description: 'Receive email notifications',
        key: 'notification_email',
        default_value: 'true',
      },
      {
        id: '4',
        category: 'Privacy',
        label: 'Profile Visibility',
        description: 'Who can see your profile',
        key: 'privacy_profile_visibility',
        default_value: 'public',
      },
      {
        id: '5',
        category: 'Fitness',
        label: 'Default Unit',
        description: 'Preferred unit system',
        key: 'fitness_unit_system',
        default_value: 'metric',
      },
    ];

    await this.prisma.setting.createMany({
      data: settings,
      skipDuplicates: true,
    });
    console.log('Settings seeded successfully');
  }

  //---- Notification Events Section ----
  async notificationEventSeed() {
    const events = [
      {
        id: '1',
        type: 'user_follow',
        text: 'Someone started following you',
      },
      {
        id: '2',
        type: 'challenge_invite',
        text: 'You have been invited to a challenge',
      },
      {
        id: '3',
        type: 'challenge_start',
        text: 'Your challenge is about to start',
      },
      {
        id: '4',
        type: 'challenge_complete',
        text: 'You have completed a challenge',
      },
      {
        id: '5',
        type: 'message_received',
        text: 'You received a new message',
      },
      {
        id: '6',
        type: 'checkpoint_unlocked',
        text: 'You have unlocked a new checkpoint',
      },
      {
        id: '7',
        type: 'subscription_expiry',
        text: 'Your subscription is about to expire',
      },
      {
        id: '8',
        type: 'report_resolved',
        text: 'Your report has been reviewed and resolved',
      },
    ];

    await this.prisma.notificationEvent.createMany({
      data: events,
      skipDuplicates: true,
    });
    console.log('Notification events seeded successfully');
  }

  //---- FAQ Section ----
  async faqSeed() {
    const faqs = [
      {
        id: '1',
        question: 'How do I get started?',
        answer:
          'Create an account, choose a subscription plan, and join your first challenge!',
        sort_order: 1,
        status: 1,
      },
      {
        id: '2',
        question: 'Can I join multiple challenges?',
        answer:
          'Yes, you can join as many active challenges as you want, limited only by your subscription tier.',
        sort_order: 2,
        status: 1,
      },
      {
        id: '3',
        question: 'How are challenges verified?',
        answer:
          'Challenges are verified through GPS data, Strava integration, and manual submission review by our moderators.',
        sort_order: 3,
        status: 1,
      },
      {
        id: '4',
        question: 'What happens if I cancel my subscription?',
        answer:
          'You will lose access to premium features but can still view your completed challenges and basic profile information.',
        sort_order: 4,
        status: 1,
      },
      {
        id: '5',
        question: 'Can I create my own challenge?',
        answer:
          'Yes, premium users can create and manage their own challenges for the community.',
        sort_order: 5,
        status: 1,
      },
    ];

    await this.prisma.faq.createMany({
      data: faqs,
      skipDuplicates: true,
    });
    console.log('FAQs seeded successfully');
  }

  //---- Contact Section ----
  async contactSeed() {
    const contacts = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone_number: '+1234567890',
        message: 'I love the platform! How can I contribute more?',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone_number: '+447890123456',
        message: 'Need help with my subscription upgrade.',
      },
    ];

    await this.prisma.contact.createMany({
      data: contacts,
      skipDuplicates: true,
    });
    console.log('Contacts seeded successfully');
  }

  //---- Social Media Section ----
  async socialMediaSeed() {
    const socialMedias = [
      {
        id: '1',
        name: 'Facebook',
        url: 'https://facebook.com/challengehub',
        icon: 'fa-facebook',
        sort_order: 1,
        status: 1,
      },
      {
        id: '2',
        name: 'Twitter',
        url: 'https://twitter.com/challengehub',
        icon: 'fa-twitter',
        sort_order: 2,
        status: 1,
      },
      {
        id: '3',
        name: 'Instagram',
        url: 'https://instagram.com/challengehub',
        icon: 'fa-instagram',
        sort_order: 3,
        status: 1,
      },
      {
        id: '4',
        name: 'YouTube',
        url: 'https://youtube.com/challengehub',
        icon: 'fa-youtube',
        sort_order: 4,
        status: 1,
      },
    ];

    await this.prisma.socialMedia.createMany({
      data: socialMedias,
      skipDuplicates: true,
    });
    console.log('Social medias seeded successfully');
  }

  //---- Website Info Section ----
  async websiteInfoSeed() {
    const websiteInfo = {
      id: '1',
      name: 'Challenge Hub',
      phone_number: '+1-800-123-4567',
      email: 'support@challengehub.com',
      address: '123 Fitness Street, Los Angeles, CA 90001',
      logo: 'https://challengehub.com/logo.png',
      favicon: 'https://challengehub.com/favicon.ico',
      copyright: '© 2024 Challenge Hub. All rights reserved.',
      cancellation_policy:
        'Subscriptions can be cancelled anytime. Refunds are processed within 5-7 business days.',
    };

    await this.prisma.websiteInfo.upsert({
      where: { id: '1' },
      update: websiteInfo,
      create: websiteInfo,
    });
    console.log('Website info seeded successfully');
  }

  //---- Plan Types Section ----
  async plantypesSeed() {
    const planTypes = [
      {
        id: '1',
        name: 'Nutrition Plans',
        description:
          'Customized meal plans and nutrition strategies tailored to your specific challenge and goals.',
      },
      {
        id: '2',
        name: 'Route Planning',
        description:
          'Detailed route maps, elevation profiles, and checkpoint information for your challenge.',
      },
      {
        id: '3',
        name: 'Training Plans',
        description:
          'Progressive training programs for all levels, designed to prepare you for your specific challenge and goals.',
      },
      {
        id: '4',
        name: 'Transportation and Logistics',
        description:
          'Logistics support including vehicle recommendations for epic, unsupported challenges.',
      },
    ];

    await this.prisma.planType.deleteMany({});
    await this.prisma.planType.createMany({
      data: planTypes,
    });

    console.log('Plan types seeded successfully');
  }

  //---- Plan Type Support Section ----
  async planTypeSupportSeed() {
    const supportPlans = [
      {
        id: '1',
        title: 'Beginner Running Plan',
        description: 'Start your running journey with this 8-week program',
        distance: 5.0,
        planTypeId: '3',
        category: PlanCategory.RUNNING,
        trainingPlansCategory: TrainingPlansCategory.Beginner,
      },
      {
        id: '2',
        title: 'Intermediate Cycling Plan',
        description:
          'Build endurance and speed for your next cycling challenge',
        distance: 50.0,
        planTypeId: '3',
        category: PlanCategory.CYCLING,
        trainingPlansCategory: TrainingPlansCategory.Intermediate,
      },
      {
        id: '3',
        title: 'Advanced Swimming Plan',
        description: 'Master your swimming technique and increase distance',
        distance: 2.5,
        planTypeId: '3',
        category: PlanCategory.SWIMMING,
        trainingPlansCategory: TrainingPlansCategory.Advanced,
      },
      {
        id: '4',
        title: 'HIIT Training Plan',
        description: 'High-intensity interval training for maximum results',
        planTypeId: '3',
        category: PlanCategory.HIIT,
        trainingPlansCategory: TrainingPlansCategory.Intermediate,
      },
      {
        id: '5',
        title: 'Marathon Nutrition Guide',
        description: 'Fuel your long runs with these nutrition strategies',
        resource_url: 'https://challengehub.com/nutrition/marathon',
        planTypeId: '1',
        category: PlanCategory.RUNNING,
      },
      {
        id: '6',
        title: 'Coast to Coast Route Guide',
        description: 'Complete route planning for coast-to-coast challenges',
        route_url: 'https://challengehub.com/routes/coast-to-coast',
        planTypeId: '2',
        category: PlanCategory.CYCLING,
      },
    ];

    await this.prisma.supportPlan.createMany({
      data: supportPlans,
      skipDuplicates: true,
    });

    console.log('Support plans seeded successfully');
  }

  //---- Challenges Section ----
  async challengeSeed() {
    const users = await this.prisma.user.findMany({
      take: 3,
    });

    if (users.length < 2) {
      console.log('Not enough users to create challenges');
      return;
    }

    const challenges = [
      {
        id: '1',
        title: 'Ultra Marathon Challenge',
        subtitle: 'Run 100km in 30 days',
        description:
          'Complete a full ultra marathon distance of 100km over 30 days.',
        path: ChallengePath.ELITE_ATHLETE,
        category: ChallengeCategory.RUNNING,
        difficulty: ChallengeDifficulty.EXTREME,
        require_device_connection: true,
        allow_manual_submission: false,
        enable_chat: true,
        is_active: true,
        is_featured: true,
        max_participants: 100,
        reward_title: 'Ultra Marathon Finisher Badge',
        reward_description: 'Exclusive Ultra Marathon digital badge',
        challenge_country: 'USA',
        created_by: users[0].id,
        winner_id: users[0].id,
        status: ChallengeStatus.ACTIVE,
      },
      {
        id: '2',
        title: 'Mountain Cycling Adventure',
        subtitle: 'Conquer 1000m elevation in 7 days',
        description: 'Climb 1000 meters of elevation through mountain trails.',
        path: ChallengePath.VIRTUAL_ADVENTURE,
        category: ChallengeCategory.CYCLING,
        difficulty: ChallengeDifficulty.HARD,
        require_device_connection: true,
        allow_manual_submission: true,
        enable_chat: true,
        is_active: true,
        is_featured: true,
        max_participants: 50,
        reward_title: 'Mountain King Badge',
        reward_description: 'Exclusive Mountain Cycling finisher badge',
        challenge_country: 'France',
        created_by: users[0].id,
        status: ChallengeStatus.ACTIVE,
      },
      {
        id: '3',
        title: 'Swim 50km Challenge',
        subtitle: 'Swim 50km in 3 months',
        description:
          'Build up your swimming endurance with this 3-month challenge.',
        path: ChallengePath.MONTHLY_CHALLENGE,
        category: ChallengeCategory.SWIMMING,
        difficulty: ChallengeDifficulty.MEDIUM,
        require_device_connection: false,
        allow_manual_submission: true,
        enable_chat: true,
        is_active: true,
        is_featured: false,
        max_participants: 200,
        reward_title: 'Marathon Swimmer Badge',
        reward_description: '50km swim achievement badge',
        challenge_country: 'Australia',
        created_by: users[1]?.id || users[0].id,
        status: ChallengeStatus.ACTIVE,
      },
      {
        id: '4',
        title: 'HIIT Intensity Challenge',
        subtitle: '30 Days of High-Intensity Workouts',
        description: 'Complete 30 high-intensity interval training sessions.',
        path: ChallengePath.COMMUNITY_CHALLENGE,
        category: ChallengeCategory.HIIT,
        difficulty: ChallengeDifficulty.CHALLENGING,
        require_device_connection: false,
        allow_manual_submission: true,
        enable_chat: true,
        is_active: true,
        is_featured: false,
        max_participants: 300,
        reward_title: 'HIIT Warrior Badge',
        reward_description: 'Complete the 30-day HIIT challenge',
        challenge_country: 'UK',
        created_by: users[2]?.id || users[0].id,
        status: ChallengeStatus.ACTIVE,
      },
    ];

    await this.prisma.challenges.createMany({
      data: challenges,
      skipDuplicates: true,
    });

    // Add challenge metrics
    const metrics = [
      {
        id: '1',
        challenge_id: '1',
        metric_type: MetricType.DISTANCE_KM,
        sequence: 1,
        target_value: 100.0,
        min_threshold: 80.0,
        is_required: true,
      },
      {
        id: '2',
        challenge_id: '2',
        metric_type: MetricType.ELEVATION_M,
        sequence: 1,
        target_value: 1000.0,
        min_threshold: 850.0,
        is_required: true,
      },
      {
        id: '3',
        challenge_id: '3',
        metric_type: MetricType.DISTANCE_KM,
        sequence: 1,
        target_value: 50.0,
        min_threshold: 40.0,
        is_required: true,
      },
      {
        id: '4',
        challenge_id: '4',
        metric_type: MetricType.DURATION_MIN,
        sequence: 1,
        target_value: 900.0,
        is_required: true,
      },
    ];

    await this.prisma.challengeMetric.createMany({
      data: metrics,
      skipDuplicates: true,
    });

    // Add challenge path configs
    const pathConfigs = [
      {
        id: '1',
        challenge_id: '1',
        config_data: {
          tiers: [
            { name: 'Bronze', distance: 50 },
            { name: 'Silver', distance: 75 },
            { name: 'Gold', distance: 100 },
          ],
        },
      },
      {
        id: '2',
        challenge_id: '2',
        config_data: {
          route_start: { lat: 48.8566, lng: 2.3522 },
          route_end: { lat: 45.764, lng: 4.8357 },
          waypoints: [
            { lat: 47.2184, lng: 3.2428 },
            { lat: 46.6034, lng: 4.0193 },
          ],
          require_gps: true,
        },
      },
      {
        id: '3',
        challenge_id: '3',
        config_data: {
          goal_type: 'distance_or_elevation',
          monthly_reset: true,
        },
      },
      {
        id: '4',
        challenge_id: '4',
        config_data: {
          team_based: false,
          min_team_size: 1,
          aggregate_metric: 'duration',
        },
      },
    ];

    await this.prisma.challengePathConfig.createMany({
      data: pathConfigs,
      skipDuplicates: true,
    });

    // Add challenge checkpoints
    const checkpoints = [
      {
        id: '1',
        challenge_id: '1',
        sequence: 1,
        title: 'First Quarter',
        description: 'Complete 25km',
        metric_targets: { DISTANCE_KM: 25 },
        reward_title: '1/4 Marathon',
        reward_description: 'First quarter milestone completed',
        is_visible: true,
        is_required: true,
        unlock_after_checkpoint_seq: 0,
      },
      {
        id: '2',
        challenge_id: '1',
        sequence: 2,
        title: 'Halfway There',
        description: 'Complete 50km',
        metric_targets: { DISTANCE_KM: 50 },
        reward_title: 'Half Marathon',
        reward_description: 'Halfway milestone completed',
        is_visible: true,
        is_required: true,
        unlock_after_checkpoint_seq: 1,
      },
      {
        id: '3',
        challenge_id: '1',
        sequence: 3,
        title: 'Three Quarters',
        description: 'Complete 75km',
        metric_targets: { DISTANCE_KM: 75 },
        reward_title: '3/4 Marathon',
        reward_description: 'Three quarters milestone completed',
        is_visible: true,
        is_required: true,
        unlock_after_checkpoint_seq: 2,
      },
      {
        id: '4',
        challenge_id: '2',
        sequence: 1,
        title: 'Base Camp',
        description: 'Reach 250m elevation',
        metric_targets: { ELEVATION_M: 250 },
        reward_title: 'Base Camp Reached',
        reward_description: 'First elevation milestone',
        is_visible: true,
        is_required: true,
        unlock_after_checkpoint_seq: 0,
      },
      {
        id: '5',
        challenge_id: '2',
        sequence: 2,
        title: 'Mid-Mountain',
        description: 'Reach 500m elevation',
        metric_targets: { ELEVATION_M: 500 },
        reward_title: 'Mid-Mountain Reached',
        reward_description: 'Second elevation milestone',
        is_visible: true,
        is_required: true,
        unlock_after_checkpoint_seq: 1,
      },
      {
        id: '6',
        challenge_id: '3',
        sequence: 1,
        title: '10km Swum',
        description: 'Complete first 10km of swimming',
        metric_targets: { DISTANCE_KM: 10 },
        reward_title: '10km Swimmer',
        reward_description: 'First swimming milestone',
        is_visible: true,
        is_required: true,
        unlock_after_checkpoint_seq: 0,
      },
    ];

    await this.prisma.challengeCheckpoint.createMany({
      data: checkpoints,
      skipDuplicates: true,
    });

    // Add challenge participations
    const participations = [];
    for (let i = 0; i < Math.min(3, users.length); i++) {
      const user = users[i];
      const challengeIds = ['1', '2', '3', '4'];
      const userChallenges = challengeIds.slice(0, 2 + (i % 2));

      for (const challengeId of userChallenges) {
        participations.push({
          id: `part_${user.id}_${challengeId}`,
          user_id: user.id,
          challenge_id: challengeId,
          status:
            i === 0
              ? ParticipationStatus.IN_PROGRESS
              : ParticipationStatus.JOINED,
          joined_at: new Date(Date.now() - i * 86400000),
          started_at: i === 0 ? new Date(Date.now() - 5 * 86400000) : null,
          progress_percent: i === 0 ? 45 : 10,
          active_checkpoint_seq: i === 0 ? 1 : 0,
          metric_values: i === 0 ? { DISTANCE_KM: 45.5 } : { DISTANCE_KM: 5.0 },
          source_provider: FitnessProvider.MANUAL,
        });
      }
    }

    await this.prisma.challengeParticipation.createMany({
      data: participations,
      skipDuplicates: true,
    });

    // Add challenge leaderboards
    const leaderboards = [];
    for (let i = 0; i < Math.min(3, users.length); i++) {
      const user = users[i];
      const challengeIds = ['1', '2', '3', '4'];

      for (const challengeId of challengeIds) {
        leaderboards.push({
          id: `lead_${user.id}_${challengeId}`,
          challenge_id: challengeId,
          user_id: user.id,
          rank: i + 1,
          progress_percent: i === 0 ? 45 + i * 10 : 10 + i * 5,
          metric_values: { DISTANCE_KM: 45.5 + i * 5 },
          source_provider: FitnessProvider.MANUAL,
        });
      }
    }

    await this.prisma.challengeLeaderboard.createMany({
      data: leaderboards,
      skipDuplicates: true,
    });

    // Add challenge journey logs
    const journeyLogs = [];
    for (let i = 0; i < Math.min(2, users.length); i++) {
      const user = users[i];
      const challengeIds = ['1', '2'];

      for (const challengeId of challengeIds) {
        journeyLogs.push({
          id: `journey_${user.id}_${challengeId}`,
          user_id: user.id,
          challenge_id: challengeId,
          participation_id: `part_${user.id}_${challengeId}`,
          event_type: 'checkpoint_unlocked',
          message: `${user.first_name} unlocked a new checkpoint!`,
          metric_changes: { DISTANCE_KM: 10.0 },
          progress_snapshot: 25.0,
          source_provider: FitnessProvider.MANUAL,
        });
      }
    }

    await this.prisma.challengeJourneyLog.createMany({
      data: journeyLogs,
      skipDuplicates: true,
    });

    // Add route plans
    const routePlans = [
      {
        id: '1',
        challenge_id: '1',
        banner_image_url:
          'https://challengehub.com/routes/ultra-marathon-banner.jpg',
        about_challenge: 'A scenic ultra marathon route through the mountains',
        location: 'Rocky Mountains, Colorado',
        total_distance: '100 km',
        average_completion_time: '30 days',
        climate_terrain: 'Mountain terrain with moderate to steep inclines',
        highest_point: '3,500 m',
        dificulty_rating: '5/5',
      },
      {
        id: '2',
        challenge_id: '2',
        banner_image_url:
          'https://challengehub.com/routes/mountain-cycling-banner.jpg',
        about_challenge: 'Challenging cycling route through the French Alps',
        location: 'French Alps',
        total_distance: '150 km',
        average_completion_time: '7 days',
        climate_terrain: 'Alpine terrain with steep climbs',
        highest_point: '2,800 m',
        dificulty_rating: '4.5/5',
      },
    ];

    await this.prisma.routePlan.createMany({
      data: routePlans,
      skipDuplicates: true,
    });

    // Add route days
    const routeDays = [
      {
        id: '1',
        routePlanId: '1',
        sequence: 1,
        day_number: '1',
        title: 'Start Line',
        description: 'Begin your ultra marathon journey',
        distance: '15 km',
      },
      {
        id: '2',
        routePlanId: '1',
        sequence: 2,
        day_number: '2',
        title: 'Mountain Pass',
        description: 'First major climb',
        distance: '12 km',
      },
      {
        id: '3',
        routePlanId: '2',
        sequence: 1,
        day_number: '1',
        title: 'Alpine Start',
        description: 'Begin your mountain cycling adventure',
        distance: '25 km',
      },
    ];

    await this.prisma.routeDay.createMany({
      data: routeDays,
      skipDuplicates: true,
    });

    // Add sponsorships
    const sponsorships = [
      {
        id: '1',
        title: 'Ultra Marathon Sponsorship',
        description: 'Support for ultra marathon runners',
        funding_goal: 5000,
        amount_raised: 2500,
        challenge_category: ChallengeCategory.RUNNING,
        status: SponsorshipStatus.OPEN,
        creator_id: users[0].id,
      },
      {
        id: '2',
        title: 'Cycling Team Sponsorship',
        description: 'Sponsorship for competitive cycling team',
        funding_goal: 10000,
        amount_raised: 6000,
        challenge_category: ChallengeCategory.CYCLING,
        status: SponsorshipStatus.PENDING,
        creator_id: users[1]?.id || users[0].id,
      },
    ];

    await this.prisma.sponsorship.createMany({
      data: sponsorships,
      skipDuplicates: true,
    });

    // ================================================================
    // FIX: Create and link conversations for each challenge
    // ================================================================
    console.log('Creating conversations for challenges...');

    const allUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { type: { in: ['ADMIN', 'admin', 'su_admin', 'SU_ADMIN'] } },
          {
            role_users: {
              some: {
                role: {
                  OR: [
                    { name: { equals: 'admin', mode: 'insensitive' } },
                    { title: { equals: 'admin', mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    const adminIds = allUsers.map((u) => u.id);

    // Find all challenges without conversations
    const challengesWithoutConv = await this.prisma.challenges.findMany({
      where: { conversationId: null },
      select: { id: true, title: true, created_by: true },
    });

    for (const challenge of challengesWithoutConv) {
      try {
        const creatorId = challenge.created_by || adminIds[0] || users[0].id;

        // Create conversation
        const conversation = await this.prisma.conversation.create({
          data: {
            type: ConversationType.GROUP,
            title: challenge.title,
            createdBy: creatorId,
            memberships: {
              create: [
                {
                  userId: creatorId,
                  role: MemberRole.ADMIN,
                  lastReadAt: new Date(),
                },
                ...adminIds
                  .filter((id) => id !== creatorId)
                  .map((id) => ({
                    userId: id,
                    role: MemberRole.MEMBER,
                    lastReadAt: new Date(),
                  })),
              ],
            },
          },
        });

        // Link conversation to challenge
        await this.prisma.challenges.update({
          where: { id: challenge.id },
          data: { conversationId: conversation.id },
        });

        console.log(
          `✅ Created conversation for challenge: ${challenge.title} (${challenge.id})`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to create conversation for challenge ${challenge.id}:`,
          error.message,
        );
      }
    }

    console.log('Challenges seeded successfully');
  }

  //---- Conversations and Messages Section ----
  async conversationAndMessageSeed() {
    const users = await this.prisma.user.findMany({
      take: 3,
    });

    if (users.length < 2) {
      console.log('Not enough users to create conversations');
      return;
    }

    // Create direct message conversations - using camelCase field names
    const conversations = [
      {
        id: '1',
        type: ConversationType.DM,
        title: 'DM Chat',
        creatorId: users[0].id, // camelCase
        participantId: users[1]?.id || users[0].id, // camelCase
        dmKey: `dm_${users[0].id}_${users[1]?.id}`, // camelCase
        createdBy: users[0].id, // camelCase
      },
      {
        id: '2',
        type: ConversationType.GROUP,
        title: 'Running Club',
        avatarUrl: 'https://challengehub.com/avatars/running-club.jpg', // camelCase
        creatorId: users[0].id, // camelCase
        participantId: users[1]?.id || users[0].id, // camelCase
        createdBy: users[0].id, // camelCase
      },
    ];

    await this.prisma.conversation.createMany({
      data: conversations,
      skipDuplicates: true,
    });

    // Add memberships - using camelCase field names
    const memberships = [];
    for (const user of users) {
      memberships.push({
        id: `mem_${user.id}_1`,
        conversationId: '1', // camelCase
        userId: user.id, // camelCase
        role: user.id === users[0].id ? MemberRole.ADMIN : MemberRole.MEMBER,
        lastReadAt: new Date(), // camelCase
      });
    }

    for (let i = 0; i < Math.min(2, users.length); i++) {
      memberships.push({
        id: `mem_${users[i].id}_2`,
        conversationId: '2', // camelCase
        userId: users[i].id, // camelCase
        role: i === 0 ? MemberRole.ADMIN : MemberRole.MEMBER,
        lastReadAt: new Date(), // camelCase
      });
    }

    await this.prisma.membership.createMany({
      data: memberships,
      skipDuplicates: true,
    });

    // Add messages - using camelCase field names
    const messages = [
      {
        id: '1',
        senderId: users[0].id, // camelCase
        receiverId: users[1]?.id || users[0].id, // camelCase
        conversationId: '1', // camelCase
        kind: MessageKind.TEXT,
        message: 'Hey! Ready for the challenge this weekend?',
        status: MessageStatus.DELIVERED,
        createdAt: new Date(Date.now() - 3600000), // camelCase
      },
      {
        id: '2',
        senderId: users[1]?.id || users[0].id, // camelCase
        receiverId: users[0].id, // camelCase
        conversationId: '1', // camelCase
        kind: MessageKind.TEXT,
        message: "Absolutely! I've been training hard for this.",
        status: MessageStatus.READ,
        readAt: new Date(Date.now() - 1800000), // camelCase
        createdAt: new Date(Date.now() - 1800000), // camelCase
      },
      {
        id: '3',
        senderId: users[0].id, // camelCase
        receiverId: users[1]?.id || users[0].id, // camelCase
        conversationId: '1', // camelCase
        kind: MessageKind.IMAGE,
        message: 'Check out my new gear!',
        media_Url: 'https://challengehub.com/media/gear.jpg',
        status: MessageStatus.DELIVERED,
        createdAt: new Date(Date.now() - 900000), // camelCase
      },
      {
        id: '4',
        senderId: users[0].id, // camelCase
        receiverId: users[2]?.id || users[0].id, // camelCase
        conversationId: '2', // camelCase
        kind: MessageKind.SYSTEM,
        message: 'Welcome to the Running Club!',
        status: MessageStatus.DELIVERED,
        createdAt: new Date(Date.now() - 7200000), // camelCase
      },
      {
        id: '5',
        senderId: users[1]?.id || users[0].id, // camelCase
        receiverId: users[0].id, // camelCase
        conversationId: '2', // camelCase
        kind: MessageKind.TEXT,
        message: "Great to be here! When's the first group run?",
        status: MessageStatus.DELIVERED,
        createdAt: new Date(Date.now() - 3600000), // camelCase
      },
    ];

    await this.prisma.message.createMany({
      data: messages,
      skipDuplicates: true,
    });

    // Add attachments
    const attachments = [
      {
        id: '1',
        name: 'gear.jpg',
        type: 'image/jpeg',
        size: 2048576,
        file: 'https://challengehub.com/uploads/gear.jpg',
        file_alt: 'New running gear',
      },
    ];

    await this.prisma.attachment.createMany({
      data: attachments,
      skipDuplicates: true,
    });

    // Add blocks - using proper field names
    const blocks = [
      {
        id: '1',
        blockerId: users[0].id,
        blockedId: users[2]?.id || users[0].id,
      },
    ];

    await this.prisma.block.createMany({
      data: blocks,
      skipDuplicates: true,
    });

    // Add call sessions - using proper field names
    const callSessions = [
      {
        id: '1',
        conversationId: '1',
        startedBy: users[0].id,
        startedAt: new Date(Date.now() - 86400000), // camelCase
        endedAt: new Date(Date.now() - 82800000), // camelCase
        kind: CallKind.VIDEO,
      },
      {
        id: '2',
        conversationId: '2',
        startedBy: users[0].id,
        startedAt: new Date(Date.now() - 172800000), // camelCase
        endedAt: new Date(Date.now() - 172200000), // camelCase
        kind: CallKind.AUDIO,
      },
    ];

    await this.prisma.callSession.createMany({
      data: callSessions,
      skipDuplicates: true,
    });

    // Add call participants - using proper field names
    const callParticipants = [
      {
        id: '1',
        callId: '1',
        userId: users[0].id,
        joinedAt: new Date(Date.now() - 86300000), // camelCase
        leftAt: new Date(Date.now() - 82900000), // camelCase
      },
      {
        id: '2',
        callId: '1',
        userId: users[1]?.id || users[0].id,
        joinedAt: new Date(Date.now() - 86200000), // camelCase
        leftAt: new Date(Date.now() - 83000000), // camelCase
      },
      {
        id: '3',
        callId: '2',
        userId: users[0].id,
        joinedAt: new Date(Date.now() - 172700000), // camelCase
        leftAt: new Date(Date.now() - 172300000), // camelCase
      },
    ];

    await this.prisma.callParticipant.createMany({
      data: callParticipants,
      skipDuplicates: true,
    });

    // Add reports - using proper field names
    const reports = [
      {
        id: '1',
        messageId: '1',
        reporterId: users[1]?.id || users[0].id,
        reason: 'Inappropriate content',
        status: ReportStatus.OPEN,
      },
      {
        id: '2',
        messageId: '3',
        reporterId: users[0].id,
        reason: 'Spam message',
        status: ReportStatus.REVIEWED,
      },
    ];

    await this.prisma.report.createMany({
      data: reports,
      skipDuplicates: true,
    });

    console.log('Conversations and messages seeded successfully');
  }
}
