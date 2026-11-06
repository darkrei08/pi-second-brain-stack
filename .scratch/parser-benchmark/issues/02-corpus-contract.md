# B2: Define the external parser benchmark corpus contract

Type: decision
Status: resolved
Blocked by: None

## Question

What corpus shape lets operators benchmark real documents without allowing private data into the public repository?

## Answer

The operator supplies an absolute `corpus_root` outside the repository and a JSON manifest with non-empty unique case IDs. Each case contains a relative `input` path under that root, optional `tags` describing document shape, and an optional relative `truth` path under that root. Truth JSON contains only canonical `text` and optional canonical `elements` (`text`, one-based `page`, normalized `bounding_box`). The harness rejects missing files, path escapes, duplicate IDs, and corpus roots inside the repository.

The manifest should cover the document shapes relevant to the deployment, such as born-digital PDFs, scanned PDFs/images, tables/forms, multi-column layouts, and multilingual/Italian text. No sample count or accuracy threshold is invented here; operators record their chosen corpus composition in the result metadata.

## Acceptance

- No corpus, OCR output, truth file, or model cache is committed.
- The harness can run with no truth and reports accuracy as not measured.
- Truth is optional because parser performance and output validity can be measured independently of a ground-truth corpus.
