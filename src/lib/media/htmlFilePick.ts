type HtmlFilePickOptions = {
  accept: string;
  capture?: 'user' | 'environment';
};

/** Fallback when Capacitor Camera native bridge is missing. */
export function pickFileViaHtmlInput(options: HtmlFilePickOptions): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept;
    if (options.capture) input.capture = options.capture;
    input.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0';

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      window.removeEventListener('focus', onWindowFocus);
      resolve(file);
    };

    input.addEventListener('change', () => {
      finish(input.files?.[0] ?? null);
    });

    const onWindowFocus = () => {
      window.setTimeout(() => {
        if (!settled && !input.files?.length) finish(null);
      }, 650);
    };

    document.body.appendChild(input);
    input.click();
    window.addEventListener('focus', onWindowFocus, { once: true });
  });
}
