import { createHash } from 'node:crypto';
import { OPAQUE_ID_PATTERN, DOCUMENT_ID_PATTERN } from './opaque-id.js';

// Provisional traversal defaults. These are conservative starting points
// chosen to prevent unbounded work on an unmeasured graph. They must be
// tuned once real graph size and query-mix evidence exists.
//
// MAX_DEPTH = 3: most knowledge-graph retrieval literature uses 2-3 hops;
// choosing 3 avoids cutting useful paths while staying well below the
// combinatorial explosion at depth 5+. Provisional and unmeasured.
//
// MAX_RESULTS = 50: a single prompt context rarely benefits from more than
// ~50 graph claims alongside segment citations. Provisional and unmeasured.
//
// STATEMENT_TIMEOUT_MS = 5000: a 5-second SQL timeout prevents a runaway
// recursive CTE from blocking the connection pool. Provisional and unmeasured.
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_RESULTS = 50;
const DEFAULT_STATEMENT_TIMEOUT_MS = 5000;

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

function requirePool(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('pool must provide connect()');
  }
}

function requireOpaqueId(value, name) {
  if (typeof value !== 'string' || !OPAQUE_ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be opaque`);
  }
}

function requireText(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} must be non-empty text`);
  }
}

function requireObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function assertionHashEntity({ kind, canonical_key, label }) {
  return `sha256:${sha256Hex(`entity:${kind}:${canonical_key}:${label}`)}`;
}

function assertionHashRelationship({ relation, source_entity_id, target_entity_id }) {
  return `sha256:${sha256Hex(`relationship:${relation}:${source_entity_id}:${target_entity_id}`)}`;
}

function validateSegmentCitations(citations, name) {
  if (!Array.isArray(citations) || citations.length === 0) {
    throw new TypeError(`${name} must be a non-empty array`);
  }
  for (const [i, c] of citations.entries()) {
    requireObject(c, `${name}[${i}]`);
    if (typeof c.document_id !== 'string' || !DOCUMENT_ID_PATTERN.test(c.document_id)) {
      throw new TypeError(`${name}[${i}].document_id must be an opaque document URN`);
    }
    requireText(c.segment_id, `${name}[${i}].segment_id`);
    if (!Number.isInteger(c.segment_index) || c.segment_index < 0) {
      throw new TypeError(`${name}[${i}].segment_index must be a non-negative integer`);
    }
    if (typeof c.source_hash !== 'string' || !HASH_PATTERN.test(c.source_hash)) {
      throw new TypeError(`${name}[${i}].source_hash must be a SHA-256 hash`);
    }
    if (typeof c.segment_hash !== 'string' || !HASH_PATTERN.test(c.segment_hash)) {
      throw new TypeError(`${name}[${i}].segment_hash must be a SHA-256 hash`);
    }
    requireText(c.citation_ref, `${name}[${i}].citation_ref`);
  }
}

function validateEntityInput(entity) {
  requireObject(entity, 'entity');
  requireText(entity.entity_id, 'entity.entity_id');
  requireOpaqueId(entity.owner_id, 'entity.owner_id');
  if (typeof entity.document_id !== 'string' || !DOCUMENT_ID_PATTERN.test(entity.document_id)) {
    throw new TypeError('entity.document_id must be an opaque document URN');
  }
  requireText(entity.kind, 'entity.kind');
  requireText(entity.canonical_key, 'entity.canonical_key');
  requireText(entity.label, 'entity.label');
  requireText(entity.extractor, 'entity.extractor');
  requireText(entity.extraction_revision, 'entity.extraction_revision');
  requireText(entity.created_at, 'entity.created_at');
  validateSegmentCitations(entity.segment_citations, 'entity.segment_citations');
}

