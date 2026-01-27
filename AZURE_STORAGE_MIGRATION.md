# Azure Blob Storage Migration

## Overview

All file storage operations have been migrated to use **Azure Blob Storage exclusively**. Supabase Storage has been removed as a fallback option.

## Changes Made

### 1. Upload Service (`src/upload/upload.service.ts`)
- ✅ Removed Supabase fallback
- ✅ Now requires Azure Blob Storage (fails fast if not configured)
- ✅ All image and document uploads use Azure Blob Storage
- ✅ File deletion uses Azure Blob Storage

### 2. Packing Proof Service (`src/vendor-orders/packing-proof.service.ts`)
- ✅ Migrated from Supabase Storage to Azure Blob Storage
- ✅ Video uploads now use Azure Blob Storage container: `videos`
- ✅ Signed URL generation uses Azure SAS tokens

### 3. Azure Storage Service (`src/shared/azure-storage.service.ts`)
- ✅ Added `getSignedUrl()` method for generating temporary access URLs
- ✅ Uses Azure SAS (Shared Access Signature) tokens
- ✅ Supports configurable expiration times

## Required Azure Configuration

### Environment Variables

Ensure these are set in Azure App Service:

```env
AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-key>
AZURE_STORAGE_CONTAINER_PRODUCTS=products
AZURE_STORAGE_CONTAINER_USERS=users
AZURE_STORAGE_CONTAINER_VIDEOS=videos  # Optional, defaults to 'videos'
```

### Azure Blob Storage Containers

The following containers are used:

1. **`products`** - Product images
2. **`users`** - User avatars, documents, KYC files
3. **`videos`** - Packing proof videos
4. **`general`** - Default fallback container

Containers are created automatically if they don't exist (with `blob` access level).

## What Still Uses Supabase

**Supabase is still used for authentication only:**
- OTP sending and verification (`auth.service.ts`)
- User registration and password reset
- **NOT used for file storage anymore**

## Benefits

1. **Unified Storage**: All files in one Azure storage account
2. **Better Performance**: Direct Azure Blob Storage access
3. **Cost Optimization**: Single storage provider
4. **Simplified Architecture**: No fallback logic needed
5. **Azure Integration**: Better integration with other Azure services

## Migration Notes

- Existing files in Supabase Storage are **not automatically migrated**
- If you need to migrate existing files, create a migration script
- New uploads will go to Azure Blob Storage
- Old Supabase URLs will continue to work until files are migrated

## Error Handling

If Azure Blob Storage is not configured:
- Application will **fail to start** (constructor throws error)
- Clear error message: "Azure Blob Storage is required but not configured"
- Ensures no silent failures or fallbacks

## Testing

To verify Azure Blob Storage is working:

1. **Check startup logs**: Should see "✅ Azure Blob Storage client initialized"
2. **Upload an image**: Should return Azure Blob Storage URL
3. **Check Azure Portal**: Files should appear in the appropriate container

## Troubleshooting

### "Azure Storage client not initialized"
- Check `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_ACCOUNT_KEY` are set
- Verify credentials are correct in Azure Portal

### "Failed to upload file to Azure Storage"
- Check network connectivity to Azure
- Verify storage account exists and is accessible
- Check container permissions

### "Failed to generate signed URL"
- Verify storage account credentials
- Check that the blob exists at the specified path
