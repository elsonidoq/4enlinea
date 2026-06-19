---
name: reference_supabase_storage_api
description: "Verified Supabase Storage JS API shapes — upload, createSignedUrl, FileOptions; from supabase/storage-js source"
metadata: 
  node_type: memory
  type: reference
  originSessionId: f91a4b1e-9aa2-4175-ba1d-626248e20591
---

Verified against `supabase/storage-js` TypeScript source 2026-06-19. Supabase Storage
methods return `{ data, error }` — never throw. The `supabase.storage` client is
available on the same `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` instance
used for DB queries. No separate initialization needed.

## `upload(path, fileBody, fileOptions?)`

```js
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload(path, buffer, { contentType: 'audio/mpeg', upsert: true });
```

**FileBody** union: `ArrayBuffer | ArrayBufferView | Blob | Buffer | File | FormData | NodeJS.ReadableStream | ReadableStream<Uint8Array> | URLSearchParams | string`

**FileOptions**:
- `cacheControl?: string`
- `contentType?: string`
- `upsert?: boolean` — **CRITICAL**: when true, overwrites existing file at same path; when false (default), throws error if file exists
- `duplex?: string`
- `metadata?: Record<string, any>`
- `headers?: Record<string, string>`

**Return — success**: `{ data: { id: string, path: string, fullPath: string }, error: null }`
**Return — failure**: `{ data: null, error: StorageError }`

## `createSignedUrl(path, expiresIn, options?)`

```js
const { data, error } = await supabase.storage
  .from('bucket-name')
  .createSignedUrl(path, 604800); // 604800s = 1 week
```

**expiresIn**: seconds (required). No maximum documented.

**options**: `{ download?: string | boolean, transform?: TransformOptions }`

**Return — success**: `{ data: { signedUrl: string }, error: null }`
**Return — failure**: `{ data: null, error: StorageError }`

**⚠️ Field is `signedUrl`, not `url` or `signed_url`.**

## `remove(paths)`

```js
const { data, error } = await supabase.storage
  .from('bucket-name')
  .remove(['path/to/file.mp3']);
```

**paths**: `string[]` — array of object paths to delete. No bulk endpoint — one call per batch.

**Return — success**: `{ data: Array<{ id, path, fullPath }>, error: null }`
