
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
          .select(
            "id, municipio, localidade, data_referencia, quantidade, tipo_registro, nivel_alerta, fonte"
          )
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
          setErro(erroMapa.message || "Erro desconhecido ao carregar o mapa.");
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

  function obterClassificacao(nomeBairro) {
    const ocorrencias =
      registrosPorBairro[normalizar(nomeBairro)] || [];

    const niveis = ocorrencias.map(
      (registro) => registro.nivel_alerta
    );

    if (niveis.includes("vermelho")) return "vermelho";
    if (niveis.includes("amarelo")) return "amarelo";
    if (niveis.includes("verde")) return "verde";

    return "nao_avaliado";
  }

  function estiloBairro(feature) {
    const nome = obterNomeBairro(feature.properties);
    const classificacao = obterClassificacao(nome);

    const cores = {
      verde: "#36a852",
      amarelo: "#f5c542",
      vermelho: "#df3c3c",
      nao_avaliado: "#94a3b8",
    };

    return {
      fillColor: cores[classificacao],
      fillOpacity: 0.65,
      color: "#ffffff",
      weight: 1,
      opacity: 1,
    };
  }

  function selecionarBairro(event) {
    const nome = obterNomeBairro(event.target.feature.properties);

    setBairroSelecionado({
      nome,
      classificacao: obterClassificacao(nome),
      registros: registrosPorBairro[normalizar(nome)] || [],
    });
  }

  function criarInteracao(feature, camada) {
    const nome = obterNomeBairro(feature.properties);

    camada.bindTooltip(nome, { sticky: true });
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
          Selecione um bairro para consultar sua classificação e os registros
          epidemiológicos publicados.
        </p>

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
                data={bairros}
                style={estiloBairro}
                onEachFeature={criarInteracao}
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
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                bairroSelecionado.classificacao === "vermelho"
                  ? "bg-red-100 text-red-800"
                  : bairroSelecionado.classificacao === "amarelo"
                    ? "bg-yellow-100 text-yellow-800"
                    : bairroSelecionado.classificacao === "verde"
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-100 text-slate-700"
              }`}
            >
              {nomesAlertaTexto(bairroSelecionado.classificacao)}
            </span>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-700">
            Registros publicados: {bairroSelecionado.registros.length}
          </p>

          {bairroSelecionado.registros.map((registro) => (
            <div
              key={registro.id}
              className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-700"
            >
              <p><strong>Tipo:</strong> {registro.tipo_registro}</p>
              <p><strong>Quantidade:</strong> {registro.quantidade}</p>
              <p><strong>Data:</strong> {registro.data_referencia}</p>
              <p>
                <strong>Classificação:</strong>{" "}
                {nomesAlertaTexto(registro.nivel_alerta)}
              </p>
              {registro.fonte && (
                <p><strong>Fonte:</strong> {registro.fonte}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs leading-5 text-slate-500">
        Fonte dos limites territoriais: camada geográfica Bairros_Dec32791_20_Vigente,
        baseada na delimitação municipal dos bairros de Salvador.
        As cores representam os níveis de alerta cadastrados no Observatório.
        Bairros sem classificação aparecem em cinza.
      </p>
    </div>
  );
}

function nomesAlertaTexto(nivel) {
  const nomes = {
    verde: "Alerta verde",
    amarelo: "Alerta amarelo",
    vermelho: "Alerta vermelho",
    nao_avaliado: "Não avaliado",
  };

  return nomes[nivel] || "Não avaliado";
}
