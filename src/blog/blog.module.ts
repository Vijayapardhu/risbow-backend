import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController, AdminBlogController } from './blog.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BlogController, AdminBlogController],
  providers: [BlogService],
  exports: [BlogService]
})
export class BlogModule {}
