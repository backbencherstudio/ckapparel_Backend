// external imports
import { Command, CommandRunner } from 'nest-commander';
// internal imports
import appConfig from '../config/app.config';
import { StringHelper } from '../common/helper/string.helper';
import { UserRepository } from '../common/repository/user/user.repository';
import { PrismaService } from '../prisma/prisma.service';

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

      // Seed in deterministic order and keep this command rerunnable.
      await this.plantypesSeed();
      await this.roleSeed();
      await this.permissionSeed();
      await this.userSeed();
      await this.permissionRoleSeed();

      console.log('Seeding done.');
    } catch (error) {
      throw error;
    }
  }

  //---- user section ----
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
      data: {
        user_id: systemUser.id,
        role_id: '1',
      },
      skipDuplicates: true,
    });
  }

  async permissionSeed() {
    let i = 0;
    const permissions = [];
    const permissionGroups = [
      // (system level )super admin level permission
      { title: 'system_tenant_management', subject: 'SystemTenant' },
      // end (system level )super admin level permission
      { title: 'user_management', subject: 'User' },
      { title: 'role_management', subject: 'Role' },
      // Project
      { title: 'Project', subject: 'Project' },
      // Task
      {
        title: 'Task',
        subject: 'Task',
        scope: ['read', 'create', 'update', 'show', 'delete', 'assign'],
      },
      // Comment
      { title: 'Comment', subject: 'Comment' },
    ];

    for (const permissionGroup of permissionGroups) {
      if (permissionGroup['scope']) {
        for (const permission of permissionGroup['scope']) {
          permissions.push({
            id: String(++i),
            title: permissionGroup.title + '_' + permission,
            action: StringHelper.cfirst(permission),
            subject: permissionGroup.subject,
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
          });
        }
      }
    }

    await this.prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });
  }

  async permissionRoleSeed() {
    const all_permissions = await this.prisma.permission.findMany();
    // ---admin---
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

    // ---normal user---
    const user_permissions = all_permissions.filter(function (permission) {
      return (
        permission.title == 'Project_read' ||
        permission.title == 'Project_show' ||
        permission.title == 'Task_read' ||
        permission.title == 'Task_show' ||
        permission.title == 'Comment_read'
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
  }

  async roleSeed() {
    await this.prisma.role.createMany({
      data: [
        {
          id: '1',
          title: 'Admin',
          name: 'admin',
        },
        {
          id: '2',
          title: 'Normal User',
          name: 'user',
        },
      ],
      skipDuplicates: true,
    });
  }

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
          'Logistics support including vehiclerecommendations for epic, unsupported challenges.',
      },
    ];

    // Keep seed deterministic across environments.
    await this.prisma.planType.deleteMany({});
    await this.prisma.planType.createMany({
      data: planTypes,
    });

    const count = await this.prisma.planType.count();
    console.log(`Plan types seeded: ${count}`);
  }
}
