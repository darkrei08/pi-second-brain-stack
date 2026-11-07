-- Graph projection tables: entities and relationships derived from segments.
-- Owner-scoped and retention-scoped via foreign keys to documents.

CREATE TABLE IF NOT EXISTS graph_entities (
  entity_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  label TEXT NOT NULL,
  provenance JSONB NOT NULL,
  extractor TEXT NOT NULL,
  extraction_revision TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (document_id, owner_id)
    REFERENCES documents (document_id, owner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS graph_entities_owner_idx
  ON graph_entities (owner_id);
CREATE INDEX IF NOT EXISTS graph_entities_document_idx
  ON graph_entities (document_id);
CREATE INDEX IF NOT EXISTS graph_entities_canonical_key_idx
  ON graph_entities (owner_id, kind, canonical_key);

CREATE TABLE IF NOT EXISTS graph_relationships (
  relationship_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_entity_id TEXT NOT NULL REFERENCES graph_entities (entity_id) ON DELETE CASCADE,
  target_entity_id TEXT NOT NULL REFERENCES graph_entities (entity_id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  provenance JSONB NOT NULL,
  extractor TEXT NOT NULL,
  extraction_revision TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (document_id, owner_id)
    REFERENCES documents (document_id, owner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS graph_relationships_owner_idx
  ON graph_relationships (owner_id);
CREATE INDEX IF NOT EXISTS graph_relationships_document_idx
  ON graph_relationships (document_id);
CREATE INDEX IF NOT EXISTS graph_relationships_source_idx
  ON graph_relationships (source_entity_id);
CREATE INDEX IF NOT EXISTS graph_relationships_target_idx
  ON graph_relationships (target_entity_id);
CREATE INDEX IF NOT EXISTS graph_relationships_source_target_relation_idx
  ON graph_relationships (owner_id, source_entity_id, target_entity_id, relation);
