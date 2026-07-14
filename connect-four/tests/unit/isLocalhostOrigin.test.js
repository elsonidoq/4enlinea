import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalhostOrigin } from '../../src/lib/isLocalhostOrigin.js';

test('isLocalhostOrigin: localhost -> true', () => {
  assert.equal(isLocalhostOrigin('localhost'), true);
});

test('isLocalhostOrigin: 127.0.0.1 -> true', () => {
  assert.equal(isLocalhostOrigin('127.0.0.1'), true);
});

test('isLocalhostOrigin: ::1 -> true', () => {
  assert.equal(isLocalhostOrigin('::1'), true);
});

test('isLocalhostOrigin: app.example.com -> false', () => {
  assert.equal(isLocalhostOrigin('app.example.com'), false);
});

test('isLocalhostOrigin: empty string -> false', () => {
  assert.equal(isLocalhostOrigin(''), false);
});
