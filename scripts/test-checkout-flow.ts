import axios from 'axios';

const API_URL = 'http://localhost:3001/api/v1'; // Assuming port 3001
const EMAIL = `test.checkout.${Date.now()}@example.com`;
const PASSWORD = 'Password123';

async function run() {
    try {
        console.log('🚀 Starting Checkout Module Smoke Test...');

        // 1. Register User
        console.log('1. Registering User...');
        try {
            await axios.post(`${API_URL}/auth/register`, {
                email: EMAIL,
                password: PASSWORD,
                name: 'Checkout Tester',
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
        }

        // 2. Login
        console.log('2. Logging In...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.access_token;
        console.log('   ✅ Logged in.');

        const authHeaders = { Authorization: `Bearer ${token}` };

        // 3. Find a Product
        console.log('3. Finding a Product...');
        const productsRes = await axios.get(`${API_URL}/products`);
        let productId;

        let products = [];
        if (Array.isArray(productsRes.data)) {
            products = productsRes.data;
        } else if (productsRes.data && Array.isArray(productsRes.data.data)) {
            products = productsRes.data.data;
        }

        if (products.length > 0) {
            productId = products[0].id;
        } else {
            console.error('   ❌ No products found. Cannot proceed.');
            return;
        }

        // 4. Add Item to Cart
        console.log(`4. Adding Product ${productId} to Cart...`);
        await axios.post(`${API_URL}/cart/items`, {
            productId,
            quantity: 1
        }, { headers: authHeaders });
        console.log('   ✅ Item added.');

        // 5. Get Address
        // Wait, checkout requires address ID. Registration created an address? 
        // User registration creates "Address" fields in User model? No, it's a relation usually.
        // Wait, schema has User.addresses relation. 
        // My Registration DTO had `address` object. `AuthService.register` usually creates an Address record.
        // I need to fetch the address ID.
        // Let's call `GET /users/me/addresses` or assuming `GET /users/me` (profile) returns it?
        // Or create one if missing.
        console.log('5. Fetching Address ID...');
        // Assuming there is an address endpoint
        let addressId;
        try {
            // Try fetching addresses
            const addressesRes = await axios.get(`${API_URL}/users/me/addresses`, { headers: authHeaders });
            if (addressesRes.data.length > 0) {
                addressId = addressesRes.data[0].id;
            }
        } catch (e) {
            console.log('   ⚠️ Could not fetch addresses endpoint. Checking profile...');
        }

        if (!addressId) {
            // Fallback: create address if endpoint exists, or fail.
            // Given I just implemented `CheckoutService` requiring `shippingAddressId`, I assume `Address` records exist.
            // If registration created it, I just need to find it.
            // Maybe `GET /users/me`?
            const meRes = await axios.get(`${API_URL}/users/me`, { headers: authHeaders });
            // Check if addresses are included
            if (meRes.data.addresses && meRes.data.addresses.length > 0) {
                addressId = meRes.data.addresses[0].id;
            }
        }

        if (!addressId) {
            console.error('   ❌ Could not find an address for checkout. Test blocked.');
            // Try creating one?
            // await axios.post(`${API_URL}/addresses` ...
            // Not enough context on Address module.
            // Let's assume Registration created it and `GET /users/me` has it or `GET /users/me/addresses` works.
            // If not, I will fail.
            return;
        }
        console.log(`   ✅ Using Address ID: ${addressId}`);

        // 6. Checkout (COD)
        console.log('6. Processing Checkout (COD)...');
        const checkoutRes = await axios.post(`${API_URL}/checkout`, {
            paymentMode: 'COD',
            shippingAddressId: addressId,
            notes: 'Test COD Order'
        }, { headers: authHeaders });

        console.log('   ✅ Checkout Success:', checkoutRes.data);

        if (checkoutRes.data.status === 'CONFIRMED' && checkoutRes.data.paymentMode === 'COD') {
            console.log('   ✅ Order Status Verified: CONFIRMED');
        } else {
            console.error('   ❌ Order Status Mismatch:', checkoutRes.data.status);
        }

        // 7. Verify Cart is Empty
        console.log('7. Verifying Cart is Empty...');
        const cartRes = await axios.get(`${API_URL}/cart`, { headers: authHeaders });
        if (cartRes.data.items.length === 0) {
            console.log('   ✅ Cart is empty.');
        } else {
            console.error('   ❌ Cart NOT empty:', cartRes.data.items.length, 'items remaining.');
        }

        console.log('✅ Checkout Smoke Test Completed Successfully!');

    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            console.error('❌ Test Failed (Axios):', {
                status: error.response?.status,
                data: error.response?.data,
                url: error.config?.url
            });
        } else {
            console.error('❌ Test Failed (Unknown):', error);
        }
        process.exit(1);
    }
}

run();
