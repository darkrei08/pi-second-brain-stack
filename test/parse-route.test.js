import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import test from 'node:test';

import { createAuthenticator } from '../src/gateway-auth.js';
import { createGatewayServer } from '../src/gateway-server.js';
import { createParserEngine } from '../src/index.js';

const token = 'a'.repeat(32);
const authenticator = createAuthenticator({ token, owner_id: 'operator-owner' });
const auth = { authorization: `Bearer ${token}` };

const docling_json = {
  pages: { 1: { page_no: 1, size: { width: 200, height: 100 } } },
  texts: [
    { text: 'Prima riga', prov: [{ page_no: 1, bbox: { l: 20, t: 60, r: 120, b: 20, coord_origin: 'BOTTOMLEFT' } }] },
    { text: 'Seconda riga', prov: [{ page_no: 1, bbox: { l: 20, t: 40, r: 120, b: 20, coord_origin: 'BOTTOMLEFT' } }] }
  ]
};

function recordingStorage() {
  const saved = [];
  return {
    saved,
    async saveDocumentAndSegments(document, result) {
      saved.push({ document, result });
    },
    async listDocumentCollections() {
      return [];
    }
  };
}

async function startEngine(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base_url = `http://127.0.0.1:${server.address().port}`;
  return {
    base_url,
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  };
}

function engineAnswer(body, status = 200) {
  return (request, response) => {
    request.resume();
    request.on('end', () => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    });
  };
}

async function send(port, body, path = '/v1/documents/parse') {
  return await new Promise((resolve, reject) => {
    const request = httpRequest({ host: '127.0.0.1', port, path, method: 'POST', headers: { ...auth, 'content-type': 'application/json' } }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
    });
    request.on('error', reject);
    request.end(JSON.stringify(body));
  });
}

async function post(gateway, body, path = '/v1/documents/parse') {
  const { port } = await gateway.start({ port: 0 });
  return await send(port, body, path);
}

const upload = {
  filename: 'report.pdf',
  media_type: 'application/pdf',
  content_base64: Buffer.from('%PDF-1.4 synthetic').toString('base64')
};

test('parses an uploaded document into stored segments through the one configured engine', async () => {
  const seen = [];
  const engine = await startEngine((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      seen.push({ url: request.url, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ document: { json_content: docling_json }, status: 'success' }));
    });
  });
  const storage = recordingStorage();
  const gateway = createGatewayServer({
    storage,
    authenticator,
    parser: createParserEngine({ base_url: engine.base_url })
  });

  try {
    const response = await post(gateway, upload);

    assert.equal(response.status, 200);
    const bytes = Buffer.from(upload.content_base64, 'base64');
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.deepEqual(response.body, { document_id: `urn:document:${hash}`, collections: [], segments: 2 });

    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, '/v1/convert/source');
    assert.deepEqual(seen[0].body.sources, [{ kind: 'file', base64_string: upload.content_base64, filename: 'report.pdf' }]);

    assert.equal(storage.saved.length, 1);
    const [{ document, result }] = storage.saved;
    assert.equal(document.document_id, `urn:document:${hash}`);
    assert.equal(document.text, 'Prima riga\n\nSeconda riga');
    assert.equal(document.source_label, 'report.pdf');
    assert.equal(document.source_hash, `sha256:${hash}`);
    assert.deepEqual(document.lineage, { parser: 'docling', model: null });
    assert.deepEqual(document.retention, { owner_id: 'operator-owner', state: 'active' });
    assert.equal(result.segments.length, 2);
    assert.deepEqual(result.segments[0].provenance.location, { page: 1, bounding_box: [0.1, 0.4, 0.6, 0.8], char_span: [0, 10] });
    assert.equal(result.segments[1].text, 'Seconda riga');
  } finally {
    await engine.close();
    await gateway.stop();
  }
});

test('answers with an unavailable error when no parser engine is configured', async () => {
  const storage = recordingStorage();
  const gateway = createGatewayServer({ storage, authenticator });

  try {
    const response = await post(gateway, upload);
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'parser_unavailable');
    assert.equal(storage.saved.length, 0);
  } finally {
    await gateway.stop();
  }
});

test('refuses an engine output the adapter cannot normalize and stores nothing', async () => {
  for (const json_content of [
    { pages: { 1: { page_no: 1, size: { width: 200, height: 100 } } }, texts: [] },
    { pages: { 1: { page_no: 1, size: { width: 200, height: 100 } } }, texts: [{ text: '   ', prov: [{ page_no: 1 }] }] },
    { pages: {}, texts: [{ text: 'Prima riga' }] }
  ]) {
    const engine = await startEngine(engineAnswer({ document: { json_content }, status: 'success' }));
    const storage = recordingStorage();
    const gateway = createGatewayServer({
      storage,
      authenticator,
      parser: createParserEngine({ base_url: engine.base_url })
    });

    try {
      const response = await post(gateway, upload);
      assert.equal(response.status, 502);
      assert.equal(response.body.error.code, 'parser_failed');
      assert.equal(storage.saved.length, 0);
    } finally {
      await engine.close();
      await gateway.stop();
    }
  }
});

test('reports an engine timeout without storing a document', async () => {
  const engine = await startEngine((request, response) => {
    request.resume();
    request.on('end', () => {
      setTimeout(() => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ document: { json_content: docling_json }, status: 'success' }));
      }, 200);
    });
  });
  const storage = recordingStorage();
  const gateway = createGatewayServer({
    storage,
    authenticator,
    parser: createParserEngine({ base_url: engine.base_url, timeout_ms: 20 })
  });

  try {
    const response = await post(gateway, upload);
    assert.equal(response.status, 504);
    assert.equal(response.body.error.code, 'parser_timeout');
    assert.equal(storage.saved.length, 0);
  } finally {
    await engine.close();
    await gateway.stop();
  }
});

test('rejects an upload outside the accepted document types and encoding', async () => {
  const engine = await startEngine(engineAnswer({ document: { json_content: docling_json }, status: 'success' }));
  const storage = recordingStorage();
  const gateway = createGatewayServer({
    storage,
    authenticator,
    parser: createParserEngine({ base_url: engine.base_url })
  });

  try {
    const { port } = await gateway.start({ port: 0 });
    const wrongType = await send(port, { ...upload, media_type: 'application/zip' });
    assert.equal(wrongType.status, 415);
    assert.equal(wrongType.body.error.code, 'unsupported_media_type');

    const wrongEncoding = await send(port, { ...upload, content_base64: 'not base64!' });
    assert.equal(wrongEncoding.status, 400);
    assert.equal(wrongEncoding.body.error.code, 'invalid_request');

    const unsafeLabel = await send(port, { ...upload, filename: '../../etc/passwd' });
    assert.equal(unsafeLabel.status, 400);
    assert.equal(unsafeLabel.body.error.code, 'invalid_request');

    const callerOwner = await send(port, { ...upload, owner_id: 'other-owner' });
    assert.equal(callerOwner.status, 400);
    assert.equal(callerOwner.body.error.code, 'invalid_request');

    assert.equal(storage.saved.length, 0);
  } finally {
    await engine.close();
    await gateway.stop();
  }
});
