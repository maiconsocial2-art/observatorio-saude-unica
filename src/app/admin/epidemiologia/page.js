
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const formularioInicial = {
  doenca_id: "",
  municipio: "",
  localidade: "",
  data_referencia: "",
  quantidade: "0",
  tipo_registro: "notificacao",
  nivel_alerta: "nao_avaliado",
  observacoes: "",
  fonte: "",
  status: "rascunho",
};

const campo =
  "w-full rounded-lg border border-black bg-white p-3 text-black placeholder:text-black outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700";

const botao =
  "rounded-lg bg-[#102b49] px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60";

const tiposRegistro = [
  { valor: "notificacao", nome: "Notificação" },
  { valor: "caso_suspeito", nome: "Caso suspeito" },
  { valor: "caso_confirmado", nome: "Caso confirmado" },
  { valor: "caso_descartado", nome: "Caso descartado" },
  { valor: "obito", nome: "Óbito" },
  { valor: "indicador_ambiental", nome: "Indicador ambiental" },
];

const niveisAlerta = [
  { valor: "nao_avaliado", nome: "Não avaliado" },
  { valor: "verde", nome: "Verde" },
  { valor: "amarelo", nome: "Amarelo" },
  { valor: "vermelho", nome: "Vermelho" },
];

const coresAlerta = {
  nao_avaliado: "border-slate-400 bg-slate-100 text-slate-800",
  verde: "border-green-600 bg-green-100 text-green-900",
  amarelo: "border-yellow-500 bg-yellow-100 text-yellow-900",
  vermelho: "border-red-600 bg-red-100 text-red-900",
};

const nomesAlerta = {
  nao_avaliado: "Não avaliado",
  verde: "Alerta verde",
  amarelo: "Alerta amarelo",
  vermelho: "Alerta vermelho",
};

