
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "../../../lib/supabase";

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

export default function Plataforma() {
  const router = useRouter();

  const [usuario, setUsuario] = useState(null);
  const [secaoAtiva, setSecaoAtiva] = useState("inicio");
  const [carregando, setCarregando] = useState(true);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [doencas, setDoencas] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [erroDados, setErroDados] = useState("");

  const [buscaDoenca, setBuscaDoenca] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState("todos");

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

      const [resultadoDoencas, resultadoRegistros] = await Promise.all([
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
            "id, municipio, localidade, data_referencia, quantidade, tipo_registro, observacoes, fonte, nivel_alerta, doenca:catalogo_doencas(nome, pilares, atinge)"
          )
          .eq("status", "publicado")
          .order("data_referencia", { ascending: false }),
      ]);

      if (resultadoDoencas.error || resultadoRegistros.error) {
        console.error(
          "Erro ao carregar dados:",
          resultadoDoencas.error,
          resultadoRegistros.error
        );

        setErroDados(
          "Não foi possível carregar todas as informações. Verifique a conexão e as permissões do banco de dados."
        );
      } else {
        setDoencas(resultadoDoencas.data || []);
        setRegistros(resultadoRegistros.data || []);
      }

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
      doenca.nome.toLowerCase().includes(buscaDoenca.toLowerCase())
    );
  }, [doencas, buscaDoenca]);

  const doencasPorPilar = useMemo(() => {
    if (!["humana", "animal", "ambiental"].includes(secaoAtiva)) {
      return [];
    }

    return doencasFiltradas.filter((doenca) =>
      doenca.pilares?.some((pilar) =>
        pilar.toLowerCase().includes(nomesPilares[secaoAtiva].toLowerCase())
      )
    );
  }, [doencasFiltradas, secaoAtiva]);

  const registrosFiltrados = useMemo(() => {
    return registros.filter((registro) => {
      const municipioCorresponde =
        !filtroMunicipio ||
        registro.municipio
          .toLowerCase()
          .includes(filtroMunicipio.toLowerCase());

      const alertaCorresponde =
        filtroAlerta === "todos" ||
        registro.nivel_alerta === filtroAlerta;

      return municipioCorresponde && alertaCorresponde;
    });
  }, [registros, filtroMunicipio, filtroAlerta]);

  const registrosComAlerta = registros.filter(
    (registro) =>
      registro.nivel_alerta &&
      registro.nivel_alerta !== "nao_avaliado"
  );

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
                  Registros com alerta avaliado
                </p>
                <p className="mt-2 text-3xl font-bold text-[#102b49]">
                  {registrosComAlerta.length}
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
              className="mb-6 w-full rounded-lg border border-slate-300 bg-white p-3 text-black outline-none focus:border-teal-600"
            />

            <ListaDoencas
              lista={doencasFiltradas}
              vazia="Nenhuma doença publicada encontrada."
            />
          </div>
        )}

        {secaoAtiva === "epidemiologia" && (
          <div>
            <p className="mb-5 text-slate-700">
              Consulte os registros epidemiológicos publicados no Observatório.
            </p>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <input
                type="search"
                value={filtroMunicipio}
                onChange={(e) => setFiltroMunicipio(e.target.value)}
                placeholder="Filtrar por município..."
                className="rounded-lg border border-slate-300 bg-white p-3 text-black"
              />

              <select
                value={filtroAlerta}
                onChange={(e) => setFiltroAlerta(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white p-3 text-black"
              >
                <option value="todos">Todos os níveis de alerta</option>
                <option value="verde">Alerta verde</option>
                <option value="amarelo">Alerta amarelo</option>
                <option value="vermelho">Alerta vermelho</option>
                <option value="nao_avaliado">Não avaliado</option>
              </select>
            </div>

            <ListaRegistros
              lista={registrosFiltrados}
              vazia="Nenhum registro epidemiológico publicado encontrado."
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
              className="mb-6 w-full rounded-lg border border-slate-300 bg-white p-3 text-black"
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
              Consulte os níveis de alerta definidos nos registros publicados.
              A classificação representa o nível atribuído ao registro, não
              uma confirmação automática de surto.
            </p>

            <ListaRegistros
              lista={registros.filter(
                (registro) =>
                  registro.nivel_alerta &&
                  registro.nivel_alerta !== "nao_avaliado"
              )}
              vazia="Não há registros publicados com nível de alerta avaliado."
            />
          </div>
        )}

        {secaoAtiva === "mapa" && (
          <div>
            <MapaEpidemiologico />
          </div>
        )}

        {secaoAtiva === "biblioteca" && (
          <div className="rounded-xl border border-slate-300 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-bold">Biblioteca científica</h3>

            <p className="mt-3 leading-7 text-slate-700">
              Esta seção será destinada a materiais científicos, documentos
              técnicos, boletins epidemiológicos e conteúdos educativos.
            </p>
          </div>
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
