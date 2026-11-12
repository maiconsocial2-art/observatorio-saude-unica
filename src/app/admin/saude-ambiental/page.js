
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const formularioInicial = {
  municipio: "",
  localidade: "",
  data_referencia: "",
  quantidade: "0",
  nivel_alerta: "nao_avaliado",
  observacoes: "",
  fonte: "",
  status: "rascunho",
};

const campo =
  "w-full rounded-lg border border-slate-300 bg-white p-3 text-black outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700";

const botao =
  "rounded-lg bg-[#102b49] px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60";

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

export default function SaudeAmbientalPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
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

        if (erroUsuario || error || !admin) {
          setAutorizado(false);
          setCarregando(false);
          return;
        }

        setAutorizado(true);
        await carregarRegistros();
      } catch {
        mostrarMensagem(
          "Não foi possível carregar os dados. Tente novamente.",
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

  async function carregarRegistros() {
    const { data, error } = await supabase
      .from("registros_epidemiologicos")
      .select("*")
      .eq("tipo_registro", "indicador_ambiental")
      .order("data_referencia", { ascending: false });

    if (error) {
      mostrarMensagem(
        "Erro ao carregar indicadores: " + error.message,
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
      municipio: registro.municipio || "",
      localidade: registro.localidade || "",
      data_referencia: registro.data_referencia || "",
      quantidade: String(registro.quantidade ?? 0),
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
        doenca_id: null,
        municipio: formulario.municipio.trim(),
        localidade: formulario.localidade.trim() || null,
        data_referencia: formulario.data_referencia,
        quantidade,
        tipo_registro: "indicador_ambiental",
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
          "Erro ao salvar indicador: " + resultado.error.message,
          "erro"
        );
        return;
      }

      limparFormulario();
      await carregarRegistros();

      mostrarMensagem(
        editando
          ? "Indicador ambiental atualizado com sucesso!"
          : "Indicador ambiental cadastrado com sucesso!",
        "sucesso"
      );
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
      `Deseja realmente excluir o indicador de ${registro.municipio}? Essa ação não poderá ser desfeita.`
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
          "Não foi possível excluir: " + error.message,
          "erro"
        );
        return;
      }

      if (editando === registro.id) {
        limparFormulario();
      }

      await carregarRegistros();

      mostrarMensagem(
        "Indicador ambiental excluído com sucesso!",
        "sucesso"
      );
    } catch (error) {
      mostrarMensagem(
        "Erro ao excluir: " + error.message,
        "erro"
      );
    } finally {
      setExcluindo(null);
    }
  }

  function formatarData(data) {
    if (!data) return "Não informada";

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function nomeNivelAlerta(valor) {
    return (
      niveisAlerta.find((nivel) => nivel.valor === valor)?.nome ||
      "Não avaliado"
    );
  }

  const publicados = registros.filter(
    (registro) => registro.status === "publicado"
  );

  const rascunhos = registros.filter(
    (registro) => registro.status === "rascunho"
  );

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
          Esta área é exclusiva para administradores.
        </p>

        <button
          onClick={() => router.push("/login")}
          className={`${botao} mt-5`}
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
          Saúde Ambiental
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Cadastre e acompanhe indicadores relacionados às condições
          ambientais e aos riscos que podem afetar a saúde humana e animal.
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-5 sm:grid-cols-3">
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Total de indicadores
            </p>
            <p className="mt-2 text-3xl font-bold">
              {registros.length}
            </p>
          </article>

          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Publicados
            </p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {publicados.length}
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

        {mensagem && (
          <div
            role="status"
            className={`mt-6 rounded-lg border p-4 font-semibold ${
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
          className="mt-10 space-y-6 rounded-2xl border bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold">
            {editando
              ? "Editar indicador ambiental"
              : "Cadastrar indicador ambiental"}
          </h2>

          <div>
            <label className="mb-2 block font-semibold">
              Tipo de informação
            </label>
            <input
              value="Indicador ambiental"
              disabled
              className={`${campo} bg-slate-100`}
            />
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
              placeholder="Ex.: Periperi"
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
              Quantidade ou valor do indicador *
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
            <p className="mt-2 text-xs text-slate-600">
              Informe um número inteiro. Descreva a unidade de medida
              nas observações, quando necessário.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Nível de alerta
            </label>
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

            <p className="mt-2 text-xs text-slate-600">
              A classificação deve ser definida pelo administrador
              com base em critérios e informações disponíveis.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Observações e descrição do indicador
            </label>
            <textarea
              rows={5}
              value={formulario.observacoes}
              onChange={(e) =>
                atualizarCampo("observacoes", e.target.value)
              }
              className={campo}
              placeholder="Descreva a condição ambiental observada, a unidade de medida e outras informações relevantes."
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
              placeholder="Ex.: órgão responsável, boletim ou relatório"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Situação da publicação
            </label>
            <select
              value={formulario.status}
              onChange={(e) =>
                atualizarCampo("status", e.target.value)
              }
              className={campo}
            >
              <option value="rascunho">Manter como rascunho</option>
              <option value="publicado">Publicar indicador</option>
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
                  : "Cadastrar indicador"}
            </button>

            {editando && (
              <button
                type="button"
                onClick={limparFormulario}
                className="rounded-lg border border-slate-400 px-5 py-3 font-semibold hover:bg-slate-100"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Indicadores cadastrados ({registros.length})
          </h2>

          <div className="mt-5 space-y-4">
            {registros.map((registro) => (
              <article
                key={registro.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold">
                      {registro.localidade
                        ? `${registro.localidade}, ${registro.municipio}`
                        : registro.municipio}
                    </h3>

                    <p className="mt-2 text-sm">
                      Data de referência:{" "}
                      {formatarData(registro.data_referencia)}
                    </p>

                    <p className="mt-2 font-semibold">
                      Quantidade ou valor: {registro.quantidade}
                    </p>

                    {registro.observacoes && (
                      <p className="mt-3 text-sm leading-6">
                        {registro.observacoes}
                      </p>
                    )}

                    {registro.fonte && (
                      <p className="mt-2 text-sm text-slate-600">
                        Fonte: {registro.fonte}
                      </p>
                    )}

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

                      <span className="rounded-full border border-slate-400 bg-slate-100 px-3 py-1 text-sm font-semibold">
                        {registro.status === "publicado"
                          ? "Publicado"
                          : "Rascunho"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editarRegistro(registro)}
                      className="rounded-lg border border-slate-400 px-4 py-2 font-semibold hover:bg-slate-100"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => excluirRegistro(registro)}
                      disabled={excluindo === registro.id}
                      className="rounded-lg border border-red-700 px-4 py-2 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
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
              <div className="rounded-xl border border-dashed bg-white p-8 text-center">
                <p className="font-semibold">
                  Nenhum indicador ambiental cadastrado.
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Os indicadores publicados e os rascunhos aparecerão aqui.
                </p>
              </div>
            )}
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-slate-500">
          Os indicadores apresentados dependem das informações e fontes
          cadastradas pelos administradores do Observatório.
        </p>
      </section>
    </main>
  );
}