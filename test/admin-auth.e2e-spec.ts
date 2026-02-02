import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Admin Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  const testAdmin = {
    email: 'test-admin@risbow.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'ADMIN',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test admin
    const hashedPassword = await bcrypt.hash(testAdmin.password, 10);
    await prisma.adminUser.upsert({
      where: { email: testAdmin.email },
      update: {},
      create: {
        email: testAdmin.email,
        password: hashedPassword,
        firstName: testAdmin.firstName,
        lastName: testAdmin.lastName,
        role: testAdmin.role,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.adminSession.deleteMany({
      where: { admin: { email: testAdmin.email } },
    });
    await prisma.adminAuditLog.deleteMany({
      where: { admin: { email: testAdmin.email } },
    });
    await prisma.adminUser.delete({
      where: { email: testAdmin.email },
    });
    await app.close();
  });

  describe('POST /api/v1/admin/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password,
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.admin.email).toBe(testAdmin.email);
      expect(response.body.admin.password).toBeUndefined();

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: testAdmin.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: 'nonexistent@risbow.com',
          password: 'anypassword',
        })
        .expect(401);
    });

    it('should reject missing credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/admin/auth/me', () => {
    it('should return admin profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testAdmin.email);
      expect(response.body.firstName).toBe(testAdmin.firstName);
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });

  describe('POST /api/v1/admin/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      // Update tokens for subsequent tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/refresh')
        .send({ refreshToken: 'invalidtoken' })
        .expect(401);
    });
  });

  describe('POST /api/v1/admin/auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should invalidate token after logout', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
