// Envia e-mails pelo Resend (resend.com, grátis até 3.000 por mês).
// Precisa de RESEND_API_KEY e EMAIL_REMETENTE na Vercel.
export async function enviarEmail(para, assunto, html) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    if (process.env.VERCEL) { console.error("RESEND_API_KEY não configurada — e-mail não enviado."); return false; }
    console.log(`[e-mail de teste] Para: ${para} | ${assunto}\n${html}`); // no computador só mostra no terminal
    globalThis.__ultimoEmail = { para, assunto, html };
    return true;
  }
  const r = await fetch(process.env.RESEND_API_BASE || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_REMETENTE || "Controller <onboarding@resend.dev>", to: [para], subject: assunto, html })
  });
  if (!r.ok) console.error("Resend:", r.status, (await r.text()).slice(0, 300));
  return r.ok;
}
