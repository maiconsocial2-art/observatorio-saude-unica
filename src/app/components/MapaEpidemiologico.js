
"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import { supabase } from "../../../lib/supabase";

const URL_BAIRROS =
  "https://services6.arcgis.com/GP5qdNaePRPh2SdT/ArcGIS/rest/services/Bairros_Dec32791_20_Vigente/FeatureServer/0/query?where=1%3D1&outFields=NOME_BAIRR&outSR=4326&f=geojson";

const PRIORIDADE_ALERTA = {
  nao_avaliado: 0,
  verde: 1,
  amarelo: 2,
  vermelho: 3,
};

function obterNomeBairro(propriedades = {}) {
  return propriedades.NOME_BAIRR
    ? String(propriedades.NOME_BAIRR).trim()
    : "Bairro sem identificação";
}

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function obterNivelAlerta(nivel) {
  const valor = normalizar(nivel).replace(/[_-]+/g, " ");

  if (valor.includes("vermelho")) return "vermelho";
  if (valor.includes("amarelo")) return "amarelo";
  if (valor.includes("verde")) return "verde";

  return "nao_avaliado";
}

function obterQuantidade(registro) {
  const quantidade = Number(registro.quantidade);

  return Number.isFinite(quantidade) && quantidade > 0
    ? quantidade
    : 0;
}

function obterNomeDoenca(registro) {
  if (Array.isArray(registro.doenca)) {
    return registro.doenca[0]?.nome || "Doença não identificada";
  }

  return registro.doenca?.nome || "Doença não identificada";
}

function obterCor(nivel) {
  const cores = {
    verde: "#36a852",
    amarelo: "#f5c542",
    vermelho: "#df3c3c",
    nao_avaliado: "#94a3b8",
  };

  return cores[obterNivelAlerta(nivel)];
}

function nomesAlertaTexto(nivel) {
  const nomes = {
    verde: "Alerta verde",
    amarelo: "Alerta amarelo",
    vermelho: "Alerta vermelho",
    nao_avaliado: "Não avaliado",
  };

  return nomes[obterNivelAlerta(nivel)];
}

function classeAlerta(nivel) {
  const classes = {
    verde: "bg-green-100 text-green-800",
    amarelo: "bg-yellow-100 text-yellow-800",
    vermelho: "bg-red-100 text-red-800",
    nao_avaliado: "bg-slate-100 text-slate-700",
  };

  return classes[obterNivelAlerta(nivel)];
}

function obterMaiorAlerta(niveis) {
  return niveis.reduce((maior, nivelAtual) => {
    const nivel = obterNivelAlerta(nivelAtual);

    return PRIORIDADE_ALERTA[nivel] > PRIORIDADE_ALERTA[maior]
      ? nivel
      : maior;
  }, "nao_avaliado");
}

function AjustarVisualizacao({ bairros }) {
  const mapa = useMap();

  useEffect(() => {
    if (bairros?.features?.length) {
      const camada = L.geoJSON(bairros);
      const limites = camada.getBounds();

      if (limites.isValid()) {
        mapa.fitBounds(limites, { padding: [15, 15] });
      }
    }
  }, [bairros, mapa]);

  return null;
}

function MarcadoresQuantidade({ bairros, registrosPorBairro }) {
  const mapa = useMap();

  useEffect(() => {
    if (!bairros?.features?.length) return;

    const camadaMarcadores = L.layerGroup();

    bairros.features.forEach((feature) => {
      const nome = obterNomeBairro(feature.properties);
      const registros = registrosPorBairro[normalizar(nome)] || [];

      const total = registros.reduce(
        (soma, registro) => soma + obterQuantidade(registro),
        0
      );

      if (total <= 0) return;

      const limites = L.geoJSON(feature).getBounds();
      if (!limites.isValid()) return;

      const centro = limites.getCenter();

      const marcador = L.marker(centro, {
        interactive: false,
        icon: L.divIcon({
          className: "marcador-casos-epidemiologicos",
          html: `
            <div style="
              background: rgba(15, 23, 42, 0.92);
              color: white;
              border: 2px solid white;
              border-radius: 20px;
              min-width: 38px;
              height: 30px;
              padding: 0 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 800;
              box-shadow: 0 2px 8px rgba(0,0,0,0.35);
              white-space: nowrap;
            ">${total.toLocaleString("pt-BR")}</div>
          `,
          iconSize: [54, 30],
          iconAnchor: [27, 15],
        }),
      });

      camadaMarcadores.addLayer(marcador);
    });

    camadaMarcadores.addTo(mapa);

    return () => {
      mapa.removeLayer(camadaMarcadores);
    };
  }, [mapa, bairros, registrosPorBairro]);

  return null;
}

function formatarData(data) {
  if (!data) return "Não informada";

  const dataFormatada = new Date(`${data}T00:00:00`);

  if (Number.isNaN(dataFormatada.getTime())) {
    return data;
  }

  return dataFormatada.toLocaleDateString("pt-BR");
}

