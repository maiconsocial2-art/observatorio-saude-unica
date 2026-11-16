
import { createClient } from "@supabase/supabase-js";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const SITE_URL = "https://observatorio-saude-unica.vercel.app/";

function criarSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function escaparHTML(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName =
      process.env.BREVO_SENDER_NAME || "Observatório Saúde Única";

    if (!apiKey || !senderEmail) {
      return Response.json(
        { erro: "Configuração do serviço de e-mail incompleta." },
        { status: 500 }
      );
    }

    const autorizacao = request.headers.get("authorization");

    if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
      return Response.json(
        { erro: "Autenticação necessária." },
        { status: 401 }
      );
    }

    const token = autorizacao.slice(7).trim();

    if (!token) {
      return Response.json(
        { erro: "Token de autenticação inválido." },
        { status: 401 }
      );
    }

    const supabaseAdmin = criarSupabaseAdmin();

    const {
      data: { user },
      error: erroAutenticacao,
    } = await supabaseAdmin.auth.getUser(token);

    if (erroAutenticacao || !user) {
      return Response.json(
        { erro: "Sua sessão é inválida ou expirou. Entre novamente." },
        { status: 401 }
      );
    }

    const { data: administrador, error: erroAdmin } =
      await supabaseAdmin
        .from("administradores")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (erroAdmin) {
      console.error(
        "Erro ao verificar administrador:",
        erroAdmin.message
      );

      return Response.json(
        { erro: "Não foi possível verificar sua permissão." },
        { status: 500 }
      );
    }

    if (!administrador) {
      return Response.json(
        { erro: "Somente administradores podem enviar o e-mail de teste." },
        { status: 403 }
      );
    }

    if (!user.email) {
      return Response.json(
        { erro: "Sua conta não possui um endereço de e-mail cadastrado." },
        { status: 400 }
      );
    }

    const nome = escaparHTML(
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "Administrador"
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Teste de e-mail</title>
        </head>

        <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;color:#172b45;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
            <div style="background:#102b49;padding:28px;color:#ffffff;">
              <p style="margin:0;color:#5eead4;font-size:12px;font-weight:bold;letter-spacing:1px;">
                OBSERVATÓRIO SAÚDE ÚNICA
              </p>

              <h1 style="margin:14px 0 0;font-size:24px;">
                Teste de envio de e-mail
              </h1>
            </div>

            <div style="padding:28px;">
              <h2 style="color:#102b49;font-size:21px;">
                Olá, ${nome}!
              </h2>

              <p style="line-height:1.7;">
                Este é um e-mail de teste do Observatório Saúde Única.
              </p>

              <p style="line-height:1.7;">
                Se você recebeu esta mensagem, a integração com o serviço
                de envio de e-mails foi aceita pela Brevo.
              </p>

              <div style="margin:24px 0;padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;">
                <p style="margin:0;color:#065f46;font-weight:bold;">
                  Teste de envio solicitado com sucesso.
                </p>
              </div>

              <p style="line-height:1.7;font-size:14px;color:#475569;">
                Esta mensagem foi enviada exclusivamente para o endereço
                de e-mail da conta administradora que solicitou o teste.
                Nenhum outro usuário recebeu esta mensagem.
              </p>

              <div style="margin:28px 0;text-align:center;">
                <a
                  href="${SITE_URL}"
                  style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:bold;"
                >
                  Acessar o Observatório
                </a>
              </div>
            </div>

            <div style="background:#f8fafc;padding:18px;text-align:center;font-size:12px;color:#64748b;">
              Observatório Saúde Única
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = [
      "OBSERVATÓRIO SAÚDE ÚNICA",
      "Teste de envio de e-mail",
      "",
      `Olá, ${user.user_metadata?.full_name || "Administrador"}!`,
      "",
      "Este é um e-mail de teste do Observatório Saúde Única.",
      "Se você recebeu esta mensagem, a integração com a Brevo aceitou o envio.",
      "",
      "Esta mensagem foi enviada exclusivamente para a conta administradora que solicitou o teste.",
      "Nenhum outro usuário recebeu esta mensagem.",
      "",
      `Acesse: ${SITE_URL}`,
    ].join("\n");

    const resposta = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: user.email,
          },
        ],
        subject: "[Observatório Saúde Única] Teste de envio de e-mail",
        htmlContent,
        textContent,
      }),
    });

    const respostaTexto = await resposta.text();

    let resultadoBrevo = {};

    try {
      resultadoBrevo = respostaTexto
        ? JSON.parse(respostaTexto)
        : {};
    } catch {
      resultadoBrevo = {};
    }

    if (!resposta.ok) {
      console.error(
        "Brevo recusou o e-mail de teste:",
        resposta.status,
        respostaTexto.slice(0, 1000)
      );

      return Response.json(
        {
          erro:
            "A Brevo não aceitou o envio. Verifique a configuração do remetente e da chave de API.",
        },
        { status: 502 }
      );
    }

    return Response.json({
      sucesso: true,
      mensagem:
        "A Brevo aceitou o e-mail de teste para a conta administradora.",
      messageId: resultadoBrevo.messageId || null,
    });
  } catch (erro) {
    console.error("Erro no teste de e-mail:", erro);

    return Response.json(
      {
        erro: erro.message || "Erro interno ao enviar o e-mail de teste.",
      },
      { status: 500 }
    );
  }
}
