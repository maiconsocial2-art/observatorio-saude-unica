"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { supabase } from "../../../lib/supabase";

const URL_MALHA_MUNICIPIOS =
  "https://servicodados.ibge.gov.br/api/v3/malhas/estados/29?intrarregiao=municipio&formato=application/vnd.geo+json&qualidade=intermediaria";

const URL_MUNICIPIOS =
  "https://servicodados.ibge.gov.br/api/v1/localidades/estados/29/municipios";

const URL_BAIRROS =
  "https://mapas.conder.ba.gov.br/arcgis/rest/services/BAHIA/BAIRRO_GEO/MapServer/0/query";

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

const OPCOES_ALERTA = ["vermelho", "amarelo", "verde", "nao_avaliado"];
const TAMANHO_PAGINA = 1000;

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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

function obterNomeBairro(feature) {
  return (
    primeiroValor(feature?.properties, [
      "NM_BAIRRO",
      "NOME_BAIRRO",
      "BAIRRO",
      "bairro",
      "nome",
      "NOME",
      "NM_BAIR",
      "NM_BAIRRO_",
      "DS_BAIRRO",
      "LOCALIDADE",
      "NM_LOCALIDADE",
    ]) || "Bairro sem identificação"
  );
}

function obterNomeMunicipioBairro(feature, municipios = []) {
  const propriedades = feature?.properties || {};

  const nome = primeiroValor(propriedades, [
    "NM_MUNICIPIO",
    "NOME_MUNICIPIO",
    "MUNICIPIO",
    "municipio",
    "NM_MUN",
    "NOME_MUN",
    "NM_MUNIC",
    "NM_MUNICIP",
    "NOME_MUNI",
    "NM_CIDADE",
    "CIDADE",
  ]);

  if (nome) return String(nome);

  const codigo = primeiroValor(propriedades, [
    "CD_MUNICIPIO",
    "CD_MUN",
    "COD_MUNICIPIO",
    "GEOCODIGO",
    "CD_GEOCOD",
    "ID_MUNICIPIO",
  ]);

  if (codigo) {
    const municipio = municipios.find((item) => {
      const codigoIBGE = String(item.id || "");

      return (
        codigoIBGE === String(codigo) ||
        codigoIBGE.startsWith(String(codigo)) ||
        String(codigo).startsWith(codigoIBGE)
      );
    });

    if (municipio) return municipio.nome;
  }

  return "";
}

function obterIdGeografico(feature) {
  const propriedades = feature?.properties || {};

  return (
    primeiroValor(propriedades, [
      "OBJECTID",
      "FID",
      "ID",
      "id",
      "CD_BAIRRO",
      "COD_BAIRRO",
      "GEOCODIGO",
      "ID_BAIRRO",
    ]) ||
    feature?.id ||
    null
  );
}

function chaveBairro(nomeMunicipio, nomeBairro) {
  return `${normalizar(nomeMunicipio)}|${normalizar(nomeBairro)}`;
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
    valor.includes("critico")
  ) {
    return "vermelho";
  }

  if (
    valor.includes("amarelo") ||
    valor.includes("moderado")
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
  return (
    registro?.doenca?.nome ||
    registro?.nome_doenca ||
    registro?.doenca_nome ||
    registro?.doenca ||
    registro?.agravo ||
    "Doença não informada"
  );
}

function obterRegistrosDoBairro(registros, municipio, bairro) {
  const chave = chaveBairro(municipio, bairro);

  return registros.filter((registro) => {
    const municipioRegistro = primeiroValor(registro, [
      "municipio",
      "cidade",
      "nome_municipio",
    ]);

    const bairroRegistro = primeiroValor(registro, [
      "localidade",
      "bairro",
      "nome_bairro",
      "local",
    ]);

    if (!municipioRegistro || !bairroRegistro) return false;

    return chaveBairro(municipioRegistro, bairroRegistro) === chave;
  });
}

