
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function SaudeHumanaAdmin() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [doencas, setDoencas] = useState([]);
  const [filtro, setFiltro] = useState("todas");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function iniciar() {
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

      setAutorizado(true);
      await carregarDoencas();
      setCarregando(false);
    }

    iniciar();
  }, [router]);

  async function carregarDoencas() {
    setMensagem("");

    const { data, error } = await supabase
      .from("catalogo_doencas")
      .select("*")
      .contains("pilares", ["Saúde Humana"])
      .order("nome");

    if (error) {
      setMensagem("Erro ao carregar doenças: " + error.message);
      return;
    }

    setDoencas(data || []);
  }

  const publicadas = doencas.filter(
    (doenca) => doenca.status === "publicado"
  );

  const rascunhos = doencas.filter(
    (doenca) => doenca.status === "rascunho"
  );

  const doencasExibidas = doencas.filter((doenca) => {
    if (filtro === "publicado") return doenca.status === "publicado";
    if (filtro === "rascunho") return doenca.status === "rascunho";
    return true;
  });

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
        <h1 className="text-2xl font-bold">
          Acesso não autorizado
        </h1>
        <button
          onClick={() => router.push("/admin")}
          className="mt-5 rounded-lg bg-[#102b49] px-5 py-3 text-white"
        >
          Voltar ao painel
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-black">
      <div className="mx-auto max-w-6xl">

        <button
          onClick={() => router.push("/admin")}
          className="mb-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100"
        >
          ← Voltar ao painel administrativo
        </button>

        <header className="rounded-2xl bg-[#102b49] p-8 text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-300">
            Observatório Saúde Única
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Saúde Humana
          </h1>

          <p className="mt-3 max-w-2xl leading-relaxed text-white">
            Gerencie e acompanhe as doenças relacionadas à saúde humana
            cadastradas no Observatório.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">

          <article className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-600">
              Total de doenças
            </p>
            <p className="mt-2 text-3xl font-bold">
              {doencas.length}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-600">
              Publicadas
            </p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {publicadas.length}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-600">
              Rascunhos
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {rascunhos.length}
            </p>
          </article>

        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Doenças cadastradas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Lista atualizada diretamente do catálogo do Observatório.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/doencas")}
              className="rounded-lg bg-[#102b49] px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Gerenciar catálogo completo
            </button>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold">
              Filtrar por situação
            </label>

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 sm:max-w-xs"
            >
              <option value="todas">Todas as doenças</option>
              <option value="publicado">Somente publicadas</option>
              <option value="rascunho">Somente rascunhos</option>
            </select>
          </div>

          {mensagem && (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {mensagem}
            </p>
          )}

          <div className="mt-6 space-y-4">

            {doencasExibidas.map((doenca) => (
              <article
                key={doenca.id}
                className="rounded-xl border border-slate-200 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div>
                    <h3 className="text-lg font-bold">
                      {doenca.nome}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {doenca.resumo || "Nenhum resumo cadastrado."}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
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

                <div className="mt-4 flex flex-wrap gap-2">
                  {(doenca.atinge || []).map((publico) => (
                    <span
                      key={publico}
                      className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {publico}
                    </span>
                  ))}
                </div>

                {doenca.descricao && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-teal-800">
                      Consultar informações completas
                    </summary>

                    <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
                      <p>
                        <strong>Descrição:</strong> {doenca.descricao}
                      </p>

                      {doenca.transmissao && (
                        <p>
                          <strong>Transmissão:</strong> {doenca.transmissao}
                        </p>
                      )}

                      {doenca.sintomas && (
                        <p>
                          <strong>Sintomas:</strong> {doenca.sintomas}
                        </p>
                      )}

                      {doenca.prevencao && (
                        <p>
                          <strong>Prevenção:</strong> {doenca.prevencao}
                        </p>
                      )}

                      {doenca.fontes?.length > 0 && (
                        <div>
                          <strong>Fontes cadastradas:</strong>
                          <ul className="mt-1 list-inside list-disc">
                            {doenca.fontes.map((fonte, index) => (
                              <li key={index}>{fonte}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                )}

              </article>
            ))}

            {doencasExibidas.length === 0 && !mensagem && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <p className="font-semibold">
                  Nenhuma doença encontrada.
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Cadastre uma doença no catálogo e marque o pilar Saúde Humana.
                </p>
              </div>
            )}

          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          As informações são provenientes do catálogo cadastrado no Observatório Saúde Única.
        </p>

      </div>
    </main>
  );
}
