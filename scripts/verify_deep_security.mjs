import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

async function runDeepSecurityVerification() {
  console.log('🛡️ RUNNING DEEP ZERO-TRUST CLOUD SECURITY VERIFICATION...\n');

  const userA = await loginOrRegister('deep_owner@vault.com', 'Deep Owner');
  const userB = await loginOrRegister('deep_attacker@vault.com', 'Deep Attacker');

  // Test 1: Upload a real physical file to User A's vault
  console.log('--- Test 1: Upload physical file via upload-raw ---');
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const fileContent = 'TOP_SECRET_PROPRIETARY_RESEARCH_DATA_' + Date.now();
  const fileBuf = Buffer.from(fileContent);

  const rawBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="confidential_memo.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`),
    fileBuf,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\ndocx\r\n--${boundary}--\r\n`)
  ]);

  const uploadRes = await fetch(`${BASE_URL}/api/cloud/upload-raw`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      cookie: userA.cookie
    },
    body: rawBody
  });

  const uploadData = await uploadRes.json();
  assert.strictEqual(uploadRes.status, 200, 'Upload should succeed');
  assert.ok(uploadData.file && uploadData.file.id, 'File should have an ID');
  const uploadedFile = uploadData.file;
  console.log(`✅ Uploaded file ID: ${uploadedFile.id}, URL: ${uploadedFile.fileData}`);

  // Test 2: Unauthenticated access to physical file URL
  console.log('\n--- Test 2: Direct static access without authentication ---');
  const unauthStaticRes = await fetch(`${BASE_URL}${uploadedFile.fileData}`);
  console.log(`Unauth status: ${unauthStaticRes.status}`);
  assert.strictEqual(unauthStaticRes.status, 401, 'Unauthenticated access to cloud physical file must be rejected with 401');
  console.log('✅ Passed: Unauthenticated direct access blocked.');

  // Test 3: Guest access to physical file URL
  console.log('\n--- Test 3: Guest session access to physical file URL ---');
  const guestRes = await fetch(`${BASE_URL}/auth/guest`, { method: 'POST' });
  const guestCookie = guestRes.headers.get('set-cookie');
  const guestStaticRes = await fetch(`${BASE_URL}${uploadedFile.fileData}`, {
    headers: { cookie: guestCookie }
  });
  console.log(`Guest status: ${guestStaticRes.status}`);
  assert.strictEqual(guestStaticRes.status, 401, 'Guest access to cloud physical file must be rejected with 401');
  console.log('✅ Passed: Guest direct access blocked.');

  // Test 4: Attacker (User B) access to User A's physical file URL (Anti-IDOR)
  console.log('\n--- Test 4: Attacker (User B) access to User A\'s physical file URL ---');
  const attackerStaticRes = await fetch(`${BASE_URL}${uploadedFile.fileData}`, {
    headers: { cookie: userB.cookie }
  });
  console.log(`Attacker status: ${attackerStaticRes.status}`);
  assert.strictEqual(attackerStaticRes.status, 404, 'Attacker must receive 404 (Anti-IDOR mask)');
  console.log('✅ Passed: Cross-account physical access masked with 404 Not Found.');

  // Test 5: Authorized Owner (User A) access to physical file URL
  console.log('\n--- Test 5: Owner (User A) access to physical file URL ---');
  const ownerStaticRes = await fetch(`${BASE_URL}${uploadedFile.fileData}`, {
    headers: { cookie: userA.cookie }
  });
  assert.strictEqual(ownerStaticRes.status, 200, 'Owner should access file with 200');
  const ownerText = await ownerStaticRes.text();
  assert.strictEqual(ownerText, fileContent, 'Content must match exactly');
  console.log('✅ Passed: Owner accessed physical file cleanly.');

  // Test 6: Double extension evasion detection
  console.log('\n--- Test 6: Double extension evasion detection (.docx.exe / .pdf.php) ---');
  const doubleExtRes = await fetch(`${BASE_URL}/api/cloud/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: userA.cookie },
    body: JSON.stringify({
      name: 'invoice_2026.pdf.php',
      content: 'Hello world disguised script',
      type: 'pdf'
    })
  });
  const doubleExtData = await doubleExtRes.json();
  console.log(`Double ext status: ${doubleExtRes.status}, error: ${doubleExtData.error}`);
  assert.strictEqual(doubleExtRes.status, 400, 'Double extension must be rejected');
  assert.ok(doubleExtData.securityViolation, 'Should flag securityViolation');
  console.log('✅ Passed: Double extension blocked.');

  // Test 7: Java Bytecode & Mach-O binary sniffing
  console.log('\n--- Test 7: Java Bytecode (0xCAFEBABE) Sniffing in innocent file ---');
  const javaClassHeader = Buffer.from([0xCA, 0xFE, 0xBA, 0xBE, 0x00, 0x00, 0x00, 0x34]);
  const javaClassB64 = `data:image/png;base64,${javaClassHeader.toString('base64')}`;
  const bytecodeRes = await fetch(`${BASE_URL}/api/cloud/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: userA.cookie },
    body: JSON.stringify({
      name: 'family_portrait.png',
      fileData: javaClassB64,
      type: 'image'
    })
  });
  const bytecodeData = await bytecodeRes.json();
  console.log(`Java bytecode status: ${bytecodeRes.status}, error: ${bytecodeData.error}`);
  assert.strictEqual(bytecodeRes.status, 400, 'Java bytecode must be rejected');
  console.log('✅ Passed: Compiled bytecode disguised as image blocked.');

  // Test 8: Cross-User Parent Folder Contamination Prevention
  console.log('\n--- Test 8: Cross-User Parent Folder Contamination Prevention ---');
  // Create User A private folder
  const folderARes = await fetch(`${BASE_URL}/api/cloud/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: userA.cookie },
    body: JSON.stringify({
      folder: { name: 'User A Top Secret Folder', folderType: 'private' }
    })
  });
  const folderAData = await folderARes.json();
  const folderAId = folderAData.folder.id;
  console.log(`User A private folder ID: ${folderAId}`);

  // User B tries to place a file into User A's folder
  const contaminateRes = await fetch(`${BASE_URL}/api/cloud/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: userB.cookie },
    body: JSON.stringify({
      name: 'attacker_implant.txt',
      content: 'injected',
      parentId: folderAId,
      type: 'code'
    })
  });
  const contaminateData = await contaminateRes.json();
  assert.strictEqual(contaminateRes.status, 200, 'Save should succeed but parentId neutralized');
  assert.strictEqual(contaminateData.file.parentId, null, 'parentId must be neutralized to null');
  console.log(`Contaminate response parentId: ${contaminateData.file.parentId}`);
  console.log('✅ Passed: Cross-user parentId injection neutralized to null.');

  // Test 9: Physical file deletion on disk upon DELETE /api/cloud/files/:id
  console.log('\n--- Test 9: Physical file cleanup on disk upon deletion ---');
  const physicalFilename = path.basename(uploadedFile.fileData);
  const diskPath = path.resolve(__dirname, '..', 'server', 'temp-files', 'uploads', physicalFilename);
  assert.ok(fs.existsSync(diskPath), `Physical file should exist on disk before deletion: ${diskPath}`);

  const deleteRes = await fetch(`${BASE_URL}/api/cloud/files/${uploadedFile.id}`, {
    method: 'DELETE',
    headers: { cookie: userA.cookie }
  });
  const deleteData = await deleteRes.json();
  assert.strictEqual(deleteRes.status, 200, 'Deletion should return 200');
  assert.ok(!fs.existsSync(diskPath), 'Physical file on disk must be unlinked and deleted!');
  console.log('✅ Passed: Physical disk file successfully cleaned up upon deletion.');

  console.log('\n========================================================');
  console.log('🏆 ALL 9/9 DEEP ZERO-TRUST HARDENING TESTS PASSED 100%!');
  console.log('========================================================\n');
}

runDeepSecurityVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
