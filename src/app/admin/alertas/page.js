
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

function obterDataHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function alertaEncerrado(alerta) {
  const hoje = obterDataHoje();

  return (
    Boolean(alerta.encerrado_em) ||
    Boolean(
      alerta.data_encerramento &&
      alerta.data_encerramento < hoje
    )
  );
}

function alertaAtivo(alerta) {
  const hoje = obterDataHoje();

  return (
    alerta.status === "publicado" &&
    alerta.data_inicio <= hoje &&
    (!alerta.data_encerramento ||
      alerta.data_encerramento >= hoje) &&
    !alerta.encerrado_em
  );
}

function alertaAgendado(alerta) {
  return (
    alerta.status === "publicado" &&
    alerta.data_inicio > obterDataHoje() &&
    !alerta.encerrado_em
  );
}

const formularioInicial = {
  titulo: "",
  descricao: "",
  recomendacoes: "",
  doenca_id: "",
  municipio: "Salvador",
  localidade: "",
  nivel_alerta: "amarelo",
  fonte: "",
  status: "rascunho",
  data_inicio: obterDataHoje(),
  data_encerramento: "",
};

export default function AlertasPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [alertas, setAlertas] = useState([]);
  const [doencas, setDoencas] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    verificarAcesso();
  }, []);

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
      router.replace("/login");
      return;
    }

    await Promise.all([
      carregarAlertas(),
      carregarDoencas(),
    ]);

    setCarregando(false);
  }

  async function carregarAlertas() {
    const { data, error } = await supabase
      .from("alertas")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      setMensagem("Erro ao carregar alertas: " + error.message);
      return;
    }

    setAlertas(data || []);
  }

  async function carregarDoencas() {
    const { data, error } = await supabase
      .from("catalogo_doencas")
      .select("id, nome")
      .eq("status", "publicado")
      .order("nome");

    if (error) {
      setMensagem("Erro ao carregar doenças: " + error.message);
      return;
    }

    setDoencas(data || []);
  }

  function atualizarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((atual) => ({
      ...atual,
      [name]: value,
    }));
  }

  function limparFormulario() {
    setFormulario({
      ...formularioInicial,
      data_inicio: obterDataHoje(),
    });
    setEditando(null);
    setMensagem("");
  }

  async function salvarAlerta(evento) {
    evento.preventDefault();

    if (!formulario.titulo.trim() || !formulario.descricao.trim()) {
      setMensagem("Preencha o título e a descrição do alerta.");
      return;
    }

    if (!formulario.municipio.trim() || !formulario.data_inicio) {
      setMensagem("Preencha o município e a data de início.");
      return;
    }

    if (
      formulario.data_encerramento &&
      formulario.data_encerramento < formulario.data_inicio
    ) {
      setMensagem(
        "A data de encerramento não pode ser anterior à data de início."
      );
      return;
    }

    setSalvando(true);
    setMensagem("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const dados = {
      titulo: formulario.titulo.trim(),
      descricao: formulario.descricao.trim(),
      recomendacoes: formulario.recomendacoes.trim() || null,
      doenca_id: formulario.doenca_id || null,
      municipio: formulario.municipio.trim(),
      localidade: formulario.localidade.trim() || null,
      nivel_alerta: formulario.nivel_alerta,
      fonte: formulario.fonte.trim() || null,
      status: formulario.status,
      data_inicio: formulario.data_inicio,
      data_encerramento: formulario.data_encerramento || null,
      criado_por: user.id,
    };

    let resultado;

    if (editando) {
      const { criado_por, ...dadosAtualizados } = dados;

      resultado = await supabase
        .from("alertas")
        .update(dadosAtualizados)
        .eq("id", editando);
    } else {
      resultado = await supabase
        .from("alertas")
        .insert(dados);
    }

    if (resultado.error) {
      setMensagem("Não foi possível salvar: " + resultado.error.message);
      setSalvando(false);
      return;
    }

    setMensagem(
      editando
        ? "Alerta atualizado com sucesso!"
        : "Alerta cadastrado com sucesso!"
    );

    limparFormulario();
    await carregarAlertas();
    setSalvando(false);
  }

  function prepararEdicao(alerta) {
    setEditando(alerta.id);

    setFormulario({
      titulo: alerta.titulo || "",
      descricao: alerta.descricao || "",
      recomendacoes: alerta.recomendacoes || "",
      doenca_id: alerta.doenca_id || "",
      municipio: alerta.municipio || "",
      localidade: alerta.localidade || "",
      nivel_alerta: alerta.nivel_alerta || "amarelo",
      fonte: alerta.fonte || "",
      status: alerta.status || "rascunho",
      data_inicio: alerta.data_inicio || "",
      data_encerramento: alerta.data_encerramento || "",
    });

    setMensagem("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirAlerta(id) {
    const confirmar = window.confirm(
      "Tem certeza de que deseja excluir este alerta? Essa ação não poderá ser desfeita."
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("alertas")
      .delete()
      .eq("id", id);

    if (error) {
      setMensagem("Erro ao excluir alerta: " + error.message);
      return;
    }

    setMensagem("Alerta excluído com sucesso!");
    await carregarAlertas();
  }

  async function encerrarAlerta(alerta) {
    const confirmar = window.confirm(
      "Deseja encerrar este alerta? Ele continuará no histórico."
    );

    if (!confirmar) return;

    const hoje = obterDataHoje();

    if (hoje < alerta.data_inicio) {
      setMensagem(
        "Não é possível encerrar um alerta antes da data de início."
      );
      return;
    }

    const { error } = await supabase
      .from("alertas")
      .update({
        data_encerramento: hoje,
        encerrado_em: new Date().toISOString(),
      })
      .eq("id", alerta.id);

    if (error) {
      setMensagem("Erro ao encerrar alerta: " + error.message);
      return;
    }

    setMensagem("Alerta encerrado com sucesso!");
    await carregarAlertas();
  }

  function formatarData(data) {
    if (!data) return "Não informada";

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function corNivel(nivel) {
    const cores = {
      verde: "bg-green-100 text-green-800",
      amarelo: "bg-yellow-100 text-yellow-800",
      vermelho: "bg-red-100 text-red-800",
    };

    return cores[nivel] || "bg-gray-100 text-gray-700";
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-white p-10 text-black">
        Carregando Central de Alertas...
      </main>
    );
  }

  const publicados = alertas.filter(
    (alerta) => alerta.status === "publicado"
  );

  const rascunhos = alertas.filter(
    (alerta) => alerta.status === "rascunho"
  );

  const ativos = alertas.filter(alertaAtivo);

  const encerrados = alertas.filter(
    (alerta) =>
      alerta.status === "publicado" && alertaEncerrado(alerta)
  );

  const agendados = alertas.filter(alertaAgendado);

  return (
    <main className="min-h-screen bg-slate-50 text-black">
      <header className="bg-[#102b49] px-6 py-6 text-white">
        <button
          onClick={() => router.push("/admin")}
          className="mb-4 text-sm text-teal-300 hover:underline"
        >
          ← Voltar ao painel administrativo
        </button>

        <p className="text-sm text-teal-300">
          OBSERVATÓRIO SAÚDE ÚNICA
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Central de Alertas
        </h1>

        <p className="mt-3 max-w-2xl text-sm text-slate-200">
          Crie, publique e acompanhe alertas relacionados aos riscos
          epidemiológicos, ambientais e de saúde pública.
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Total de alertas</p>
            <p className="mt-2 text-3xl font-bold">{alertas.length}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Publicados</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {publicados.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Rascunhos</p>
            <p className="mt-2 text-3xl font-bold text-yellow-700">
              {rascunhos.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Alertas ativos</p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {ativos.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Encerrados</p>
            <p className="mt-2 text-3xl font-bold text-slate-600">
              {encerrados.length}
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            {editando ? "Editar alerta" : "Cadastrar novo alerta"}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Preencha as informações e escolha se deseja publicar ou manter
            o alerta como rascunho.
          </p>

          <form onSubmit={salvarAlerta} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Título do alerta *
              </label>
              <input
                name="titulo"
                value={formulario.titulo}
                onChange={atualizarCampo}
                required
                maxLength={180}
                placeholder="Ex.: Alerta de atenção para dengue"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Doença ou risco relacionado
              </label>
              <select
                name="doenca_id"
                value={formulario.doenca_id}
                onChange={atualizarCampo}
                className="w-full rounded-lg border bg-white p-3"
              >
                <option value="">Não vincular a uma doença específica</option>
                {doencas.map((doenca) => (
                  <option key={doenca.id} value={doenca.id}>
                    {doenca.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Município *
                </label>
                <input
                  name="municipio"
                  value={formulario.municipio}
                  onChange={atualizarCampo}
                  required
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Bairro ou localidade
                </label>
                <input
                  name="localidade"
                  value={formulario.localidade}
                  onChange={atualizarCampo}
                  placeholder="Ex.: Itapuã"
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Nível do alerta *
              </label>
              <select
                name="nivel_alerta"
                value={formulario.nivel_alerta}
                onChange={atualizarCampo}
                className="w-full rounded-lg border bg-white p-3"
              >
                <option value="verde">Verde</option>
                <option value="amarelo">Amarelo</option>
                <option value="vermelho">Vermelho</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">
                A classificação deve ser definida pelo administrador
                com base em informações e critérios documentados.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Descrição da situação *
              </label>
              <textarea
                name="descricao"
                value={formulario.descricao}
                onChange={atualizarCampo}
                required
                rows={4}
                placeholder="Explique a situação que motivou o alerta."
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Recomendações à população
              </label>
              <textarea
                name="recomendacoes"
                value={formulario.recomendacoes}
                onChange={atualizarCampo}
                rows={4}
                placeholder="Informe medidas preventivas e orientações."
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Data de início *
                </label>
                <input
                  type="date"
                  name="data_inicio"
                  value={formulario.data_inicio}
                  onChange={atualizarCampo}
                  required
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Data de encerramento
                </label>
                <input
                  type="date"
                  name="data_encerramento"
                  value={formulario.data_encerramento}
                  onChange={atualizarCampo}
                  min={formulario.data_inicio}
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Fonte da informação
              </label>
              <input
                name="fonte"
                value={formulario.fonte}
                onChange={atualizarCampo}
                placeholder="Ex.: SESAB, Ministério da Saúde, boletim oficial..."
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Situação da publicação
              </label>
              <select
                name="status"
                value={formulario.status}
                onChange={atualizarCampo}
                className="w-full rounded-lg border bg-white p-3"
              >
                <option value="rascunho">Manter como rascunho</option>
                <option value="publicado">Publicar alerta</option>
              </select>
            </div>

            {mensagem && (
              <p className="rounded-lg bg-slate-100 p-3 text-sm">
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
                  : "Cadastrar alerta"}
              </button>

              {editando && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="rounded-lg border px-6 py-3 font-semibold"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold">
            Alertas cadastrados ({alertas.length})
          </h2>

          {alertas.length === 0 ? (
            <div className="mt-4 rounded-xl border bg-white p-8 text-center">
              <p className="font-semibold">
                Nenhum alerta cadastrado.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Os alertas publicados e os rascunhos aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {alertas.map((alerta) => {
                const encerrado = alertaEncerrado(alerta);
                const ativo = alertaAtivo(alerta);
                const agendado = alertaAgendado(alerta);

                return (
                  <article
                    key={alerta.id}
                    className="rounded-xl border bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">
                          {alerta.titulo}
                        </h3>

                        <p className="mt-1 text-sm text-slate-600">
                          {alerta.municipio}
                          {alerta.localidade
                            ? ` • ${alerta.localidade}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${corNivel(
                            alerta.nivel_alerta
                          )}`}
                        >
                          {alerta.nivel_alerta.toUpperCase()}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                          {alerta.status === "publicado"
                            ? "PUBLICADO"
                            : "RASCUNHO"}
                        </span>

                        {encerrado && (
                          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold">
                            ENCERRADO
                          </span>
                        )}

                        {ativo && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                            ATIVO
                          </span>
                        )}

                        {agendado && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                            AGENDADO
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm">
                      {alerta.descricao}
                    </p>

                    {alerta.recomendacoes && (
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-sm font-semibold">
                          Recomendações
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm">
                          {alerta.recomendacoes}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 space-y-1 text-xs text-slate-600">
                      <p>
                        Início: {formatarData(alerta.data_inicio)}
                      </p>
                      <p>
                        Encerramento:{" "}
                        {formatarData(alerta.data_encerramento)}
                      </p>
                      {alerta.fonte && <p>Fonte: {alerta.fonte}</p>}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => prepararEdicao(alerta)}
                        className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-100"
                      >
                        Editar
                      </button>

                      {alerta.status === "publicado" &&
                        !encerrado && (
                          <button
                            onClick={() => encerrarAlerta(alerta)}
                            className="rounded-lg bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-900 hover:bg-yellow-200"
                          >
                            Encerrar alerta
                          </button>
                        )}

                      <button
                        onClick={() => excluirAlerta(alerta.id)}
                        className="rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-200"
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
