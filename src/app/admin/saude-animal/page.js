
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function SaudeAnimalPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [doencas, setDoencas] = useState([]);
  const [filtro, setFiltro] = useState("todas");
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarDados() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: admin, error: erroAdmin } = await supabase
        .from("administradores")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (erroAdmin || !admin) {
        setAutorizado(false);
        setCarregando(false);
        return;
      }

      setAutorizado(true);

      const { data, error } = await supabase
        .from("catalogo_doencas")
        .select("*")
        .contains("pilares", ["Saúde Animal"])
        .order("nome");

      if (error) {
        setErro("Não foi possível carregar as doenças. Tente novamente.");
      } else {
        setDoencas(data || []);
      }

      setCarregando(false);
    }

    carregarDados();
  }, [router]);

  const publicadas = doencas.filter(
    (doenca) => doenca.status === "publicado"
  );

  const rascunhos = doencas.filter(
    (doenca) => doenca.status === "rascunho"
  );

  const doencasFiltradas = doencas.filter((doenca) => {
    if (filtro === "publicado") {
      return doenca.status === "publicado";
    }

    if (filtro === "rascunho") {
      return doenca.status === "rascunho";
    }

    return true;
  });

  if (carregando) {
    return (
      <main className="min-h-screen bg-white p-10 text-black">
        Carregando informações de Saúde Animal...
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

  return (
    <main className="min-h-screen bg-slate-50 text-black">
      <header className="bg-[#102b49] px-6 py-6 text-white">
        <button
          onClick={() => router.push("/admin")}
          className="mb-4 text-sm text-teal-200 hover:text-white"
        >
          ← Voltar ao painel administrativo
        </button>

        <p className="text-sm text-teal-300">
          OBSERVATÓRIO SAÚDE ÚNICA
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Saúde Animal
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Gerencie e acompanhe as doenças relacionadas à saúde animal
          cadastradas no Observatório.
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-5 sm:grid-cols-3">
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Total de doenças
            </p>
            <p className="mt-2 text-3xl font-bold">
              {doencas.length}
            </p>
          </article>

          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Publicadas
            </p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {publicadas.length}
            </p>
          </article>

          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Rascunhos
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {rascunhos.length}
            </p>
          </article>
        </div>

        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Doenças cadastradas
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Lista atualizada diretamente do catálogo do Observatório.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/doencas")}
              className="rounded-lg bg-[#102b49] px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Gerenciar catálogo completo
            </button>
          </div>

          <div className="mt-6">
            <label
              htmlFor="filtro"
              className="mb-2 block text-sm font-semibold"
            >
              Filtrar por situação
            </label>

            <select
              id="filtro"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-slate-300 bg-white p-3"
            >
              <option value="todas">Todas as doenças</option>
              <option value="publicado">Somente publicadas</option>
              <option value="rascunho">Somente rascunhos</option>
            </select>
          </div>

          {erro && (
            <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
              {erro}
            </p>
          )}

          <div className="mt-6 space-y-5">
            {doencasFiltradas.map((doenca) => (
              <article
                key={doenca.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-xl font-bold">
                    {doenca.nome}
                  </h3>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      doenca.status === "publicado"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {doenca.status === "publicado"
                      ? "Publicada"
                      : "Rascunho"}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {doenca.resumo || "Nenhum resumo cadastrado."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(doenca.atinge || []).map((publico) => (
                    <span
                      key={publico}
                      className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800"
                    >
                      {publico}
                    </span>
                  ))}
                </div>

                <details className="mt-5 border-t border-slate-200 pt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#102b49]">
                    Consultar informações completas
                  </summary>

                  <div className="mt-4 space-y-4 text-sm leading-6">
                    <div>
                      <h4 className="font-bold">Descrição</h4>
                      <p>{doenca.descricao || "Não informado."}</p>
                    </div>

                    <div>
                      <h4 className="font-bold">Transmissão</h4>
                      <p>{doenca.transmissao || "Não informado."}</p>
                    </div>

                    <div>
                      <h4 className="font-bold">Sintomas</h4>
                      <p>{doenca.sintomas || "Não informado."}</p>
                    </div>

                    <div>
                      <h4 className="font-bold">Prevenção</h4>
                      <p>{doenca.prevencao || "Não informado."}</p>
                    </div>

                    <div>
                      <h4 className="font-bold">Fontes</h4>
                      {doenca.fontes?.length ? (
                        <ul className="list-disc pl-5">
                          {doenca.fontes.map((fonte, index) => (
                            <li key={index}>{fonte}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Não informado.</p>
                      )}
                    </div>
                  </div>
                </details>
              </article>
            ))}

            {doencasFiltradas.length === 0 && !erro && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="font-semibold">
                  Nenhuma doença encontrada.
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Não há doenças cadastradas nessa categoria e situação.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          As informações são provenientes do catálogo cadastrado no
          Observatório Saúde Única.
        </p>
      </section>
    </main>
  );
}
