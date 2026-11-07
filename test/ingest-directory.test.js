import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { ingestDirectory } from '../src/ingest-directory.js';

const collection_id = 'synthetic-directory-collection';
const gateway_token = 'a'.repeat(32);

async function withDirectory(files, run) {
  const directory = await mkdtemp(join(tmpdir(), 'ingest-directory-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(directory, name), content);
    }
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function recordingPost() {
  const calls = [];
  const post = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({}) };
  };
  post.calls = calls;
  return post;
}

test('pre-validates every file and posts each one in sequence with the collection', async () => {
  await withDirectory({ 'b-contract.txt': 'Second file about contracts.\n\nIt has two paragraphs.' }, async (directory) => {
    await writeFile(join(directory, 'a-invoice.txt'), 'First file about invoices.\n\nIt also has two paragraphs.');
    const post = recordingPost();
    const result = await ingestDirectory({
      directory,
      collection_id,
      gateway_url: 'http://127.0.0.1:8080',
      gateway_token,
      max_segment_chars: 60,
      post
    });

    assert.deepEqual(result, { collection_id, documents: 2 });
    assert.equal(post.calls.length, 2);
    assert.deepEqual(post.calls.map(({ url }) => url), [
      'http://127.0.0.1:8080/v1/documents/ingest',
      'http://127.0.0.1:8080/v1/documents/ingest'
    ]);
    assert.equal(post.calls[0].init.method, 'POST');
    assert.equal(post.calls[0].init.headers.authorization, `Bearer ${gateway_token}`);
    assert.equal(post.calls[0].init.headers['content-type'], 'application/json');
    const bodies = post.calls.map(({ init }) => JSON.parse(init.body));
    assert.deepEqual(bodies.map(({ document }) => document.source_label), ['a-invoice.txt', 'b-contract.txt']);
    assert.deepEqual(bodies.map(({ max_segment_chars }) => max_segment_chars), [60, 60]);
    for (const { document } of bodies) {
      assert.match(document.document_id, /^urn:document:file-[0-9a-f]{64}$/u);
      assert.match(document.source_hash, /^sha256:[0-9a-f]{64}$/u);
      assert.deepEqual(document.collections, [collection_id]);
      assert.equal(document.retention, undefined);
    }
  });
});

test('refuses a non-UTF-8 file before posting anything', async () => {
  await withDirectory({
    'a-invoice.txt': 'Valid invoice text.',
    'b-broken.txt': Buffer.from([0xff, 0xfe, 0xfd])
  }, async (directory) => {
    const post = recordingPost();
    await assert.rejects(
      ingestDirectory({ directory, collection_id, gateway_token, post }),
      /Cannot decode file b-broken\.txt as UTF-8/
    );
    assert.equal(post.calls.length, 0);
  });
});

test('refuses a file the segmentation use case cannot accept before posting anything', async () => {
  await withDirectory({ 'a-empty.txt': '' }, async (directory) => {
    const post = recordingPost();
    await assert.rejects(ingestDirectory({ directory, collection_id, gateway_token, post }), /text/);
    assert.equal(post.calls.length, 0);
  });
});

test('stops at the first gateway refusal and reports which file it was', async () => {
  await withDirectory({
    'a-invoice.txt': 'First invoice text.',
    'b-contract.txt': 'Second contract text.'
  }, async (directory) => {
    const calls = [];
    const post = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'invalid_request', message: 'unknown or foreign collection for this owner' } })
      };
    };
    await assert.rejects(
      ingestDirectory({ directory, collection_id, gateway_token, post }),
      /Gateway refused a-invoice\.txt: unknown or foreign collection for this owner/
    );
    assert.equal(calls.length, 1);
  });
});

test('refuses malformed input before reading the directory', async () => {
  const post = recordingPost();
  await assert.rejects(
    ingestDirectory({ directory: '/nonexistent-directory', collection_id: '../foreign', gateway_token, post }),
    /collection_id/
  );
  await assert.rejects(
    ingestDirectory({ directory: '/nonexistent-directory', collection_id, gateway_url: 'ftp://example.test', gateway_token, post }),
    /gateway_url/
  );
  await assert.rejects(
    ingestDirectory({ directory: '/nonexistent-directory', collection_id, gateway_token: '' , post }),
    /gateway_token/
  );
  assert.equal(post.calls.length, 0);
});
