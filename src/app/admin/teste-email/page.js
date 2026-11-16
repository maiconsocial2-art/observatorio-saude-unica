
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function TesteEmailPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [emailAdministrador, setEmailAdministrador] = useState("");

  useEffect(() => {
    verificarAcesso();
  }, []);

  async function verificarAcesso() {
    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user) {
      router.replace("/login");
      return;
    }

    const { data: administrador, error: erroAdmin } =
      await supabase
        .from("administradores")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (erroAdmin || !administrador) {
      router.replace("/login");
      return;
    }

    setEmailAdministrador(user.email || "");
    setCarregando(false);
  }

  async function enviarTeste() {
    if (enviando) return;

    setEnviando(true);
    setMensagem("");
    setTipoMensagem("");

    try {
      const {
        data: { session },
        error: erroSessao,
      } = await supabase.auth.getSession();

      if (erroSessao || !session?.access_token) {
        throw new Error(
          "Sua sessão expirou. Entre novamente no Observatório."
        );
      }

      const resposta = await fetch("/api/alertas/teste-email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.erro || "Não foi possível enviar o e-mail de teste."
        );
      }

      setTipoMensagem("sucesso");
      setMensagem(
        "A Brevo aceitou o envio do e-mail de teste para sua conta. Confira sua caixa de entrada, incluindo as pastas de spam e promoções."
      );
    } catch (erro) {
      setTipoMensagem("erro");
      setMensagem(
        erro.message || "Ocorreu um erro ao tentar enviar o e-mail."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-700">
        Verificando acesso de administrador...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#102b49] px-6 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => router.push("/admin/alertas")}
            className="mb-5 text-sm text-teal-300 hover:underline"
          >
            ← Voltar à Central de Alertas
          </button>

          <p className="text-sm font-semibold tracking-wide text-teal-300">
            OBSERVATÓRIO SAÚDE ÚNICA
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Teste de envio de e-mail
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
            Verifique se a integração de e-mails com a Brevo está
            funcionando corretamente.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-2xl">
              ✉️
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Enviar mensagem de teste
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Verificação exclusiva da conta administradora.
              </p>
            </div>
          </div>

          <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Destinatário do teste
            </p>

            <p className="mt-2 break-all text-sm text-slate-900">
              {emailAdministrador || "E-mail não identificado"}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 p-4">
            <p className="font-semibold text-teal-900">
              O que acontecerá?
            </p>

            <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-6 text-teal-950">
              <li>
                Uma mensagem será enviada para o e-mail da sua conta.
              </li>
              <li>
                Nenhum outro usuário será incluído como destinatário.
              </li>
              <li>
                Nenhum alerta será criado ou publicado.
              </li>
              <li>
                As preferências de notificação dos usuários não serão alteradas.
              </li>
            </ul>
          </div>

          {mensagem && (
            <div
              role="status"
              className={`mt-6 rounded-xl border p-4 text-sm leading-6 ${
                tipoMensagem === "sucesso"
                  ? "border-green-200 bg-green-50 text-green-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              <p className="font-semibold">
                {tipoMensagem === "sucesso"
                  ? "Solicitação aceita"
                  : "Não foi possível concluir o teste"}
              </p>

              <p className="mt-1">{mensagem}</p>
            </div>
          )}

          <button
            type="button"
            onClick={enviarTeste}
            disabled={enviando || !emailAdministrador}
            className="mt-7 w-full rounded-xl bg-[#102b49] px-6 py-4 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando
              ? "Enviando e-mail de teste..."
              : "Enviar e-mail de teste"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            O envio depende da disponibilidade da Brevo e da configuração
            do remetente. A aceitação pela Brevo não garante que a mensagem
            já chegou à caixa de entrada.
          </p>
        </div>
      </section>
    </main>
  );
}