import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

const SW_SOURCE = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
const SHELL_HTML =
  '<script src="./assets/index.js"></script><link href="./assets/index.css" rel="stylesheet">';
const ORIGIN = 'https://dash.local';

class FakeResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
  }

  clone() {
    return new FakeResponse(this.body, { status: this.status });
  }

  async text() {
    return this.body;
  }
}

function createWorker(shell = SHELL_HTML) {
  const listeners = new Map();
  const stores = new Map();
  const fetched = [];

  const caches = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        put: async (request, response) => store.set(request.url ?? String(request), response),
        match: async (request) => store.get(request.url ?? String(request)),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
  };

  const sandbox = {
    caches,
    console,
    URL,
    location: { origin: ORIGIN },
    skipWaiting: () => {},
    clients: { claim: () => {} },
    addEventListener: (type, handler) => listeners.set(type, handler),
    fetch: async (input) => {
      const url = input.url ?? String(input);
      fetched.push(url);
      return new FakeResponse(url.includes('index.html') ? shell : `body:${url}`);
    },
  };
  sandbox.self = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(SW_SOURCE, sandbox);

  return { listeners, stores, fetched, shellStore: () => stores.get('tunet-pwa-v4') };
}

function dispatch(worker, type, event = {}) {
  const pending = [];
  const respondWithCalls = [];
  const handler = worker.listeners.get(type);

  handler({
    ...event,
    waitUntil: (promise) => pending.push(promise),
    respondWith: (response) => respondWithCalls.push(response),
  });

  return { respondWithCalls, done: Promise.all(pending) };
}

describe('service worker', () => {
  it('precaches the shell and its referenced build assets on install', async () => {
    const worker = createWorker();
    await dispatch(worker, 'install').done;

    const store = worker.shellStore();
    expect(store.has('./index.html')).toBe(true);
    expect(store.has('./assets/index.js')).toBe(true);
    expect(store.has('./assets/index.css')).toBe(true);
  });

  it('serves navigations from cache and refreshes the shell in the background', async () => {
    const worker = createWorker();
    await dispatch(worker, 'install').done;

    const { respondWithCalls, done } = dispatch(worker, 'fetch', {
      request: { method: 'GET', url: `${ORIGIN}/page/home`, mode: 'navigate' },
    });
    await done;

    expect(await (await respondWithCalls[0]).text()).toBe(SHELL_HTML);
    expect(worker.fetched).toContain(`${ORIGIN}/page/home`);
  });

  it('caches assets on first request and serves them cache-first', async () => {
    const worker = createWorker();
    const request = { method: 'GET', url: `${ORIGIN}/assets/lazy.js`, mode: 'cors' };

    const first = dispatch(worker, 'fetch', { request });
    expect(await (await first.respondWithCalls[0]).text()).toBe(`body:${request.url}`);
    expect(worker.shellStore().has(request.url)).toBe(true);

    const fetchesAfterFirst = worker.fetched.length;
    const second = dispatch(worker, 'fetch', { request });
    expect(await (await second.respondWithCalls[0]).text()).toBe(`body:${request.url}`);
    expect(worker.fetched.length).toBe(fetchesAfterFirst);
  });

  it('ignores non-GET and cross-origin requests', async () => {
    const worker = createWorker();

    const post = dispatch(worker, 'fetch', {
      request: { method: 'POST', url: `${ORIGIN}/assets/index.js`, mode: 'cors' },
    });
    const crossOrigin = dispatch(worker, 'fetch', {
      request: { method: 'GET', url: 'https://fonts.googleapis.com/css', mode: 'navigate' },
    });

    expect(post.respondWithCalls).toHaveLength(0);
    expect(crossOrigin.respondWithCalls).toHaveLength(0);
  });
});
