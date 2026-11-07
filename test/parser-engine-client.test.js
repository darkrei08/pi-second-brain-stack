import assert from 'node:assert/strict';
import test from 'node:test';

import { createParserEngine } from '../src/index.js';

const base_url = 'http://127.0.0.1:5001';

const raw_json = {
  pages: { 1: { page_no: 1, size: { width: 200, height: 100 } } },
  texts: [{
    text: 'Prima riga',
    prov: [{ page_no: 1, bbox: { l: 20, t: 20, r: 120, b: 60, coord_origin: 'BOTTOMLEFT' } }]
  }]
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('posts the document to the engine conversion endpoint and returns its structured output', async () => {
  const calls = [];
  const parse = createParserEngine({
    base_url,
    allowed_hosts: [],
    fetch: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ document: { json_content: raw_json }, status: 'success' });
    }
  });

  const result = await parse({ filename: 'report.pdf', content_base64: 'JVBERi0xLjQK' });

  assert.deepEqual(result, { parser_type: 'docling', raw_json });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:5001/v1/convert/source');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.redirect, 'error');
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  const sent = JSON.parse(calls[0].init.body);
  assert.deepEqual(sent.sources, [{ kind: 'file', base64_string: 'JVBERi0xLjQK', filename: 'report.pdf' }]);
  assert.deepEqual(sent.options.to_formats, ['json']);
});

test('refuses a host outside the allowlist before connecting', async () => {
  let connected = false;
  const fetch = async () => {
    connected = true;
    return jsonResponse({});
  };

  assert.throws(
    () => createParserEngine({ base_url: 'https://198.51.100.7:5001', fetch }),
    /provider host 198\.51\.100\.7 is not allowed/
  );
  assert.equal(connected, false);

  assert.throws(() => createParserEngine({ base_url: 'http://parser.example.com', fetch }), /must use https/);
  assert.throws(() => createParserEngine({ base_url: 'ftp://127.0.0.1:5001', fetch }), /absolute http or https URL/);
  assert.throws(() => createParserEngine({ base_url: 'http://user:secret@127.0.0.1:5001', fetch }), /must not contain credentials/);
  assert.doesNotThrow(() => createParserEngine({ base_url: 'https://parser.example.com', allowed_hosts: ['parser.example.com'], fetch }));
});

test('bounds the engine call with a timeout', async () => {
  const parse = createParserEngine({
    base_url,
    timeout_ms: 10,
    fetch: (url, init) => new Promise((resolve, reject) => {
      const keepAlive = setTimeout(() => reject(new Error('the fake engine never observed an abort')), 1000);
      init.signal.addEventListener('abort', () => {
        clearTimeout(keepAlive);
        reject(init.signal.reason);
      });
    })
  });

  await assert.rejects(() => parse({ filename: 'report.pdf', content_base64: 'JVBERi0xLjQK' }), /parser engine request timed out/u);
  assert.throws(() => createParserEngine({ base_url, timeout_ms: 0, fetch: async () => jsonResponse({}) }), /timeout_ms/);
  assert.throws(() => createParserEngine({ base_url, timeout_ms: 600001, fetch: async () => jsonResponse({}) }), /timeout_ms/);
});

test('refuses an engine answer that is not a successful conversion', async () => {
  const parseWith = (response) => createParserEngine({ base_url, fetch: async () => response });

  await assert.rejects(
    () => parseWith(jsonResponse({ error: 'boom' }, 500))({ filename: 'report.pdf', content_base64: 'JVBERi0xLjQK' }),
    /parser engine request failed with status 500/u
  );
  await assert.rejects(
    () => parseWith(jsonResponse({ status: 'failure', errors: [] }))({ filename: 'report.pdf', content_base64: 'JVBERi0xLjQK' }),
    /must report a successful conversion/u
  );
  await assert.rejects(
    () => parseWith(jsonResponse({ status: 'success', document: {} }))({ filename: 'report.pdf', content_base64: 'JVBERi0xLjQK' }),
    /must contain a JSON document/u
  );
  await assert.rejects(
    () => parseWith(new Response('not json', { status: 200 }))({ filename: 'report.pdf', content_base64: 'JVBERi0xLjQK' }),
    /must be valid JSON/u
  );
});
