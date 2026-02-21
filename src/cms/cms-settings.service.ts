import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CmsSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.cMSSettings.findFirst();
    
    if (!settings) {
      settings = await this.prisma.cMSSettings.create({
        data: { id: 'default' }
      });
    }
    
    return settings;
  }

  async updateSettings(data: {
    siteName?: string;
    siteDescription?: string;
    logo?: string;
    favicon?: string;
    ogImage?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactAddress?: string;
    socialFacebook?: string;
    socialTwitter?: string;
    socialInstagram?: string;
    socialYoutube?: string;
    analyticsId?: string;
    customCss?: string;
    customJs?: string;
    customHead?: string;
    customBody?: string;
    isLive?: boolean;
  }) {
    const existing = await this.prisma.cMSSettings.findFirst();
    
    if (!existing) {
      return this.prisma.cMSSettings.create({
        data: { id: 'default', ...data }
      });
    }
    
    return this.prisma.cMSSettings.update({
      where: { id: existing.id },
      data
    });
  }

  async uploadImage(file: Express.Multer.File, type: 'logo' | 'favicon' | 'ogImage') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseBucket = process.env.SUPABASE_BUCKET || 'cms';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const folder = type === 'logo' ? 'logos' : type === 'favicon' ? 'favicons' : 'og-images';
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    const buffer = Buffer.from(file.buffer);
    const base64 = buffer.toString('base64');
    
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/${supabaseBucket}/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': file.mimetype,
          'Authorization': `Bearer ${supabaseKey}`,
          'x-upsert': 'true'
        },
        body: buffer
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/${fileName}`;
    
    const settings = await this.getSettings();
    const updateData: any = {};
    updateData[type] = publicUrl;
    
    return this.prisma.cMSSettings.update({
      where: { id: settings.id },
      data: updateData
    });
  }
}
