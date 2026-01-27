const axios = require('axios');

const API_URL = 'http://localhost:5000/api/auth';

const testAuth = async () => {
    try {
        console.log('--- Testing Authentication Flow ---');

        // 1. Register User
        console.log('\n[1] Testing Registration...');
        const user = {
            firstname: 'John',
            lastname: 'Doe',
            email: `test_${Date.now()}@example.com`,
            password: 'password123',
            role: 'Acheteur'
        };

        try {
            const registerRes = await axios.post(`${API_URL}/register`, user);
            console.log('✅ Registration Successful');
            console.log('Token received:', registerRes.data.token ? 'Yes' : 'No');
        } catch (error) {
            console.error('❌ Registration Failed:', error.response ? error.response.data : error.message);
            return; // Stop if registration fails (likely DB not running or server issue)
        }

        // 2. Login User
        console.log('\n[2] Testing Login...');
        try {
            const loginRes = await axios.post(`${API_URL}/login`, {
                email: user.email,
                password: user.password
            });
            console.log('✅ Login Successful');
            var token = loginRes.data.token;
        } catch (error) {
            console.error('❌ Login Failed:', error.response ? error.response.data : error.message);
            return;
        }

        // 3. Access Protected Route (Me)
        console.log('\n[3] Testing Protected Route (Get Me)...');
        try {
            const meRes = await axios.get(`${API_URL}/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('✅ Protected Route Access Successful');
            console.log('User Role:', meRes.data.data.role);
        } catch (error) {
            console.error('❌ Protected Route Access Failed:', error.response ? error.response.data : error.message);
        }

        // 4. Access Protected Route without Token
        console.log('\n[4] Testing Protected Route without Token...');
        try {
            await axios.get(`${API_URL}/me`);
            console.error('❌ Failed: Should have been rejected');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Access correctly denied (401 Unauthorized)');
            } else {
                console.error('❌ Unexpected error:', error.message);
            }
        }

    } catch (err) {
        console.error('Unexpected Error:', err);
    }
};

testAuth();
