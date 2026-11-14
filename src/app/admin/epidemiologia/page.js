
"use client";

import { useEffect, useRef, useState } from "react";
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

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");
}

function converterData(valor, XLSX) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return [
      valor.getFullYear(),
      String(valor.getMonth() + 1).padStart(2, "0"),
      String(valor.getDate()).padStart(2, "0"),
    ].join("-");
  }

  if (typeof valor === "number" && Number.isFinite(valor)) {
    const data = XLSX.SSF.parse_date_code(valor);

    if (data) {
      return [
        data.y,
        String(data.m).padStart(2, "0"),
        String(data.d).padStart(2, "0"),
      ].join("-");
    }
  }

  const texto = String(valor ?? "").trim();

  if (!texto) return "";

  let resultado = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (resultado) {
    return `${resultado[1]}-${String(resultado[2]).padStart(2, "0")}-${String(resultado[3]).padStart(2, "0")}`;
  }

  resultado = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (resultado) {
    return `${resultado[3]}-${String(resultado[2]).padStart(2, "0")}-${String(resultado[1]).padStart(2, "0")}`;
  }

  return "";
}

function converterQuantidade(valor) {
  if (typeof valor === "number") return valor;

  const texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "");

  if (!texto) return NaN;

  if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    return Number(texto.replace(/\./g, ""));
  }

  if (/^\d+,\d+$/.test(texto)) {
    return Number(texto.replace(",", "."));
  }

  return Number(texto);
}

function converterValorTipo(valor) {
  const texto = normalizarTexto(valor);

  const equivalencias = {
    notificacao: "notificacao",
    notificacoes: "notificacao",
    caso_suspeito: "caso_suspeito",
    suspeito: "caso_suspeito",
    caso_confirmado: "caso_confirmado",
    confirmado: "caso_confirmado",
    caso_descartado: "caso_descartado",
    descartado: "caso_descartado",
    obito: "obito",
    indicador_ambiental: "indicador_ambiental",
  };

  return equivalencias[texto] || "";
}

function converterValorAlerta(valor) {
  const texto = normalizarTexto(valor);

  const equivalencias = {
    verde: "verde",
    amarelo: "amarelo",
    vermelho: "vermelho",
    nao_avaliado: "nao_avaliado",
    "": "nao_avaliado",
  };

  return equivalencias[texto] || "";
}

function converterStatus(valor) {
  const texto = normalizarTexto(valor);

  if (!texto || texto === "rascunho") return "rascunho";
  if (texto === "publicado") return "publicado";

  return "";
}

