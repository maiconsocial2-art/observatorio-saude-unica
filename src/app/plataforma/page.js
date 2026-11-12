"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "../../../lib/supabase";
import BibliotecaCientifica from "../components/BibliotecaCientifica";

const MapaEpidemiologico = dynamic(
  () => import("../components/MapaEpidemiologico"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl bg-white p-10 text-center text-slate-700">
        Preparando o mapa epidemiológico de Salvador...
      </div>
    ),
  }
);

const secoes = [
  { id: "inicio", nome: "Visão geral", icone: "⌂" },
  { id: "doencas", nome: "Doenças", icone: "✚" },
  { id: "epidemiologia", nome: "Epidemiologia", icone: "▥" },
  { id: "mapa", nome: "Mapa epidemiológico", icone: "⌖" },
  { id: "humana", nome: "Saúde Humana", icone: "♡" },
  { id: "animal", nome: "Saúde Animal", icone: "♧" },
  { id: "ambiental", nome: "Saúde Ambiental", icone: "♻" },
  { id: "alertas", nome: "Alertas", icone: "⚑" },
  { id: "biblioteca", nome: "Biblioteca científica", icone: "▤" },
];

const nomesPilares = {
  humana: "Saúde Humana",
  animal: "Saúde Animal",
  ambiental: "Saúde Ambiental",
};

const coresAlerta = {
  verde: "bg-green-100 text-green-800",
  amarelo: "bg-yellow-100 text-yellow-800",
  vermelho: "bg-red-100 text-red-800",
  nao_avaliado: "bg-slate-100 text-slate-700",
};

const nomesAlerta = {
  verde: "Alerta verde",
  amarelo: "Alerta amarelo",
  vermelho: "Alerta vermelho",
  nao_avaliado: "Não avaliado",
};

const nomesRegistro = {
  notificacao: "Notificação",
  caso_suspeito: "Caso suspeito",
  caso_confirmado: "Caso confirmado",
  caso_descartado: "Caso descartado",
  obito: "Óbito",
  indicador_ambiental: "Indicador ambiental",
};