export default function GerenciarEpidemiologia() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const [doencas, setDoencas] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("info");

  useEffect(() => {
    async function iniciar() {
      try {
        const {
          data: { user },
          error: erroUsuario,
        } = await supabase.auth.getUser();

        if (erroUsuario || !user) {
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

        await Promise.all([
          carregarDoencas(),
          carregarRegistros(),
        ]);
      } catch {
        mostrarMensagem(
          "Não foi possível verificar seu acesso. Tente novamente.",
          "erro"
        );
      } finally {
        setCarregando(false);
      }
    }

    iniciar();
  }, [router]);

  function mostrarMensagem(texto, tipo = "info") {
    setMensagem(texto);
    setTipoMensagem(tipo);
  }

  async function carregarDoencas() {
    const { data, error } = await supabase
      .from("catalogo_doencas")
      .select("id, nome")
      .order("nome");

    if (error) {
      mostrarMensagem(
        "Erro ao carregar doenças: " + error.message,
        "erro"
      );
      return;
    }

    setDoencas(data || []);
  }

  async function carregarRegistros() {
    const { data, error } = await supabase
      .from("registros_epidemiologicos")
      .select("*")
      .order("data_referencia", { ascending: false });

    if (error) {
      mostrarMensagem(
        "Erro ao carregar registros: " + error.message,
        "erro"
      );
      return;
    }

    setRegistros(data || []);
  }

  function atualizarCampo(nome, valor) {
    setFormulario((atual) => ({
      ...atual,
      [nome]: valor,
    }));
  }

  function limparFormulario() {
    setFormulario({ ...formularioInicial });
    setEditando(null);
  }

  function editarRegistro(registro) {
    setEditando(registro.id);

    setFormulario({
      doenca_id: registro.doenca_id || "",
      municipio: registro.municipio || "",
      localidade: registro.localidade || "",
      data_referencia: registro.data_referencia || "",
      quantidade: String(registro.quantidade ?? 0),
      tipo_registro: registro.tipo_registro || "notificacao",
      nivel_alerta: registro.nivel_alerta || "nao_avaliado",
      observacoes: registro.observacoes || "",
      fonte: registro.fonte || "",
      status: registro.status || "rascunho",
    });

    setMensagem("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarRegistro(event) {
    event.preventDefault();
    setMensagem("");
    setSalvando(true);

    try {
      const {
        data: { user },
        error: erroUsuario,
      } = await supabase.auth.getUser();

      if (erroUsuario || !user) {
        mostrarMensagem(
          "Sua sessão terminou. Entre novamente.",
          "erro"
        );
        return;
      }

      const quantidade = Number(formulario.quantidade);

      if (
        !formulario.municipio.trim() ||
        !formulario.data_referencia ||
        !Number.isInteger(quantidade) ||
        quantidade < 0
      ) {
        mostrarMensagem(
          "Confira o município, a data e a quantidade informada.",
          "erro"
        );
        return;
      }

      const dados = {
        doenca_id: formulario.doenca_id || null,
        municipio: formulario.municipio.trim(),
        localidade: formulario.localidade.trim() || null,
        data_referencia: formulario.data_referencia,
        quantidade,
        tipo_registro: formulario.tipo_registro,
        nivel_alerta: formulario.nivel_alerta,
        observacoes: formulario.observacoes.trim() || null,
        fonte: formulario.fonte.trim() || null,
        status: formulario.status,
        atualizado_em: new Date().toISOString(),
      };

      let resultado;

      if (editando) {
        resultado = await supabase
          .from("registros_epidemiologicos")
          .update(dados)
          .eq("id", editando);
      } else {
        resultado = await supabase
          .from("registros_epidemiologicos")
          .insert({
            ...dados,
            criado_por: user.id,
          });
      }

      if (resultado.error) {
        mostrarMensagem(
          "Erro ao salvar: " + resultado.error.message,
          "erro"
        );
        return;
      }

      const mensagemSucesso = editando
        ? "Registro atualizado com sucesso!"
        : "Registro cadastrado com sucesso!";

      limparFormulario();
      await carregarRegistros();
      mostrarMensagem(mensagemSucesso, "sucesso");
    } catch (error) {
      mostrarMensagem(
        "Ocorreu um erro inesperado: " + error.message,
        "erro"
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRegistro(registro) {
    const confirmar = window.confirm(
      `Tem certeza de que deseja excluir o registro de ${registro.municipio}? Essa ação não poderá ser desfeita.`
    );

    if (!confirmar) return;

    setExcluindo(registro.id);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("registros_epidemiologicos")
        .delete()
        .eq("id", registro.id);

      if (error) {
        mostrarMensagem(
          "Não foi possível excluir o registro: " + error.message,
          "erro"
        );
        return;
      }

      if (editando === registro.id) {
        limparFormulario();
      }

      await carregarRegistros();
      mostrarMensagem(
        "Registro excluído com sucesso!",
        "sucesso"
      );
    } catch (error) {
      mostrarMensagem(
        "Ocorreu um erro ao excluir: " + error.message,
        "erro"
      );
    } finally {
      setExcluindo(null);
    }
  }

  function nomeDoenca(id) {
    return (
      doencas.find((doenca) => doenca.id === id)?.nome ||
      "Não especificada"
    );
  }

  function nomeTipo(valor) {
    return (
      tiposRegistro.find((tipo) => tipo.valor === valor)?.nome ||
      valor
    );
  }

  function nomeNivelAlerta(valor) {
    return nomesAlerta[valor] || "Não avaliado";
  }

  function formatarData(data) {
    if (!data) return "Não informada";

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
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

        <p className="mt-2">
          Esta área é exclusiva para administradores.
        </p>

        <button
          onClick={() => router.push("/admin")}
          className={`${botao} mt-5`}
        >
          Voltar ao painel
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-5 py-10 text-black">
      <div className="mx-auto max-w-5xl">

        <button
          onClick={() => router.push("/admin")}
          className="mb-6 rounded-lg border border-black bg-white px-4 py-2 font-semibold text-black hover:bg-slate-100"
        >
          ← Voltar ao painel administrativo
        </button>

        <h1 className="text-3xl font-bold">
          Dados epidemiológicos
        </h1>

        <p className="mt-2 text-black">
          Cadastre, classifique e gerencie os registros
          epidemiológicos do Observatório Saúde Única.
        </p>

        {mensagem && (
          <div
            role="status"
            className={`mt-5 rounded-lg border p-4 font-semibold ${
              tipoMensagem === "sucesso"
                ? "border-green-700 bg-green-50 text-green-900"
                : tipoMensagem === "erro"
                  ? "border-red-700 bg-red-50 text-red-900"
                  : "border-slate-500 bg-slate-100 text-black"
            }`}
          >
            {mensagem}
          </div>
        )}

        <form
          onSubmit={salvarRegistro}
          className="mt-8 space-y-6 rounded-2xl border border-black bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold">
            {editando
              ? "Editar registro epidemiológico"
              : "Novo registro epidemiológico"}
          </h2>

          <div>
            <label className="mb-2 block font-semibold">
              Doença relacionada
            </label>

            <select
              value={formulario.doenca_id}
              onChange={(e) =>
                atualizarCampo("doenca_id", e.target.value)
              }
              className={campo}
            >
              <option value="">Não especificar doença</option>

              {doencas.map((doenca) => (
                <option key={doenca.id} value={doenca.id}>
                  {doenca.nome}
                </option>
              ))}
            </select>

            {doencas.length === 0 && (
              <p className="mt-2 text-sm text-black">
                Nenhuma doença cadastrada no catálogo ainda.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Município *
            </label>

            <input
              required
              value={formulario.municipio}
              onChange={(e) =>
                atualizarCampo("municipio", e.target.value)
              }
              className={campo}
              placeholder="Ex.: Salvador"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Bairro ou localidade
            </label>

            <input
              value={formulario.localidade}
              onChange={(e) =>
                atualizarCampo("localidade", e.target.value)
              }
              className={campo}
              placeholder="Ex.: Itapuã"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Data de referência *
            </label>

            <input
              type="date"
              required
              value={formulario.data_referencia}
              onChange={(e) =>
                atualizarCampo("data_referencia", e.target.value)
              }
              className={campo}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Quantidade *
            </label>

            <input
              type="number"
              min="0"
              step="1"
              required
              value={formulario.quantidade}
              onChange={(e) =>
                atualizarCampo("quantidade", e.target.value)
              }
              className={campo}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Tipo de registro *
            </label>

            <select
              value={formulario.tipo_registro}
              onChange={(e) =>
                atualizarCampo("tipo_registro", e.target.value)
              }
              className={campo}
            >
              {tiposRegistro.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-black p-4">
            <label className="mb-2 block font-semibold">
              Nível de alerta epidemiológico
            </label>

            <p className="mb-3 text-sm text-black">
              Classifique o registro de acordo com os critérios
              epidemiológicos adotados pelo Observatório.
            </p>

            <select
              value={formulario.nivel_alerta}
              onChange={(e) =>
                atualizarCampo("nivel_alerta", e.target.value)
              }
              className={campo}
            >
              {niveisAlerta.map((nivel) => (
                <option key={nivel.valor} value={nivel.valor}>
                  {nivel.nome}
                </option>
              ))}
            </select>

            <div className="mt-4 flex flex-wrap gap-2">
              {niveisAlerta.map((nivel) => (
                <span
                  key={nivel.valor}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                    coresAlerta[nivel.valor]
                  }`}
                >
                  {nivel.nome}
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs text-black">
              Atenção: as cores representam a classificação do
              alerta, não a confirmação de um surto nem,
              isoladamente, a gravidade da doença.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Observações
            </label>

            <textarea
              rows={4}
              value={formulario.observacoes}
              onChange={(e) =>
                atualizarCampo("observacoes", e.target.value)
              }
              className={campo}
              placeholder="Informações complementares sobre o registro."
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Fonte da informação
            </label>

            <input
              value={formulario.fonte}
              onChange={(e) =>
                atualizarCampo("fonte", e.target.value)
              }
              className={campo}
              placeholder="Ex.: SESAB, Ministério da Saúde, SINAN"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Publicação
            </label>

            <select
              value={formulario.status}
              onChange={(e) =>
                atualizarCampo("status", e.target.value)
              }
              className={campo}
            >
              <option value="rascunho">
                Manter como rascunho
              </option>

              <option value="publicado">
                Publicar registro
              </option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={salvando}
              className={botao}
            >
              {salvando
                ? "Salvando..."
                : editando
                  ? "Salvar alterações"
                  : "Cadastrar registro"}
            </button>

            {editando && (
              <button
                type="button"
                onClick={limparFormulario}
                className="rounded-lg border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-slate-100"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Registros cadastrados ({registros.length})
          </h2>

          <p className="mt-2 text-sm text-black">
            Os registros são apresentados conforme as permissões
            de acesso do administrador.
          </p>

          <div className="mt-5 space-y-4">
            {registros.map((registro) => (
              <article
                key={registro.id}
                className="rounded-xl border border-black bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold">
                      {nomeDoenca(registro.doenca_id)}
                    </h3>

                    <p className="mt-1">
                      {registro.municipio}
                      {registro.localidade
                        ? ` · ${registro.localidade}`
                        : ""}
                    </p>

                    <p className="mt-2 text-sm">
                      Data: {formatarData(registro.data_referencia)}
                    </p>

                    <p className="text-sm">
                      Tipo: {nomeTipo(registro.tipo_registro)}
                    </p>

                    <p className="mt-2 font-semibold">
                      Quantidade: {registro.quantidade}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                          coresAlerta[
                            registro.nivel_alerta || "nao_avaliado"
                          ] || coresAlerta.nao_avaliado
                        }`}
                      >
                        {nomeNivelAlerta(registro.nivel_alerta)}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                          registro.status === "publicado"
                            ? "border-green-700 bg-green-50 text-green-900"
                            : "border-slate-500 bg-slate-100 text-slate-800"
                        }`}
                      >
                        {registro.status === "publicado"
                          ? "Publicado"
                          : "Rascunho"}
                      </span>
                    </div>

                    {registro.fonte && (
                      <p className="mt-3 text-sm">
                        Fonte: {registro.fonte}
                      </p>
                    )}

                    {registro.observacoes && (
                      <p className="mt-2 text-sm">
                        Observações: {registro.observacoes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editarRegistro(registro)}
                      className="rounded-lg border border-black bg-white px-4 py-2 font-semibold text-black hover:bg-slate-100"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => excluirRegistro(registro)}
                      disabled={excluindo === registro.id}
                      className="rounded-lg border border-red-700 bg-white px-4 py-2 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
                    >
                      {excluindo === registro.id
                        ? "Excluindo..."
                        : "Excluir"}
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {registros.length === 0 && (
              <p className="rounded-xl border border-black bg-white p-5">
                Nenhum registro epidemiológico cadastrado.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
