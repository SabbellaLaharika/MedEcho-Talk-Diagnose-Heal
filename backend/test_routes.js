const http = require('http');

function makeRequest(path, data, name) {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`[${name}] STATUS: ${res.statusCode}`);
        if (res.statusCode === 404) {
            console.error(`[${name}] FAILED: Route not found (404)`);
        } else {
            console.log(`[${name}] SUCCESS: Route found`);
        }

        res.on('data', d => process.stdout.write(d));
        res.on('end', () => console.log('\n------------------'));
    });

    req.on('error', (e) => {
        console.error(`[${name}] ERROR: ${e.message}`);
    });

    req.write(data);
    req.end();
}

// Test Login
const loginData = JSON.stringify({ email: 'test@example.com', password: 'password' });
makeRequest('/api/auth/login', loginData, 'LOGIN');

// Test Register
const registerData = JSON.stringify({
    name: 'Test',
    email: `test_${Date.now()}@example.com`,
    password: 'password',
    phone: '1234567890'
});
makeRequest('/api/auth/register', registerData, 'REGISTER');
