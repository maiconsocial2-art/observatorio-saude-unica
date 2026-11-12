
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [nome, setNome] = useState("");
  const [nivelAdmin, setNivelAdmin] = useState("");

  useEffect(() => {
    async function verificarAcesso() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: admin, error } = await supabase
        .from("administradores")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !admin) {
        setAutorizado(false);
        setCarregando(false);
        return;
      }

      const { data: perfil } = await supabase
        .from("perfis_usuarios")
        .select("nome_completo")
        .eq("id", user.id)
        .maybeSingle();

      setNome(perfil?.nome_completo || user.email);

      const { data: superAdmin, error: erroVerificacao } =
        await supabase.rpc("eh_superadministrador");

      if (erroVerificacao) {
        console.error(
          "Erro ao verificar nível administrativo:",
          erroVerificacao
        );
        setNivelAdmin("Não foi possível verificar");
      } else if (superAdmin === true) {
        setNivelAdmin("Superadministrador");
      } else {
        setNivelAdmin("Administrador");
      }

      setAutorizado(true);
      setCarregando(false);
    }

    verificarAcesso();
  }, [router]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-white p-10 text-black">
        Verificando acesso...
      </main>
    );
  }

  if (!autorizado) {
    return (
      <main className="min-h-screen bg-white p-10 text-black">
        <h1 className="text-2xl font-bold text-red-700">
          Acesso não autorizado
        </h1>
        <p className="mt-3">
          Esta área é exclusiva para administradores autorizados.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-5 rounded-lg bg-[#102b49] px-5 py-3 text-white"
        >
          Voltar ao login
        </button>
      </main>
    );
  }

  const areas = [
    {
      titulo: "Gerenciar doenças",
      descricao:
        "Cadastrar, editar, classificar e publicar doenças no catálogo.",
      botao: "Acessar gerenciamento",
      rota: "/admin/doencas",
    },
    {
      titulo: "Saúde Humana",
      descricao:
        "Gerenciar e acompanhar doenças relacionadas à saúde humana.",
      botao: "Acessar Saúde Humana",
      rota: "/admin/saude-humana",
    },
    {
      titulo: "Saúde Animal",
      descricao:
        "Gerenciar e acompanhar doenças relacionadas à saúde animal.",
      botao: "Acessar Saúde Animal",
      rota: "/admin/saude-animal",
    },
    {
      titulo: "Saúde Ambiental",
      descricao:
        "Adicionar indicadores e informações sobre as condições ambientais e seus riscos.",
      botao: "Acessar Saúde Ambiental",
      rota: "/admin/saude-ambiental",
    },
    {
      titulo: "Dados Epidemiológicos",
      descricao: "Gerenciar registros e indicadores epidemiológicos.",
      botao: "Acessar dados epidemiológicos",
      rota: "/admin/epidemiologia",
    },
    {
      titulo: "Alertas",
      descricao: "Criar, publicar e atualizar alertas do Observatório.",
      botao: "Acessar Central de Alertas",
      rota: "/admin/alertas",
    },
    {
      titulo: "Conteúdos e Histórias",
      descricao:
        "Cadastrar, editar e publicar artigos, notícias, campanhas e materiais educativos.",
      botao: "Acessar Conteúdos e Histórias",
      rota: "/admin/conteudos",
    },
    {
      titulo: "Gerenciar usuários",
      descricao:
        "Visualizar usuários cadastrados, acompanhar seus perfis e gerenciar permissões de acesso ao Observatório.",
      botao: "Acessar gerenciamento de usuários",
      rota: "/admin/usuarios",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-[#102b49] px-6 py-6 text-white">
        <div>
          <p className="text-sm text-teal-300">
            OBSERVATÓRIO SAÚDE ÚNICA
          </p>
          <h1 className="text-2xl font-bold">
            Painel Administrativo
          </h1>
        </div>

        <button
          onClick={sair}
          className="rounded-lg border border-white px-4 py-2 text-white hover:bg-white hover:text-black"
        >
          Sair
        </button>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-semibold text-teal-700">
          ÁREA RESTRITA
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Bem-vindo, {nome}!
        </h2>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
          <span>👑</span>
          Nível de acesso: {nivelAdmin}
        </div>

        <p className="mt-3 text-black">
          Gerencie os dados, doenças, usuários e conteúdos do Observatório Saúde Única.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <article
              key={area.titulo}
              className="rounded-2xl border border-black bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold">
                {area.titulo}
              </h3>

              <p className="mt-3 text-sm leading-6 text-black">
                {area.descricao}
              </p>

              <button
                onClick={() => router.push(area.rota)}
                className="mt-5 rounded-lg bg-[#102b49] px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700"
              >
                {area.botao}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}