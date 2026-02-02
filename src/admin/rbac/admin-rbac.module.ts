import { Module, Global } from '@nestjs/common';
import { AdminPermissionsService } from './admin-permissions.service';

@Global()
@Module({
  providers: [AdminPermissionsService],
  exports: [AdminPermissionsService],
})
export class AdminRbacModule {}
