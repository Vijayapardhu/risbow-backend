-- 1. Create Buckets (if they don't exist)
insert into storage.buckets (id, name, public)
values 
  ('product_images', 'product_images', true),
  ('marketing_assets', 'marketing_assets', true),
  ('category', 'category', true),
  ('banners', 'banners', true),
  ('reels', 'reels', true),
  ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- NOTE: We removed 'alter table storage.objects ...' as it is already enabled by default 
-- and can cause permission errors.

-- 3. Create Policies

-- =======================================================
-- PRODUCT_IMAGES
-- =======================================================

drop policy if exists "Public Access to Product Images" on storage.objects;
create policy "Public Access to Product Images"
on storage.objects for select
using ( bucket_id = 'product_images' );

drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images"
on storage.objects for insert
with check ( bucket_id = 'product_images' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can update product images" on storage.objects;
create policy "Authenticated users can update product images"
on storage.objects for update
using ( bucket_id = 'product_images' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can delete product images" on storage.objects;
create policy "Authenticated users can delete product images"
on storage.objects for delete
using ( bucket_id = 'product_images' and auth.role() = 'authenticated' );


-- =======================================================
-- MARKETING_ASSETS
-- =======================================================

drop policy if exists "Public Access to Marketing Assets" on storage.objects;
create policy "Public Access to Marketing Assets"
on storage.objects for select
using ( bucket_id = 'marketing_assets' );

drop policy if exists "Authenticated users can upload marketing assets" on storage.objects;
create policy "Authenticated users can upload marketing assets"
on storage.objects for insert
with check ( bucket_id = 'marketing_assets' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can update marketing assets" on storage.objects;
create policy "Authenticated users can update marketing assets"
on storage.objects for update
using ( bucket_id = 'marketing_assets' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can delete marketing assets" on storage.objects;
create policy "Authenticated users can delete marketing assets"
on storage.objects for delete
using ( bucket_id = 'marketing_assets' and auth.role() = 'authenticated' );


-- =======================================================
-- CATEGORY
-- =======================================================

drop policy if exists "Public Access to Category Images" on storage.objects;
create policy "Public Access to Category Images"
on storage.objects for select
using ( bucket_id = 'category' );

drop policy if exists "Authenticated users can upload category images" on storage.objects;
create policy "Authenticated users can upload category images"
on storage.objects for insert
with check ( bucket_id = 'category' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can modify category images" on storage.objects;
create policy "Authenticated users can modify category images"
on storage.objects for all
using ( bucket_id = 'category' and auth.role() = 'authenticated' );


-- =======================================================
-- BANNERS
-- =======================================================

drop policy if exists "Public Access to Banners" on storage.objects;
create policy "Public Access to Banners"
on storage.objects for select
using ( bucket_id = 'banners' );

drop policy if exists "Authenticated users can modify banners" on storage.objects;
create policy "Authenticated users can modify banners"
on storage.objects for all
using ( bucket_id = 'banners' and auth.role() = 'authenticated' );


-- =======================================================
-- REELS
-- =======================================================

drop policy if exists "Public Access to Reels" on storage.objects;
create policy "Public Access to Reels"
on storage.objects for select
using ( bucket_id = 'reels' );

drop policy if exists "Authenticated users can modify reels" on storage.objects;
create policy "Authenticated users can modify reels"
on storage.objects for all
using ( bucket_id = 'reels' and auth.role() = 'authenticated' );


-- =======================================================
-- AVATARS
-- =======================================================

drop policy if exists "Public Access to Avatars" on storage.objects;
create policy "Public Access to Avatars"
on storage.objects for select
using ( bucket_id = 'avatars' );

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
on storage.objects for insert
with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can update avatars" on storage.objects;
create policy "Authenticated users can update avatars"
on storage.objects for update
using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