export default function GerenciarEpidemiologia() {
  const router = useRouter();
  const arquivoRef = useRef(null);

  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const [importando, setImportando] = useState(false);

  const [doencas, setDoencas] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(null);

  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("info");

  const [arquivoNome, setArquivoNome] = useState("");
  const [linhasImportacao, setLinhasImportacao] = useState([]);
  const [mostrarImportacao, setMostrarImportacao] = useState(false);

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

  async function baixarModeloExcel() {
    try {
      const XLSX = await import("xlsx");

      const dados = [
        {
          doenca: "Dengue",
          municipio: "Salvador",
          localidade: "Itapua",
          data_referencia: "2026-11-10",
          quantidade: 120,
          tipo_registro: "notificacao",
          nivel_alerta: "vermelho",
          observacoes: "Exemplo ilustrativo",
          fonte: "SESAB",
          status: "rascunho",
        },
        {
          doenca: "Leptospirose",
          municipio: "Camaçari",
          localidade: "",
          data_referencia: "2026-11-10",
          quantidade: 8,
          tipo_registro: "caso_confirmado",
          nivel_alerta: "amarelo",
          observacoes: "",
          fonte: "SINAN",
          status: "rascunho",
        },
      ];

      const planilha = XLSX.utils.json_to_sheet(dados);

      planilha["!cols"] = [
        { wch: 25 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 15 },
        { wch: 24 },
        { wch: 18 },
        { wch: 35 },
        { wch: 25 },
        { wch: 15 },
      ];

      const instrucoes = [
        ["MODELO DE IMPORTAÇÃO EPIDEMIOLÓGICA"],
        [""],
        ["Preencha uma linha para cada registro epidemiológico."],
        ["Não altere os nomes das colunas da primeira linha."],
        ["A doença deve estar cadastrada no catálogo do site."],
        ["A data deve usar o formato AAAA-MM-DD ou DD/MM/AAAA."],
        ["A quantidade deve ser um número inteiro igual ou maior que zero."],
        ["O município deve ser escrito corretamente."],
        ["Tipos: notificacao, caso_suspeito, caso_confirmado, caso_descartado, obito, indicador_ambiental."],
        ["Alertas: nao_avaliado, verde, amarelo, vermelho."],
        ["Publicação: rascunho ou publicado."],
        ["Os dados abaixo são apenas exemplos. Substitua-os pelos seus dados reais."],
      ];

      const orientacoes = XLSX.utils.aoa_to_sheet(instrucoes);
      orientacoes["!cols"] = [{ wch: 110 }];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        planilha,
        "Dados epidemiologicos"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        orientacoes,
        "Instrucoes"
      );

      XLSX.writeFile(
        workbook,
        "modelo_importacao_epidemiologica.xlsx"
      );
    } catch (error) {
      mostrarMensagem(
        "Não foi possível gerar o modelo Excel: " + error.message,
        "erro"
      );
    }
  }

  async function processarArquivoExcel(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    setMensagem("");
    setLinhasImportacao([]);
    setMostrarImportacao(false);
    setArquivoNome(arquivo.name);

    const extensao = arquivo.name.split(".").pop().toLowerCase();

    if (!["xlsx", "xls", "csv"].includes(extensao)) {
      mostrarMensagem(
        "Formato inválido. Envie um arquivo .xlsx, .xls ou .csv.",
        "erro"
      );
      event.target.value = "";
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const conteudo = await arquivo.arrayBuffer();

      const workbook = XLSX.read(conteudo, {
        type: "array",
        cellDates: true,
      });

      const nomeAba = workbook.SheetNames[0];

      if (!nomeAba) {
        throw new Error("A planilha não possui nenhuma aba.");
      }

      const worksheet = workbook.Sheets[nomeAba];

      const linhas = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: true,
      });

      if (!linhas.length) {
        throw new Error("A planilha está vazia.");
      }

      const mapaDoencas = new Map(
        doencas.map((doenca) => [
          normalizarTexto(doenca.nome),
          doenca.id,
        ])
      );

      const resultado = linhas.map((linha, indice) => {
        const valores = {};

        Object.entries(linha).forEach(([chave, valor]) => {
          valores[normalizarTexto(chave)] = valor;
        });

        const obter = (...nomes) => {
          for (const nome of nomes) {
            const chave = normalizarTexto(nome);

            if (Object.prototype.hasOwnProperty.call(valores, chave)) {
              return valores[chave];
            }
          }

          return "";
        };

        const nomeDoenca = String(
          obter("doenca", "nome_doenca", "doença")
        ).trim();

        const municipio = String(
          obter("municipio", "cidade", "município")
        ).trim();

        const localidade = String(
          obter("localidade", "bairro")
        ).trim();

        const data = converterData(
          obter("data_referencia", "data", "data de referencia"),
          XLSX
        );

        const quantidade = converterQuantidade(
          obter("quantidade", "casos", "total")
        );

        const tipoRegistro = converterValorTipo(
          obter("tipo_registro", "tipo", "tipo de registro")
        );

        const nivelAlerta = converterValorAlerta(
          obter("nivel_alerta", "alerta", "nivel de alerta")
        );

        const status = converterStatus(
          obter("status", "publicacao", "publicação")
        );

        const observacoes = String(
          obter("observacoes", "observações")
        ).trim();

        const fonte = String(
          obter("fonte", "fonte da informacao", "fonte da informação")
        ).trim();

        const erros = [];

        if (!municipio) {
          erros.push("Município não informado.");
        }

        if (!data) {
          erros.push("Data inválida ou não informada.");
        }

        if (
          !Number.isInteger(quantidade) ||
          quantidade < 0
        ) {
          erros.push("Quantidade deve ser um número inteiro não negativo.");
        }

        if (!tipoRegistro) {
          erros.push("Tipo de registro inválido ou não informado.");
        }

        if (!nivelAlerta) {
          erros.push("Nível de alerta inválido.");
        }

        if (!status) {
          erros.push("Status inválido.");
        }

        let doencaId = null;

        if (nomeDoenca) {
          doencaId = mapaDoencas.get(
            normalizarTexto(nomeDoenca)
          );

          if (!doencaId) {
            erros.push(
              `A doença "${nomeDoenca}" não foi encontrada no catálogo.`
            );
          }
        }

        return {
          linha: indice + 2,
          nomeDoenca,
          municipio,
          localidade,
          data,
          quantidade,
          tipoRegistro,
          nivelAlerta,
          observacoes,
          fonte,
          status,
          doencaId,
          erros,
        };
      });

      setLinhasImportacao(resultado);
      setMostrarImportacao(true);

      const validas = resultado.filter(
        (linha) => linha.erros.length === 0
      ).length;

      const invalidas = resultado.length - validas;

      mostrarMensagem(
        `Planilha analisada: ${resultado.length} linhas encontradas, ${validas} válidas e ${invalidas} com problemas.`,
        invalidas > 0 ? "info" : "sucesso"
      );
    } catch (error) {
      mostrarMensagem(
        "Erro ao ler a planilha: " + error.message,
        "erro"
      );
    } finally {
      event.target.value = "";
    }
  }

  async function confirmarImportacao() {
    const validas = linhasImportacao.filter(
      (linha) => linha.erros.length === 0
    );

    if (!validas.length) {
      mostrarMensagem(
        "Não existem linhas válidas para importar.",
        "erro"
      );
      return;
    }

    const confirmar = window.confirm(
      `Você está prestes a importar ${validas.length} registros para o banco de dados. Deseja continuar?`
    );

    if (!confirmar) return;

    setImportando(true);
    setMensagem("");

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

      const agora = new Date().toISOString();

      const dados = validas.map((linha) => ({
        doenca_id: linha.doencaId,
        municipio: linha.municipio,
        localidade: linha.localidade || null,
        data_referencia: linha.data,
        quantidade: linha.quantidade,
        tipo_registro: linha.tipoRegistro,
        nivel_alerta: linha.nivelAlerta,
        observacoes: linha.observacoes || null,
        fonte: linha.fonte || null,
        status: linha.status,
        criado_por: user.id,
        atualizado_em: agora,
      }));

      let importados = 0;

      for (let inicio = 0; inicio < dados.length; inicio += 100) {
        const lote = dados.slice(inicio, inicio + 100);

        const { error } = await supabase
          .from("registros_epidemiologicos")
          .insert(lote);

        if (error) {
          throw new Error(
            `Erro ao importar o lote iniciado no registro ${inicio + 1}: ${error.message}. Foram enviados ${importados} registros antes da falha.`
          );
        }

        importados += lote.length;
      }

      setLinhasImportacao([]);
      setMostrarImportacao(false);
      setArquivoNome("");

      await carregarRegistros();

      const invalidas = linhasImportacao.length - validas.length;

      mostrarMensagem(
        `${importados} registros importados com sucesso. ${invalidas} linhas foram ignoradas por conter erros.`,
        "sucesso"
      );
    } catch (error) {
      mostrarMensagem(
        error.message || "Não foi possível importar os registros.",
        "erro"
      );

      await carregarRegistros();
    } finally {
      setImportando(false);
    }
  }

  function cancelarImportacao() {
    setLinhasImportacao([]);
    setMostrarImportacao(false);
    setArquivoNome("");

    mostrarMensagem(
      "Importação cancelada. Nenhum registro desta planilha foi enviado.",
      "info"
    );
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

  const quantidadeValidas = linhasImportacao.filter(
    (linha) => linha.erros.length === 0
  ).length;

  const quantidadeInvalidas =
    linhasImportacao.length - quantidadeValidas;

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

        <section className="mt-8 rounded-2xl border-2 border-green-700 bg-green-50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-green-950">
                Importação de planilha Excel
              </h2>

              <p className="mt-2 text-sm text-green-950">
                Cadastre vários registros epidemiológicos de uma
                só vez utilizando uma planilha.
              </p>
            </div>

            <span className="rounded-full border border-green-700 bg-white px-3 py-1 text-sm font-semibold text-green-900">
              Importação em lote
            </span>
          </div>

          <div className="mt-5 rounded-xl border border-green-800 bg-white p-4">
            <h3 className="font-bold">
              Primeiro, baixe o modelo oficial
            </h3>

            <p className="mt-1 text-sm text-black">
              Utilize o modelo para preencher as informações
              corretamente. Os exemplos presentes nele são
              ilustrativos e devem ser substituídos.
            </p>

            <button
              type="button"
              onClick={baixarModeloExcel}
              className="mt-4 rounded-lg border border-green-800 bg-white px-5 py-3 font-semibold text-green-900 hover:bg-green-100"
            >
              ↓ Baixar modelo Excel
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-green-800 bg-white p-4">
            <h3 className="font-bold">
              Enviar sua planilha preenchida
            </h3>

            <p className="mt-1 text-sm text-black">
              Formatos aceitos: XLSX, XLS e CSV.
            </p>

            <input
              ref={arquivoRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={processarArquivoExcel}
              className="mt-4 block w-full rounded-lg border border-black bg-white p-3 text-black"
            />

            {arquivoNome && (
              <p className="mt-3 text-sm font-semibold">
                Arquivo selecionado: {arquivoNome}
              </p>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-green-800 bg-white p-4 text-sm">
            <p className="font-bold">Importante:</p>

            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>A doença precisa estar cadastrada no catálogo.</li>
              <li>Município, data e quantidade são obrigatórios.</li>
              <li>O sistema verifica os tipos de registro e níveis de alerta.</li>
              <li>Somente as linhas válidas poderão ser importadas.</li>
              <li>Os registros importados não serão automaticamente deduplicados.</li>
            </ul>
          </div>
        </section>

        {mostrarImportacao && (
          <section className="mt-8 rounded-2xl border border-black bg-white p-6">
            <h2 className="text-2xl font-bold">
              Conferência da importação
            </h2>

            <p className="mt-2 text-sm">
              Confira os dados antes de confirmar o envio ao banco.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-black p-4">
                <p className="text-sm">Total de linhas</p>
                <p className="text-2xl font-bold">
                  {linhasImportacao.length}
                </p>
              </div>

              <div className="rounded-lg border border-green-700 bg-green-50 p-4">
                <p className="text-sm text-green-900">Linhas válidas</p>
                <p className="text-2xl font-bold text-green-900">
                  {quantidadeValidas}
                </p>
              </div>

              <div className="rounded-lg border border-red-700 bg-red-50 p-4">
                <p className="text-sm text-red-900">Linhas com erros</p>
                <p className="text-2xl font-bold text-red-900">
                  {quantidadeInvalidas}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {linhasImportacao.map((linha) => (
                <article
                  key={linha.linha}
                  className={`rounded-xl border p-4 ${
                    linha.erros.length
                      ? "border-red-700 bg-red-50"
                      : "border-green-700 bg-green-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">
                      Linha {linha.linha}: {linha.municipio || "Município não informado"}
                    </h3>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        linha.erros.length
                          ? "border-red-700 bg-white text-red-900"
                          : "border-green-700 bg-white text-green-900"
                      }`}
                    >
                      {linha.erros.length ? "Com problemas" : "Válida"}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <p>Doença: {linha.nomeDoenca || "Não especificada"}</p>
                    <p>Localidade: {linha.localidade || "Não informada"}</p>
                    <p>Data: {linha.data || "Inválida"}</p>
                    <p>Quantidade: {Number.isFinite(linha.quantidade) ? linha.quantidade : "Inválida"}</p>
                    <p>Tipo: {linha.tipoRegistro || "Inválido"}</p>
                    <p>Alerta: {linha.nivelAlerta || "Inválido"}</p>
                    <p>Status: {linha.status || "Inválido"}</p>
                    <p>Fonte: {linha.fonte || "Não informada"}</p>
                  </div>

                  {linha.erros.length > 0 && (
                    <div className="mt-3 rounded-lg border border-red-700 bg-white p-3">
                      <p className="font-bold text-red-900">
                        Problemas encontrados:
                      </p>

                      <ul className="mt-1 list-disc pl-5 text-sm text-red-900">
                        {linha.erros.map((erro, indice) => (
                          <li key={indice}>{erro}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirmarImportacao}
                disabled={importando || quantidadeValidas === 0}
                className={botao}
              >
                {importando
                  ? "Importando registros..."
                  : `Importar ${quantidadeValidas} registros válidos`}
              </button>

              <button
                type="button"
                onClick={cancelarImportacao}
                disabled={importando}
                className="rounded-lg border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-slate-100 disabled:opacity-60"
              >
                Cancelar importação
              </button>
            </div>

            {quantidadeInvalidas > 0 && (
              <p className="mt-3 text-sm text-red-800">
                As linhas com problemas serão ignoradas. Apenas as
                linhas válidas serão enviadas.
              </p>
            )}
          </section>
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
