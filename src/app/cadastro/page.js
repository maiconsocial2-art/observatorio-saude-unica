
"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [tipoPerfil, setTipoPerfil] = useState("morador");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(event) {
    event.preventDefault();
    setMensagem("");

    if (senha !== confirmarSenha) {
      setMensagem("As senhas não são iguais.");
      return;
    }

    if (senha.length < 6) {
      setMensagem("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome_completo: nome,
          tipo_perfil: tipoPerfil,
        },
      },
    });

    setCarregando(false);

    if (error) {
      setMensagem("Não foi possível realizar o cadastro: " + error.message);
      return;
    }

    setMensagem(
      "Cadastro enviado! Verifique seu e-mail para confirmar a conta, caso a confirmação esteja habilitada."
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-700">
            Observatório Saúde Única
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Criar uma conta
          </h1>

          <p className="mt-3 text-slate-600">
            Faça parte da nossa comunidade de informação e vigilância em saúde.
          </p>
        </div>

        <form onSubmit={cadastrar} className="space-y-5">
          <div>
            <label className="mb-2 block font-medium text-slate-700">
              Nome completo
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome"
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-teal-600"
            />
          </div>

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
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-slate-700">
              Tipo de perfil
            </label>
            <select
              value={tipoPerfil}
              onChange={(e) => setTipoPerfil(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-teal-600"
            >
              <option value="morador">Morador</option>
              <option value="tutor">Tutor de animais</option>
              <option value="estudante">Estudante</option>
              <option value="profissional_saude">Profissional de saúde</option>
              <option value="pesquisador">Pesquisador</option>
              <option value="viajante">Viajante</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium text-slate-700">
              Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Crie uma senha"
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-slate-700">
              Confirmar senha
            </label>
            <input
              type="password"
              required
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite a senha novamente"
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-teal-600"
            />
          </div>

          {mensagem && (
            <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
              {mensagem}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-teal-700 p-3 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {carregando ? "Cadastrando..." : "Criar minha conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Observatório Saúde Única | Informação, prevenção e integração.
        </p>
      </div>
    </main>
  );
}
