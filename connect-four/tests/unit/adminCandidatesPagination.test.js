// Source-parse assertion (DB-free), same technique as
// connect-four/tests/blunder/blunderTagConstraint.test.js: rather than seeding a
// live database (rejected per research.md D10 — the repo's fast suite is entirely
// pure-module / source-parse based, no test seeds a live DB), this reads
// server/index.js's source text and asserts the GET /api/admin/candidates query
// chain's *shape* guarantees every-row-exactly-once pagination: a non-unique
// `created_at` sort key + SQL-level `.range()` can reorder tied rows across
// separate paginated requests unless a unique final tiebreaker (`id`) is present
// before `.range()`. FR-012a, FR-012b.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_JS_PATH = path.join(__dirname, '..', '..', 'server', 'index.js');

describe('GET /api/admin/candidates — pagination tiebreaker shape', () => {
  it("the query-builder chain orders by 'created_at' then 'id' before .range(...)", () => {
    const source = fs.readFileSync(INDEX_JS_PATH, 'utf8');

    // Locate the admin/candidates handler specifically, not just any .range() call
    // in the file (server/index.js has several .range() call sites).
    const handlerMatch = source.match(
      /app\.get\('\/api\/admin\/candidates',[\s\S]*?\.range\(offset, offset \+ limit - 1\);/
    );
    assert.ok(handlerMatch, 'could not locate GET /api/admin/candidates handler in server/index.js');
    const handlerSource = handlerMatch[0];

    const orderCreatedAtIdx = handlerSource.indexOf(".order('created_at'");
    assert.ok(orderCreatedAtIdx !== -1, "handler must call .order('created_at' ...)");

    const orderIdIdx = handlerSource.indexOf(".order('id'", orderCreatedAtIdx);
    assert.ok(
      orderIdIdx !== -1,
      "handler must call .order('id' ...) immediately after .order('created_at' ...) " +
      '— without it, tied created_at values can reorder across paginated requests, ' +
      'skipping or duplicating rows.'
    );

    const rangeIdx = handlerSource.indexOf('.range(', orderIdIdx);
    assert.ok(
      rangeIdx !== -1 && rangeIdx > orderIdIdx,
      ".order('id' ...) must precede .range(...) in the query-builder chain"
    );
  });
});
