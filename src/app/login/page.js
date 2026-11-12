
"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);

  function mostrarMensagem(texto, tipo = "erro") {
    setMensagem(texto);
    setTipoMensagem(tipo);
  }

  async function entrar(event) {
    event.preventDefault();
    setMensagem("");
    setCarregando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      const codigo = error.code;

      if (
        codigo === "invalid_credentials" ||
        codigo === "invalid_login_credentials"
      ) {
        mostrarMensagem(
          "E-mail ou senha incorretos. Confira seus dados e tente novamente."
        );
      } else if (
        codigo === "email_not_confirmed"
      ) {
        mostrarMensagem(
          "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada."
        );
      } else if (
        codigo === "too_many_requests"
      ) {
        mostrarMensagem(
          "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente."
        );
      } else {
        mostrarMensagem(
          "Não foi possível realizar o login. Verifique sua conexão e tente novamente."
        );
      }

      setCarregando(false);
      return;
    }

    const user = data.user;

    const { data: administrador, error: erroAdmin } = await supabase
      .from("administradores")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (erroAdmin) {
      mostrarMensagem(
        "Não foi possível verificar seu acesso. Tente novamente."
      );

      await supabase.auth.signOut();
      setCarregando(false);
      return;
    }

    if (administrador) {
      window.location.href = "/admin";
    } else {
      const parametros = new URLSearchParams(window.location.search);
      const secao = parametros.get("secao");

      const secoesPermitidas = [
        "inicio",
        "doencas",
        "epidemiologia",
        "mapa",
        "humana",
        "animal",
        "ambiental",
        "alertas",
        "biblioteca",
      ];

      const destino = secoesPermitidas.includes(secao)
        ? `/plataforma?secao=${encodeURIComponent(secao)}`
        : "/plataforma";

      window.location.href = destino;
    }
  }

  async function recuperarSenha() {
    setMensagem("");

    if (!email.trim()) {
      mostrarMensagem(
        "Digite seu e-mail cadastrado para receber o link de recuperação."
      );
      return;
    }

    setRecuperando(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      }
    );

    if (error) {
      if (
        error.code === "over_email_send_rate_limit" ||
        error.code === "too_many_requests"
      ) {
        mostrarMensagem(
          "Você solicitou muitos e-mails recentemente. Aguarde um pouco antes de tentar novamente."
        );
      } else {
        mostrarMensagem(
          "Não foi possível enviar o e-mail. Tente novamente mais tarde."
        );
      }
    } else {
      mostrarMensagem(
        "Se existir uma conta cadastrada com esse e-mail, você receberá um link para redefinir sua senha. Verifique também o spam.",
        "sucesso"
      );
    }

    setRecuperando(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-700">
            Observatório Saúde Única
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Acessar minha conta
          </h1>

          <p className="mt-3 text-slate-600">
            Entre para acompanhar informações de saúde humana, animal e ambiental.
          </p>
        </div>

        <form onSubmit={entrar} className="space-y-5">

          <div>
            <label className="mb-2 block font-medium text-slate-700">
              E-mail
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full rounded-lg border border-slate-300 p-3 text-black outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-slate-700">
              Senha
            </label>

            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full rounded-lg border border-slate-300 p-3 text-black outline-none focus:border-teal-600"
            />
          </div>

          {mensagem && (
            <div
              role="alert"
              aria-live="polite"
              className={`rounded-lg p-3 text-sm ${
                tipoMensagem === "sucesso"
                  ? "border border-green-200 bg-green-50 text-green-800"
                  : "border border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando || recuperando}
            className="w-full rounded-lg bg-teal-700 p-3 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

        </form>

        <button
          type="button"
          onClick={recuperarSenha}
          disabled={recuperando || carregando}
          className="mt-5 w-full text-center text-sm font-medium text-teal-700 hover:underline disabled:opacity-60"
        >
          {recuperando
            ? "Enviando e-mail..."
            : "Esqueci minha senha"}
        </button>

        <p className="mt-8 text-center text-sm text-slate-500">
          Observatório Saúde Única | Informação, prevenção e integração.
        </p>

      </div>
    </main>
  );
}
