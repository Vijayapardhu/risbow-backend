import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Admin Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  const testAdmin = {
    email: 'report-admin@risbow.com',
    password: 'TestPassword123!',
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
        firstName: 'Report',
        lastName: 'Admin',
        role: testAdmin.role,
        isActive: true,
      },
    });

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({
        email: testAdmin.email,
        password: testAdmin.password,
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
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

  describe('GET /api/v1/admin/reports/types', () => {
    it('should return available report types', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/reports/types')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('SALES_SUMMARY');
      expect(response.body).toContain('PLATFORM_OVERVIEW');
    });

    it('should reject unauthorized access', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/reports/types')
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/reports/dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/reports/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(response.body.vendors).toBeDefined();
      expect(response.body.products).toBeDefined();
      expect(response.body.orders).toBeDefined();
    });
  });

  describe('GET /api/v1/admin/reports/sales-summary', () => {
    it('should return sales summary for date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/reports/sales-summary')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalRevenue).toBeDefined();
      expect(response.body.summary.orderCount).toBeDefined();
    });

    it('should require date parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/reports/sales-summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('POST /api/v1/admin/reports/generate', () => {
    it('should generate platform overview report', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/reports/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'PLATFORM_OVERVIEW',
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should validate report type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/reports/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'INVALID_TYPE',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/admin/reports/low-stock', () => {
    it('should return low stock products', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/reports/low-stock')
        .query({ threshold: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
