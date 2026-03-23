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

      // begin transaaction
      await this.prisma.$transaction(async ($tx) => {
        await this.roleSeed();
        await this.permissionSeed();
        await this.userSeed();
        await this.permissionRoleSeed();
      });

      console.log('Seeding done.');
    } catch (error) {
      throw error;
    }
  }

  //---- user section ----
  async userSeed() {
    // default admin user
    const systemUser = await UserRepository.createSuAdminUser({
      username: appConfig().defaultUser.system.username,
      email: appConfig().defaultUser.system.email,
      password: appConfig().defaultUser.system.password,
    });

    await this.prisma.roleUser.create({
      data: {
        user_id: systemUser.id,
        role_id: '1',
      },
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
    });
  }
}
