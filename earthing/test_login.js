console.log('Testing backend connectivity...');

const payload = { role: 'official', email: 'test@test.com', password: 'password' };
const url = 'http://localhost:4000/api/auth/login';

console.log('URL:', url);
console.log('Payload:', payload);

fetch(url, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(payload)
})
.then(r => {
  console.log('Response status:', r.status);
  return r.json();
})
.then(d => {
  console.log('Response data:', d);
  console.log('API is responding correctly!');
  process.exit(0);
})
.catch(e => {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
  process.exit(1);
});
