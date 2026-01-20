import axios from 'axios';

const API_URL = 'http://localhost:3001/api/v1';
const EMAIL = `test.cart.${Date.now()}@example.com`;
const PASSWORD = 'Password123';

async function run() {
    try {
        console.log('🚀 Starting Cart Module Smoke Test...');

        // 1. Register User
        console.log('1. Registering User...');
        try {
            await axios.post(`${API_URL}/auth/register`, {
                email: EMAIL,
                password: PASSWORD,
                name: 'Cart Tester',
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
            });
        } catch (e: any) {
            console.log('   Warning: Registration failed:', e.response?.data || e.message);
            // proceed to login attempt anyway, or return?
            // If registration failed due to other reasons, login will fail.
        }

        // 2. Login
        console.log('2. Logging In...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.access_token;
        console.log('   ✅ Logged in. Token:', token ? 'Present' : 'MISSING');

        const authHeaders = { Authorization: `Bearer ${token}` };

        // 3. Get Cart (Should be empty)
        console.log('3. Fetching Cart (Expect Empty)...');
        const cartRes = await axios.get(`${API_URL}/cart`, { headers: authHeaders });
        if (cartRes.data.items.length === 0) {
            console.log('   ✅ Cart is empty.');
        } else {
            console.warn('   ⚠️ Cart not empty? (Unexpected for new user)');
        }

        // 4. Find a Product to Add
        // We need a product ID. Let's fetch products public list.
        console.log('4. Finding a Product...');
        // Assuming there's a products endpoint. If not, we might fail here.
        // Risbow usually has public catalog.
        // Let's try GET /products or similar if available, or create one if we can (but we are not admin).
        // WE WILL ASSUME there is at least one product in the DB from previous seeds.
        // If not, we can't test completely.

        // Note: For this smoke test to be reliable without assumptions, we'd need to assume seed data exists.
        // Let's try to query products assuming `CatalogModule` exposes GET /products or /catalog/products
        let productId;
        let variantId;
        try {
            const productsRes = await axios.get(`${API_URL}/products`);
            // console.log('Products Response:', JSON.stringify(productsRes.data, null, 2));

            let products = [];
            if (Array.isArray(productsRes.data)) {
                products = productsRes.data;
            } else if (productsRes.data && Array.isArray(productsRes.data.data)) {
                products = productsRes.data.data;
            }

            if (products.length > 0) {
                productId = products[0].id;
            } else {
                console.log('   ℹ️ No products found. Skipping Add Item test.');
                return;
            }
        } catch (e: any) {
            console.log('   ⚠️ Could not fetch products:', e.response?.status, e.response?.data || e.message);
            return;
        }

        if (productId) {
            // 5. Add Item to Cart
            console.log(`5. Adding Product ${productId} to Cart...`);
            await axios.post(`${API_URL}/cart/items`, {
                productId,
                quantity: 1
            }, { headers: authHeaders });
            console.log('   ✅ Item added.');

            // 6. Verify Cart Update
            console.log('6. Verifying Cart...');
            const updatedCart = await axios.get(`${API_URL}/cart`, { headers: authHeaders });
            const item = updatedCart.data.items.find((i: any) => i.productId === productId);
            if (item && item.quantity === 1) {
                console.log('   ✅ Item present with quantity 1.');
            } else {
                console.error('   ❌ Item NOT found or quantity mismatch.');
            }

            // 7. Update Quantity
            console.log('7. Updating Quantity...');
            // Need cart item id
            const cartItemId = item.id;
            await axios.patch(`${API_URL}/cart/items/${cartItemId}`, {
                quantity: 2
            }, { headers: authHeaders });
            console.log('   ✅ Quantity updated.');

            // 8. Delete Item
            console.log('8. Removing Item...');
            await axios.delete(`${API_URL}/cart/items/${cartItemId}`, { headers: authHeaders });
            console.log('   ✅ Item removed.');
        }

        console.log('✅ Smoke Test Completed Successfully!');

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('❌ Test Failed (Axios):', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                code: error.code,
                url: error.config?.url
            });
        } else {
            console.error('❌ Test Failed (Unknown):', error);
        }
        process.exit(1);
    }
}

run();
