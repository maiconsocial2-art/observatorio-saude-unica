
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

const categorias = [
  { valor: "", nome: "Todas as categorias" },
  { valor: "artigo_cientifico", nome: "Artigos científicos" },
  { valor: "material_educativo", nome: "Materiais educativos" },
  { valor: "noticia_campanha", nome: "Notícias e campanhas" },
  { valor: "historia_relato", nome: "Histórias e relatos" },
];

const pilares = [
  "Saúde Humana",
  "Saúde Animal",
  "Saúde Ambiental",
];

const nomesCategorias = {
  artigo_cientifico: "Artigo científico",
  material_educativo: "Material educativo",
  noticia_campanha: "Notícia ou campanha",
  historia_relato: "História ou relato",
};

export default function BibliotecaCientifica() {
  const [conteudos, setConteudos] = useState([]);
  const [categoria, setCategoria] = useState("");
  const [pilar, setPilar] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [conteudoAberto, setConteudoAberto] = useState(null);

  useEffect(() => {
    async function carregarConteudos() {
      setCarregando(true);
      setErro("");

      const { data, error } = await supabase
        .from("conteudos")
        .select(
          "id, titulo, resumo, conteudo, categoria, pilares, publico_alvo, fonte, imagem_url, video_url, criado_em"
        )
        .eq("status", "publicado")
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("Erro ao carregar biblioteca:", error);
        setErro("Não foi possível carregar os conteúdos neste momento.");
        setConteudos([]);
      } else {
        setConteudos(data || []);
      }

      setCarregando(false);
    }

    carregarConteudos();
  }, []);

  const conteudosFiltrados = useMemo(() => {
    return conteudos.filter((item) => {
      const textoBusca = `${item.titulo || ""} ${item.resumo || ""} ${item.conteudo || ""}`;

      const correspondeBusca = textoBusca
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(
          busca
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
        );

      const correspondeCategoria =
        !categoria || item.categoria === categoria;

      const correspondePilar =
        !pilar || item.pilares?.includes(pilar);

      return (
        correspondeBusca &&
        correspondeCategoria &&
        correspondePilar
      );
    });
  }, [conteudos, busca, categoria, pilar]);

  function limparFiltros() {
    setBusca("");
    setCategoria("");
    setPilar("");
  }

  function formatarData(data) {
    if (!data) return "";

    return new Date(data).toLocaleDateString("pt-BR");
  }

  if (carregando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-700">
          Carregando biblioteca científica...
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        {erro}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="leading-7 text-slate-700">
          Explore artigos científicos, materiais educativos, notícias,
          campanhas e relatos relacionados à Saúde Única.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          Pesquisar conteúdos
        </h3>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Pesquisar por palavra
            </span>

            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite um título ou assunto..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Categoria
            </span>

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-teal-600"
            >
              {categorias.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Pilar da Saúde Única
            </span>

            <select
              value={pilar}
              onChange={(e) => setPilar(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-teal-600"
            >
              <option value="">Todos os pilares</option>
              {pilares.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {conteudosFiltrados.length} conteúdo(s) encontrado(s)
          </p>

          <button
            type="button"
            onClick={limparFiltros}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {conteudosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h3 className="font-bold text-slate-800">
            Nenhum conteúdo encontrado
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Tente alterar os filtros ou aguarde a publicação de novos materiais.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {conteudosFiltrados.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {item.imagem_url && (
                <img
                  src={item.imagem_url}
                  alt={`Imagem de ${item.titulo}`}
                  className="h-48 w-full object-cover"
                />
              )}

              <div className="p-5">
                <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                  {nomesCategorias[item.categoria] || item.categoria}
                </span>

                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  {item.titulo}
                </h3>

                {item.resumo && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.resumo}
                  </p>
                )}

                {item.pilares?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.pilares.map((nome) => (
                      <span
                        key={nome}
                        className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                      >
                        {nome}
                      </span>
                    ))}
                  </div>
                )}

                {item.publico_alvo?.length > 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    <strong>Público-alvo:</strong>{" "}
                    {item.publico_alvo.join(", ")}
                  </p>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  Publicado em: {formatarData(item.criado_em)}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setConteudoAberto(
                      conteudoAberto === item.id ? null : item.id
                    )
                  }
                  className="mt-5 w-full rounded-lg bg-[#102b49] px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  {conteudoAberto === item.id
                    ? "Fechar conteúdo"
                    : "Ler conteúdo completo"}
                </button>

                {conteudoAberto === item.id && (
                  <div className="mt-5 border-t border-slate-200 pt-5">
                    <div className="whitespace-pre-line text-sm leading-7 text-slate-700">
                      {item.conteudo}
                    </div>

                    {item.fonte && (
                      <p className="mt-5 break-words text-sm text-slate-600">
                        <strong>Fonte:</strong> {item.fonte}
                      </p>
                    )}

                    {item.video_url && (
                      <p className="mt-4">
                        <a
                          href={item.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-teal-700 underline"
                        >
                          Assistir ao vídeo
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}