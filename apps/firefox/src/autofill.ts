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
 * Only fill one visible, editable, active password field after explicit user
 * action and exact-origin verification. Do not select hidden template fields,
 * signup/new-password controls, cross-origin frames or ambiguous multi-form
 * pages. Never submit, focus a different form or send data to remote APIs.
 *
 * A malicious same-origin website can still observe input values; origin
 * matching and visible-field heuristics do not make autofill phishing-proof.
 */
export function fillActiveDocument(expectedOrigin: string, username: string, password: string): boolean {
  if (globalThis.location.origin !== expectedOrigin) return false;

  function usable(node: HTMLInputElement): boolean {
    if (!node.isConnected || node.disabled || node.readOnly ||
        node.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    // Hidden CSS templates and zero-size credential honeypots are not targets.
    return Array.from(node.getClientRects()).some(r => r.width > 0 && r.height > 0);
  }

  const passwords = Array.from(document.querySelectorAll<HTMLInputElement>(
    'input[type="password"]'
  )).filter(usable);
  // Multiple current/new password fields are ambiguous. Fail closed.
  if (passwords.length !== 1) return false;
  const pwd = passwords[0];
  if (pwd.autocomplete.toLowerCase().split(/\s+/).includes('new-password')) return false;
  const container = pwd.form ?? document;
  const usernames = Array.from(container.querySelectorAll<HTMLInputElement>(
    'input[autocomplete~="username"],input[type="email"],input[name="username"],input[name="email"]'
  )).filter(n => n.type !== 'password' && usable(n));
  if (usernames.length > 1) return false;

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
  if (!setter) return false;
  function fill(node: HTMLInputElement, value: string): boolean {
    if (!usable(node) || globalThis.location.origin !== expectedOrigin) return false;
    setter!.call(node,value);
    node.dispatchEvent(new Event('input',{bubbles:true}));
    node.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  if (usernames[0] && !fill(usernames[0],username)) return false;
  return fill(pwd,password);
}
