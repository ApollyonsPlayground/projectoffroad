const AGENTMAIL_SEND = 'https://api.agentmail.to/v0/inboxes';

export type ChatContext = {
  currentPage?: string;
  userId?: string;
  userName?: string;
};

const FALLBACK_AFTER_MAIL =
  "Got it — I’ve got your message in my inbox and I’ll get back to you with something useful in a sec. If you’re hunting trails or runs, poke around the Trails and Runs tabs while you wait.";

export async function tryWebhookReply(params: {
  message: string;
  context: ChatContext;
  signal?: AbortSignal;
}): Promise<string | null> {
  const url = process.env.CAELUM_REPLY_WEBHOOK_URL?.trim();
  if (!url) return null;

  const secret = process.env.CAELUM_REPLY_WEBHOOK_SECRET?.trim();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      message: params.message,
      context: params.context,
    }),
    signal: params.signal,
    cache: 'no-store',
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Webhook ${res.status}${t ? `: ${t.slice(0, 200)}` : ''}`);
  }

  const raw = (await res.json()) as { reply?: unknown; success?: unknown };
  const reply = typeof raw.reply === 'string' ? raw.reply.trim() : '';
  if (!reply) throw new Error('Webhook returned empty reply');

  if (raw.success === false) {
    throw new Error(typeof raw.reply === 'string' ? raw.reply : 'Assistant declined');
  }

  return reply;
}

export async function sendAgentMailMessage(params: {
  message: string;
  context: ChatContext;
  signal?: AbortSignal;
}): Promise<void> {
  const apiKey = process.env.AGENTMAIL_API_KEY?.trim();
  const inboxId = process.env.AGENTMAIL_INBOX_ID?.trim();
  const to = process.env.CAELUM_AGENTMAIL_TO?.trim() || 'caelumheyron@agentmail.to';

  if (!apiKey || !inboxId) {
    throw new Error('AgentMail not configured');
  }

  const pathInbox = encodeURIComponent(inboxId);
  const subjectParts = ['SoCal Offroaders · Ask Caelum'];
  if (params.context.userName) subjectParts.push(params.context.userName);
  else if (params.context.userId) subjectParts.push(params.context.userId.slice(0, 8));

  const bodyLines = [
    params.message,
    '',
    '---',
    `Page: ${params.context.currentPage ?? 'unknown'}`,
    `User: ${params.context.userName ?? 'guest'}`,
    `User id: ${params.context.userId ?? '—'}`,
  ];

  const res = await fetch(`${AGENTMAIL_SEND}/${pathInbox}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject: subjectParts.join(' — '),
      text: bodyLines.join('\n'),
    }),
    signal: params.signal,
    cache: 'no-store',
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`AgentMail ${res.status}${t ? `: ${t.slice(0, 200)}` : ''}`);
  }
}

export async function deliverCaelumReply(params: {
  message: string;
  context: ChatContext;
  signal?: AbortSignal;
}): Promise<{ reply: string; deliveredVia: 'webhook' | 'agentmail' | 'webhook+agentmail' }> {
  const webhookUrl = process.env.CAELUM_REPLY_WEBHOOK_URL?.trim();
  const forwardMailToo = process.env.CAELUM_FORWARD_TO_AGENTMAIL?.trim() === '1';
  const hasMail = Boolean(process.env.AGENTMAIL_API_KEY?.trim() && process.env.AGENTMAIL_INBOX_ID?.trim());

  /** Primary path: webhook returns the in-app reply. Failures bubble up (no silent AgentMail fallback). */
  if (webhookUrl) {
    const reply = await tryWebhookReply(params);
    if (!reply) {
      throw new Error('Webhook returned no reply');
    }

    let via: 'webhook' | 'webhook+agentmail' = 'webhook';
    if (forwardMailToo && hasMail) {
      try {
        await sendAgentMailMessage(params);
        via = 'webhook+agentmail';
      } catch {
        /* archival email is best-effort */
      }
    }
    return { reply, deliveredVia: via };
  }

  /** Secondary path: AgentMail only when no webhook is configured (async inbox; canned reply in-app). */
  if (hasMail) {
    await sendAgentMailMessage(params);
    return { reply: FALLBACK_AFTER_MAIL, deliveredVia: 'agentmail' };
  }

  throw new Error(
    'Set CAELUM_REPLY_WEBHOOK_URL (POST JSON → { "reply": string }) for Ask Caelum. AgentMail is optional if you omit the webhook.',
  );
}
