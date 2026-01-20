
const axios = require('axios');

async function checkHealth() {
    console.log('Checking Backend Health...');
    try {
        const res = await axios.get('http://localhost:3001/api/v1/categories');
        console.log('Categories Status:', res.status);
        console.log('Categories Data Length:', res.data.length);
    } catch (e) {
        console.error('Category Fetch Failed:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data));
        }
    }
}

checkHealth();
