import request from 'supertest';
// Импортируй свой сервер/handler, например:
import app from '../src/app'; // если есть express-like app
// или импортируй handler напрямую, если используешь Next.js API routes

describe('Documents API', () => {
  let documentId: number;
  let storageUrl: string;
  let nonce: string;
  const testAddress = '0x123...'; // подставь валидный адрес
  const testSignature = '0xabc...'; // подставь валидную подпись для nonce

  it('POST /api/documents — загрузка документа', async () => {
    const fileBuffer = Buffer.from('test file content');
    const formData = {
      title: 'Test Doc',
      creator_address: testAddress,
      hash: 'testhash',
      encrypted_aes_key_for_creator: 'encryptedkey',
      whitelist: JSON.stringify([testAddress]),
      encrypted_aes_keys: JSON.stringify([{ address: testAddress, encrypted_aes_key: 'encryptedkey' }]),
    };

    const res = await request(app)
      .post('/api/documents')
      .field('title', formData.title)
      .field('creator_address', formData.creator_address)
      .field('hash', formData.hash)
      .field('encrypted_aes_key_for_creator', formData.encrypted_aes_key_for_creator)
      .field('whitelist', formData.whitelist)
      .field('encrypted_aes_keys', formData.encrypted_aes_keys)
      .attach('encrypted_file', fileBuffer, 'test.pdf');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('storageUrl');
    documentId = res.body.id;
    storageUrl = res.body.storageUrl;
  });

  it('POST /api/documents/nonce — получить nonce', async () => {
    const res = await request(app)
      .post('/api/documents/nonce')
      .send({ address: testAddress });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nonce');
    nonce = res.body.nonce;
  });

  it('GET /api/documents/:id/key — получить зашифрованный ключ', async () => {
    // Здесь testSignature должен быть валидной подписью nonce от testAddress
    const res = await request(app)
      .get(`/api/documents/${documentId}/key`)
      .query({ address: testAddress, nonce, signature: testSignature });
    // Если подпись невалидна, ожидай 401
    // expect(res.status).toBe(401);
    // Если валидна:
    // expect(res.status).toBe(200);
    // expect(res.body).toHaveProperty('encrypted_aes_key');
  });
});