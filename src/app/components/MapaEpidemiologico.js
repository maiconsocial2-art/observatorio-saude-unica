
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { supabase } from "../../../lib/supabase";

const URL_MALHA_MUNICIPIOS =
  "https://servicodados.ibge.gov.br/api/v3/malhas/estados/29?intrarregiao=municipio&formato=application/vnd.geo+json&qualidade=intermediaria";

const URL_MUNICIPIOS =
  "https://servicodados.ibge.gov.br/api/v1/localidades/estados/29/municipios";

const CORES_ALERTA = {
  verde: "#22a447",
  amarelo: "#f4c430",
  vermelho: "#dc3737",
  nao_avaliado: "#94a3b8",
};

const NOMES_ALERTA = {
  verde: "Alerta verde",
  amarelo: "Alerta amarelo",
  vermelho: "Alerta vermelho",
  nao_avaliado: "Alerta cinza",
};

const OPCOES_ALERTA = [
  "vermelho",
  "amarelo",
  "verde",
  "nao_avaliado",
];

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizarMunicipio(valor) {
  return normalizar(valor)
    .replace(/\s*[-/]\s*(ba|bahia)$/i, "")
    .replace(/\s+(ba|bahia)$/i, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function primeiroValor(objeto, campos) {
  for (const campo of campos) {
    const valor = objeto?.[campo];

    if (
      valor !== undefined &&
      valor !== null &&
      String(valor).trim() !== ""
    ) {
      return valor;
    }
  }

  return null;
}

function somenteNumeros(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function obterCodigoFeature(feature) {
  const propriedades = feature?.properties || {};

  const codigo = primeiroValor(propriedades, [
    "codarea",
    "CD_MUN",
    "CD_MUNICIPIO",
    "CD_MUN_IBGE",
    "GEOCODIGO",
    "codigo",
    "id",
  ]);

  return String(codigo || feature?.id || "").trim();
}

function obterMunicipioFeature(feature, municipios) {
  const propriedades = feature?.properties || {};

  const codigoFeature = somenteNumeros(
    obterCodigoFeature(feature)
  );

  if (codigoFeature) {
    const encontrado = municipios.find((municipio) => {
      const codigoMunicipio = somenteNumeros(municipio.id);

      return (
        codigoMunicipio === codigoFeature ||
        codigoMunicipio.startsWith(codigoFeature) ||
        codigoFeature.startsWith(codigoMunicipio)
      );
    });

    if (encontrado) return encontrado;
  }

  const nomeFeature = primeiroValor(propriedades, [
    "name",
    "NM_MUN",
    "NM_MUNICIPIO",
    "NOME_MUNICIPIO",
    "MUNICIPIO",
    "municipio",
    "NOME",
  ]);

  if (nomeFeature) {
    return (
      municipios.find(
        (municipio) =>
          normalizarMunicipio(municipio.nome) ===
          normalizarMunicipio(nomeFeature)
      ) || null
    );
  }

  return null;
}

function obterNivelAlerta(registro) {
  const valor = normalizar(
    primeiroValor(registro, [
      "nivel_alerta",
      "alerta",
      "classificacao",
      "risco",
      "cor_alerta",
    ]) || ""
  );

  if (
    valor.includes("vermelho") ||
    valor.includes("critico") ||
    valor.includes("alto risco")
  ) {
    return "vermelho";
  }

  if (
    valor.includes("amarelo") ||
    valor.includes("moderado") ||
    valor.includes("medio")
  ) {
    return "amarelo";
  }

  if (
    valor.includes("verde") ||
    valor.includes("baixo")
  ) {
    return "verde";
  }

  return "nao_avaliado";
}

function obterQuantidade(registro) {
  const valor = Number(
    primeiroValor(registro, [
      "quantidade",
      "casos",
      "total",
      "numero_casos",
      "quantidade_casos",
    ]) || 0
  );

  return Number.isFinite(valor) ? valor : 0;
}

function obterNomeDoenca(registro) {
  if (registro?.doenca && typeof registro.doenca === "object") {
    return (
      registro.doenca.nome ||
      registro.nome_doenca ||
      registro.doenca_nome ||
      "Doença não informada"
    );
  }

  return (
    registro?.nome_doenca ||
    registro?.doenca_nome ||
    registro?.doenca ||
    registro?.agravo ||
    "Doença não informada"
  );
}

function obterRegistrosDoMunicipio(registros, municipio) {
  const chave = normalizarMunicipio(municipio);

  return registros.filter((registro) => {
    const nomeMunicipio = primeiroValor(registro, [
      "municipio",
      "cidade",
      "nome_municipio",
    ]);

    return (
      nomeMunicipio &&
      normalizarMunicipio(nomeMunicipio) === chave
    );
  });
}

function filtrarRegistrosPorDoenca(
  registros,
  doencasSelecionadas
) {
  if (!doencasSelecionadas.length) return registros;

  return registros.filter((registro) => {
    const nome = normalizar(obterNomeDoenca(registro));

    return doencasSelecionadas.some(
      (doenca) => normalizar(doenca) === nome
    );
  });
}

function obterDataHoje() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function alertaAtivo(alerta) {
  const hoje = obterDataHoje();

  return (
    alerta?.status === "publicado" &&
    Boolean(alerta?.data_inicio) &&
    alerta.data_inicio <= hoje &&
    (!alerta.data_encerramento ||
      alerta.data_encerramento >= hoje) &&
    !alerta.encerrado_em
  );
}

function obterAlertasDoMunicipio(alertas, municipio) {
  const chave = normalizarMunicipio(municipio);

  return alertas.filter((alerta) => {
    return (
      alertaAtivo(alerta) &&
      normalizarMunicipio(alerta.municipio) === chave
    );
  });
}

function filtrarAlertasPorDoenca(
  alertas,
  doencasSelecionadas
) {
  if (!doencasSelecionadas.length) return alertas;

  return alertas.filter((alerta) => {
    const nome = normalizar(alerta.doenca_nome || "");

    return (
      nome &&
      doencasSelecionadas.some(
        (doenca) => normalizar(doenca) === nome
      )
    );
  });
}

function obterResumoMunicipio(registros, alertas = []) {
  const quantidade = registros.reduce(
    (total, registro) => total + obterQuantidade(registro),
    0
  );

  const niveis = [
    ...registros.map(obterNivelAlerta),
    ...alertas.map(obterNivelAlerta),
  ];

  let nivel = "nao_avaliado";

  if (niveis.includes("vermelho")) {
    nivel = "vermelho";
  } else if (niveis.includes("amarelo")) {
    nivel = "amarelo";
  } else if (niveis.includes("verde")) {
    nivel = "verde";
  }

  return {
    quantidade,
    nivel,
    registros: registros.length,
    alertas: alertas.length,
  };
}

function obterDadosMunicipio(
  municipio,
  registros,
  alertas,
  doencasSelecionadas
) {
  const registrosMunicipio = obterRegistrosDoMunicipio(
    registros,
    municipio.nome
  );

  const registrosFiltrados = filtrarRegistrosPorDoenca(
    registrosMunicipio,
    doencasSelecionadas
  );

  const alertasMunicipio = obterAlertasDoMunicipio(
    alertas,
    municipio.nome
  );

  const alertasFiltrados = filtrarAlertasPorDoenca(
    alertasMunicipio,
    doencasSelecionadas
  );

  const resumo = obterResumoMunicipio(
    registrosFiltrados,
    alertasFiltrados
  );

  return {
    ...municipio,
    ...resumo,
    doencas: [
      ...new Set([
        ...registrosFiltrados.map(obterNomeDoenca),
        ...alertasFiltrados
          .map((alerta) => alerta.doenca_nome)
          .filter(Boolean),
      ]),
    ],
  };
}

function criarFeatureCollection(features) {
  return {
    type: "FeatureCollection",
    features,
  };
}

function municipioEstaSelecionado(municipio, selecionados) {
  return selecionados.some(
    (item) => String(item.id) === String(municipio.id)
  );
}

/*
 * CAMADA DOS MUNICÍPIOS
 *
 * Cada polígono representa um município da Bahia.
 * A cor é calculada pelos registros e alertas associados
 * ao município, e não pela seleção da lista.
 */
function CamadaMunicipios({
  municipiosMalha,
  municipios,
  registros,
  alertas,
  doencasSelecionadas,
  alertasSelecionados,
  municipiosSelecionados,
  alternarMunicipio,
}) {
  const map = useMap();

  const obterDadosFeature = useCallback(
    (feature) => {
      const municipio = obterMunicipioFeature(
        feature,
        municipios
      );

      if (!municipio) return null;

      const dados = obterDadosMunicipio(
        municipio,
        registros,
        alertas,
        doencasSelecionadas
      );

      return {
        ...dados,
        feature,
      };
    },
    [
      municipios,
      registros,
      alertas,
      doencasSelecionadas,
    ]
  );

  const municipiosVisiveis = useMemo(() => {
    if (!municipiosMalha?.features?.length) return [];

    return municipiosMalha.features.filter((feature) => {
      const dados = obterDadosFeature(feature);

      if (!dados) return false;

      const selecionado = municipioEstaSelecionado(
        dados,
        municipiosSelecionados
      );

      // Municípios selecionados continuam visíveis,
      // mesmo que seu nível esteja desmarcado no filtro.
      return (
        selecionado ||
        alertasSelecionados.includes(dados.nivel)
      );
    });
  }, [
    municipiosMalha,
    obterDadosFeature,
    alertasSelecionados,
    municipiosSelecionados,
  ]);

  const estilo = useCallback(
    (feature) => {
      const dados = obterDadosFeature(feature);

      if (!dados) {
        return {
          color: "#64748b",
          weight: 0.8,
          fillColor: CORES_ALERTA.nao_avaliado,
          fillOpacity: 0.75,
        };
      }

      const selecionado = municipioEstaSelecionado(
        dados,
        municipiosSelecionados
      );

      const cor = CORES_ALERTA[dados.nivel] ||
        CORES_ALERTA.nao_avaliado;

      return {
        color: selecionado ? "#111827" : "#475569",
        weight: selecionado ? 3 : 1,
        opacity: 1,
        fillColor: cor,
        fillOpacity: selecionado ? 0.9 : 0.75,
      };
    },
    [obterDadosFeature, municipiosSelecionados]
  );

  const interacao = useCallback(
    (feature, layer) => {
      const dados = obterDadosFeature(feature);

      if (!dados) return;

      const tooltip = `
        <div style="min-width:160px">
          <strong>${dados.nome}</strong><br/>
          <span>${NOMES_ALERTA[dados.nivel]}</span><br/>
          <span>${dados.registros} registro(s)</span><br/>
          <span>${dados.alertas} alerta(s)</span><br/>
          <span>${dados.quantidade.toLocaleString("pt-BR")} caso(s)</span>
        </div>
      `;

      layer.bindTooltip(tooltip, {
        sticky: true,
        direction: "top",
      });

      layer.on({
        click: () => {
          alternarMunicipio({
            id: dados.id,
            nome: dados.nome,
          });
        },
      });
    },
    [obterDadosFeature, alternarMunicipio]
  );

  useEffect(() => {
    if (!municipiosVisiveis.length) return;

    const camada = L.geoJSON(
      criarFeatureCollection(municipiosVisiveis),
      {
        style: estilo,
        onEachFeature: interacao,
      }
    );

    camada.addTo(map);

    return () => {
      map.removeLayer(camada);
    };
  }, [
    municipiosVisiveis,
    map,
    estilo,
    interacao,
  ]);

  return null;
}

function AjustarVisualizacao({
  municipiosMalha,
  municipiosSelecionados,
}) {
  const map = useMap();

  useEffect(() => {
    if (!municipiosMalha?.features?.length) return;

    if (!municipiosSelecionados.length) {
      map.setView([-12.8, -41.5], 6);
      return;
    }

    const codigosSelecionados = new Set(
      municipiosSelecionados.map((item) =>
        somenteNumeros(item.id)
      )
    );

    const featuresSelecionadas =
      municipiosMalha.features.filter((feature) => {
        const codigo = somenteNumeros(
          obterCodigoFeature(feature)
        );

        if (!codigo) return false;

        return [...codigosSelecionados].some(
          (id) =>
            id === codigo ||
            id.startsWith(codigo) ||
            codigo.startsWith(id)
        );
      });

    if (!featuresSelecionadas.length) return;

    const camada = L.geoJSON(
      criarFeatureCollection(featuresSelecionadas)
    );

    const limites = camada.getBounds();

    if (limites.isValid()) {
      map.fitBounds(limites, {
        padding: [30, 30],
        maxZoom: 9,
      });
    }
  }, [
    map,
    municipiosMalha,
    municipiosSelecionados,
  ]);

  return null;
}

export default function MapaEpidemiologico() {
  const [municipios, setMunicipios] = useState([]);
  const [municipiosMalha, setMunicipiosMalha] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [alertas, setAlertas] = useState([]);

  const [municipiosSelecionados, setMunicipiosSelecionados] =
    useState([]);

  const [buscaMunicipio, setBuscaMunicipio] = useState("");

  const [doencasSelecionadas, setDoencasSelecionadas] =
    useState([]);

  const [alertasSelecionados, setAlertasSelecionados] =
    useState(OPCOES_ALERTA);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
      setErro("");

      try {
        const [
          respostaMunicipios,
          respostaMalha,
          respostaRegistros,
          respostaAlertas,
          respostaDoencas,
        ] = await Promise.all([
          fetch(URL_MUNICIPIOS),
          fetch(URL_MALHA_MUNICIPIOS),

          supabase
            .from("registros_epidemiologicos")
            .select(`
              id,
              municipio,
              localidade,
              data_referencia,
              quantidade,
              tipo_registro,
              nivel_alerta,
              fonte,
              status,
              doenca:catalogo_doencas (
                nome,
                pilares,
                atinge
              )
            `)
            .eq("status", "publicado"),

          supabase
            .from("alertas")
            .select(`
              id,
              titulo,
              descricao,
              recomendacoes,
              doenca_id,
              municipio,
              localidade,
              nivel_alerta,
              fonte,
              status,
              data_inicio,
              data_encerramento,
              encerrado_em,
              criado_em
            `)
            .eq("status", "publicado"),

          supabase
            .from("catalogo_doencas")
            .select("id, nome")
            .eq("status", "publicado"),
        ]);

        if (!respostaMunicipios.ok) {
          throw new Error(
            "Erro ao carregar municípios do IBGE."
          );
        }

        if (!respostaMalha.ok) {
          throw new Error(
            "Erro ao carregar a malha municipal do IBGE."
          );
        }

        const listaMunicipios = await respostaMunicipios.json();
        const malha = await respostaMalha.json();

        if (respostaRegistros.error) {
          throw respostaRegistros.error;
        }

        if (respostaAlertas.error) {
          throw respostaAlertas.error;
        }

        if (respostaDoencas.error) {
          throw respostaDoencas.error;
        }

        if (!ativo) return;

        const municipiosOrganizados = listaMunicipios
          .map((municipio) => ({
            id: String(municipio.id),
            nome: municipio.nome,
          }))
          .sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR")
          );

        setMunicipios(municipiosOrganizados);
        setMunicipiosMalha(malha);
        setRegistros(respostaRegistros.data || []);

        const nomesDoencas = new Map(
          (respostaDoencas.data || []).map((doenca) => [
            String(doenca.id),
            doenca.nome,
          ])
        );

        const alertasCarregados = (
          respostaAlertas.data || []
        ).map((alerta) => ({
          ...alerta,
          doenca_nome:
            nomesDoencas.get(String(alerta.doenca_id)) || "",
        }));

        setAlertas(alertasCarregados.filter(alertaAtivo));
      } catch (erroCarregamento) {
        console.error(
          "Erro ao carregar mapa epidemiológico:",
          erroCarregamento
        );

        if (ativo) {
          setErro(
            erroCarregamento.message ||
              "Não foi possível carregar os dados do mapa."
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    const atualizarAlertas = async () => {
      const [respostaAlertas, respostaDoencas] =
        await Promise.all([
          supabase
            .from("alertas")
            .select(`
              id,
              titulo,
              descricao,
              recomendacoes,
              doenca_id,
              municipio,
              localidade,
              nivel_alerta,
              fonte,
              status,
              data_inicio,
              data_encerramento,
              encerrado_em,
              criado_em
            `)
            .eq("status", "publicado"),

          supabase
            .from("catalogo_doencas")
            .select("id, nome")
            .eq("status", "publicado"),
        ]);

      if (!ativo) return;

      if (
        respostaAlertas.error ||
        respostaDoencas.error
      ) {
        console.error(
          "Não foi possível atualizar os alertas do mapa:",
          respostaAlertas.error || respostaDoencas.error
        );

        return;
      }

      const nomesDoencas = new Map(
        (respostaDoencas.data || []).map((doenca) => [
          String(doenca.id),
          doenca.nome,
        ])
      );

      setAlertas(
        (respostaAlertas.data || [])
          .map((alerta) => ({
            ...alerta,
            doenca_nome:
              nomesDoencas.get(String(alerta.doenca_id)) || "",
          }))
          .filter(alertaAtivo)
      );
    };

    const canal = supabase
      .channel("mapa-epidemiologico-alertas")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alertas",
        },
        atualizarAlertas
      )
      .subscribe();

    const aoVoltarParaAba = () => {
      if (document.visibilityState === "visible") {
        atualizarAlertas();
      }
    };

    const intervalo = window.setInterval(
      atualizarAlertas,
      60000
    );

    document.addEventListener(
      "visibilitychange",
      aoVoltarParaAba
    );

    return () => {
      ativo = false;

      window.clearInterval(intervalo);

      document.removeEventListener(
        "visibilitychange",
        aoVoltarParaAba
      );

      supabase.removeChannel(canal);
    };
  }, []);

  const alternarMunicipio = useCallback((municipio) => {
    setMunicipiosSelecionados((anteriores) => {
      const existe = anteriores.some(
        (item) => String(item.id) === String(municipio.id)
      );

      if (existe) {
        return anteriores.filter(
          (item) => String(item.id) !== String(municipio.id)
        );
      }

      return [...anteriores, municipio];
    });
  }, []);

  const municipiosFiltrados = useMemo(() => {
    const busca = normalizar(buscaMunicipio);

    return municipios.filter((municipio) =>
      normalizar(municipio.nome).includes(busca)
    );
  }, [municipios, buscaMunicipio]);

  const listaDoencas = useMemo(() => {
    const nomes = [
      ...registros.map(obterNomeDoenca),
      ...alertas.map((alerta) => alerta.doenca_nome),
    ].filter(
      (nome) =>
        nome && nome !== "Doença não informada"
    );

    return [...new Set(nomes)].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [registros, alertas]);

  const municipiosComDados = useMemo(() => {
    return municipiosSelecionados.map((municipio) =>
      obterDadosMunicipio(
        municipio,
        registros,
        alertas,
        doencasSelecionadas
      )
    );
  }, [
    municipiosSelecionados,
    registros,
    alertas,
    doencasSelecionadas,
  ]);

  const resumoGeral = useMemo(() => {
    const registrosFiltrados = filtrarRegistrosPorDoenca(
      registros,
      doencasSelecionadas
    );

    const casos = registrosFiltrados.reduce(
      (total, registro) =>
        total + obterQuantidade(registro),
      0
    );

    return {
      registros: registrosFiltrados.length,
      casos,
      municipios: municipiosSelecionados.length,
    };
  }, [
    registros,
    doencasSelecionadas,
    municipiosSelecionados,
  ]);

  const alternarDoenca = (nome) => {
    setDoencasSelecionadas((anteriores) =>
      anteriores.includes(nome)
        ? anteriores.filter((item) => item !== nome)
        : [...anteriores, nome]
    );
  };

  const alternarAlerta = (nivel) => {
    setAlertasSelecionados((anteriores) =>
      anteriores.includes(nivel)
        ? anteriores.filter((item) => item !== nivel)
        : [...anteriores, nivel]
    );
  };

  const selecionarTodosAlertas = () => {
    setAlertasSelecionados(OPCOES_ALERTA);
  };

  const limparFiltros = () => {
    setDoencasSelecionadas([]);
    setAlertasSelecionados(OPCOES_ALERTA);
    setBuscaMunicipio("");
  };

  const limparMunicipiosSelecionados = () => {
    setMunicipiosSelecionados([]);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Registros encontrados
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {resumoGeral.registros}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Quantidade de casos
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {resumoGeral.casos.toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Municípios selecionados
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {resumoGeral.municipios}
          </p>
        </div>
      </div>

      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          Carregando municípios e registros epidemiológicos...
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Localização territorial
                </h2>
                <p className="text-sm text-slate-500">
                  Pesquise e selecione os municípios da Bahia que deseja acompanhar.
                </p>
              </div>

              <button
                type="button"
                onClick={limparFiltros}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Limpar filtros
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Buscar município da Bahia
              </label>

              <input
                type="text"
                value={buscaMunicipio}
                onChange={(event) =>
                  setBuscaMunicipio(event.target.value)
                }
                placeholder="Digite o nome do município..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  {municipiosFiltrados.length} município(s) na busca
                </span>

                <button
                  type="button"
                  onClick={limparMunicipiosSelecionados}
                  disabled={!municipiosSelecionados.length}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Limpar municípios selecionados
                </button>
              </div>

              <div className="mt-3 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {municipiosFiltrados.map((municipio) => {
                  const selecionado = municipioEstaSelecionado(
                    municipio,
                    municipiosSelecionados
                  );

                  return (
                    <label
                      key={municipio.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition ${
                        selecionado
                          ? "border-blue-400 bg-blue-50 text-blue-900"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => alternarMunicipio(municipio)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <span>{municipio.nome}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Filtros epidemiológicos
              </h2>
              <p className="text-sm text-slate-500">
                Combine doenças e níveis de alerta para atualizar as cores dos municípios no mapa.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Nível de alerta
                  </h3>

                  <button
                    type="button"
                    onClick={selecionarTodosAlertas}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Selecionar todos
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {OPCOES_ALERTA.map((nivel) => (
                    <label
                      key={nivel}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                        alertasSelecionados.includes(nivel)
                          ? "border-slate-300 bg-slate-50"
                          : "border-slate-200 opacity-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={alertasSelecionados.includes(nivel)}
                        onChange={() => alternarAlerta(nivel)}
                        className="h-4 w-4 rounded border-slate-300"
                      />

                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: CORES_ALERTA[nivel],
                        }}
                      />

                      {NOMES_ALERTA[nivel]}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Doenças
                  </h3>

                  <button
                    type="button"
                    onClick={() => setDoencasSelecionadas([])}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Limpar doenças
                  </button>
                </div>

                {listaDoencas.length ? (
                  <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                    {listaDoencas.map((doenca) => (
                      <label
                        key={doenca}
                        className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={doencasSelecionadas.includes(doenca)}
                          onChange={() => alternarDoenca(doenca)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        <span>{doenca}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Nenhuma doença encontrada nos registros publicados.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Mapa epidemiológico dos municípios da Bahia
                </h2>
                <p className="text-sm text-slate-500">
                  Cada área delimitada representa um município. Clique em um município para selecioná-lo ou removê-lo da seleção.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                {OPCOES_ALERTA.map((nivel) => (
                  <span
                    key={nivel}
                    className="flex items-center gap-1"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: CORES_ALERTA[nivel],
                      }}
                    />
                    {NOMES_ALERTA[nivel]}
                  </span>
                ))}
              </div>
            </div>

            <div className="h-[550px] w-full">
              <MapContainer
                center={[-12.8, -41.5]}
                zoom={6}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {municipiosMalha && (
                  <CamadaMunicipios
                    municipiosMalha={municipiosMalha}
                    municipios={municipios}
                    registros={registros}
                    alertas={alertas}
                    doencasSelecionadas={doencasSelecionadas}
                    alertasSelecionados={alertasSelecionados}
                    municipiosSelecionados={municipiosSelecionados}
                    alternarMunicipio={alternarMunicipio}
                  />
                )}

                <AjustarVisualizacao
                  municipiosMalha={municipiosMalha}
                  municipiosSelecionados={municipiosSelecionados}
                />
              </MapContainer>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Municípios selecionados
                </h2>
                <p className="text-sm text-slate-500">
                  A seleção permanece ativa enquanto você utiliza os filtros.
                </p>
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                {municipiosComDados.length} selecionado(s)
              </span>
            </div>

            {municipiosComDados.length ? (
              <div className="space-y-2">
                {municipiosComDados.map((municipio) => (
                  <div
                    key={municipio.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        {municipio.nome}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        {municipio.registros} registro(s) ·{" "}
                        {municipio.quantidade.toLocaleString("pt-BR")} caso(s)
                      </p>

                      {municipio.alertas > 0 && (
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          {municipio.alertas} alerta(s) ativo(s)
                        </p>
                      )}

                      {municipio.doencas.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          Doenças: {municipio.doencas.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: CORES_ALERTA[municipio.nivel],
                          }}
                        />
                        {NOMES_ALERTA[municipio.nivel]}
                      </span>

                      <button
                        type="button"
                        onClick={() => alternarMunicipio(municipio)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                Nenhum município selecionado. Escolha um município na lista ou clique diretamente no mapa.
              </p>
            )}
          </section>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <strong>
              Como os filtros e as classificações funcionam
            </strong>

            <p className="mt-1">
              O mapa utiliza exclusivamente os limites territoriais municipais fornecidos pelo IBGE. Cada polígono representa um município da Bahia.
            </p>

            <p className="mt-1">
              Os registros epidemiológicos são associados ao município informado no cadastro. Os alertas publicados e vigentes também são associados ao município, independentemente da localidade específica.
            </p>

            <p className="mt-1">
              Ao escolher uma ou mais doenças, a classificação considera somente os registros e alertas dessas doenças. Quando existem níveis diferentes no mesmo município, prevalece o mais grave: vermelho, amarelo e depois verde. Cinza indica ausência de registro correspondente ou ausência de classificação válida.
            </p>

            <p className="mt-1">
              Os municípios selecionados continuam visíveis no mapa mesmo quando o respectivo nível de alerta é desmarcado nos filtros.
            </p>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Fontes: IBGE, para a lista de municípios e os limites territoriais municipais; Supabase, para os registros epidemiológicos e alertas publicados e vigentes. A classificação depende dos dados cadastrados e publicados no sistema.
          </p>
        </>
      )}
    </div>
  );
}