function filtrarRegistrosPorDoenca(registros, doencasSelecionadas) {
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

// Considera somente alertas publicados e dentro do período de vigência.
function alertaAtivo(alerta) {
  const hoje = obterDataHoje();

  return (
    alerta?.status === "publicado" &&
    Boolean(alerta?.data_inicio) &&
    alerta.data_inicio <= hoje &&
    (!alerta.data_encerramento || alerta.data_encerramento >= hoje) &&
    !alerta.encerrado_em
  );
}

// Localiza os alertas que pertencem ao bairro selecionado.
function obterAlertasDoBairro(alertas, municipio, bairro) {
  const chaveMunicipio = normalizar(municipio);
  const chaveBairroAtual = normalizar(bairro);

  return alertas.filter((alerta) => {
    if (!alertaAtivo(alerta)) return false;

    const municipioAlerta = normalizar(alerta.municipio);
    const localidadeAlerta = normalizar(alerta.localidade);

    if (
      !municipioAlerta ||
      municipioAlerta !== chaveMunicipio
    ) {
      return false;
    }

    // Sem localidade específica, o alerta vale para todo o município.
    if (!localidadeAlerta) return true;

    if (localidadeAlerta === chaveMunicipio) return true;

    return localidadeAlerta === chaveBairroAtual;
  });
}

function filtrarAlertasPorDoenca(alertas, doencasSelecionadas) {
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

// Prioridade: vermelho > amarelo > verde > cinza.
function obterResumoBairro(registros, alertas = []) {
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

function formatarData(data) {
  if (!data) return "Data não informada";

  const valor = new Date(`${data}T00:00:00`);

  if (Number.isNaN(valor.getTime())) return String(data);

  return valor.toLocaleDateString("pt-BR");
}

function criarFeatureCollection(features) {
  return {
    type: "FeatureCollection",
    features,
  };
}

async function carregarBairrosCONDER() {
  let inicio = 0;
  const todos = [];

  while (true) {
    const parametros = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
      resultOffset: String(inicio),
      resultRecordCount: String(TAMANHO_PAGINA),
    });

    const resposta = await fetch(
      `${URL_BAIRROS}?${parametros.toString()}`
    );

    if (!resposta.ok) {
      throw new Error(
        "Não foi possível carregar os bairros da CONDER."
      );
    }

    const dados = await resposta.json();

    if (dados.error) {
      throw new Error(
        dados.error.message ||
          "Erro ao consultar os bairros da CONDER."
      );
    }

    const features = dados.features || [];

    todos.push(...features);

    if (
      features.length < TAMANHO_PAGINA ||
      dados.exceededTransferLimit === false
    ) {
      break;
    }

    if (features.length === 0) break;

    inicio += features.length;
  }

  const unicos = new Map();

  todos.forEach((feature, indice) => {
    const id =
      obterIdGeografico(feature) ||
      `${obterNomeBairro(feature)}-${indice}`;

    unicos.set(id, feature);
  });

  return criarFeatureCollection([...unicos.values()]);
}

function CamadaBairros({
  bairros,
  municipios,
  registros,
  alertas,
  doencasSelecionadas,
  alertasSelecionados,
  bairrosSelecionados,
  alternarBairro,
}) {
  const map = useMap();

  const estilo = useCallback(
    (feature) => {
      const nomeBairro = obterNomeBairro(feature);
      const nomeMunicipio = obterNomeMunicipioBairro(
        feature,
        municipios
      );

      const chave = chaveBairro(nomeMunicipio, nomeBairro);

      const selecionado = bairrosSelecionados.some(
        (item) => item.chave === chave
      );

      const registrosBairro = obterRegistrosDoBairro(
        registros,
        nomeMunicipio,
        nomeBairro
      );

      const registrosFiltrados = filtrarRegistrosPorDoenca(
        registrosBairro,
        doencasSelecionadas
      );

      const alertasBairro = obterAlertasDoBairro(
        alertas,
        nomeMunicipio,
        nomeBairro
      );

      const alertasFiltrados = filtrarAlertasPorDoenca(
        alertasBairro,
        doencasSelecionadas
      );

      const resumo = obterResumoBairro(
        registrosFiltrados,
        alertasFiltrados
      );

      const nivel = resumo.nivel;
      const cor = CORES_ALERTA[nivel];

      return {
        color: selecionado ? "#111827" : "#475569",
        weight: selecionado ? 3 : 1,
        opacity: 1,
        fillColor: cor,
        fillOpacity: alertasSelecionados.includes(nivel)
          ? selecionado
            ? 0.85
            : 0.55
          : 0.08,
      };
    },
    [
      municipios,
      registros,
      alertas,
      doencasSelecionadas,
      alertasSelecionados,
      bairrosSelecionados,
    ]
  );

  const interacao = useCallback(
    (feature, layer) => {
      const nomeBairro = obterNomeBairro(feature);
      const nomeMunicipio = obterNomeMunicipioBairro(
        feature,
        municipios
      );

      layer.bindTooltip(
        nomeMunicipio
          ? `${nomeBairro} - ${nomeMunicipio}`
          : nomeBairro,
        { sticky: true }
      );

      layer.on({
        click: () => {
          if (!nomeMunicipio) {
            window.alert(
              "Não foi possível identificar o município deste bairro na camada cartográfica."
            );
            return;
          }

          alternarBairro({
            chave: chaveBairro(nomeMunicipio, nomeBairro),
            bairro: nomeBairro,
            municipio: nomeMunicipio,
          });
        },
      });
    },
    [municipios, alternarBairro]
  );

  useEffect(() => {
    if (!bairros?.features?.length) return;

    const camada = L.geoJSON(bairros, {
      style: estilo,
      onEachFeature: interacao,
    });

    camada.addTo(map);

    return () => {
      map.removeLayer(camada);
    };
  }, [bairros, map, estilo, interacao]);

  return null;
}

function AjustarVisualizacao({
  bairros,
  municipiosMalha,
  municipioSelecionado,
}) {
  const map = useMap();

  useEffect(() => {
    if (!municipioSelecionado) {
      map.setView([-12.8, -41.5], 6);
      return;
    }

    const municipio = municipiosMalha?.features?.find(
      (feature) => {
        const propriedades = feature.properties || {};

        const codigo = String(
          propriedades.id ||
            propriedades.CD_MUN ||
            propriedades.CD_MUNICIPIO ||
            feature.id ||
            ""
        );

        return (
          codigo === String(municipioSelecionado.id) ||
          codigo.startsWith(String(municipioSelecionado.id))
        );
      }
    );

    if (municipio) {
      const camada = L.geoJSON(municipio);

      map.fitBounds(camada.getBounds(), {
        padding: [25, 25],
      });

      return;
    }

    const featuresMunicipio = (bairros?.features || []).filter(
      (feature) =>
        normalizar(
          obterNomeMunicipioBairro(feature, [municipioSelecionado])
        ) === normalizar(municipioSelecionado.nome)
    );

    if (featuresMunicipio.length) {
      const camada = L.geoJSON(
        criarFeatureCollection(featuresMunicipio)
      );

      map.fitBounds(camada.getBounds(), {
        padding: [25, 25],
      });
    }
  }, [
    map,
    bairros,
    municipiosMalha,
    municipioSelecionado,
  ]);

  return null;
}

export default function MapaEpidemiologico() {
  const [municipios, setMunicipios] = useState([]);
  const [municipiosMalha, setMunicipiosMalha] = useState(null);
  const [bairros, setBairros] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [alertas, setAlertas] = useState([]);

  const [municipioSelecionado, setMunicipioSelecionado] =
    useState(null);

  const [buscaMunicipio, setBuscaMunicipio] = useState("");
  const [buscaBairro, setBuscaBairro] = useState("");

  const [bairrosSelecionados, setBairrosSelecionados] =
    useState([]);

  const [doencasSelecionadas, setDoencasSelecionadas] =
    useState([]);

  const [alertasSelecionados, setAlertasSelecionados] =
    useState(OPCOES_ALERTA);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Carregamento inicial dos dados cartográficos e epidemiológicos.
  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
      setErro("");

      try {
        const [
          respostaMunicipios,
          respostaMalha,
          dadosBairros,
          respostaRegistros,
          respostaAlertas,
          respostaDoencas,
        ] = await Promise.all([
          fetch(URL_MUNICIPIOS),
          fetch(URL_MALHA_MUNICIPIOS),
          carregarBairrosCONDER(),

          // Registros epidemiológicos publicados.
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

          // Alertas cadastrados na Central de Alertas.
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

          // Catálogo usado para identificar a doença de cada alerta.
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

        setMunicipios(
          listaMunicipios
            .map((municipio) => ({
              id: municipio.id,
              nome: municipio.nome,
            }))
            .sort((a, b) =>
              a.nome.localeCompare(b.nome, "pt-BR")
            )
        );

        setMunicipiosMalha(malha);
        setBairros(dadosBairros);
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

  // Atualiza o mapa quando um alerta é publicado, editado ou encerrado.
  // Também consulta novamente ao retornar à página e a cada minuto.
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

  const alternarBairro = useCallback((bairro) => {
    setBairrosSelecionados((anteriores) => {
      const existe = anteriores.some(
        (item) => item.chave === bairro.chave
      );

      if (existe) {
        return anteriores.filter(
          (item) => item.chave !== bairro.chave
        );
      }

      return [...anteriores, bairro];
    });
  }, []);

  const municipiosFiltrados = useMemo(() => {
    const busca = normalizar(buscaMunicipio);

    return municipios.filter((municipio) =>
      normalizar(municipio.nome).includes(busca)
    );
  }, [municipios, buscaMunicipio]);

  const bairrosDoMunicipio = useMemo(() => {
    if (!municipioSelecionado || !bairros?.features) {
      return [];
    }

    const encontrados = bairros.features
      .filter((feature) => {
        const nomeMunicipio = obterNomeMunicipioBairro(
          feature,
          municipios
        );

        return (
          normalizar(nomeMunicipio) ===
          normalizar(municipioSelecionado.nome)
        );
      })
      .map((feature) => {
        const nome = obterNomeBairro(feature);

        const chave = chaveBairro(
          municipioSelecionado.nome,
          nome
        );

        return {
          nome,
          chave,
          municipio: municipioSelecionado.nome,
        };
      });

    const unicos = new Map();

    encontrados.forEach((bairro) => {
      unicos.set(bairro.chave, bairro);
    });

    return [...unicos.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }, [municipioSelecionado, bairros, municipios]);

  const bairrosFiltrados = useMemo(() => {
    const busca = normalizar(buscaBairro);

    return bairrosDoMunicipio.filter((bairro) => {
      const correspondeBusca = normalizar(
        bairro.nome
      ).includes(busca);

      const registrosBairro = obterRegistrosDoBairro(
        registros,
        bairro.municipio,
        bairro.nome
      );

      const registrosDoencas = filtrarRegistrosPorDoenca(
        registrosBairro,
        doencasSelecionadas
      );

      const alertasBairro = obterAlertasDoBairro(
        alertas,
        bairro.municipio,
        bairro.nome
      );

      const alertasDoencas = filtrarAlertasPorDoenca(
        alertasBairro,
        doencasSelecionadas
      );

      const nivel = obterResumoBairro(
        registrosDoencas,
        alertasDoencas
      ).nivel;

      const correspondeAlerta =
        alertasSelecionados.includes(nivel);

      return correspondeBusca && correspondeAlerta;
    });
  }, [
    bairrosDoMunicipio,
    buscaBairro,
    registros,
    alertas,
    doencasSelecionadas,
    alertasSelecionados,
  ]);

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

  const resumoGeral = useMemo(() => {
    const filtrados = filtrarRegistrosPorDoenca(
      registros,
      doencasSelecionadas
    );

    const totalCasos = filtrados.reduce(
      (total, registro) =>
        total + obterQuantidade(registro),
      0
    );

    return {
      registros: filtrados.length,
      casos: totalCasos,
      bairros: bairrosSelecionados.length,
    };
  }, [
    registros,
    doencasSelecionadas,
    bairrosSelecionados,
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
    setBuscaBairro("");
    setBuscaMunicipio("");
  };

  const selecionarTodosBairrosVisiveis = () => {
    setBairrosSelecionados((anteriores) => {
      const mapa = new Map(
        anteriores.map((item) => [item.chave, item])
      );

      bairrosFiltrados.forEach((bairro) => {
        mapa.set(bairro.chave, {
          chave: bairro.chave,
          bairro: bairro.nome,
          municipio: bairro.municipio,
        });
      });

      return [...mapa.values()];
    });
  };

  const limparBairrosSelecionados = () => {
    setBairrosSelecionados([]);
  };

  const selecionarMunicipio = (id) => {
    const municipio = municipios.find(
      (item) => String(item.id) === String(id)
    );

    setMunicipioSelecionado(municipio || null);
    setBuscaBairro("");
  };

  const detalhesBairrosSelecionados = useMemo(() => {
    return bairrosSelecionados.map((bairro) => {
      const registrosBairro = obterRegistrosDoBairro(
        registros,
        bairro.municipio,
        bairro.bairro
      );

      const registrosDoencas = filtrarRegistrosPorDoenca(
        registrosBairro,
        doencasSelecionadas
      );

      const alertasBairro = filtrarAlertasPorDoenca(
        obterAlertasDoBairro(
          alertas,
          bairro.municipio,
          bairro.bairro
        ),
        doencasSelecionadas
      );

      return {
        ...bairro,
        ...obterResumoBairro(
          registrosDoencas,
          alertasBairro
        ),
        doencas: [
          ...new Set([
            ...registrosDoencas.map(obterNomeDoenca),
            ...alertasBairro
              .map((alerta) => alerta.doenca_nome)
              .filter(Boolean),
          ]),
        ],
      };
    });
  }, [
    bairrosSelecionados,
    registros,
    alertas,
    doencasSelecionadas,
  ]);

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
            Bairros selecionados
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {resumoGeral.bairros}
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
          Carregando municípios, bairros e registros epidemiológicos...
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
                  Escolha uma cidade para localizar seus bairros. Você pode selecionar bairros de municípios diferentes.
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  placeholder="Digite o nome da cidade..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <select
                  value={municipioSelecionado?.id || ""}
                  onChange={(event) =>
                    selecionarMunicipio(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">
                    Selecione um município
                  </option>

                  {municipiosFiltrados.map((municipio) => (
                    <option
                      key={municipio.id}
                      value={municipio.id}
                    >
                      {municipio.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Buscar bairro
                </label>

                <input
                  type="text"
                  value={buscaBairro}
                  onChange={(event) =>
                    setBuscaBairro(event.target.value)
                  }
                  placeholder="Digite o nome do bairro..."
                  disabled={!municipioSelecionado}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selecionarTodosBairrosVisiveis}
                    disabled={!bairrosFiltrados.length}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Selecionar bairros visíveis
                  </button>

                  <button
                    type="button"
                    onClick={limparBairrosSelecionados}
                    disabled={!bairrosSelecionados.length}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Limpar seleção
                  </button>
                </div>
              </div>
            </div>

            {municipioSelecionado && (
              <div className="mt-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Bairros de {municipioSelecionado.nome}
                  </h3>

                  <span className="text-xs text-slate-500">
                    {bairrosFiltrados.length} bairro(s) encontrados
                  </span>
                </div>

                {bairrosFiltrados.length ? (
                  <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {bairrosFiltrados.map((bairro) => {
                      const selecionado = bairrosSelecionados.some(
                        (item) => item.chave === bairro.chave
                      );

                      return (
                        <label
                          key={bairro.chave}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition ${
                            selecionado
                              ? "border-blue-400 bg-blue-50 text-blue-900"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() =>
                              alternarBairro({
                                chave: bairro.chave,
                                bairro: bairro.nome,
                                municipio: bairro.municipio,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />

                          <span>{bairro.nome}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                    Nenhum bairro encontrado para este município com os filtros atuais.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Filtros epidemiológicos
              </h2>

              <p className="text-sm text-slate-500">
                Combine doenças e níveis de alerta para atualizar as cores do mapa.
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
                  Mapa epidemiológico da Bahia
                </h2>

                <p className="text-sm text-slate-500">
                  Clique nos bairros para selecionar ou remover da seleção.
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

                {bairros && (
                  <CamadaBairros
                    bairros={bairros}
                    municipios={municipios}
                    registros={registros}
                    alertas={alertas}
                    doencasSelecionadas={doencasSelecionadas}
                    alertasSelecionados={alertasSelecionados}
                    bairrosSelecionados={bairrosSelecionados}
                    alternarBairro={alternarBairro}
                  />
                )}

                <AjustarVisualizacao
                  bairros={bairros}
                  municipiosMalha={municipiosMalha}
                  municipioSelecionado={municipioSelecionado}
                />
              </MapContainer>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Bairros selecionados
                </h2>

                <p className="text-sm text-slate-500">
                  A seleção permanece ativa mesmo quando você troca de município.
                </p>
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                {detalhesBairrosSelecionados.length} selecionado(s)
              </span>
            </div>

            {detalhesBairrosSelecionados.length ? (
              <div className="space-y-2">
                {detalhesBairrosSelecionados.map((bairro) => (
                  <div
                    key={bairro.chave}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        {bairro.bairro}
                      </p>

                      <p className="text-xs text-slate-500">
                        {bairro.municipio}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        {bairro.registros} registro(s) ·{" "}
                        {bairro.quantidade.toLocaleString("pt-BR")} caso(s)
                      </p>

                      {bairro.alertas > 0 && (
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          {bairro.alertas} alerta(s) ativo(s)
                        </p>
                      )}

                      {bairro.doencas.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          Doenças: {bairro.doencas.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: CORES_ALERTA[bairro.nivel],
                          }}
                        />

                        {NOMES_ALERTA[bairro.nivel]}
                      </span>

                      <button
                        type="button"
                        onClick={() => alternarBairro(bairro)}
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
                Nenhum bairro selecionado. Escolha um município e marque uma ou mais localidades na lista ou diretamente no mapa.
              </p>
            )}
          </section>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <strong>
              Como os filtros e as classificações funcionam
            </strong>

            <p className="mt-1">
              O município serve somente para localizar os bairros disponíveis. A seleção de bairros é múltipla e permanece ao trocar de município.
            </p>

            <p className="mt-1">
              Os registros epidemiológicos e os alertas publicados são associados ao município e à localidade. Alertas sem localidade específica valem para todo o município. Alertas agendados, em rascunho ou encerrados não colorem o mapa.
            </p>

            <p className="mt-1">
              Ao escolher uma ou mais doenças, a cor de cada bairro considera somente os registros e alertas dessas doenças. Quando existem níveis diferentes no mesmo bairro, prevalece o nível mais grave: vermelho, amarelo e depois verde. Cinza indica ausência de registro correspondente ou ausência de classificação válida.
            </p>

            <p className="mt-1">
              O mapa desenha exclusivamente as geometrias retornadas pela camada de bairros da CONDER. Não utiliza polígonos municipais nem a camada oceânica para colorir ou selecionar o mapa.
            </p>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Fontes: IBGE, para a lista de municípios e referência cartográfica; CONDER, serviço BAHIA/BAIRRO_GEO, para os polígonos de bairros; Supabase, para os registros epidemiológicos e alertas publicados e vigentes. A disponibilidade de bairros depende da cobertura e dos atributos fornecidos pela camada cartográfica da CONDER. Onde não houver polígono de bairro publicado ou identificável, o mapa não consegue oferecer seleção territorial precisa.
          </p>
        </>
      )}
    </div>
  );
}