function validateRelationshipInput(rel) {
  requireObject(rel, 'relationship');
  requireText(rel.relationship_id, 'relationship.relationship_id');
  requireOpaqueId(rel.owner_id, 'relationship.owner_id');
  if (typeof rel.document_id !== 'string' || !DOCUMENT_ID_PATTERN.test(rel.document_id)) {
    throw new TypeError('relationship.document_id must be an opaque document URN');
  }
  requireText(rel.source_entity_id, 'relationship.source_entity_id');
  requireText(rel.target_entity_id, 'relationship.target_entity_id');
  requireText(rel.relation, 'relationship.relation');
  if (typeof rel.confidence !== 'number' || !Number.isFinite(rel.confidence) ||
      rel.confidence < 0 || rel.confidence > 1) {
    throw new TypeError('relationship.confidence must be between 0 and 1');
  }
  requireText(rel.extractor, 'relationship.extractor');
  requireText(rel.extraction_revision, 'relationship.extraction_revision');
  requireText(rel.created_at, 'relationship.created_at');
  validateSegmentCitations(rel.segment_citations, 'relationship.segment_citations');
}

export function createGraphProjection({ pool }) {
  requirePool(pool);

  return {
    /**
     * Replace the graph projection for a single document atomically.
     * Deletes all existing entities and relationships for the document/owner,
     * then inserts the new ones. Safe to re-run: idempotent by construction.
     */
    async replaceProjection({ document_id, owner_id, entities, relationships }) {
      if (typeof document_id !== 'string' || !DOCUMENT_ID_PATTERN.test(document_id)) {
        throw new TypeError('document_id must be an opaque document URN');
      }
      requireOpaqueId(owner_id, 'owner_id');
      if (!Array.isArray(entities)) {
        throw new TypeError('entities must be an array');
      }
      if (!Array.isArray(relationships)) {
        throw new TypeError('relationships must be an array');
      }
      for (const entity of entities) {
        validateEntityInput(entity);
        if (entity.owner_id !== owner_id) {
          throw new TypeError('entity owner_id must match the projection owner_id');
        }
        if (entity.document_id !== document_id) {
          throw new TypeError('entity document_id must match the projection document_id');
        }
      }
      for (const rel of relationships) {
        validateRelationshipInput(rel);
        if (rel.owner_id !== owner_id) {
          throw new TypeError('relationship owner_id must match the projection owner_id');
        }
        if (rel.document_id !== document_id) {
          throw new TypeError('relationship document_id must match the projection document_id');
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verify the document exists and belongs to the owner.
        const docCheck = await client.query(
          `SELECT document_id FROM documents
           WHERE document_id = $1 AND owner_id = $2
           FOR UPDATE`,
          [document_id, owner_id]
        );
        if (docCheck.rowCount !== 1) {
          throw new Error('document must belong to the owner');
        }

        // Atomic replacement: delete old projection, insert new.
        // Relationships cascade from entities, so deleting entities suffices.
        await client.query(
          'DELETE FROM graph_entities WHERE document_id = $1 AND owner_id = $2',
          [document_id, owner_id]
        );

        for (const entity of entities) {
          const assertion_hash = assertionHashEntity(entity);
          await client.query(`
            INSERT INTO graph_entities (
              entity_id, owner_id, document_id, kind, canonical_key, label,
              provenance, extractor, extraction_revision, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
          `, [
            entity.entity_id,
            owner_id,
            document_id,
            entity.kind,
            entity.canonical_key,
            entity.label,
            JSON.stringify({
              assertion_hash,
              segment_citations: entity.segment_citations
            }),
            entity.extractor,
            entity.extraction_revision,
            entity.created_at
          ]);
        }

        for (const rel of relationships) {
          const assertion_hash = assertionHashRelationship(rel);
          await client.query(`
            INSERT INTO graph_relationships (
              relationship_id, owner_id, document_id,
              source_entity_id, target_entity_id, relation, confidence,
              provenance, extractor, extraction_revision, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
          `, [
            rel.relationship_id,
            owner_id,
            document_id,
            rel.source_entity_id,
            rel.target_entity_id,
            rel.relation,
            rel.confidence,
            JSON.stringify({
              assertion_hash,
              segment_citations: rel.segment_citations
            }),
            rel.extractor,
            rel.extraction_revision,
            rel.created_at
          ]);
        }

        await client.query('COMMIT');
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Preserve the original database error.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    /**
     * Bounded graph expansion using recursive SQL.
     *
     * Seeds from a list of entity IDs (typically found by segment/entity matching),
     * expands through relationships up to `max_depth` hops, returns at most
     * `max_results` claims. Every claim carries its original segment citations.
     *
     * Fails closed: any entity or relationship whose source segment no longer
     * validates (wrong owner, non-active retention, changed hashes) is excluded.
     * An empty graph or no seed matches returns an empty array.
     */
    async expandGraph({
      seed_entity_ids,
      owner_id,
      max_depth = DEFAULT_MAX_DEPTH,
      max_results = DEFAULT_MAX_RESULTS,
      statement_timeout_ms = DEFAULT_STATEMENT_TIMEOUT_MS
    }) {
      if (!Array.isArray(seed_entity_ids) || seed_entity_ids.length === 0) {
        return [];
      }
      requireOpaqueId(owner_id, 'owner_id');
      if (!Number.isInteger(max_depth) || max_depth < 1 || max_depth > 10) {
        throw new TypeError('max_depth must be an integer between 1 and 10');
      }
      if (!Number.isInteger(max_results) || max_results < 1 || max_results > 500) {
        throw new TypeError('max_results must be an integer between 1 and 500');
      }
      if (!Number.isInteger(statement_timeout_ms) || statement_timeout_ms < 100 || statement_timeout_ms > 60000) {
        throw new TypeError('statement_timeout_ms must be an integer between 100 and 60000');
      }

      const client = await pool.connect();
      try {
        await client.query(`SET LOCAL statement_timeout = ${statement_timeout_ms}`);

        // Two-phase approach:
        // 1. Recursive CTE finds reachable entity IDs with depth tracking.
        // 2. Collect entity claims and relationship claims separately,
        //    both owner-scoped and retention-scoped.
        const { rows } = await client.query(`
          WITH RECURSIVE reachable_entities AS (
            -- Base: seed entities on active documents for this owner
            SELECT ge.entity_id, 0 AS depth
            FROM graph_entities ge
            JOIN documents d ON d.document_id = ge.document_id AND d.owner_id = ge.owner_id
            WHERE ge.entity_id = ANY($1::text[])
              AND ge.owner_id = $2
              AND d.retention_state = 'active'

            UNION

            -- Recursive: follow relationships to discover new entities
            SELECT
              CASE WHEN gr.source_entity_id = r.entity_id
                THEN gr.target_entity_id
                ELSE gr.source_entity_id
              END AS entity_id,
              r.depth + 1 AS depth
            FROM reachable_entities r
            JOIN graph_relationships gr
              ON (gr.source_entity_id = r.entity_id OR gr.target_entity_id = r.entity_id)
              AND gr.owner_id = $2
            JOIN documents d_rel ON d_rel.document_id = gr.document_id AND d_rel.owner_id = $2
            -- Verify the far-end entity exists for this owner on an active document
            JOIN graph_entities ge_far
              ON ge_far.entity_id = CASE WHEN gr.source_entity_id = r.entity_id
                THEN gr.target_entity_id ELSE gr.source_entity_id END
              AND ge_far.owner_id = $2
            JOIN documents d_far ON d_far.document_id = ge_far.document_id AND d_far.owner_id = $2
            WHERE r.depth < $3
              AND d_rel.retention_state = 'active'
              AND d_far.retention_state = 'active'
          ),
          -- Deduplicate entities, keeping the minimum depth
          min_depth AS (
            SELECT entity_id, MIN(depth) AS depth
            FROM reachable_entities
            GROUP BY entity_id
          ),
          -- Entity claims
          entity_claims AS (
            SELECT
              ge.entity_id,
              ge.document_id,
              ge.kind,
              ge.canonical_key,
              ge.label,
              ge.provenance,
              ge.extractor,
              ge.extraction_revision,
              ge.created_at,
              md.depth,
              'entity'::text AS claim_type,
              NULL::text AS relationship_id,
              NULL::text AS relation,
              NULL::text AS source_entity_id,
              NULL::text AS target_entity_id,
              NULL::real AS confidence
            FROM min_depth md
            JOIN graph_entities ge ON ge.entity_id = md.entity_id AND ge.owner_id = $2
            JOIN documents d ON d.document_id = ge.document_id AND d.owner_id = $2
            WHERE d.retention_state = 'active'
          ),
          -- Relationship claims: include any relationship connecting two reachable entities
          relationship_claims AS (
            SELECT
              gr.target_entity_id AS entity_id,
              gr.document_id,
              NULL::text AS kind,
              NULL::text AS canonical_key,
              NULL::text AS label,
              gr.provenance,
              gr.extractor,
              gr.extraction_revision,
              gr.created_at,
              GREATEST(s.depth, t.depth) AS depth,
              'relationship'::text AS claim_type,
              gr.relationship_id,
              gr.relation,
              gr.source_entity_id,
              gr.target_entity_id,
              gr.confidence
            FROM graph_relationships gr
            JOIN min_depth s ON s.entity_id = gr.source_entity_id
            JOIN min_depth t ON t.entity_id = gr.target_entity_id
            JOIN documents d ON d.document_id = gr.document_id AND d.owner_id = $2
            WHERE gr.owner_id = $2
              AND d.retention_state = 'active'
          ),
          all_claims AS (
            SELECT * FROM entity_claims
            UNION ALL
            SELECT * FROM relationship_claims
          )
          SELECT * FROM all_claims
          ORDER BY depth, claim_type, COALESCE(relationship_id, entity_id)
          LIMIT $4
        `, [seed_entity_ids, owner_id, max_depth, max_results]);

        // Post-filter: revalidate each claim's segment citations against current state.
        // A claim whose citations cannot be verified is excluded (fail closed).
        const claims = [];
        for (const row of rows) {
          const provenance = row.provenance;
          if (!provenance || !Array.isArray(provenance.segment_citations) || provenance.segment_citations.length === 0) {
            continue; // No citation chain: fail closed.
          }

          const valid = await this._revalidateGraphCitations(client, provenance.segment_citations, owner_id);
          if (!valid) continue; // Stale citation: fail closed.

          if (row.claim_type === 'entity') {
            claims.push({
              claim_type: 'entity',
              entity_id: row.entity_id,
              document_id: row.document_id,
              kind: row.kind,
              canonical_key: row.canonical_key,
              label: row.label,
              assertion_hash: provenance.assertion_hash,
              segment_citations: provenance.segment_citations,
              extractor: row.extractor,
              extraction_revision: row.extraction_revision,
              depth: row.depth
            });
          } else {
            claims.push({
              claim_type: 'relationship',
              relationship_id: row.relationship_id,
              entity_id: row.entity_id,
              document_id: row.document_id,
              relation: row.relation,
              source_entity_id: row.source_entity_id,
              target_entity_id: row.target_entity_id,
              confidence: row.confidence,
              assertion_hash: provenance.assertion_hash,
              segment_citations: provenance.segment_citations,
              extractor: row.extractor,
              extraction_revision: row.extraction_revision,
              depth: row.depth
            });
          }
        }

        return claims;
      } finally {
        client.release();
      }
    },

    /**
     * Revalidate segment citations for a graph claim.
     * Returns true only if every cited segment still exists, belongs to the
     * owner, is on an active document, and hashes match.
     */
    async _revalidateGraphCitations(client, citations, owner_id) {
      for (const citation of citations) {
        const { rows } = await client.query(`
          SELECT 1
          FROM segments s
          JOIN documents d ON d.document_id = s.document_id
          WHERE s.id = $1
            AND s.document_id = $2
            AND d.owner_id = $3
            AND d.retention_state = 'active'
            AND d.source_hash = $4
            AND s.text_sha256 = $5
        `, [
          citation.segment_id,
          citation.document_id,
          owner_id,
          citation.source_hash,
          citation.segment_hash.startsWith('sha256:')
            ? citation.segment_hash.slice('sha256:'.length)
            : citation.segment_hash
        ]);
        if (rows.length === 0) return false;
      }
      return true;
    },

    /**
     * Delete the entire graph projection for a document.
     * Entities cascade-delete their relationships.
     */
    async deleteProjection(document_id, owner_id) {
      if (typeof document_id !== 'string' || !DOCUMENT_ID_PATTERN.test(document_id)) {
        throw new TypeError('document_id must be an opaque document URN');
      }
      requireOpaqueId(owner_id, 'owner_id');
      const result = await pool.query(
        'DELETE FROM graph_entities WHERE document_id = $1 AND owner_id = $2',
        [document_id, owner_id]
      );
      return result.rowCount > 0;
    }
  };
}
