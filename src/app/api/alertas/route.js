
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://observatorio-saude-unica.vercel.app/";
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const TAMANHO_PAGINA = 1000;

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

function normalizarMunicipio(valor) {
  return String(valor || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function montarEmail(alerta) {
  const titulo = escaparHTML(alerta.titulo);
  const descricao = escaparHTML(alerta.descricao);
  const recomendacoes = escaparHTML(alerta.recomendacoes || "");
  const municipio = escaparHTML(alerta.municipio || "");
  const localidade = escaparHTML(alerta.localidade || "");
  const nivel = escaparHTML(alerta.nivel_alerta || "");
  const fonte = escaparHTML(alerta.fonte || "");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novo alerta epidemiológico</title>
      </head>
      <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;color:#172b45;">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
          <div style="background:#102b49;padding:28px;color:#ffffff;">
            <p style="margin:0;color:#5eead4;font-size:12px;font-weight:bold;letter-spacing:1px;">
              OBSERVATÓRIO SAÚDE ÚNICA
            </p>
            <h1 style="margin:14px 0 0;font-size:24px;">
              Novo alerta epidemiológico
            </h1>
          </div>

          <div style="padding:28px;">
            <p style="font-size:12px;color:#64748b;font-weight:bold;">
              ALERTA ${nivel.toUpperCase()}
            </p>

            <h2 style="color:#102b49;font-size:22px;">
              ${titulo}
            </h2>

            <p style="line-height:1.7;">
              ${descricao}
            </p>

            <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:20px 0;">
              <p style="margin:0 0 8px;">
                <strong>Município:</strong> ${municipio}
              </p>
              ${
                localidade
                  ? `<p style="margin:0;"><strong>Localidade:</strong> ${localidade}</p>`
                  : ""
              }
            </div>

            ${
              recomendacoes
                ? `
                  <h3 style="color:#102b49;">Recomendações</h3>
                  <p style="line-height:1.7;">${recomendacoes}</p>
                `
                : ""
            }

            ${
              fonte
                ? `
                  <p style="font-size:13px;color:#64748b;">
                    <strong>Fonte:</strong> ${fonte}
                  </p>
                `
                : ""
            }

            <div style="margin:28px 0;text-align:center;">
              <a
                href="${SITE_URL}"
                style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:bold;"
              >
                Acessar o Observatório
              </a>
            </div>

            <p style="font-size:12px;color:#64748b;line-height:1.6;">
              Você recebeu esta mensagem porque autorizou o recebimento
              de alertas por e-mail e demonstrou interesse neste município
              nas suas preferências de notificação.
            </p>
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
    "Novo alerta epidemiológico",
    "",
    alerta.titulo || "",
    "",
    alerta.descricao || "",
    "",
    `Município: ${alerta.municipio || ""}`,
    `Localidade: ${alerta.localidade || "Não informada"}`,
    "",
    alerta.recomendacoes || "",
    "",
    alerta.fonte ? `Fonte: ${alerta.fonte}` : "",
    "",
    `Acesse: ${SITE_URL}`,
  ].join("\n");

  return { htmlContent, textContent };
}

async function consultarPreferencias(supabaseAdmin) {
  const preferencias = [];
  let inicio = 0;

  while (true) {
    const fim = inicio + TAMANHO_PAGINA - 1;

    const { data, error } = await supabaseAdmin
      .from("preferencias_notificacoes")
      .select("usuario_id, municipios_interesse")
      .eq("receber_por_email", true)
      .range(inicio, fim);

    if (error) {
      throw new Error(
        "Não foi possível consultar as preferências dos usuários."
      );
    }

    preferencias.push(...(data || []));

    if (!data || data.length < TAMANHO_PAGINA) {
      break;
    }

    inicio += TAMANHO_PAGINA;
  }

  return preferencias;
}

async function consultarUsuarios(supabaseAdmin) {
  const usuariosPorId = new Map();
  let pagina = 1;

  while (true) {
    const { data, error } =
      await supabaseAdmin.auth.admin.listUsers({
        page: pagina,
        perPage: TAMANHO_PAGINA,
      });

    if (error) {
      throw new Error(
        "Não foi possível consultar os usuários cadastrados."
      );
    }

    const usuarios = data?.users || [];

    for (const usuario of usuarios) {
      usuariosPorId.set(usuario.id, usuario);
    }

    if (usuarios.length < TAMANHO_PAGINA) {
      break;
    }

    pagina++;
  }

  return usuariosPorId;
}

async function registrarFalha(supabaseAdmin, registroId, erro) {
  const { error } = await supabaseAdmin
    .from("envios_email_alertas")
    .update({
      status: "erro",
      erro: String(erro?.message || erro || "Erro desconhecido").slice(
        0,
        1000
      ),
    })
    .eq("id", registroId);

  if (error) {
    console.error(
      "Não foi possível registrar a falha do envio:",
      error.message
    );
  }
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
        { erro: "Sessão inválida ou expirada." },
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
      throw new Error("Não foi possível verificar a permissão de administrador.");
    }

    if (!administrador) {
      return Response.json(
        { erro: "Você não tem permissão para enviar alertas." },
        { status: 403 }
      );
    }

    let corpo;

    try {
      corpo = await request.json();
    } catch {
      return Response.json(
        { erro: "O corpo da solicitação não contém JSON válido." },
        { status: 400 }
      );
    }

    const alertaId = corpo?.alertaId;

    const uuidValido =
      typeof alertaId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        alertaId
      );

    if (!uuidValido) {
      return Response.json(
        { erro: "Identificador do alerta inválido." },
        { status: 400 }
      );
    }

    const { data: alerta, error: erroAlerta } =
      await supabaseAdmin
        .from("alertas")
        .select("*")
        .eq("id", alertaId)
        .maybeSingle();

    if (erroAlerta) {
      throw new Error("Não foi possível consultar o alerta.");
    }

    if (!alerta) {
      return Response.json(
        { erro: "Alerta não encontrado." },
        { status: 404 }
      );
    }

    if (
      alerta.status !== "publicado" ||
      alerta.enviar_por_email !== true
    ) {
      return Response.json({
        sucesso: true,
        enviados: 0,
        mensagem: "O alerta não está habilitado para envio por e-mail.",
      });
    }

    if (
      alerta.abrangencia !== "municipal" ||
      !String(alerta.municipio || "").trim()
    ) {
      return Response.json({
        sucesso: true,
        enviados: 0,
        mensagem: "Este alerta não possui abrangência municipal válida.",
      });
    }

    const municipioAlerta = normalizarMunicipio(alerta.municipio);

    const preferencias = await consultarPreferencias(supabaseAdmin);

    const elegiveis = preferencias.filter((preferencia) => {
      const municipios = preferencia.municipios_interesse || [];

      return (
        Array.isArray(municipios) &&
        municipios.some(
          (municipio) =>
            normalizarMunicipio(municipio) === municipioAlerta
        )
      );
    });

    if (elegiveis.length === 0) {
      return Response.json({
        sucesso: true,
        enviados: 0,
        falhas: 0,
        mensagem: "Nenhum usuário habilitado para receber alertas deste município.",
      });
    }

    const usuariosPorId = await consultarUsuarios(supabaseAdmin);

    const destinatarios = elegiveis
      .map((preferencia) => {
        const usuario = usuariosPorId.get(preferencia.usuario_id);

        if (!usuario?.email) {
          return null;
        }

        return {
          usuario_id: usuario.id,
          email: usuario.email,
        };
      })
      .filter(Boolean);

    if (destinatarios.length === 0) {
      return Response.json({
        sucesso: true,
        enviados: 0,
        falhas: 0,
        mensagem: "Não foram encontrados e-mails válidos para os usuários elegíveis.",
      });
    }

    const registros = destinatarios.map((destinatario) => ({
      alerta_id: alerta.id,
      usuario_id: destinatario.usuario_id,
      email: destinatario.email,
      status: "pendente",
    }));

    const { data: novosRegistros, error: erroRegistros } =
      await supabaseAdmin
        .from("envios_email_alertas")
        .upsert(registros, {
          onConflict: "alerta_id,usuario_id",
          ignoreDuplicates: true,
        })
        .select("id, usuario_id, email");

    if (erroRegistros) {
      throw new Error(
        "Não foi possível registrar os envios de e-mail."
      );
    }

    const conteudo = montarEmail(alerta);

    let enviados = 0;
    let falhas = 0;

    for (const registro of novosRegistros || []) {
      try {
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
                email: registro.email,
              },
            ],
            subject: `[Observatório Saúde Única] ${alerta.titulo}`,
            htmlContent: conteudo.htmlContent,
            textContent: conteudo.textContent,
          }),
        });

        if (!resposta.ok) {
          const detalhe = await resposta.text();

          throw new Error(
            `Brevo retornou erro ${resposta.status}: ${detalhe.slice(0, 500)}`
          );
        }

        const resultadoBrevo = await resposta.json();

        const { error: erroAtualizacao } = await supabaseAdmin
          .from("envios_email_alertas")
          .update({
            status: "enviado",
            brevo_message_id: resultadoBrevo.messageId || null,
            enviado_em: new Date().toISOString(),
            erro: null,
          })
          .eq("id", registro.id);

        if (erroAtualizacao) {
          console.error(
            "O e-mail foi aceito pela Brevo, mas o histórico não foi atualizado:",
            erroAtualizacao.message
          );
        }

        enviados++;
      } catch (erroEnvio) {
        falhas++;

        await registrarFalha(
          supabaseAdmin,
          registro.id,
          erroEnvio
        );
      }
    }

    return Response.json({
      sucesso: falhas === 0,
      enviados,
      falhas,
      ignorados: destinatarios.length - (novosRegistros || []).length,
      mensagem: "Processamento dos e-mails concluído.",
    });
  } catch (erro) {
    console.error("Erro no envio de alertas:", erro);

    return Response.json(
      {
        erro: erro.message || "Erro interno ao processar os e-mails.",
      },
      { status: 500 }
    );
  }
}
