import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { useBrowserReady } from '../lib/use-browser-ready.ts';
void test('server-rendered controls stay disabled until browser handlers can attach', () => {
 function Control() { return createElement('input', { disabled: !useBrowserReady(), 'aria-label': 'Test control' }); }
 assert.match(renderToString(createElement(Control)), /disabled=""/);
});
