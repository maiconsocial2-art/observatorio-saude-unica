
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function RedefinirSenha() {
  const router = useRouter();

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    let ativo = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ativo) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setAutorizado(true);
        setVerificando(false);
      }
    });

    async function verificarLink() {
      const parametros = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      const possuiCodigo = parametros.has("code");
      const possuiTokenRecovery =
        parametros.get("type") === "recovery" ||
        hash.includes("type=recovery");

      const { data: { session } } = await supabase.auth.getSession();

      if (!ativo) return;

      if (
        session &&
        (possuiCodigo || possuiTokenRecovery)
      ) {
        setAutorizado(true);
      }

      setVerificando(false);
    }

    verificarLink();

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function salvarNovaSenha(event) {
    event.preventDefault();
    setMensagem("");
    setTipoMensagem("");

    if (senha.length < 8) {
      setMensagem("A senha deve ter pelo menos 8 caracteres.");
      setTipoMensagem("erro");
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem("As senhas não são iguais. Confira e tente novamente.");
      setTipoMensagem("erro");
      return;
    }

    setCarregando(true);

    const { error } = await supabase.auth.updateUser({
      password: senha,
    });

    if (error) {
      setMensagem(
        "Não foi possível redefinir sua senha. O link pode ter expirado ou já ter sido utilizado. Solicite outro e-mail de recuperação."
      );
      setTipoMensagem("erro");
      setCarregando(false);
      return;
    }

    await supabase.auth.signOut();

    setMensagem("Senha alterada com sucesso! Você já pode entrar com sua nova senha.");
    setTipoMensagem("sucesso");
    setSenha("");
    setConfirmarSenha("");
    setCarregando(false);

    setTimeout(() => {
      window.location.href = "/login";
    }, 2500);
  }

  if (verificando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-700">
          Verificando link de recuperação...
        </p>
      </main>
    );
  }

  if (!autorizado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">

          <h1 className="text-2xl font-bold text-slate-900">
            Link inválido ou expirado
          </h1>

          <p className="mt-4 text-slate-600">
            Não foi possível validar seu link de recuperação.
            Solicite um novo e-mail para redefinir sua senha.
          </p>

          <button
            onClick={() => router.push("/login")}
            className="mt-6 w-full rounded-lg bg-teal-700 p-3 font-semibold text-white hover:bg-teal-800"
          >
            Voltar ao login
          </button>

        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-700">
            Observatório Saúde Única
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Redefinir senha
          </h1>

          <p className="mt-3 text-slate-600">
            Escolha uma nova senha para acessar sua conta.
          </p>
        </div>

        <form onSubmit={salvarNovaSenha} className="space-y-5">

          <div>
            <label className="mb-2 block font-medium text-slate-700">
              Nova senha
            </label>

            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua nova senha"
              className="w-full rounded-lg border border-slate-300 p-3 text-black outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-slate-700">
              Confirmar nova senha
            </label>

            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite novamente sua senha"
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
            disabled={carregando}
            className="w-full rounded-lg bg-teal-700 p-3 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {carregando ? "Salvando..." : "Salvar nova senha"}
          </button>

        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Observatório Saúde Única | Informação, prevenção e integração.
        </p>

      </div>
    </main>
  );
}