function formatarData(data) {
  if (!data) return "Data não informada";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ListaDoencas({ lista, vazia }) {
  if (!lista.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-semibold text-slate-700">{vazia}</p>
        <p className="mt-2 text-sm text-slate-500">
          Quando houver doenças publicadas nesta categoria, elas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {lista.map((doenca) => (
        <article
          key={doenca.id}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900">
            {doenca.nome}
          </h3>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            {doenca.resumo || "Descrição ainda não disponibilizada."}
          </p>

          {doenca.pilares?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {doenca.pilares.map((pilar) => (
                <span
                  key={pilar}
                  className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800"
                >
                  {pilar}
                </span>
              ))}
            </div>
          )}

          {doenca.atinge?.length > 0 && (
            <p className="mt-4 text-sm text-slate-600">
              <strong>Atinge:</strong> {doenca.atinge.join(", ")}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function ListaRegistros({ lista, vazia }) {
  if (!lista.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-semibold text-slate-700">{vazia}</p>
        <p className="mt-2 text-sm text-slate-500">
          Os registros publicados aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lista.map((registro) => (
        <article
          key={registro.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {registro.doenca?.nome || "Registro sem doença especificada"}
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {registro.localidade ? `${registro.localidade}, ` : ""}
                {registro.municipio}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                coresAlerta[registro.nivel_alerta] ||
                coresAlerta.nao_avaliado
              }`}
            >
              {nomesAlerta[registro.nivel_alerta] || "Não avaliado"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p>
              <strong>Data:</strong> {formatarData(registro.data_referencia)}
            </p>
            <p>
              <strong>Quantidade:</strong> {registro.quantidade}
            </p>
            <p>
              <strong>Tipo:</strong>{" "}
              {nomesRegistro[registro.tipo_registro] ||
                registro.tipo_registro}
            </p>
          </div>

          {registro.observacoes && (
            <p className="mt-4 text-sm leading-6 text-slate-700">
              <strong>Observações:</strong> {registro.observacoes}
            </p>
          )}

          {registro.fonte && (
            <p className="mt-3 text-xs text-slate-500">
              <strong>Fonte:</strong> {registro.fonte}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function obterDataHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function classificarAlerta(alerta) {
  const hoje = obterDataHoje();

  if (
    alerta.encerrado_em ||
    (alerta.data_encerramento && alerta.data_encerramento < hoje)
  ) {
    return "encerrado";
  }

  if (alerta.data_inicio > hoje) {
    return "agendado";
  }

  if (
    alerta.status === "publicado" &&
    alerta.data_inicio <= hoje &&
    (!alerta.data_encerramento || alerta.data_encerramento >= hoje)
  ) {
    return "ativo";
  }

  return "publicado";
}

function ListaAlertas({ lista, vazia }) {
  if (!lista.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-semibold text-slate-700">{vazia}</p>
        <p className="mt-2 text-sm text-slate-500">
          Os alertas publicados pela administração aparecerão aqui.
        </p>
      </div>
    );
  }

  const alertasOrdenados = [...lista].sort((a, b) => {
    const ordem = { ativo: 0, agendado: 1, publicado: 2, encerrado: 3 };
    return ordem[classificarAlerta(a)] - ordem[classificarAlerta(b)];
  });

  const ativos = alertasOrdenados.filter(
    (alerta) => classificarAlerta(alerta) === "ativo"
  );
  const agendados = alertasOrdenados.filter(
    (alerta) => classificarAlerta(alerta) === "agendado"
  );
  const historico = alertasOrdenados.filter(
    (alerta) => classificarAlerta(alerta) === "encerrado"
  );
  const outros = alertasOrdenados.filter(
    (alerta) => ["publicado"].includes(classificarAlerta(alerta))
  );

  function CartaoAlerta({ alerta }) {
    const situacao = classificarAlerta(alerta);

    const estilosSituacao = {
      ativo: "bg-green-100 text-green-800",
      agendado: "bg-blue-100 text-blue-800",
      publicado: "bg-teal-100 text-teal-800",
      encerrado: "bg-slate-200 text-slate-700",
    };

    const nomesSituacao = {
      ativo: "ATIVO",
      agendado: "AGENDADO",
      publicado: "PUBLICADO",
      encerrado: "ENCERRADO",
    };

    return (
      <article
        key={alerta.id}
        className={`rounded-xl border bg-white p-6 shadow-sm ${
          situacao === "ativo"
            ? "border-green-200"
            : "border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900">
              {alerta.titulo}
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              {alerta.localidade ? `${alerta.localidade}, ` : ""}
              {alerta.municipio}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                coresAlerta[alerta.nivel_alerta] ||
                coresAlerta.nao_avaliado
              }`}
            >
              {nomesAlerta[alerta.nivel_alerta] || "Nível não informado"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${estilosSituacao[situacao]}`}
            >
              {nomesSituacao[situacao]}
            </span>
          </div>
        </div>

        <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-700">
          {alerta.descricao}
        </p>

        {alerta.doenca?.nome && (
          <p className="mt-4 text-sm text-slate-700">
            <strong>Doença relacionada:</strong> {alerta.doenca.nome}
          </p>
        )}

        {alerta.recomendacoes && (
          <div className="mt-5 rounded-lg bg-teal-50 p-4">
            <h4 className="font-semibold text-teal-900">
              Recomendações e prevenção
            </h4>

            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-teal-900">
              {alerta.recomendacoes}
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            <strong>Início:</strong> {formatarData(alerta.data_inicio)}
          </p>

          <p>
            <strong>Encerramento previsto:</strong>{" "}
            {alerta.data_encerramento
              ? formatarData(alerta.data_encerramento)
              : "Não informado"}
          </p>

          {alerta.encerrado_em && (
            <p className="sm:col-span-2">
              <strong>Encerrado manualmente em:</strong>{" "}
              {new Date(alerta.encerrado_em).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>

        {alerta.fonte && (
          <p className="mt-4 text-xs text-slate-500">
            <strong>Fonte:</strong> {alerta.fonte}
          </p>
        )}
      </article>
    );
  }

  return (
    <div className="space-y-8">
      {ativos.length > 0 && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              Alertas ativos
            </h3>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              {ativos.length} ativo(s)
            </span>
          </div>
          <div className="space-y-5">
            {ativos.map((alerta) => (
              <CartaoAlerta key={alerta.id} alerta={alerta} />
            ))}
          </div>
        </section>
      )}
      {agendados.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            Alertas programados
          </h3>
          <div className="space-y-5">
            {agendados.map((alerta) => (
              <CartaoAlerta key={alerta.id} alerta={alerta} />
            ))}
          </div>
        </section>
      )}

      {outros.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            Outros alertas publicados
          </h3>
          <div className="space-y-5">
            {outros.map((alerta) => (
              <CartaoAlerta key={alerta.id} alerta={alerta} />
            ))}
          </div>
        </section>
      )}

      {historico.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            Histórico de alertas encerrados
          </h3>
          <p className="mb-4 text-sm text-slate-600">
            Estes alertas permanecem disponíveis para consulta, mas não estão mais vigentes.
          </p>
          <div className="space-y-5">
            {historico.map((alerta) => (
              <CartaoAlerta key={alerta.id} alerta={alerta} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CampoFiltro({ titulo, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {titulo}
      </span>
      {children}
    </label>
  );
}

const classeCampo =
  "w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const filtrosIniciais = {
  doenca: "",
  municipio: "",
  localidade: "",
  dataInicial: "",
  dataFinal: "",
  pilar: "",
  atingido: "",
  tipo: "",
  alerta: "todos",
};

export default function Plataforma() {
  const router = useRouter();

  const [usuario, setUsuario] = useState(null);
  const [secaoAtiva, setSecaoAtiva] = useState("inicio");
  const [carregando, setCarregando] = useState(true);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [doencas, setDoencas] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [erroDados, setErroDados] = useState("");

  const [buscaDoenca, setBuscaDoenca] = useState("");
  const [filtros, setFiltros] = useState(filtrosIniciais);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const secaoSolicitada = parametros.get("secao");

    const secoesPermitidas = secoes.map((item) => item.id);

    if (secaoSolicitada && secoesPermitidas.includes(secaoSolicitada)) {
      setSecaoAtiva(secaoSolicitada);
    }
  }, []);

  function atualizarFiltro(campo, valor) {
    setFiltros((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function limparFiltros() {
    setFiltros(filtrosIniciais);
  }

  useEffect(() => {
    async function verificarAcesso() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setUsuario(user);
      setCarregando(false);
    }

    verificarAcesso();
  }, [router]);

  useEffect(() => {
    if (!usuario) return;

    async function carregarDados() {
      setCarregandoDados(true);
      setErroDados("");

      const [
        resultadoDoencas,
        resultadoRegistros,
        resultadoAlertas,
      ] = await Promise.all([
        supabase
          .from("catalogo_doencas")
          .select(
            "id, nome, resumo, descricao, pilares, atinge, transmissao, sintomas, prevencao, fontes"
          )
          .eq("status", "publicado")
          .order("nome"),

        supabase
          .from("registros_epidemiologicos")
          .select(
            "id, doenca_id, municipio, localidade, data_referencia, quantidade, tipo_registro, observacoes, fonte, nivel_alerta, doenca:catalogo_doencas(id, nome, pilares, atinge)"
          )
          .eq("status", "publicado")
          .order("data_referencia", { ascending: false }),

        supabase
          .from("alertas")
          .select(
            "id, titulo, descricao, recomendacoes, doenca_id, municipio, localidade, nivel_alerta, fonte, status, data_inicio, data_encerramento, encerrado_em, doenca:catalogo_doencas(id, nome)"
          )
          .eq("status", "publicado")
          .order("data_inicio", { ascending: false }),
      ]);

      if (
        resultadoDoencas.error ||
        resultadoRegistros.error ||
        resultadoAlertas.error
      ) {
        console.error(
          "Erro ao carregar dados:",
          resultadoDoencas.error,
          resultadoRegistros.error,
          resultadoAlertas.error
        );

        setErroDados(
          "Não foi possível carregar todas as informações. Verifique a conexão e as permissões do banco de dados."
        );
      }

      setDoencas(resultadoDoencas.data || []);
      setRegistros(resultadoRegistros.data || []);
      setAlertas(resultadoAlertas.data || []);

      setCarregandoDados(false);
    }

    carregarDados();
  }, [usuario]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const secao = secoes.find((item) => item.id === secaoAtiva);

  const doencasFiltradas = useMemo(() => {
    return doencas.filter((doenca) =>
      normalizar(doenca.nome).includes(normalizar(buscaDoenca))
    );
  }, [doencas, buscaDoenca]);

  const doencasPorPilar = useMemo(() => {
    if (!["humana", "animal", "ambiental"].includes(secaoAtiva)) {
      return [];
    }

    return doencasFiltradas.filter((doenca) =>
      doenca.pilares?.some((pilar) =>
        normalizar(pilar).includes(normalizar(nomesPilares[secaoAtiva]))
      )
    );
  }, [doencasFiltradas, secaoAtiva]);

  const registrosFiltrados = useMemo(() => {
    return registros.filter((registro) => {
      const nomeDoenca = registro.doenca?.nome || "";

      const doencaCorresponde =
        !filtros.doenca ||
        registro.doenca_id === filtros.doenca ||
        registro.doenca?.id === filtros.doenca ||
        normalizar(nomeDoenca).includes(normalizar(filtros.doenca));

      const municipioCorresponde =
        !filtros.municipio ||
        normalizar(registro.municipio).includes(normalizar(filtros.municipio));

      const localidadeCorresponde =
        !filtros.localidade ||
        normalizar(registro.localidade).includes(normalizar(filtros.localidade));

      const dataCorresponde =
        (!filtros.dataInicial ||
          registro.data_referencia >= filtros.dataInicial) &&
        (!filtros.dataFinal ||
          registro.data_referencia <= filtros.dataFinal);

      const pilaresDoenca = registro.doenca?.pilares || [];
      const pilarCorresponde =
        !filtros.pilar ||
        pilaresDoenca.some((pilar) =>
          normalizar(pilar).includes(normalizar(filtros.pilar))
        );

      const atingidos = registro.doenca?.atinge || [];
      const atingidoCorresponde =
        !filtros.atingido ||
        atingidos.some((item) => {
          const valor = normalizar(item);

          if (filtros.atingido === "humanos") {
            return (
              valor.includes("humano") ||
              valor.includes("pessoa") ||
              valor.includes("ambos")
            );
          }

          if (filtros.atingido === "animais") {
            return (
              valor.includes("animal") ||
              valor.includes("cao") ||
              valor.includes("gato") ||
              valor.includes("ambos")
            );
          }

          return false;
        });

      const tipoCorresponde =
        !filtros.tipo || registro.tipo_registro === filtros.tipo;

      const alertaCorresponde =
        filtros.alerta === "todos" ||
        registro.nivel_alerta === filtros.alerta;

      return (
        doencaCorresponde &&
        municipioCorresponde &&
        localidadeCorresponde &&
        dataCorresponde &&
        pilarCorresponde &&
        atingidoCorresponde &&
        tipoCorresponde &&
        alertaCorresponde
      );
    });
  }, [registros, filtros]);

  const registrosComAlerta = registros.filter(
    (registro) =>
      registro.nivel_alerta &&
      registro.nivel_alerta !== "nao_avaliado"
  );

  const quantidadeFiltrosAtivos = Object.entries(filtros).filter(
    ([campo, valor]) =>
      campo === "alerta" ? valor !== "todos" : Boolean(valor)
  ).length;

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-black">
        Carregando o Observatório Saúde Única...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 text-black md:flex-row">
      <aside className="flex w-full shrink-0 flex-col bg-[#102b49] p-5 text-white md:min-h-screen md:w-64">
        <h1 className="text-xl font-bold">
          Observatório
          <span className="block text-sm font-medium text-teal-300">
            Saúde Única
          </span>
        </h1>

        <p className="mb-5 mt-2 text-xs text-slate-300">
          One Health Observatory
        </p>

        <div className="my-4 border-t border-slate-600" />

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-1 md:flex-col">
          {secoes.map((item) => (
            <button
              key={item.id}
              onClick={() => setSecaoAtiva(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${
                secaoAtiva === item.id
                  ? "bg-teal-600 text-white"
                  : "text-white hover:bg-slate-700"
              }`}
            >
              <span>{item.icone}</span>
              {item.nome}
            </button>
          ))}
        </nav>

        <div className="mt-6 border-t border-slate-600 pt-4">
          <p className="mb-3 break-all text-xs text-slate-300">
            {usuario?.email}
          </p>

          <button
            onClick={sair}
            className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-slate-200"
          >
            Sair da plataforma
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1 p-5 md:p-10">
        <header className="mb-8 border-b border-slate-300 pb-5">
          <p className="text-sm text-slate-600">
            Observatório Saúde Única
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            {secao?.nome}
          </h2>
        </header>

        {erroDados && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            {erroDados}
          </div>
        )}

        {carregandoDados && (
          <p className="mb-6 text-sm text-slate-600">
            Atualizando informações do Observatório...
          </p>
        )}

        {secaoAtiva === "inicio" && (
          <div>
            <h3 className="text-xl font-bold">
              Bem-vindo ao Observatório!
            </h3>

            <p className="mt-2 text-slate-700">
              Consulte informações sobre saúde humana, animal e ambiental
              em um único ambiente.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-600">Doenças publicadas</p>
                <p className="mt-2 text-3xl font-bold text-[#102b49]">
                  {doencas.length}
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-600">
                  Registros epidemiológicos
                </p>
                <p className="mt-2 text-3xl font-bold text-[#102b49]">
                  {registros.length}
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-600">
                  Alertas publicados
                </p>
                <p className="mt-2 text-3xl font-bold text-[#102b49]">
                  {alertas.filter((alerta) => classificarAlerta(alerta) === "ativo").length}
                </p>
              </article>
            </div>

            <h3 className="mb-4 mt-10 text-xl font-bold">
              Explore o Observatório
            </h3>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {secoes.slice(1).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSecaoAtiva(item.id)}
                  className="rounded-xl border border-slate-300 bg-white p-6 text-left shadow-sm hover:border-teal-600"
                >
                  <span className="text-2xl">{item.icone}</span>
                  <h3 className="mt-3 font-bold">{item.nome}</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Acesse esta área do Observatório.
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {secaoAtiva === "doencas" && (
          <div>
            <p className="mb-5 text-slate-700">
              Consulte o catálogo de doenças disponibilizadas pelo Observatório.
            </p>

            <input
              type="search"
              value={buscaDoenca}
              onChange={(e) => setBuscaDoenca(e.target.value)}
              placeholder="Pesquisar uma doença..."
              className={`${classeCampo} mb-6`}
            />

            <ListaDoencas
              lista={doencasFiltradas}
              vazia="Nenhuma doença publicada encontrada."
            />
          </div>
        )}

        {secaoAtiva === "epidemiologia" && (
          <div>
            <p className="mb-6 text-slate-700">
              Pesquise os registros epidemiológicos combinando doença,
              localização, período, pilar da Saúde Única, população atingida,
              tipo de registro e nível de alerta.
            </p>

            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Filtros de pesquisa
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Combine os campos para refinar os resultados.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={limparFiltros}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Limpar filtros
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <CampoFiltro titulo="Doença">
                  <select
                    value={filtros.doenca}
                    onChange={(e) => atualizarFiltro("doenca", e.target.value)}
                    className={classeCampo}
                  >
                    <option value="">Todas as doenças</option>
                    {doencas.map((doenca) => (
                      <option key={doenca.id} value={doenca.id}>
                        {doenca.nome}
                      </option>
                    ))}
                  </select>
                </CampoFiltro>

                <CampoFiltro titulo="Município">
                  <input
                    type="search"
                    value={filtros.municipio}
                    onChange={(e) =>
                      atualizarFiltro("municipio", e.target.value)
                    }
                    placeholder="Ex.: Salvador"
                    className={classeCampo}
                  />
                </CampoFiltro>

                <CampoFiltro titulo="Bairro ou localidade">
                  <input
                    type="search"
                    value={filtros.localidade}
                    onChange={(e) =>
                      atualizarFiltro("localidade", e.target.value)
                    }
                    placeholder="Digite o bairro"
                    className={classeCampo}
                  />
                </CampoFiltro>

                <CampoFiltro titulo="Data inicial">
                  <input
                    type="date"
                    value={filtros.dataInicial}
                    onChange={(e) =>
                      atualizarFiltro("dataInicial", e.target.value)
                    }
                    className={classeCampo}
                  />
                </CampoFiltro>

                <CampoFiltro titulo="Data final">
                  <input
                    type="date"
                    value={filtros.dataFinal}
                    min={filtros.dataInicial || undefined}
                    onChange={(e) =>
                      atualizarFiltro("dataFinal", e.target.value)
                    }
                    className={classeCampo}
                  />
                </CampoFiltro>

                <CampoFiltro titulo="Pilar da Saúde Única">
                  <select
                    value={filtros.pilar}
                    onChange={(e) => atualizarFiltro("pilar", e.target.value)}
                    className={classeCampo}
                  >
                    <option value="">Todos os pilares</option>
                    <option value="Saúde Humana">Saúde Humana</option>
                    <option value="Saúde Animal">Saúde Animal</option>
                    <option value="Saúde Ambiental">Saúde Ambiental</option>
                  </select>
                </CampoFiltro>

                <CampoFiltro titulo="População atingida">
                  <select
                    value={filtros.atingido}
                    onChange={(e) =>
                      atualizarFiltro("atingido", e.target.value)
                    }
                    className={classeCampo}
                  >
                    <option value="">Todos os públicos</option>
                    <option value="humanos">Humanos</option>
                    <option value="animais">Animais</option>
                  </select>
                </CampoFiltro>

                <CampoFiltro titulo="Tipo de registro">
                  <select
                    value={filtros.tipo}
                    onChange={(e) => atualizarFiltro("tipo", e.target.value)}
                    className={classeCampo}
                  >
                    <option value="">Todos os tipos</option>
                    <option value="notificacao">Notificação</option>
                    <option value="caso_suspeito">Caso suspeito</option>
                    <option value="caso_confirmado">Caso confirmado</option>
                    <option value="caso_descartado">Caso descartado</option>
                    <option value="obito">Óbito</option>
                    <option value="indicador_ambiental">Indicador ambiental</option>
                  </select>
                </CampoFiltro>

                <CampoFiltro titulo="Nível de alerta">
                  <select
                    value={filtros.alerta}
                    onChange={(e) => atualizarFiltro("alerta", e.target.value)}
                    className={classeCampo}
                  >
                    <option value="todos">Todos os níveis</option>
                    <option value="nao_avaliado">Não avaliado</option>
                    <option value="verde">Verde</option>
                    <option value="amarelo">Amarelo</option>
                    <option value="vermelho">Vermelho</option>
                  </select>
                </CampoFiltro>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Resultados da pesquisa
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {registrosFiltrados.length} registro(s) encontrado(s)
                </p>
              </div>

              {quantidadeFiltrosAtivos > 0 && (
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
                  {quantidadeFiltrosAtivos} filtro(s) ativo(s)
                </span>
              )}
            </div>

            <ListaRegistros
              lista={registrosFiltrados}
              vazia="Nenhum registro encontrado com esses filtros."
            />
          </div>
        )}

        {["humana", "animal", "ambiental"].includes(secaoAtiva) && (
          <div>
            <p className="mb-5 text-slate-700">
              Doenças relacionadas ao pilar {nomesPilares[secaoAtiva]}.
            </p>

            <input
              type="search"
              value={buscaDoenca}
              onChange={(e) => setBuscaDoenca(e.target.value)}
              placeholder="Pesquisar uma doença..."
              className={`${classeCampo} mb-6`}
            />

            <ListaDoencas
              lista={doencasPorPilar}
              vazia="Nenhuma doença publicada foi encontrada neste pilar."
            />
          </div>
        )}

        {secaoAtiva === "alertas" && (
          <div>
            <p className="mb-5 text-slate-700">
              Consulte os alertas publicados pela administração do Observatório.
              Os níveis representam classificações atribuídas aos alertas e
              não significam, por si só, confirmação de surto.
            </p>

            <ListaAlertas
              lista={alertas}
              vazia="Não há alertas publicados no momento."
            />
          </div>
        )}

        {secaoAtiva === "mapa" && (
          <div>
            <MapaEpidemiologico />
          </div>
        )}

        {secaoAtiva === "biblioteca" && (
          <BibliotecaCientifica />
        )}

        <footer className="mt-12 border-t border-slate-300 pt-5 text-xs leading-5 text-slate-500">
          As informações exibidas dependem dos dados publicados e das fontes
          cadastradas. Registros demonstrativos não representam ocorrências
          reais. O Observatório não substitui os sistemas oficiais de vigilância
          em saúde.
        </footer>
      </section>
    </main>
  );
}