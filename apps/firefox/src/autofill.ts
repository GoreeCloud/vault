/** Browser tab injection occurs only after direct user click and exact origin match. */
export function matchingHttpsOrigin(storedWebsite: string, tabUrl: string): string | null {
  try {
    const stored = new URL(storedWebsite);
    const active = new URL(tabUrl);
    if (stored.protocol !== 'https:' || active.protocol !== 'https:') return null;
    if (stored.username || stored.password || active.username || active.password) return null;
    return stored.origin === active.origin ? stored.origin : null;
  } catch { return null; }
}

/**
 * Execute ONLY in the active tab with browser.scripting.executeScript on user action.
 * Check again inside isolated world for navigation races. Never submit a form.
 */
export function fillActiveDocument(expectedOrigin: string, username: string, password: string): boolean {
  if (globalThis.location.origin !== expectedOrigin) return false;
  const pwd = document.querySelector<HTMLInputElement>('input[type="password"]');
  if (!pwd || pwd.disabled || pwd.readOnly || !pwd.isConnected) return false;
  const form = pwd.form ?? document;
  const name = form.querySelector<HTMLInputElement>(
    'input[autocomplete="username"],input[type="email"],input[name="username"],input[name="email"]'
  );
  function fill(node: HTMLInputElement, value: string) {
    if (node.disabled || node.readOnly || !node.isConnected) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    if (!setter) return;
    setter.call(node,value);
    node.dispatchEvent(new Event('input',{bubbles:true}));
    node.dispatchEvent(new Event('change',{bubbles:true}));
  }
  if (name) fill(name,username);
  fill(pwd,password);
  return true;
}
