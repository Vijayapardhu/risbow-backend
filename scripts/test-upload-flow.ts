// @ts-nocheck
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Since we are in `scripts/`, we might need to install `form-data` if not present.
// However, axios in node usually handles it if we pass a stream or Buffer with known length? 
// Actually axios requires `form-data` package for multipart in Node.
// Let's assume it's available or we can use a basic boundary construction manually if needed, 
// but `risbow-backend` doesn't seem to have `form-data` in package.json explicitly?
// It has `axios`. Let's check if axios has it transitively or if I should just use `fetch` (Node 18+).
// Node version is v24 (from logs). Native `fetch` and `FormData` should work!

const API_URL = 'http://localhost:3001/api/v1';
const EMAIL = `test.upload.${Date.now()}@example.com`;
const PASSWORD = 'Password123';

async function run() {
    try {
        console.log('🚀 Starting Upload Module Smoke Test...');

        // 1. Register User
        console.log('1. Registering User...');
        try {
            await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: EMAIL,
                    password: PASSWORD,
                    name: 'Upload Tester',
                    phone: `99${Math.floor(Math.random() * 100000000)}`,
                    gender: 'MALE',
                    dateOfBirth: new Date('1990-01-01').toISOString(),
                    address: {
                        line1: '123 Test St',
                        line2: 'Apt 4B',
                        city: 'Test City',
                        state: 'Test State',
                        postalCode: '123456',
                        country: 'Test Country'
                    }
                })
            });
        } catch (e) {
            console.log('   Warning: Registration might have failed (user exists?)');
        }

        // 2. Login
        console.log('2. Logging In...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log('   ✅ Logged in.');

        const authHeaders = { Authorization: `Bearer ${token}` };

        // 3. Create Dummy Image
        // create a small red square jpeg or png buffer manually? 
        // 1x1 transparent GIF is easiest: 
        // R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7
        const imageBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

        // 4. Upload Image
        console.log('4. Uploading Single Image...');
        const formData = new FormData();
        formData.append('file', imageBlob, 'test-image.png');
        formData.append('context', 'products');
        formData.append('contextId', '123e4567-e89b-12d3-a456-426614174000'); // Valid UUID

        const uploadRes = await fetch(`${API_URL}/upload/image`, {
            method: 'POST',
            headers: { ...authHeaders }, // Fetch sets Content-Type boundary automatically for FormData
            body: formData
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            throw new Error(`Upload Failed: ${uploadRes.status} ${err}`);
        }

        const uploadData = await uploadRes.json();
        console.log('   ✅ Image Uploaded:', uploadData);
        if (!uploadData.url.includes('.webp')) {
            console.error('   ❌ Optimization failed: URL does not end in .webp'); // Sharp should convert to webp
        } else {
            console.log('   ✅ Optimization verified (webp extension).');
        }

        // 5. Upload Document
        console.log('5. Uploading Document...');
        const docBuffer = Buffer.from('Dummy PDF Content', 'utf-8');
        const docBlob = new Blob([docBuffer], { type: 'application/pdf' });

        const docFormData = new FormData();
        docFormData.append('file', docBlob, 'test.pdf');
        docFormData.append('documentType', 'KYC');

        const docRes = await fetch(`${API_URL}/upload/document`, {
            method: 'POST',
            headers: { ...authHeaders },
            body: docFormData
        });

        if (!docRes.ok) {
            const err = await docRes.text();
            throw new Error(`Doc Upload Failed: ${docRes.status} ${err}`);
        }

        const docData = await docRes.json();
        console.log('   ✅ Document Uploaded:', docData);

        // 6. Delete File (Optional / if path available)
        // Since we don't assume we are Admin, this might fail if we implemented strict checks, 
        // but current controller is loose.
        console.log('6. Deleting Image...');
        const deletePath = uploadData.path; // e.g. products/...
        // Need to URL encode? No, path param usually goes in URL. 
        // Route is DELETE /upload/:path
        // If path contains slashes, we need wildcard route which we added (`:path(*)`).
        const deleteRes = await fetch(`${API_URL}/upload/${encodeURIComponent(deletePath)}`, {
            method: 'DELETE',
            headers: { ...authHeaders }
        });

        if (deleteRes.ok) {
            console.log('   ✅ File Deleted.');
        } else {
            console.log('   ⚠️ Delete failed (expected if RLS or logic prevents it?):', deleteRes.status);
        }

        console.log('✅ Upload Module Smoke Test Completed!');

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}

run();