export default function MapaEpidemiologico() {
  const [bairros, setBairros] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [bairroSelecionado, setBairroSelecionado] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function carregarMapa() {
      try {
        setCarregando(true);
        setErro("");

        const respostaMapa = await fetch(URL_BAIRROS);

        if (!respostaMapa.ok) {
          throw new Error(
            `Falha ao acessar os bairros. Código HTTP: ${respostaMapa.status}`
          );
        }

        const dadosMapa = await respostaMapa.json();

        if (dadosMapa.error) {
          throw new Error(
            dadosMapa.error.message || "Erro na base geográfica."
          );
        }

        if (
          dadosMapa.type !== "FeatureCollection" ||
          !Array.isArray(dadosMapa.features) ||
          dadosMapa.features.length === 0
        ) {
          throw new Error(
            "A base geográfica não retornou os polígonos dos bairros."
          );
        }

        const { data, error } = await supabase
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
            doenca:catalogo_doencas (
              nome,
              pilares,
              atinge
            )
          `)
          .eq("status", "publicado")
          .ilike("municipio", "Salvador");

        if (error) {
          console.error("Erro na consulta epidemiológica:", error);

          throw new Error(
            `Falha ao consultar os registros epidemiológicos: ${error.message}`
          );
        }

        if (!ativo) return;

        setBairros(dadosMapa);
        setRegistros(data || []);
      } catch (erroMapa) {
        console.error("Erro no mapa epidemiológico:", erroMapa);

        if (ativo) {
          setErro(
            erroMapa.message || "Erro desconhecido ao carregar o mapa."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarMapa();

    return () => {
      ativo = false;
    };
  }, []);

  const registrosPorBairro = useMemo(() => {
    const resultado = {};

    registros.forEach((registro) => {
      const nome = normalizar(registro.localidade);

      if (!nome) return;

      if (!resultado[nome]) {
        resultado[nome] = [];
      }

      resultado[nome].push(registro);
    });

    return resultado;
  }, [registros]);

  const resumoGeral = useMemo(() => {
    const totalCasos = registros.reduce(
      (soma, registro) => soma + obterQuantidade(registro),
      0
    );

    const doencas = new Set(
      registros
        .map(obterNomeDoenca)
        .filter((nome) => nome !== "Doença não identificada")
    );

    return {
      totalCasos,
      totalRegistros: registros.length,
      totalDoencas: doencas.size,
    };
  }, [registros]);

  function obterClassificacao(nomeBairro) {
    const ocorrencias =
      registrosPorBairro[normalizar(nomeBairro)] || [];

    return obterMaiorAlerta(
      ocorrencias.map((registro) => registro.nivel_alerta)
    );
  }

  function estiloBairro(feature) {
    const nome = obterNomeBairro(feature.properties);
    const classificacao = obterClassificacao(nome);

    return {
      fillColor: obterCor(classificacao),
      fillOpacity: 0.65,
      color: "#ffffff",
      weight: 1,
      opacity: 1,
    };
  }

  function selecionarBairro(event) {
    const nome = obterNomeBairro(event.target.feature.properties);

    const ocorrencias =
      registrosPorBairro[normalizar(nome)] || [];

    const totalCasos = ocorrencias.reduce(
      (soma, registro) => soma + obterQuantidade(registro),
      0
    );

    const resumoDoencas = {};

    ocorrencias.forEach((registro) => {
      const nomeDoenca = obterNomeDoenca(registro);
      const chaveDoenca = normalizar(nomeDoenca);

      if (!resumoDoencas[chaveDoenca]) {
        resumoDoencas[chaveDoenca] = {
          nome: nomeDoenca,
          quantidade: 0,
          registros: 0,
          niveisAlerta: [],
        };
      }

      resumoDoencas[chaveDoenca].quantidade += obterQuantidade(registro);
      resumoDoencas[chaveDoenca].registros += 1;

      resumoDoencas[chaveDoenca].niveisAlerta.push(
        registro.nivel_alerta
      );
    });

    const doencas = Object.values(resumoDoencas)
      .map((doenca) => ({
        ...doenca,
        classificacao: obterMaiorAlerta(doenca.niveisAlerta),
      }))
      .sort((a, b) => b.quantidade - a.quantidade);

    setBairroSelecionado({
      nome,
      classificacao: obterClassificacao(nome),
      registros: ocorrencias,
      totalCasos,
      doencas,
    });
  }

  function criarInteracao(feature, camada) {
    const nome = obterNomeBairro(feature.properties);

    const ocorrencias =
      registrosPorBairro[normalizar(nome)] || [];

    const total = ocorrencias.reduce(
      (soma, registro) => soma + obterQuantidade(registro),
      0
    );

    camada.bindTooltip(
      `<strong>${nome}</strong><br>${total.toLocaleString("pt-BR")} casos registrados`,
      { sticky: true }
    );

    camada.on({ click: selecionarBairro });
  }

  if (carregando) {
    return (
      <div className="rounded-xl bg-white p-10 text-center text-slate-700">
        Carregando os bairros e os dados epidemiológicos de Salvador...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-800">
        <h3 className="font-bold">
          Não foi possível carregar o mapa.
        </h3>
        <p className="mt-2 text-sm">{erro}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">
          Mapa Epidemiológico de Salvador
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Consulte a distribuição dos casos e das doenças monitoradas
          nos bairros de Salvador.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Casos registrados</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {resumoGeral.totalCasos.toLocaleString("pt-BR")}
            </p>
          </div>

          <div className="rounded-lg bg-indigo-50 p-4">
            <p className="text-sm text-indigo-700">Doenças monitoradas</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">
              {resumoGeral.totalDoencas}
            </p>
          </div>

          <div className="rounded-lg bg-slate-100 p-4">
            <p className="text-sm text-slate-700">Registros publicados</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {resumoGeral.totalRegistros}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-sm bg-green-600" />
            Verde: alerta verde atribuído
          </span>

          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-sm bg-yellow-400" />
            Amarelo: alerta amarelo atribuído
          </span>

          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-sm bg-red-600" />
            Vermelho: alerta vermelho atribuído
          </span>

          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-sm bg-slate-400" />
            Cinza: não avaliado
          </span>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Os números sobre os bairros representam a soma das quantidades
          informadas nos registros epidemiológicos publicados.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <MapContainer
          center={[-12.9714, -38.5014]}
          zoom={11}
          scrollWheelZoom={true}
          className="h-[600px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {bairros && (
            <>
              <GeoJSON
                key="bairros-salvador"
                data={bairros}
                style={estiloBairro}
                onEachFeature={criarInteracao}
              />

              <MarcadoresQuantidade
                bairros={bairros}
                registrosPorBairro={registrosPorBairro}
              />

              <AjustarVisualizacao bairros={bairros} />
            </>
          )}
        </MapContainer>
      </div>

      {bairroSelecionado && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-slate-900">
              {bairroSelecionado.nome}
            </h3>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${classeAlerta(
                bairroSelecionado.classificacao
              )}`}
            >
              Classificação geral:{" "}
              {nomesAlertaTexto(bairroSelecionado.classificacao)}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            A classificação geral do bairro considera o alerta de maior
            prioridade entre as doenças registradas.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-700">Total de casos</p>
              <p className="text-2xl font-bold text-blue-900">
                {bairroSelecionado.totalCasos.toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="rounded-lg bg-indigo-50 p-4">
              <p className="text-sm text-indigo-700">Doenças identificadas</p>
              <p className="text-2xl font-bold text-indigo-900">
                {bairroSelecionado.doencas.length}
              </p>
            </div>

            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-sm text-slate-700">Registros publicados</p>
              <p className="text-2xl font-bold text-slate-900">
                {bairroSelecionado.registros.length}
              </p>
            </div>
          </div>

          <h4 className="mt-6 font-bold text-slate-900">
            Doenças monitoradas neste bairro
          </h4>

          {bairroSelecionado.doencas.length > 0 ? (
            <div className="mt-3 space-y-3">
              {bairroSelecionado.doencas.map((doenca) => (
                <div
                  key={normalizar(doenca.nome)}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: obterCor(doenca.classificacao),
                        }}
                        aria-hidden="true"
                      />

                      <p className="font-semibold text-slate-800">
                        {doenca.nome}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${classeAlerta(
                          doenca.classificacao
                        )}`}
                      >
                        {nomesAlertaTexto(doenca.classificacao)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {doenca.registros} registro(s) publicado(s)
                    </p>
                  </div>

                  <span className="shrink-0 text-lg font-bold text-slate-900">
                    {doenca.quantidade.toLocaleString("pt-BR")} casos
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              Nenhuma doença possui registros publicados neste bairro.
            </p>
          )}

          <h4 className="mt-6 font-bold text-slate-900">
            Histórico dos registros
          </h4>

          {bairroSelecionado.registros.map((registro) => (
            <div
              key={registro.id}
              className="mt-3 border-t border-slate-200 pt-4 text-sm text-slate-700"
            >
              <p>
                <strong>Doença:</strong> {obterNomeDoenca(registro)}
              </p>

              <p>
                <strong>Tipo:</strong>{" "}
                {registro.tipo_registro || "Não informado"}
              </p>

              <p>
                <strong>Quantidade:</strong>{" "}
                {obterQuantidade(registro).toLocaleString("pt-BR")}
              </p>

              <p>
                <strong>Data:</strong>{" "}
                {formatarData(registro.data_referencia)}
              </p>

              <p className="flex flex-wrap items-center gap-2">
                <strong>Classificação:</strong>

                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${classeAlerta(
                    registro.nivel_alerta
                  )}`}
                >
                  {nomesAlertaTexto(registro.nivel_alerta)}
                </span>
              </p>

              {registro.fonte && (
                <p>
                  <strong>Fonte:</strong> {registro.fonte}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs leading-5 text-slate-500">
        Fonte dos limites territoriais: camada geográfica
        Bairros_Dec32791_20_Vigente. As cores dos bairros representam o
        nível de alerta de maior prioridade entre os registros publicados.
        No painel de cada bairro, cada doença apresenta sua própria
        classificação. Os números representam as quantidades registradas
        e publicadas. Bairros sem classificação aparecem em cinza.
      </p>
    </div>
  );
}