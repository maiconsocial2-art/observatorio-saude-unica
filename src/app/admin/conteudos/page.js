
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const formularioInicial = {
  titulo: "",
  resumo: "",
  conteudo: "",
  categoria: "material_educativo",
  pilares: [],
  publico_alvo: [],
  fonte: "",
  imagem_url: "",
  video_url: "",
  status: "rascunho",
};

const categorias = [
  { valor: "artigo_cientifico", nome: "Artigo científico" },
  { valor: "material_educativo", nome: "Material educativo" },
  { valor: "noticia_campanha", nome: "Notícia ou campanha" },
  { valor: "historia_relato", nome: "História ou relato" },
];

const pilaresDisponiveis = [
  "Saúde Humana",
  "Saúde Animal",
  "Saúde Ambiental",
];

const publicosDisponiveis = [
  "Moradores",
  "Tutores de animais",
  "Estudantes",
  "Profissionais de saúde",
  "Pesquisadores",
  "Viajantes",
  "Público geral",
];

export default function ConteudosPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [conteudos, setConteudos] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [imagemArquivo, setImagemArquivo] = useState(null);
  const [previaImagem, setPreviaImagem] = useState("");

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

      setAutorizado(true);
      await carregarConteudos();
      setCarregando(false);
    }

    verificarAcesso();
  }, [router]);

  useEffect(() => {
    if (!imagemArquivo) return;

    const url = URL.createObjectURL(imagemArquivo);
    setPreviaImagem(url);

    return () => URL.revokeObjectURL(url);
  }, [imagemArquivo]);

  async function carregarConteudos() {
    const { data, error } = await supabase
      .from("conteudos")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      setErro("Erro ao carregar conteúdos: " + error.message);
      return;
    }

    setConteudos(data || []);
    setErro("");
  }

  function atualizarCampo(campo, valor) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function alternarSelecao(campo, valor) {
    setFormulario((atual) => {
      const selecionados = atual[campo] || [];

      return {
        ...atual,
        [campo]: selecionados.includes(valor)
          ? selecionados.filter((item) => item !== valor)
          : [...selecionados, valor],
      };
    });
  }

  function selecionarImagem(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem válido.");
      event.target.value = "";
      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      setErro("A imagem deve ter no máximo 5 MB.");
      event.target.value = "";
      return;
    }

    setErro("");
    setImagemArquivo(arquivo);
  }

  function limparFormulario() {
    setFormulario(formularioInicial);
    setEditando(null);
    setImagemArquivo(null);
    setPreviaImagem("");
  }

  async function enviarImagem(userId) {
    if (!imagemArquivo) {
      return formulario.imagem_url.trim() || null;
    }

    const extensao = imagemArquivo.name.split(".").pop()?.toLowerCase() || "jpg";
    const nomeArquivo = `${userId}/${crypto.randomUUID()}.${extensao}`;

    const { error } = await supabase.storage
      .from("capas-conteudos")
      .upload(nomeArquivo, imagemArquivo, {
        cacheControl: "3600",
        upsert: false,
        contentType: imagemArquivo.type,
      });

    if (error) {
      throw new Error("Não foi possível enviar a imagem: " + error.message);
    }

    const { data } = supabase.storage
      .from("capas-conteudos")
      .getPublicUrl(nomeArquivo);

    return data.publicUrl;
  }

  async function salvarConteudo(event) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    if (!formulario.titulo.trim() || !formulario.conteudo.trim()) {
      setErro("Preencha o título e o conteúdo completo.");
      return;
    }

    if (formulario.pilares.length === 0) {
      setErro("Selecione pelo menos um pilar da Saúde Única.");
      return;
    }

    if (
      formulario.imagem_url.trim() &&
      !/^https?:\/\/\S+$/i.test(formulario.imagem_url.trim())
    ) {
      setErro("Informe um endereço válido para a imagem.");
      return;
    }

    if (
      formulario.video_url.trim() &&
      !/^https?:\/\/\S+$/i.test(formulario.video_url.trim())
    ) {
      setErro("Informe um endereço válido para o vídeo.");
      return;
    }

    setSalvando(true);

    try {
      const {
        data: { user },
        error: erroUsuario,
      } = await supabase.auth.getUser();

      if (erroUsuario || !user) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }

      const imagemUrl = await enviarImagem(user.id);

      const dados = {
        titulo: formulario.titulo.trim(),
        resumo: formulario.resumo.trim(),
        conteudo: formulario.conteudo.trim(),
        categoria: formulario.categoria,
        pilares: formulario.pilares,
        publico_alvo: formulario.publico_alvo,
        fonte: formulario.fonte.trim(),
        imagem_url: imagemUrl,
        video_url: formulario.video_url.trim() || null,
        status: formulario.status,
        atualizado_em: new Date().toISOString(),
      };

      let resultado;

      if (editando) {
        resultado = await supabase
          .from("conteudos")
          .update(dados)
          .eq("id", editando);
      } else {
        resultado = await supabase
          .from("conteudos")
          .insert({
            ...dados,
            criado_por: user.id,
          });
      }

      if (resultado.error) {
        throw new Error(resultado.error.message);
      }

      setMensagem(
        editando
          ? "Conteúdo atualizado com sucesso!"
          : "Conteúdo cadastrado com sucesso!"
      );

      limparFormulario();
      await carregarConteudos();
    } catch (error) {
      setErro("Erro ao salvar conteúdo: " + error.message);
    } finally {
      setSalvando(false);
    }
  }

  function editarConteudo(item) {
    setFormulario({
      titulo: item.titulo || "",
      resumo: item.resumo || "",
      conteudo: item.conteudo || "",
      categoria: item.categoria || "material_educativo",
      pilares: item.pilares || [],
      publico_alvo: item.publico_alvo || [],
      fonte: item.fonte || "",
      imagem_url: item.imagem_url || "",
      video_url: item.video_url || "",
      status: item.status || "rascunho",
    });

    setImagemArquivo(null);
    setPreviaImagem(item.imagem_url || "");
    setEditando(item.id);
    setMensagem("");
    setErro("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirConteudo(id) {
    const confirmar = window.confirm(
      "Tem certeza de que deseja excluir este conteúdo permanentemente?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("conteudos")
      .delete()
      .eq("id", id);

    if (error) {
      setErro("Erro ao excluir conteúdo: " + error.message);
      return;
    }

    setMensagem("Conteúdo excluído com sucesso!");
    await carregarConteudos();
  }

  async function alterarStatus(item, novoStatus) {
    const { error } = await supabase
      .from("conteudos")
      .update({
        status: novoStatus,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setErro("Erro ao alterar publicação: " + error.message);
      return;
    }

    setMensagem(
      novoStatus === "publicado"
        ? "Conteúdo publicado com sucesso!"
        : "Conteúdo movido para rascunho."
    );

    await carregarConteudos();
  }

  const conteudosFiltrados = conteudos.filter((item) => {
    const categoriaOk =
      filtroCategoria === "todos" ||
      item.categoria === filtroCategoria;

    const statusOk =
      filtroStatus === "todos" ||
      item.status === filtroStatus;

    return categoriaOk && statusOk;
  });

  const publicados = conteudos.filter(
    (item) => item.status === "publicado"
  ).length;

  const rascunhos = conteudos.filter(
    (item) => item.status === "rascunho"
  ).length;

  const nomeCategoria = (valor) =>
    categorias.find((item) => item.valor === valor)?.nome || valor;

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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#102b49] px-6 py-6 text-white">
        <button
          onClick={() => router.push("/admin")}
          className="mb-4 text-sm text-teal-200 hover:underline"
        >
          ← Voltar ao painel administrativo
        </button>

        <p className="text-sm text-teal-300">
          OBSERVATÓRIO SAÚDE ÚNICA
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Conteúdos e Histórias
        </h1>

        <p className="mt-2 text-sm text-slate-200">
          Gerencie artigos, materiais educativos, notícias, campanhas e histórias.
        </p>
      </header>

      <section className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Indicador titulo="Total de conteúdos" valor={conteudos.length} />
          <Indicador titulo="Publicados" valor={publicados} />
          <Indicador titulo="Rascunhos" valor={rascunhos} />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            {editando ? "Editar conteúdo" : "Cadastrar novo conteúdo"}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Preencha as informações para criar uma publicação no Observatório.
          </p>

          <form onSubmit={salvarConteudo} className="mt-6 space-y-5">
            <Campo titulo="Título da publicação *">
              <input
                required
                value={formulario.titulo}
                onChange={(e) => atualizarCampo("titulo", e.target.value)}
                className="campo"
                placeholder="Digite o título"
              />
            </Campo>

            <Campo titulo="Resumo">
              <textarea
                rows={3}
                value={formulario.resumo}
                onChange={(e) => atualizarCampo("resumo", e.target.value)}
                className="campo"
                placeholder="Apresente brevemente o conteúdo"
              />
            </Campo>

            <Campo titulo="Conteúdo completo *">
              <textarea
                required
                rows={10}
                value={formulario.conteudo}
                onChange={(e) => atualizarCampo("conteudo", e.target.value)}
                className="campo"
                placeholder="Escreva o texto completo da publicação"
              />
            </Campo>

            <Campo titulo="Categoria *">
              <select
                value={formulario.categoria}
                onChange={(e) => atualizarCampo("categoria", e.target.value)}
                className="campo"
              >
                {categorias.map((categoria) => (
                  <option key={categoria.valor} value={categoria.valor}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo titulo="Pilares relacionados *">
              <div className="grid gap-3 sm:grid-cols-3">
                {pilaresDisponiveis.map((pilar) => (
                  <label key={pilar} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formulario.pilares.includes(pilar)}
                      onChange={() => alternarSelecao("pilares", pilar)}
                    />
                    {pilar}
                  </label>
                ))}
              </div>
            </Campo>

            <Campo titulo="Público-alvo">
              <div className="grid gap-3 sm:grid-cols-2">
                {publicosDisponiveis.map((publico) => (
                  <label key={publico} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formulario.publico_alvo.includes(publico)}
                      onChange={() => alternarSelecao("publico_alvo", publico)}
                    />
                    {publico}
                  </label>
                ))}
              </div>
            </Campo>

            <Campo titulo="Fonte ou referência">
              <input
                value={formulario.fonte}
                onChange={(e) => atualizarCampo("fonte", e.target.value)}
                className="campo"
                placeholder="Instituição, autor, artigo ou endereço da fonte"
              />
            </Campo>

            <Campo titulo="Imagem de capa">
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={selecionarImagem}
                  className="campo"
                />

                <p className="text-xs text-slate-500">
                  Escolha uma imagem do computador. Formatos de imagem aceitos, até 5 MB.
                </p>

                {previaImagem && (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <img
                      src={previaImagem}
                      alt="Pré-visualização da imagem de capa"
                      className="h-56 w-full object-cover"
                    />
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm font-medium text-slate-600">
                        Pré-visualização da capa
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setImagemArquivo(null);
                          setPreviaImagem("");
                          atualizarCampo("imagem_url", "");
                        }}
                        className="text-sm font-semibold text-red-700 hover:underline"
                      >
                        Remover imagem
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Campo>

            <Campo titulo="Link do vídeo (opcional)">
              <input
                type="url"
                value={formulario.video_url}
                onChange={(e) => atualizarCampo("video_url", e.target.value)}
                className="campo"
                placeholder="https://..."
              />
            </Campo>

            <Campo titulo="Situação da publicação">
              <select
                value={formulario.status}
                onChange={(e) => atualizarCampo("status", e.target.value)}
                className="campo"
              >
                <option value="rascunho">Manter como rascunho</option>
                <option value="publicado">Publicar conteúdo</option>
              </select>
            </Campo>

            {erro && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {erro}
              </p>
            )}

            {mensagem && (
              <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {mensagem}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-lg bg-[#102b49] px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {salvando
                  ? "Salvando..."
                  : editando
                    ? "Salvar alterações"
                    : "Cadastrar conteúdo"}
              </button>

              {editando && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="rounded-lg border border-slate-300 px-6 py-3 font-semibold"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Conteúdos cadastrados ({conteudosFiltrados.length})
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="campo"
            >
              <option value="todos">Todas as categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria.valor} value={categoria.valor}>
                  {categoria.nome}
                </option>
              ))}
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="campo"
            >
              <option value="todos">Todos os status</option>
              <option value="publicado">Publicados</option>
              <option value="rascunho">Rascunhos</option>
            </select>
          </div>

          <div className="mt-6 space-y-4">
            {conteudosFiltrados.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-6 text-center text-slate-600">
                Nenhum conteúdo cadastrado.
              </p>
            ) : (
              conteudosFiltrados.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  {item.imagem_url && (
                    <img
                      src={item.imagem_url}
                      alt={`Capa de ${item.titulo}`}
                      className="mb-4 h-48 w-full rounded-lg object-cover"
                    />
                  )}

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{item.titulo}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {nomeCategoria(item.categoria)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "publicado"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.status === "publicado" ? "Publicado" : "Rascunho"}
                    </span>
                  </div>

                  {item.resumo && (
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {item.resumo}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.pilares || []).map((pilar) => (
                      <span
                        key={pilar}
                        className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-800"
                      >
                        {pilar}
                      </span>
                    ))}
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[#102b49]">
                      Visualizar conteúdo completo
                    </summary>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {item.conteudo}
                    </div>

                    {item.fonte && (
                      <p className="mt-3 text-sm">
                        <strong>Fonte:</strong> {item.fonte}
                      </p>
                    )}

                    {item.video_url && (
                      <p className="mt-2 break-all text-sm">
                        <strong>Vídeo:</strong>{" "}
                        <a
                          href={item.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 underline"
                        >
                          Assistir vídeo
                        </a>
                      </p>
                    )}
                  </details>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => editarConteudo(item)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                    >
                      Editar
                    </button>

                    {item.status === "rascunho" ? (
                      <button
                        onClick={() => alterarStatus(item, "publicado")}
                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Publicar
                      </button>
                    ) : (
                      <button
                        onClick={() => alterarStatus(item, "rascunho")}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Retirar publicação
                      </button>
                    )}

                    <button
                      onClick={() => excluirConteudo(item.id)}
                      className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      <style jsx>{`
        .campo {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.75rem;
          background: white;
          color: #0f172a;
          outline: none;
        }

        .campo:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.15);
        }
      `}</style>
    </main>
  );
}

function Campo({ titulo, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {titulo}
      </label>
      {children}
    </div>
  );
}

function Indicador({ titulo, valor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-600">{titulo}</p>
      <p className="mt-2 text-3xl font-bold text-[#102b49]">{valor}</p>
    </div>
  );
}
