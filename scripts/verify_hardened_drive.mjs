// Automated verification script for extreme Enterprise Zero-Trust Drive hardening
import assert from 'assert';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3001';

async function loginOrRegister(email, name, password = 'Password123!') {
  let res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password })
    });
  }
  const cookie = res.headers.get('set-cookie');
  const data = await res.json();
  return { cookie, user: data.user };
}

async function runTests() {
  console.log('🧪 Starting Enterprise Zero-Trust Drive Hardening Verification...\n');

  // Login User A
  const userA = await loginOrRegister('vault_owner@deepmail.com', 'Vault Owner');
  // Login User B (Attacker / snooper)
  const userB = await loginOrRegister('vault_attacker@deepmail.com', 'Vault Attacker');

  console.log(`✅ 1. Authenticated User A (${userA.user?.email}) & User B (${userB.user?.email}) successfully.`);

  // Test 2: Dangerous file extension rejection (.exe)
  console.log('\n--- Test 2: Dangerous Extension Rejection (.exe) ---');
  const exeUploadRes = await fetch(`${BASE_URL}/api/cloud/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: userA.cookie
    },
    body: JSON.stringify({
      files: [{
        name: 'malware_payload.exe',
        content: 'MZ_dummy_executable_content',
        category: 'other'
      }]
    })
  });
  const exeUploadData = await exeUploadRes.json();
  console.log(`HTTP Status: ${exeUploadRes.status}, Response:`, exeUploadData);
  assert.strictEqual(exeUploadRes.status, 400, 'Should reject .exe with HTTP 400');
  assert.strictEqual(exeUploadData.securityViolation, true, 'Should flag securityViolation');
  console.log('✅ Test 2 Passed: .exe blocked by Cloud Security Shield.');

  // Test 3: Disguised file magic-bytes inspection (PE header 'MZ' disguised as photo.png)
  console.log('\n--- Test 3: Magic Bytes Inspection (MZ header inside .png) ---');
  const fakePngBuffer = Buffer.concat([Buffer.from([0x4D, 0x5A]), Buffer.from('DISGUISED_WINDOWS_EXECUTABLE_BYTES')]);
  const fakePngBase64 = `data:image/png;base64,${fakePngBuffer.toString('base64')}`;
  
  const disguisedRes = await fetch(`${BASE_URL}/api/cloud/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: userA.cookie
    },
    body: JSON.stringify({
      files: [{
        name: 'innocent_photo.png',
        fileData: fakePngBase64,
        category: 'image'
      }]
    })
  });
  const disguisedData = await disguisedRes.json();
  console.log(`HTTP Status: ${disguisedRes.status}, Response:`, disguisedData);
  assert.strictEqual(disguisedRes.status, 400, 'Should reject disguised executable with HTTP 400');
  assert.strictEqual(disguisedData.securityViolation, true, 'Should flag securityViolation');
  console.log('✅ Test 3 Passed: Disguised executable sniffing caught fake PNG.');

  // Test 4: Malicious SVG XSS script injection rejection
  console.log('\n--- Test 4: Malicious SVG XSS Prevention ---');
  const xssSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>';
  const svgRes = await fetch(`${BASE_URL}/api/cloud/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: userA.cookie
    },
    body: JSON.stringify({
      name: 'vector_graphic.svg',
      content: xssSvg,
      type: 'image'
    })
  });
  const svgData = await svgRes.json();
  console.log(`HTTP Status: ${svgRes.status}, Response:`, svgData);
  assert.strictEqual(svgRes.status, 400, 'Should reject SVG XSS with HTTP 400');
  assert.strictEqual(svgData.securityViolation, true, 'Should flag securityViolation on SVG script');
  console.log('✅ Test 4 Passed: SVG script injection blocked.');

  // Test 5: Legitimate document upload with SHA-256 Checksum generation
  console.log('\n--- Test 5: Legitimate Document Upload & SHA-256 Generation ---');
  const secretContent = 'TOP_SECRET_ENTERPRISE_VAULT_DOCUMENT_' + Date.now();
  const expectedHash = crypto.createHash('sha256').update(secretContent).digest('hex');

  const legitRes = await fetch(`${BASE_URL}/api/cloud/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: userA.cookie
    },
    body: JSON.stringify({
      name: 'financial_confidential.docx',
      content: secretContent,
      type: 'docx'
    })
  });
  const legitData = await legitRes.json();
  console.log(`HTTP Status: ${legitRes.status}, Saved File:`, legitData.file ? { id: legitData.file.id, name: legitData.file.name, checksum: legitData.file.checksum } : legitData);
  assert.strictEqual(legitRes.status, 200, 'Should succeed with 200');
  assert.ok(legitData.file && legitData.file.id, 'File should be saved');
  assert.strictEqual(legitData.file.checksum, expectedHash, 'Checksum must match expected SHA-256 hash');
  console.log(`✅ Test 5 Passed: Checksum generated correctly (${expectedHash.substring(0, 16)}...).`);

  const fileId = legitData.file.id;

  // Test 6: Anti-IDOR Oracle: Attacker User B tries to probe User A's file
  console.log("\n--- Test 6: Anti-IDOR Oracle (User B probes User A's file) ---");
  const idorProbeRes = await fetch(`${BASE_URL}/api/cloud/files/${fileId}`, {
    headers: { cookie: userB.cookie }
  });
  console.log(`HTTP Status for /files/:id: ${idorProbeRes.status}`);
  assert.strictEqual(idorProbeRes.status, 404, 'Must return 404 (Not Found) to avoid ID enumeration oracle');

  const idorRawRes = await fetch(`${BASE_URL}/api/cloud/files/${fileId}/raw`, {
    headers: { cookie: userB.cookie }
  });
  console.log(`HTTP Status for /raw: ${idorRawRes.status}`);
  assert.strictEqual(idorRawRes.status, 404, 'Must return 404 on raw download probe');
  console.log('✅ Test 6 Passed: Cross-account probe properly masked with 404 Not Found.');

  // Test 7: Authorized download returns tamper-free headers & verified checksum
  console.log('\n--- Test 7: Authorized Download with Enterprise Security Headers ---');
  const authDownloadRes = await fetch(`${BASE_URL}/api/cloud/files/${fileId}/raw`, {
    headers: { cookie: userA.cookie }
  });
  console.log(`HTTP Status: ${authDownloadRes.status}`);
  console.log(`X-Security-Shield: ${authDownloadRes.headers.get('x-security-shield')}`);
  console.log(`X-Tamper-Status: ${authDownloadRes.headers.get('x-tamper-status')}`);
  console.log(`X-Content-Sha256: ${authDownloadRes.headers.get('x-content-sha256')}`);
  assert.strictEqual(authDownloadRes.status, 200, 'Authorized download must succeed');
  assert.strictEqual(authDownloadRes.headers.get('x-security-shield'), 'ENTERPRISE-ZERO-TRUST-256BIT');
  assert.strictEqual(authDownloadRes.headers.get('x-tamper-status'), 'VERIFIED_INTEGRITY');
  assert.strictEqual(authDownloadRes.headers.get('x-content-sha256'), expectedHash);
  console.log('✅ Test 7 Passed: Enterprise security headers & integrity verified.');

  // Test 8: Mandatory Login Guard (Guests and Unauthenticated MUST be blocked)
  console.log('\n--- Test 8: Mandatory Login Guard (Guests & Unauthenticated Blocked) ---');
  // 8a. Unauthenticated request
  const unauthRes = await fetch(`${BASE_URL}/api/cloud/files`);
  console.log(`Unauthenticated HTTP Status: ${unauthRes.status}`);
  const unauthData = await unauthRes.json();
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated must receive 401');
  assert.strictEqual(unauthData.code, 'LOGIN_REQUIRED', 'Must return code LOGIN_REQUIRED');

  // 8b. Guest request
  const guestAuthRes = await fetch(`${BASE_URL}/auth/guest`, { method: 'POST' });
  const guestCookie = guestAuthRes.headers.get('set-cookie');
  const guestCloudRes = await fetch(`${BASE_URL}/api/cloud/files`, {
    headers: { cookie: guestCookie }
  });
  console.log(`Guest HTTP Status on /api/cloud/files: ${guestCloudRes.status}`);
  const guestCloudData = await guestCloudRes.json();
  assert.strictEqual(guestCloudRes.status, 401, 'Guest must be rejected from Cloud Drive with 401');
  assert.strictEqual(guestCloudData.code, 'LOGIN_REQUIRED', 'Guest must receive LOGIN_REQUIRED code');
  assert.strictEqual(guestCloudData.requireLogin, true, 'Guest must receive requireLogin: true');
  console.log('✅ Test 8 Passed: Mandatory login enforced 100% (Guest & Unauthenticated blocked).');

  console.log('\n=============================================');
  console.log('🎉 ALL 8/8 ENTERPRISE ZERO-TRUST TESTS PASSED!');
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
