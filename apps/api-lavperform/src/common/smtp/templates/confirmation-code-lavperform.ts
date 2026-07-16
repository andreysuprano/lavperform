export const MailLavperform = {
    title: (code: string) => `Seu código de confirmação | ${code}`,
    html: (code: string) => `
  <!doctype html>
  <html lang="pt-BR">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>Seu código de confirmação</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .bg-body { background-color:#0d1117 !important; }
        .card { background:#161b22 !important; box-shadow:none !important; }
        .text { color:#e6edf3 !important; }
        .muted { color:#8b949e !important; }
        .code { background:#0d1117 !important; color:#ffffff !important; border-color:#30363d !important; }
      }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
      .hover-underline:hover { text-decoration: underline !important; }
    </style>
  </head>

  <body style="margin:0; padding:0; background:#f0f4f8;" class="bg-body">
    <!-- Preheader (oculto) -->
    <div style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">
      Seu código de confirmação é ${code}. Use-o para continuar com segurança.
    </div>

    <!-- Wrapper -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f0f4f8" style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Open Sans',sans-serif;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <!-- Container -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;">
            <tr>
              <td align="center" style="padding:8px 0 24px;">
                <a href="https://lavperform.cloud" target="_blank" rel="noopener" style="text-decoration:none;">
                  <img src="https://app.lavperform.cloud/logo.png" width="200" height="auto" alt="LavPerform" style="display:block; border:0; outline:0;">
                </a>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td class="card" bgcolor="#ffffff" style="border-radius:10px; box-shadow:0 6px 18px rgba(0,0,0,0.06);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <!-- Faixa de destaque superior -->
                  <tr>
                    <td style="background:#1d6fa4; border-radius:10px 10px 0 0; padding:4px 0; font-size:0; line-height:0;">&nbsp;</td>
                  </tr>

                  <tr>
                    <td style="padding:32px 32px 8px;" align="left">
                      <h1 class="text" style="margin:0; font-size:22px; line-height:28px; color:#0f2b3d; font-weight:700;">
                        Confirme sua identidade
                      </h1>
                      <p class="muted" style="margin:8px 0 0; font-size:14px; line-height:20px; color:#6b7280;">
                        Use o código abaixo para continuar o processo com segurança. Este código expira em breve e só pode ser usado uma vez.
                      </p>
                    </td>
                  </tr>

                  <!-- Código -->
                  <tr>
                    <td align="center" style="padding:24px 24px 8px;">
                      <div class="code" style="display:inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-weight:700; font-size:28px; letter-spacing:6px; background:#eef4fb; color:#0f2b3d; padding:16px 20px; border:1px solid #b3cfe8; border-radius:8px;">
                        ${code}
                      </div>
                    </td>
                  </tr>

                  <!-- Dicas de segurança -->
                  <tr>
                    <td style="padding:8px 32px 28px;" align="left">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td class="muted" style="font-size:12px; line-height:18px; color:#6b7280;">
                            <strong>Nunca compartilhe este código.</strong> A LavPerform nunca pedirá seu código por telefone, WhatsApp ou redes sociais.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Rodapé -->
            <tr>
              <td align="center" style="padding:16px 8px 0;">
                <p class="muted" style="margin:0; font-size:12px; line-height:18px; color:#6b7280;">
                  © ${new Date().getFullYear()} <a href="https://lavperform.com.br" target="_blank" rel="noopener" style="color:#6b7280; text-decoration:none;">lavperform.cloud</a> ·
                  Suporte: <a href="mailto:suporte@lavperform.cloud" target="_blank" rel="noopener" style="color:#6b7280; text-decoration:underline;">suporte@lavperform.cloud</a>
                </p>
                <p class="muted" style="margin:4px 0 0; font-size:11px; line-height:16px; color:#9aa3b2;">
                  Você recebeu este e-mail porque alguém solicitou um código de confirmação para este endereço.
                  Se não foi você, ignore esta mensagem.
                </p>
                <div style="height:40px; line-height:40px; font-size:0;">&nbsp;</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `,
    attachments: []
};
