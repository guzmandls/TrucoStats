import type { Env } from './groups'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

export interface Mail {
  to: string
  subject: string
  text: string
  html: string
}

// Si el envío de correos está configurado (la clave de Brevo y el remitente
// verificado). Sin eso la app funciona igual, pero no puede mandar enlaces.
export function mailConfigured(env: Env): boolean {
  return env.MAIL_LOG === '1' || (!!env.BREVO_API_KEY && !!env.MAIL_FROM)
}

// Manda un correo con la API de Brevo. Devuelve si salió bien. Con MAIL_LOG=1
// (solo para desarrollo local) lo escribe en el registro en vez de enviarlo.
export async function sendMail(env: Env, mail: Mail): Promise<boolean> {
  if (env.MAIL_LOG === '1') {
    console.log(`[correo] a ${mail.to}: ${mail.subject}\n${mail.text}`)
    return true
  }
  if (!env.BREVO_API_KEY || !env.MAIL_FROM) {
    return false
  }
  try {
    const response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'TrucoStats', email: env.MAIL_FROM },
        to: [{ email: mail.to }],
        subject: mail.subject,
        textContent: mail.text,
        htmlContent: mail.html,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Correo con un botón que lleva al enlace (y el enlace en texto, por si el
// programa de correo no muestra el botón).
function linkMail(
  to: string,
  subject: string,
  intro: string,
  button: string,
  link: string,
  outro: string,
): Mail {
  return {
    to,
    subject,
    text: `${intro}\n\n${link}\n\n${outro}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f7f4ea;color:#1c1c1c">
<h2 style="margin:0 0 16px">TrucoStats</h2>
<p>${escapeHtml(intro)}</p>
<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#1c1c1c;color:#f7f4ea;padding:14px 22px;text-decoration:none;border-radius:10px;font-weight:bold">${escapeHtml(button)}</a></p>
<p style="font-size:13px;word-break:break-all">${escapeHtml(link)}</p>
<p style="font-size:13px">${escapeHtml(outro)}</p>
</div>`,
  }
}

export function resetMail(to: string, username: string, link: string): Mail {
  return linkMail(
    to,
    'Recupera tu contraseña de TrucoStats',
    `Pediste recuperar la contraseña de la cuenta “${username}”. Abre el enlace para elegir una nueva. Vale 1 hora y solo se puede usar una vez.`,
    'Elegir una contraseña nueva',
    link,
    'Si no fuiste tú, ignora este correo: tu contraseña no cambia.',
  )
}

export function confirmMail(to: string, link: string): Mail {
  return linkMail(
    to,
    'Confirma tu correo en TrucoStats',
    'Confirma que este correo es tuyo para usarlo en tu cuenta de TrucoStats. Servirá para recuperar tu contraseña. El enlace vale 24 horas.',
    'Confirmar mi correo',
    link,
    'Si no lo pediste tú, ignora este correo: no se guarda nada.',
  )
}
