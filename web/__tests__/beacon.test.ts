/**
 * Integration test for the customer beacon (public/pf-usage.js).
 *
 * Drives the real beacon in jsdom and asserts the dimension fields added for the
 * monitoring roadmap — platform (every signal), error_type and capture_mode
 * (auto vs manual) — actually land on the /batch payload the beacon ships.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'pf-usage.js'), 'utf8');

// Eval the beacon IIFE against a faked script tag + captured transport, and
// return the array of batch bodies sent via fetch.
function loadBeacon(): any[] {
  const bodies: any[] = [];

  const script = document.createElement('script');
  script.setAttribute('data-product-id', 'pipe-1');
  script.setAttribute('data-key', 'wkey-1');
  (script as any).src = 'https://app.example.test/pf-usage.js';
  document.head.appendChild(script);
  Object.defineProperty(document, 'currentScript', { configurable: true, get: () => script });

  (global as any).fetch = jest.fn((_url: string, opts: any) => {
    try { bodies.push(JSON.parse(opts.body)); } catch (_e) { /* ignore */ }
    return Promise.resolve({ status: 200 });
  });

  // eslint-disable-next-line no-eval
  (0, eval)(SRC);
  return bodies;
}

describe('pf-usage beacon dimensions', () => {
  it('stamps platform, error_type and capture_mode across signal kinds', () => {
    jest.useFakeTimers();
    const bodies = loadBeacon(); // auto pageview enqueues on load

    // Auto-captured exception (window error listener).
    window.dispatchEvent(Object.assign(new Event('error'), { error: new Error('boom'), message: 'boom' }));
    // Auto-captured promise rejection.
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('promise boom') }));
    // Developer-tagged event + error.
    (window as any).problemFinderUsage.record('signup');
    (window as any).problemFinderUsage.recordError('manual boom');

    jest.advanceTimersByTime(2100); // fire the debounced flush -> fetch

    const items = bodies.flatMap((b) => b.batch);
    expect(items.length).toBeGreaterThanOrEqual(5);

    // platform rides on every signal.
    expect(items.every((i: any) => i.platform === 'web')).toBe(true);

    const pageview = items.find((i: any) => i.kind === 'event' && i.event_type === 'pageview');
    const manualEvent = items.find((i: any) => i.kind === 'event' && i.event_type === 'signup');
    const exception = items.find((i: any) => i.kind === 'error' && i.message === 'boom');
    const rejection = items.find((i: any) => i.kind === 'error' && i.error_type === 'unhandled_rejection');
    const manualError = items.find((i: any) => i.kind === 'error' && i.message === 'manual boom');

    // capture_mode: auto for beacon listeners, manual for the public API.
    expect(pageview.capture_mode).toBe('auto');
    expect(manualEvent.capture_mode).toBe('manual');

    // error_type classification per source.
    expect(exception.error_type).toBe('exception');
    expect(exception.capture_mode).toBe('auto');
    expect(rejection.capture_mode).toBe('auto');
    expect(manualError.error_type).toBe('reported');
    expect(manualError.capture_mode).toBe('manual');
  });
});
