import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const REELS_PER_DAY_LIMIT = 10;

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

    const userId = user.id;

    // Parse request body
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const vendorId = formData.get('vendorId') as string | null;
    const creatorId = formData.get('creatorId') as string | null;
    const productId = formData.get('productId') as string | null;
    const description = formData.get('description') as string | null;

    // Validate: Must be either vendor or creator, not both
    if (!vendorId && !creatorId) {
      return new Response(
        JSON.stringify({ error: 'Either vendorId or creatorId must be provided.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (vendorId && creatorId) {
      return new Response(
        JSON.stringify({ error: 'Cannot specify both vendorId and creatorId.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If creatorId, verify user is the creator
    if (creatorId) {
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('CreatorProfile')
        .select('userId')
        .eq('id', creatorId)
        .single();

      if (creatorError || !creatorProfile || creatorProfile.userId !== userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized. You are not the creator of this profile.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // If vendorId, verify user is the vendor
    if (vendorId && vendorId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. You are not the vendor.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Check reels count for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { count, error: countError } = await supabase
      .from('Reel')
      .select('*', { count: 'exact', head: true })
      .or(`vendorId.eq.${vendorId || ''},creatorId.eq.${creatorId || ''}`)
      .gte('createdAt', todayStart.toISOString())
      .lte('createdAt', todayEnd.toISOString());

    if (countError) {
      console.error('Error checking reel count:', countError);
      return new Response(
        JSON.stringify({ error: 'Failed to check rate limit.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if ((count || 0) >= REELS_PER_DAY_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Maximum ${REELS_PER_DAY_LIMIT} reels per day allowed.` 
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'File is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 100MB limit.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'mp4';
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const filePath = `reels/${vendorId || creatorId}/${fileName}`;

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

    // TODO: Generate thumbnail (can be done via another Edge Function or service)
    const thumbnailUrl = null;

    // Create Reel record
    const { data: reelData, error: reelError } = await supabase
      .from('Reel')
      .insert({
        vendorId: vendorId || null,
        creatorId: creatorId || null,
        mediaUrl,
        thumbnailUrl,
        productId: productId || null,
        description: description || null,
        flaggedForReview: false,
      })
      .select()
      .single();

    if (reelError) {
      console.error('Reel creation error:', reelError);
      // Clean up uploaded file on error
      await supabase.storage.from('videos').remove([filePath]);
      return new Response(
        JSON.stringify({ error: 'Failed to create reel record.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        reel: {
          id: reelData.id,
          mediaUrl: reelData.mediaUrl,
          thumbnailUrl: reelData.thumbnailUrl,
          productId: reelData.productId,
          description: reelData.description,
          createdAt: reelData.createdAt,
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
