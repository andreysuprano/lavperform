export const Mail = {
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
      /* Clientes que respeitam <style> (Gmail web/mobile, Apple Mail, Outlook.com) */
      @media (prefers-color-scheme: dark) {
        .bg-body { background-color:#0f1115 !important; }
        .card { background:#151925 !important; box-shadow:none !important; }
        .text { color:#e6e8ee !important; }
        .muted { color:#a8b0c3 !important; }
        .code { background:#0b0e14 !important; color:#ffffff !important; border-color:#2b3345 !important; }
        .btn { background:#ffd400 !important; color:#1a1f2b !important; }
      }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
      .hover-underline:hover { text-decoration: underline !important; }
    </style>
  </head>
  
  <body style="margin:0; padding:0; background:#f2f3f8;" class="bg-body">
    <!-- Preheader (oculto) -->
    <div style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">
      Seu código de confirmação é ${code}. Use-o para continuar com segurança.
    </div>
  
    <!-- Wrapper -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f2f3f8" style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Open Sans',sans-serif;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <!-- Container -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;">
            <tr>
              <td align="center" style="padding:8px 0 24px;">
                <a href="https://foodcrm.com.br" target="_blank" rel="noopener" style="text-decoration:none;">
                  <img src="https://foodcrm.com.br/wp-content/uploads/2025/09/logo_dark_amarelo.png" width="250" height="auto" alt="FoodCRM" style="display:block; border:0; outline:0;">
                </a>
              </td>
            </tr>
  
            <!-- Card -->
            <tr>
              <td class="card" bgcolor="#ffffff" style="border-radius:10px; box-shadow:0 6px 18px rgba(0,0,0,0.06);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:32px 32px 8px;" align="left">
                      <h1 class="text" style="margin:0; font-size:22px; line-height:28px; color:#1e1e2d; font-weight:700;">
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
                      <div class="code" style="display:inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-weight:700; font-size:28px; letter-spacing:6px; background:#f7f8fc; color:#111827; padding:16px 20px; border:1px solid #e5e7eb; border-radius:8px;">
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
                            <strong>Nunca compartilhe este código.</strong> O FoodCRM nunca pedirá seu código por telefone, WhatsApp ou redes sociais.
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
                  © ${new Date().getFullYear()} <a href="https://foodcrm.com.br" target="_blank" rel="noopener" style="color:#6b7280; text-decoration:none;">foodcrm.com.br</a> ·
                  Suporte: <a href="mailto:suporte@foodcrm.com.br" target="_blank" rel="noopener" style="color:#6b7280; text-decoration:underline;">suporte@foodcrm.com.br</a>
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
  attachments: [
    {
      filename: 'logo.png',
      path: './src/common/smtp/templates/logo.png', // caminho local ou buffer
      cid: 'logo' // precisa ser o mesmo que você usou no src
    }
  ]
};
