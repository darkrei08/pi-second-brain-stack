# 03: Entity and relationship provenance envelope

Type: decision
Status: resolved
Blocked by: None

## Question

Which fields make an entity or relationship citable with fail-closed guarantees at least as strong as segment citations?

## Answer

Every node and edge must carry a provenance envelope with these logical fields:

```js
{
  schema_version: 1,
  owner_id,
  source_segments: [{
    document_id,
    segment_id,
    segment_index,
    source_hash,
    segment_hash,
    citation_ref
  }],
  assertion: {
    kind,
    canonical_key,
    label,
    relation,
    source_node_id,
    target_node_id
  },
  assertion_hash,
  extraction: {
    extractor_id,
    extraction_revision,
    created_at
  }
}
```

The node form uses `kind`, `canonical_key`, and `label`; the edge form uses `relation`, `source_node_id`, and `target_node_id`. Unsupported fields are omitted rather than invented. `source_segments` is non-empty, each entry is a complete segment citation reference, and `assertion_hash` is recomputed from the canonical assertion fields and compared byte-for-byte with the stored value.

Before prompt use, graph evidence must validate owner and active retention, current document/source hash, current segment hash, node/edge identity, endpoint identity, assertion fields, assertion hash, and extraction revision. It then returns the graph claim together with the original segment citation(s). Any failure makes that graph evidence item unusable; callers must not repair it, fall back to a different endpoint, or emit an uncited graph-only answer.

A segment revalidation call cannot validate this envelope because it does not receive the derived assertion fields or extraction revision. Graph freshness therefore needs a graph-specific resolver and storage-backed revalidation seam.

## Traceability row (pending parent consolidation)

| Issue | Decision | Status |
|---|---|---|
| #17 | Graph evidence requires source-segment citations plus assertion fields/hash and pinned extraction lineage; graph-specific revalidation is mandatory | resolved |
