// Transactional email via Resend's REST API.
// Needs env.RESEND_API_KEY (secret) and env.EMAIL_FROM, e.g. "Axon <noreply@yourdomain.com>".

function layout(title, body, cta) {
  return `<!doctype html><html><body style="margin:0;background:#f6f4ff;font-family:Nunito,Segoe UI,Arial,sans-serif;color:#1f1a3d">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <div style="font-size:24px;font-weight:900;color:#6d4cff;margin-bottom:20px">● Axon</div>
    <div style="background:#fff;border:2px solid #e0d9f6;border-radius:20px;padding:24px">
      <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
      <p style="font-size:16px;line-height:1.5;color:#57527a;margin:0 0 20px">${body}</p>
      <a href="${cta.href}" style="display:inline-block;background:#6d4cff;color:#fff;text-decoration:none;font-weight:900;padding:14px 22px;border-radius:14px;box-shadow:0 4px 0 #4f30d9">${cta.label}</a>
      <p style="font-size:13px;color:#57527a;margin:20px 0 0">Or paste this link into your browser:<br><span style="word-break:break-all">${cta.href}</span></p>
    </div>
    <p style="font-size:12px;color:#8a85ad;margin-top:16px">If you didn't request this, you can ignore this email.</p>
  </div></body></html>`;
}

export async function sendEmail(env, { to, subject, title, body, cta }) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.warn('Email not sent: RESEND_API_KEY / EMAIL_FROM not configured');
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject,
      html: layout(title, body, cta),
      text: `${title}\n\n${body}\n\n${cta.label}: ${cta.href}\n\nIf you didn't request this, ignore this email.`,
    }),
  });
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text().catch(() => ''));
    return { error: true };
  }
  return { ok: true };
}

export const verifyEmail = (env, to, link) => sendEmail(env, {
  to,
  subject: 'Confirm your Axon email',
  title: 'Confirm your email',
  body: 'Welcome to Axon! Confirm your email so you can always recover your account and progress.',
  cta: { href: link, label: 'Confirm email' },
});

export const resetEmail = (env, to, link) => sendEmail(env, {
  to,
  subject: 'Reset your Axon password',
  title: 'Reset your password',
  body: 'Someone (hopefully you) asked to reset your Axon password. This link works for 1 hour.',
  cta: { href: link, label: 'Choose a new password' },
});
