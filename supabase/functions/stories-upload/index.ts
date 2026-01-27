import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STORIES_PER_DAY_LIMIT = 5;

Deno.serve(async (req: Request) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      });
    }

    // JWT validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Missing or invalid Authorization header.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Invalid token.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get vendor ID from user (assuming vendor ID = user ID for vendors)
    const vendorId = user.id;

    // Rate limiting: Check stories count for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { count, error: countError } = await supabase
      .from('Story')
      .select('*', { count: 'exact', head: true })
      .eq('vendorId', vendorId)
      .gte('createdAt', todayStart.toISOString())
      .lte('createdAt', todayEnd.toISOString());

    if (countError) {
      console.error('Error checking story count:', countError);
      return new Response(
        JSON.stringify({ error: 'Failed to check rate limit.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if ((count || 0) >= STORIES_PER_DAY_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Maximum ${STORIES_PER_DAY_LIMIT} stories per day allowed.` 
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('mediaType') as string || 'IMAGE';

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'File is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 50MB limit.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const filePath = `stories/${vendorId}/${fileName}`;

    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file to storage.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    const mediaUrl = urlData.publicUrl;

    // Set expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create Story record
    const { data: storyData, error: storyError } = await supabase
      .from('Story')
      .insert({
        vendorId,
        mediaUrl,
        mediaType: mediaType.toUpperCase(),
        expiresAt: expiresAt.toISOString(),
        isActive: true,
        flaggedForReview: false,
      })
      .select()
      .single();

    if (storyError) {
      console.error('Story creation error:', storyError);
      // Clean up uploaded file on error
      await supabase.storage.from('videos').remove([filePath]);
      return new Response(
        JSON.stringify({ error: 'Failed to create story record.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        story: {
          id: storyData.id,
          mediaUrl: storyData.mediaUrl,
          mediaType: storyData.mediaType,
          expiresAt: storyData.expiresAt,
          createdAt: storyData.createdAt,
        },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
