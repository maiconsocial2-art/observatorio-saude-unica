
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AvatarMenu() {
  const [nome, setNome] = useState("");
  const [tipoPerfil, setTipoPerfil] = useState("");
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    async function carregarPerfil() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("perfis_usuarios")
        .select("nome_completo, tipo_perfil")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Erro ao carregar perfil:", error.message);
      }

      setNome(
        data?.nome_completo ||
          user.user_metadata?.nome_completo ||
          user.email ||
          "Usuário"
      );

      setTipoPerfil(data?.tipo_perfil || "morador");
    }

    carregarPerfil();
  }, []);

  const iniciais = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  const tipos = {
    morador: "Morador",
    tutor: "Tutor de animais",
    estudante: "Estudante",
    profissional_saude: "Profissional de saúde",
    pesquisador: "Pesquisador",
    viajante: "Viajante",
  };

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50"
        aria-label="Abrir menu do perfil"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800">
          {iniciais || "U"}
        </span>

        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold text-slate-800">
            {nome || "Minha conta"}
          </span>
          <span className="block text-xs text-slate-500">
            {tipos[tipoPerfil] || "Usuário"}
          </span>
        </span>
      </button>

      {aberto && (
        <div className="absolute right-0 z-50 mt-3 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="font-semibold text-slate-800">
              {nome || "Usuário"}
            </p>

            <p className="text-xs text-slate-500">
              {tipos[tipoPerfil] || "Usuário"}
            </p>
          </div>

          <div className="py-2">
            <p className="rounded-lg px-3 py-2 text-sm text-slate-700">
              Meu perfil
            </p>

            <p className="rounded-lg px-3 py-2 text-sm text-slate-700">
              Minhas informações
            </p>

            <p className="rounded-lg px-3 py-2 text-sm text-slate-700">
              Configurações
            </p>
          </div>

          <button
            type="button"
            onClick={sair}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
