
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const formularioInicial = {
  nome: "",
  resumo: "",
  descricao: "",
  pilares: [],
  atinge: [],
  transmissao: "",
  sintomas: "",
  prevencao: "",
  fontes: "",
  status: "rascunho",
};

const campoEstilo =
  "w-full rounded-lg border border-black bg-white p-3 text-black placeholder:text-black outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700";

const botaoPrincipal =
  "rounded-lg border border-black bg-[#102b49] px-6 py-3 font-semibold text-white hover:bg-[#168d8a]";

export default function GerenciarDoencas() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [doencas, setDoencas] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);

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
    const { data, error } = await supabase
      .from("catalogo_doencas")
      .select("*")
      .order("nome");

    if (error) {
      setMensagem("Erro ao carregar doenças: " + error.message);
      return;
    }

    setDoencas(data || []);
  }

  function atualizarCampo(campo, valor) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function alternarOpcao(campo, valor) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: atual[campo].includes(valor)
        ? atual[campo].filter((item) => item !== valor)
        : [...atual[campo], valor],
    }));
  }

  function criarSlug(nome) {
    return nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function editarDoenca(doenca) {
    setEditando(doenca.id);

    setFormulario({
      nome: doenca.nome || "",
      resumo: doenca.resumo || "",
      descricao: doenca.descricao || "",
      pilares: doenca.pilares || [],
      atinge: doenca.atinge || [],
      transmissao: doenca.transmissao || "",
      sintomas: doenca.sintomas || "",
      prevencao: doenca.prevencao || "",
      fontes: (doenca.fontes || []).join("\n"),
      status: doenca.status || "rascunho",
    });

    setMensagem("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limparFormulario() {
    setFormulario({ ...formularioInicial });
    setEditando(null);
    setMensagem("");
  }

  async function excluirDoenca(doenca) {
    const confirmar = window.confirm(
      `Tem certeza de que deseja excluir "${doenca.nome}"? Essa ação não poderá ser desfeita.`
    );

    if (!confirmar) return;

    setExcluindo(doenca.id);
    setMensagem("");

    const { error } = await supabase
      .from("catalogo_doencas")
      .delete()
      .eq("id", doenca.id);

    if (error) {
      setMensagem(
        "Não foi possível excluir a doença: " + error.message
      );
      setExcluindo(null);
      return;
    }

    if (editando === doenca.id) {
      setFormulario({ ...formularioInicial });
      setEditando(null);
    }

    setMensagem("Doença excluída com sucesso!");
    await carregarDoencas();
    setExcluindo(null);
  }

  async function salvarDoenca(event) {
    event.preventDefault();
    setSalvando(true);
    setMensagem("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMensagem("Sua sessão terminou. Entre novamente.");
      setSalvando(false);
      return;
    }

    if (!formulario.nome.trim()) {
      setMensagem("Informe o nome da doença.");
      setSalvando(false);
      return;
    }

    if (
      formulario.pilares.length === 0 ||
      formulario.atinge.length === 0
    ) {
      setMensagem(
        "Selecione pelo menos um pilar e quem a doença atinge."
      );
      setSalvando(false);
      return;
    }

    const dados = {
      nome: formulario.nome.trim(),
      slug: criarSlug(formulario.nome),
      resumo: formulario.resumo,
      descricao: formulario.descricao,
      pilares: formulario.pilares,
      atinge: formulario.atinge,
      transmissao: formulario.transmissao,
      sintomas: formulario.sintomas,
      prevencao: formulario.prevencao,
      fontes: formulario.fontes
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      status: formulario.status,
      atualizado_em: new Date().toISOString(),
    };

    let resultado;

    if (editando) {
      resultado = await supabase
        .from("catalogo_doencas")
        .update(dados)
        .eq("id", editando);
    } else {
      resultado = await supabase
        .from("catalogo_doencas")
        .insert({
          ...dados,
          criado_por: user.id,
        });
    }

    if (resultado.error) {
      setMensagem(
        "Não foi possível salvar: " + resultado.error.message
      );
      setSalvando(false);
      return;
    }

    setMensagem(
      editando
        ? "Doença atualizada com sucesso!"
        : "Doença cadastrada com sucesso!"
    );

    limparFormulario();
    await carregarDoencas();
    setSalvando(false);
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
        <h1 className="text-2xl font-bold">
          Acesso não autorizado
        </h1>

        <p className="mt-3">
          Esta área é exclusiva para administradores autorizados.
        </p>

        <button
          onClick={() => router.push("/admin")}
          className={`${botaoPrincipal} mt-5`}
        >
          Voltar ao painel
        </button>
      </main>
    );
  }

  return (
    <main className="admin-doencas min-h-screen bg-white px-5 py-10 text-black">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 rounded-lg border border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-slate-100"
        >
          ← Voltar ao painel administrativo
        </button>

        <h1 className="text-3xl font-bold text-black">
          Gerenciamento de doenças
        </h1>

        <p className="mt-2 text-black">
          Cadastre, consulte, edite, publique e exclua doenças do Observatório Saúde Única.
        </p>

        <form
          onSubmit={salvarDoenca}
          className="mt-8 space-y-6 rounded-2xl border border-black bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold text-black">
            {editando ? "Editar doença" : "Cadastrar nova doença"}
          </h2>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black">
              Nome da doença *
            </label>

            <input
              required
              value={formulario.nome}
              onChange={(e) => atualizarCampo("nome", e.target.value)}
              className={campoEstilo}
              placeholder="Ex.: Dengue"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black">
              Resumo
            </label>

            <textarea
              value={formulario.resumo}
              onChange={(e) => atualizarCampo("resumo", e.target.value)}
              className={campoEstilo}
              rows={2}
              placeholder="Breve apresentação da doença"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black">
              Descrição
            </label>

            <textarea
              value={formulario.descricao}
              onChange={(e) => atualizarCampo("descricao", e.target.value)}
              className={campoEstilo}
              rows={4}
              placeholder="Explique a doença e suas características."
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-black">
              Pilares relacionados *
            </p>

            <div className="flex flex-wrap gap-4">
              {[
                "Saúde Humana",
                "Saúde Animal",
                "Saúde Ambiental",
              ].map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-black bg-white px-4 py-3 text-black"
                >
                  <input
                    type="checkbox"
                    checked={formulario.pilares.includes(item)}
                    onChange={() => alternarOpcao("pilares", item)}
                    className="h-5 w-5 accent-black"
                  />
                  <span className="text-black">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-black">
              Quem a doença atinge? *
            </p>

            <div className="flex flex-wrap gap-4">
              {["Humanos", "Animais"].map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-black bg-white px-4 py-3 text-black"
                >
                  <input
                    type="checkbox"
                    checked={formulario.atinge.includes(item)}
                    onChange={() => alternarOpcao("atinge", item)}
                    className="h-5 w-5 accent-black"
                  />
                  <span className="text-black">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black">
              Transmissão
            </label>

            <textarea
              value={formulario.transmissao}
              onChange={(e) =>
                atualizarCampo("transmissao", e.target.value)
              }
              className={campoEstilo}
              rows={3}
              placeholder="Descreva as formas de transmissão."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black">
              Sintomas
            </label>

            <textarea
              value={formulario.sintomas}
              onChange={(e) =>
                atualizarCampo("sintomas", e.target.value)
              }
              className={campoEstilo}
              rows={3}
              placeholder="Descreva os principais sintomas."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black">
              Prevenção
            </label>

            <textarea
              value={formulario.prevencao}
              onChange={(e) =>
                atualizarCampo("prevencao", e.target.value)
              }
              className={campoEstilo}
              rows={3}
              placeholder="Descreva as medidas de prevenção."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black">
              Fontes científicas (uma por linha)
            </label>

            <textarea
              value={formulario.fontes}
              onChange={(e) =>
                atualizarCampo("fontes", e.target.value)
              }
              className={campoEstilo}
              rows={3}
              placeholder="Instituição, título ou endereço da fonte"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black">
              Situação
            </label>

            <select
              value={formulario.status}
              onChange={(e) =>
                atualizarCampo("status", e.target.value)
              }
              className={campoEstilo}
            >
              <option value="rascunho" className="bg-white text-black">
                Salvar como rascunho
              </option>

              <option value="publicado" className="bg-white text-black">
                Publicar no site
              </option>
            </select>
          </div>

          {mensagem && (
            <div
              role="status"
              className="rounded-lg border border-black bg-white p-4 text-sm font-semibold text-black"
            >
              {mensagem}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={salvando}
              className={`${botaoPrincipal} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {salvando
                ? "Salvando..."
                : editando
                  ? "Salvar alterações"
                  : "Cadastrar doença"}
            </button>

            {editando && (
              <button
                type="button"
                onClick={limparFormulario}
                className="rounded-lg border border-black bg-white px-6 py-3 font-semibold text-black hover:bg-slate-100"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-black">
            Doenças cadastradas ({doencas.length})
          </h2>

          <div className="mt-4 space-y-3">
            {doencas.map((doenca) => (
              <article
                key={doenca.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black bg-white p-5"
              >
                <div>
                  <h3 className="font-bold text-black">
                    {doenca.nome}
                  </h3>

                  <p className="mt-1 text-sm text-black">
                    {doenca.atinge?.join(", ")} · {doenca.status}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => editarDoenca(doenca)}
                    className="rounded-lg border border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-slate-100"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => excluirDoenca(doenca)}
                    disabled={excluindo === doenca.id}
                    className="rounded-lg border border-red-700 bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {excluindo === doenca.id
                      ? "Excluindo..."
                      : "Excluir"}
                  </button>
                </div>
              </article>
            ))}

            {doencas.length === 0 && (
              <p className="rounded-xl border border-black bg-white p-5 text-black">
                Nenhuma doença cadastrada ainda.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
