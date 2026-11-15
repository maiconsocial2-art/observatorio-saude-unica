
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
  { id: "notificacoes", nome: "Notificações", icone: "🔔" },
  { id: "minha-conta", nome: "Minha conta", icone: "👤" },
  { id: "definicoes", nome: "Definições", icone: "⚙" },
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

function formatarDataHora(data) {
  if (!data) return "Data não informada";
  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
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
        <article key={doenca.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">{doenca.nome}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {doenca.resumo || "Descrição ainda não disponibilizada."}
          </p>

          {doenca.pilares?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {doenca.pilares.map((pilar) => (
                <span key={pilar} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
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
        <article key={registro.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coresAlerta[registro.nivel_alerta] || coresAlerta.nao_avaliado}`}>
              {nomesAlerta[registro.nivel_alerta] || "Não avaliado"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p><strong>Data:</strong> {formatarData(registro.data_referencia)}</p>
            <p><strong>Quantidade:</strong> {registro.quantidade}</p>
            <p><strong>Tipo:</strong> {nomesRegistro[registro.tipo_registro] || registro.tipo_registro}</p>
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

  if (alerta.encerrado_em || (alerta.data_encerramento && alerta.data_encerramento < hoje)) {
    return "encerrado";
  }

  if (alerta.data_inicio > hoje) return "agendado";

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

  const ativos = alertasOrdenados.filter((a) => classificarAlerta(a) === "ativo");
  const agendados = alertasOrdenados.filter((a) => classificarAlerta(a) === "agendado");
  const historico = alertasOrdenados.filter((a) => classificarAlerta(a) === "encerrado");
  const outros = alertasOrdenados.filter((a) => classificarAlerta(a) === "publicado");

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
      <article className={`rounded-xl border bg-white p-6 shadow-sm ${situacao === "ativo" ? "border-green-200" : "border-slate-200"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900">{alerta.titulo}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {alerta.localidade ? `${alerta.localidade}, ` : ""}
              {alerta.municipio || "Abrangência geral"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coresAlerta[alerta.nivel_alerta] || coresAlerta.nao_avaliado}`}>
              {nomesAlerta[alerta.nivel_alerta] || "Nível não informado"}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${estilosSituacao[situacao]}`}>
              {nomesSituacao[situacao]}
            </span>
          </div>
        </div>

        <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-700">{alerta.descricao}</p>

        {alerta.doenca?.nome && (
          <p className="mt-4 text-sm text-slate-700">
            <strong>Doença relacionada:</strong> {alerta.doenca.nome}
          </p>
        )}

        {alerta.recomendacoes && (
          <div className="mt-5 rounded-lg bg-teal-50 p-4">
            <h4 className="font-semibold text-teal-900">Recomendações e prevenção</h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-teal-900">{alerta.recomendacoes}</p>
          </div>
        )}

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:grid-cols-2">
          <p><strong>Início:</strong> {formatarData(alerta.data_inicio)}</p>
          <p><strong>Encerramento previsto:</strong> {alerta.data_encerramento ? formatarData(alerta.data_encerramento) : "Não informado"}</p>
          {alerta.encerrado_em && (
            <p className="sm:col-span-2">
              <strong>Encerrado manualmente em:</strong>{" "}
              {new Date(alerta.encerrado_em).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>

        {alerta.fonte && (
          <p className="mt-4 text-xs text-slate-500"><strong>Fonte:</strong> {alerta.fonte}</p>
        )}
      </article>
    );
  }

  return (
    <div className="space-y-8">
      {ativos.length > 0 && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">Alertas ativos</h3>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">{ativos.length} ativo(s)</span>
          </div>
          <div className="space-y-5">{ativos.map((a) => <CartaoAlerta key={a.id} alerta={a} />)}</div>
        </section>
      )}

      {agendados.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-900">Alertas programados</h3>
          <div className="space-y-5">{agendados.map((a) => <CartaoAlerta key={a.id} alerta={a} />)}</div>
        </section>
      )}

      {outros.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-900">Outros alertas publicados</h3>
          <div className="space-y-5">{outros.map((a) => <CartaoAlerta key={a.id} alerta={a} />)}</div>
        </section>
      )}

      {historico.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-900">Histórico de alertas encerrados</h3>
          <p className="mb-4 text-sm text-slate-600">
            Estes alertas permanecem disponíveis para consulta, mas não estão mais vigentes.
          </p>
          <div className="space-y-5">{historico.map((a) => <CartaoAlerta key={a.id} alerta={a} />)}</div>
        </section>
      )}
    </div>
  );
}

function CampoFiltro({ titulo, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{titulo}</span>
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

const preferenciasIniciais = {
  receber_no_site: true,
  receber_por_email: true,
  municipios_interesse: [],
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

  const [notificacoes, setNotificacoes] = useState([]);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);
  const [erroNotificacoes, setErroNotificacoes] = useState("");
  const [atualizandoNotificacoes, setAtualizandoNotificacoes] = useState(false);

  const [notificacaoPopup, setNotificacaoPopup] = useState(null);

  const [preferencias, setPreferencias] = useState(preferenciasIniciais);
  const [carregandoPreferencias, setCarregandoPreferencias] = useState(false);
  const [salvandoPreferencias, setSalvandoPreferencias] = useState(false);
  const [erroPreferencias, setErroPreferencias] = useState("");
  const [mensagemPreferencias, setMensagemPreferencias] = useState("");
  const [textoMunicipios, setTextoMunicipios] = useState("");

  const [marcandoTodas, setMarcandoTodas] = useState(false);

  // Dados e estados da área Minha conta
  const [novoEmail, setNovoEmail] = useState("");
  const [confirmarEmail, setConfirmarEmail] = useState("");
  const [salvandoEmail, setSalvandoEmail] = useState(false);
  const [erroEmail, setErroEmail] = useState("");
  const [mensagemEmail, setMensagemEmail] = useState("");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");
  const [mensagemSenha, setMensagemSenha] = useState("");

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const secaoSolicitada = parametros.get("secao");
    const permitidas = secoes.map((item) => item.id);

    if (secaoSolicitada && permitidas.includes(secaoSolicitada)) {
      setSecaoAtiva(secaoSolicitada);
    }
  }, []);

  function atualizarFiltro(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }

  function limparFiltros() {
    setFiltros(filtrosIniciais);
  }

  useEffect(() => {
    let ativo = true;

    async function verificarAcesso() {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (!ativo) return;

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setUsuario(user);
      setCarregando(false);
    }

    verificarAcesso();

    return () => {
      ativo = false;
    };
  }, [router]);

  useEffect(() => {
    if (!usuario) return;

    async function carregarDados() {
      setCarregandoDados(true);
      setErroDados("");

      const [resultadoDoencas, resultadoRegistros, resultadoAlertas] =
        await Promise.all([
          supabase
            .from("catalogo_doencas")
            .select("id, nome, resumo, descricao, pilares, atinge, transmissao, sintomas, prevencao, fontes")
            .eq("status", "publicado")
            .order("nome"),

          supabase
            .from("registros_epidemiologicos")
            .select("id, doenca_id, municipio, localidade, data_referencia, quantidade, tipo_registro, observacoes, fonte, nivel_alerta, doenca:catalogo_doencas(id, nome, pilares, atinge)")
            .eq("status", "publicado")
            .order("data_referencia", { ascending: false }),

          supabase
            .from("alertas")
            .select("id, titulo, descricao, recomendacoes, doenca_id, municipio, localidade, nivel_alerta, fonte, status, data_inicio, data_encerramento, encerrado_em, abrangencia, doenca:catalogo_doencas(id, nome)")
            .eq("status", "publicado")
            .order("data_inicio", { ascending: false }),
        ]);

      if (resultadoDoencas.error || resultadoRegistros.error || resultadoAlertas.error) {
        console.error("Erro ao carregar dados:", resultadoDoencas.error, resultadoRegistros.error, resultadoAlertas.error);
        setErroDados("Não foi possível carregar todas as informações. Verifique a conexão e as permissões do banco de dados.");
      }

      setDoencas(resultadoDoencas.data || []);
      setRegistros(resultadoRegistros.data || []);
      setAlertas(resultadoAlertas.data || []);
      setCarregandoDados(false);
    }

    carregarDados();
  }, [usuario]);

  // Busca notificações. Na primeira carga, abre o aviso flutuante
  // se existir alguma notificação ainda não lida.
  async function carregarNotificacoes(mostrarPopup = false) {
    if (!usuario) return;

    setCarregandoNotificacoes(true);
    setErroNotificacoes("");

    const { data, error } = await supabase
      .from("notificacoes_usuarios")
      .select("id, alerta_id, titulo, mensagem, municipio, nivel_alerta, lida, lida_em, criada_em")
      .eq("usuario_id", usuario.id)
      .order("criada_em", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Erro ao carregar notificações:", error);
      setErroNotificacoes("Não foi possível carregar suas notificações. Verifique sua conexão.");
      setNotificacoes([]);
    } else {
      const lista = data || [];
      setNotificacoes(lista);

      if (mostrarPopup) {
        const maisRecenteNaoLida = lista.find((item) => !item.lida);
        if (maisRecenteNaoLida) {
          setNotificacaoPopup(maisRecenteNaoLida);
        }
      }
    }

    setCarregandoNotificacoes(false);
  }

  async function carregarPreferencias() {
    if (!usuario) return;

    setCarregandoPreferencias(true);
    setErroPreferencias("");
    setMensagemPreferencias("");

    const { data, error } = await supabase
      .from("preferencias_notificacoes")
      .select("receber_no_site, receber_por_email, municipios_interesse")
      .eq("usuario_id", usuario.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar preferências:", error);
      setErroPreferencias("Não foi possível carregar suas preferências.");
    } else if (data) {
      const municipios = data.municipios_interesse || [];

      setPreferencias({
        receber_no_site: data.receber_no_site,
        receber_por_email: data.receber_por_email,
        municipios_interesse: municipios,
      });

      setTextoMunicipios(municipios.join(", "));
    } else {
      setErroPreferencias("Não encontramos suas preferências de notificação. Entre em contato com a administração.");
    }

    setCarregandoPreferencias(false);
  }

  useEffect(() => {
    if (!usuario) return;

    carregarNotificacoes(true);
    carregarPreferencias();
  }, [usuario]);

  // Escuta novas notificações no Supabase em tempo real.
  useEffect(() => {
    if (!usuario) return;

    const canal = supabase
      .channel(`notificacoes-usuario-${usuario.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes_usuarios",
          filter: `usuario_id=eq.${usuario.id}`,
        },
        (payload) => {
          const nova = payload.new;

          setNotificacoes((atuais) => {
            if (atuais.some((item) => item.id === nova.id)) {
              return atuais;
            }

            return [nova, ...atuais].slice(0, 100);
          });

          if (!nova.lida) {
            setNotificacaoPopup(nova);
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Não foi possível conectar ao canal de notificações em tempo real.");
        }
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuario]);

  function atualizarPreferencia(campo, valor) {
    setPreferencias((atual) => ({ ...atual, [campo]: valor }));
    setMensagemPreferencias("");
  }

  async function salvarPreferencias(event) {
    event.preventDefault();
    if (!usuario) return;

    setSalvandoPreferencias(true);
    setErroPreferencias("");
    setMensagemPreferencias("");

    const municipios = [
      ...new Set(
        textoMunicipios
          .split(",")
          .map((municipio) => municipio.trim())
          .filter(Boolean)
      ),
    ];

    const { error } = await supabase
      .from("preferencias_notificacoes")
      .update({
        receber_no_site: preferencias.receber_no_site,
        receber_por_email: preferencias.receber_por_email,
        municipios_interesse: municipios,
        atualizado_em: new Date().toISOString(),
      })
      .eq("usuario_id", usuario.id);

    if (error) {
      console.error("Erro ao salvar preferências:", error);
      setErroPreferencias("Não foi possível salvar suas preferências. Verifique sua conexão e tente novamente.");
    } else {
      setPreferencias((atual) => ({ ...atual, municipios_interesse: municipios }));
      setTextoMunicipios(municipios.join(", "));
      setMensagemPreferencias("Suas preferências foram salvas com sucesso!");
    }

    setSalvandoPreferencias(false);
  }

  // Atualiza o e-mail da conta autenticada.
  async function alterarEmail(event) {
    event.preventDefault();

    setErroEmail("");
    setMensagemEmail("");

    if (!usuario) {
      setErroEmail("Não foi possível identificar sua conta. Entre novamente.");
      return;
    }

    const email = novoEmail.trim().toLowerCase();
    const confirmacao = confirmarEmail.trim().toLowerCase();

    if (!email || !confirmacao) {
      setErroEmail("Preencha os dois campos de e-mail.");
      return;
    }

    if (email !== confirmacao) {
      setErroEmail("Os e-mails informados não são iguais.");
      return;
    }

    if (email === usuario.email?.toLowerCase()) {
      setErroEmail("O novo e-mail precisa ser diferente do e-mail atual.");
      return;
    }

    setSalvandoEmail(true);

    const { data, error } = await supabase.auth.updateUser({
      email,
    });

    if (error) {
      console.error("Erro ao alterar e-mail:", error);
      setErroEmail(error.message || "Não foi possível solicitar a alteração do e-mail.");
    } else {
      setMensagemEmail(
        "Solicitação realizada! Verifique sua caixa de entrada do novo endereço e siga as instruções de confirmação do Supabase. Dependendo das configurações de segurança, poderá ser necessária uma confirmação também no e-mail atual."
      );
      setNovoEmail("");
      setConfirmarEmail("");

      if (data?.user) {
        setUsuario(data.user);
      }
    }

    setSalvandoEmail(false);
  }

  // Atualiza a senha pelo sistema de autenticação do Supabase.
  async function alterarSenha(event) {
    event.preventDefault();

    setErroSenha("");
    setMensagemSenha("");

    if (!usuario) {
      setErroSenha("Não foi possível identificar sua conta. Entre novamente.");
      return;
    }

    if (novaSenha.length < 8) {
      setErroSenha("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErroSenha("As senhas informadas não são iguais.");
      return;
    }

    setSalvandoSenha(true);

    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      console.error("Erro ao alterar senha:", error);
      setErroSenha(error.message || "Não foi possível alterar sua senha.");
    } else {
      setMensagemSenha("Sua senha foi alterada com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
    }

    setSalvandoSenha(false);
  }

  async function marcarComoLida(notificacao) {
    if (!usuario || notificacao.lida) return;

    const agora = new Date().toISOString();

    const { error } = await supabase
      .from("notificacoes_usuarios")
      .update({ lida: true, lida_em: agora })
      .eq("id", notificacao.id)
      .eq("usuario_id", usuario.id);

    if (error) {
      console.error("Erro ao marcar notificação:", error);
      setErroNotificacoes("Não foi possível atualizar a notificação.");
      return;
    }

    setNotificacoes((atuais) =>
      atuais.map((item) =>
        item.id === notificacao.id
          ? { ...item, lida: true, lida_em: agora }
          : item
      )
    );

    if (notificacaoPopup?.id === notificacao.id) {
      setNotificacaoPopup(null);
    }
  }

  async function marcarTodasComoLidas() {
    if (!usuario || notificacoesNaoLidas === 0) return;

    setMarcandoTodas(true);
    setErroNotificacoes("");

    const agora = new Date().toISOString();

    const { error } = await supabase
      .from("notificacoes_usuarios")
      .update({ lida: true, lida_em: agora })
      .eq("usuario_id", usuario.id)
      .eq("lida", false);

    if (error) {
      console.error("Erro ao marcar todas como lidas:", error);
      setErroNotificacoes("Não foi possível marcar todas as notificações como lidas.");
    } else {
      setNotificacoes((atuais) =>
        atuais.map((item) => ({ ...item, lida: true, lida_em: agora }))
      );
      setNotificacaoPopup(null);
    }

    setMarcandoTodas(false);
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const secao = secoes.find((item) => item.id === secaoAtiva);

  const notificacoesNaoLidas = notificacoes.filter(
    (notificacao) => !notificacao.lida
  ).length;

  const doencasFiltradas = useMemo(
    () => doencas.filter((doenca) => normalizar(doenca.nome).includes(normalizar(buscaDoenca))),
    [doencas, buscaDoenca]
  );

  const doencasPorPilar = useMemo(() => {
    if (!["humana", "animal", "ambiental"].includes(secaoAtiva)) return [];

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
        (!filtros.dataInicial || registro.data_referencia >= filtros.dataInicial) &&
        (!filtros.dataFinal || registro.data_referencia <= filtros.dataFinal);

      const pilaresDoenca = registro.doenca?.pilares || [];
      const pilarCorresponde =
        !filtros.pilar ||
        pilaresDoenca.some((pilar) => normalizar(pilar).includes(normalizar(filtros.pilar)));

      const atingidos = registro.doenca?.atinge || [];
      const atingidoCorresponde =
        !filtros.atingido ||
        atingidos.some((item) => {
          const valor = normalizar(item);

          if (filtros.atingido === "humanos") {
            return valor.includes("humano") || valor.includes("pessoa") || valor.includes("ambos");
          }

          if (filtros.atingido === "animais") {
            return valor.includes("animal") || valor.includes("cao") || valor.includes("gato") || valor.includes("ambos");
          }

          return false;
        });

      const tipoCorresponde = !filtros.tipo || registro.tipo_registro === filtros.tipo;
      const alertaCorresponde = filtros.alerta === "todos" || registro.nivel_alerta === filtros.alerta;

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

  const quantidadeFiltrosAtivos = Object.entries(filtros).filter(
    ([campo, valor]) => campo === "alerta" ? valor !== "todos" : Boolean(valor)
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

      {/* AVISO FLUTUANTE DE NOVA NOTIFICAÇÃO */}
      {notificacaoPopup && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[9999] w-[calc(100%-2.5rem)] max-w-md animate-in slide-in-from-bottom-5 rounded-2xl border border-teal-200 bg-white p-5 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-2xl">
              🔔
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                    Nova notificação
                  </p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    {notificacaoPopup.titulo}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setNotificacaoPopup(null)}
                  aria-label="Fechar aviso"
                  className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ×
                </button>
              </div>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {notificacaoPopup.mensagem}
              </p>

              {notificacaoPopup.municipio && (
                <p className="mt-2 text-xs text-slate-500">
                  <strong>Local:</strong> {notificacaoPopup.municipio}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSecaoAtiva("notificacoes");
                    setNotificacaoPopup(null);
                  }}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Ver notificações
                </button>

                <button
                  type="button"
                  onClick={() => setNotificacaoPopup(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <aside className="flex w-full shrink-0 flex-col bg-[#102b49] p-5 text-white md:min-h-screen md:w-64">
        <h1 className="text-xl font-bold">
          Observatório
          <span className="block text-sm font-medium text-teal-300">Saúde Única</span>
        </h1>

        <p className="mb-5 mt-2 text-xs text-slate-300">One Health Observatory</p>
        <div className="my-4 border-t border-slate-600" />

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-1 md:flex-col">
          {secoes.map((item) => (
            <button
              key={item.id}
              onClick={() => setSecaoAtiva(item.id)}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm ${
                secaoAtiva === item.id ? "bg-teal-600 text-white" : "text-white hover:bg-slate-700"
              }`}
            >
              <span className="flex items-center gap-3">
                <span>{item.icone}</span>
                {item.nome}
              </span>

              {item.id === "notificacoes" && notificacoesNaoLidas > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
                  {notificacoesNaoLidas > 99 ? "99+" : notificacoesNaoLidas}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-6 border-t border-slate-600 pt-4">
          <p className="mb-3 break-all text-xs text-slate-300">{usuario?.email}</p>
          <button
            onClick={sair}
            className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-slate-200"
          >
            Sair da plataforma
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1 p-5 md:p-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-5">
          <div>
            <p className="text-sm text-slate-600">Observatório Saúde Única</p>
            <h2 className="mt-1 text-3xl font-bold">{secao?.nome}</h2>
          </div>

          <button
            onClick={() => setSecaoAtiva("notificacoes")}
            className="relative rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg shadow-sm hover:bg-slate-50"
            aria-label="Abrir notificações"
            title="Notificações"
          >
            🔔
            {notificacoesNaoLidas > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                {notificacoesNaoLidas > 99 ? "99+" : notificacoesNaoLidas}
              </span>
            )}
          </button>
        </header>

        {erroDados && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{erroDados}</div>
        )}

        {carregandoDados && (
          <p className="mb-6 text-sm text-slate-600">Atualizando informações do Observatório...</p>
        )}

        {/* VISÃO GERAL */}
        {secaoAtiva === "inicio" && (
          <div>
            <h3 className="text-xl font-bold">Bem-vindo ao Observatório!</h3>
            <p className="mt-2 text-slate-700">
              Consulte informações sobre saúde humana, animal e ambiental em um único ambiente.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-600">Doenças publicadas</p>
                <p className="mt-2 text-3xl font-bold text-[#102b49]">{doencas.length}</p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-600">Registros epidemiológicos</p>
                <p className="mt-2 text-3xl font-bold text-[#102b49]">{registros.length}</p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-600">Alertas publicados</p>
                <p className="mt-2 text-3xl font-bold text-[#102b49]">
                  {alertas.filter((a) => classificarAlerta(a) === "ativo").length}
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-600">Notificações não lidas</p>
                <p className="mt-2 text-3xl font-bold text-teal-700">{notificacoesNaoLidas}</p>
                <button onClick={() => setSecaoAtiva("notificacoes")} className="mt-3 text-sm font-semibold text-teal-700 hover:underline">
                  Consultar notificações
                </button>
              </article>
            </div>

            <h3 className="mb-4 mt-10 text-xl font-bold">Explore o Observatório</h3>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {secoes.filter((item) => item.id !== "inicio").map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSecaoAtiva(item.id)}
                  className="rounded-xl border border-slate-300 bg-white p-6 text-left shadow-sm hover:border-teal-600"
                >
                  <span className="text-2xl">{item.icone}</span>
                  <h3 className="mt-3 font-bold">{item.nome}</h3>
                  <p className="mt-2 text-sm text-slate-600">Acesse esta área do Observatório.</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DOENÇAS */}
        {secaoAtiva === "doencas" && (
          <div>
            <p className="mb-5 text-slate-700">Consulte o catálogo de doenças disponibilizadas pelo Observatório.</p>
            <input
              type="search"
              value={buscaDoenca}
              onChange={(e) => setBuscaDoenca(e.target.value)}
              placeholder="Pesquisar uma doença..."
              className={`${classeCampo} mb-6`}
            />
            <ListaDoencas lista={doencasFiltradas} vazia="Nenhuma doença publicada encontrada." />
          </div>
        )}

        {/* EPIDEMIOLOGIA */}
        {secaoAtiva === "epidemiologia" && (
          <div>
            <p className="mb-6 text-slate-700">
              Pesquise os registros epidemiológicos combinando doença, localização, período, pilar da Saúde Única, população atingida, tipo de registro e nível de alerta.
            </p>

            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Filtros de pesquisa</h3>
                  <p className="mt-1 text-sm text-slate-500">Combine os campos para refinar os resultados.</p>
                </div>
                <button type="button" onClick={limparFiltros} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  Limpar filtros
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <CampoFiltro titulo="Doença">
                  <select value={filtros.doenca} onChange={(e) => atualizarFiltro("doenca", e.target.value)} className={classeCampo}>
                    <option value="">Todas as doenças</option>
                    {doencas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </CampoFiltro>

                <CampoFiltro titulo="Município">
                  <input type="search" value={filtros.municipio} onChange={(e) => atualizarFiltro("municipio", e.target.value)} placeholder="Ex.: Salvador" className={classeCampo} />
                </CampoFiltro>

                <CampoFiltro titulo="Bairro ou localidade">
                  <input type="search" value={filtros.localidade} onChange={(e) => atualizarFiltro("localidade", e.target.value)} placeholder="Digite o bairro" className={classeCampo} />
                </CampoFiltro>

                <CampoFiltro titulo="Data inicial">
                  <input type="date" value={filtros.dataInicial} onChange={(e) => atualizarFiltro("dataInicial", e.target.value)} className={classeCampo} />
                </CampoFiltro>

                <CampoFiltro titulo="Data final">
                  <input type="date" value={filtros.dataFinal} min={filtros.dataInicial || undefined} onChange={(e) => atualizarFiltro("dataFinal", e.target.value)} className={classeCampo} />
                </CampoFiltro>

                <CampoFiltro titulo="Pilar da Saúde Única">
                  <select value={filtros.pilar} onChange={(e) => atualizarFiltro("pilar", e.target.value)} className={classeCampo}>
                    <option value="">Todos os pilares</option>
                    <option value="Saúde Humana">Saúde Humana</option>
                    <option value="Saúde Animal">Saúde Animal</option>
                    <option value="Saúde Ambiental">Saúde Ambiental</option>
                  </select>
                </CampoFiltro>

                <CampoFiltro titulo="População atingida">
                  <select value={filtros.atingido} onChange={(e) => atualizarFiltro("atingido", e.target.value)} className={classeCampo}>
                    <option value="">Todos os públicos</option>
                    <option value="humanos">Humanos</option>
                    <option value="animais">Animais</option>
                  </select>
                </CampoFiltro>

                <CampoFiltro titulo="Tipo de registro">
                  <select value={filtros.tipo} onChange={(e) => atualizarFiltro("tipo", e.target.value)} className={classeCampo}>
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
                  <select value={filtros.alerta} onChange={(e) => atualizarFiltro("alerta", e.target.value)} className={classeCampo}>
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
                <h3 className="text-lg font-bold text-slate-900">Resultados da pesquisa</h3>
                <p className="mt-1 text-sm text-slate-600">{registrosFiltrados.length} registro(s) encontrado(s)</p>
              </div>
              {quantidadeFiltrosAtivos > 0 && (
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
                  {quantidadeFiltrosAtivos} filtro(s) ativo(s)
                </span>
              )}
            </div>

            <ListaRegistros lista={registrosFiltrados} vazia="Nenhum registro encontrado com esses filtros." />
          </div>
        )}

        {/* PILARES DA SAÚDE ÚNICA */}
        {["humana", "animal", "ambiental"].includes(secaoAtiva) && (
          <div>
            <p className="mb-5 text-slate-700">Doenças relacionadas ao pilar {nomesPilares[secaoAtiva]}.</p>
            <input type="search" value={buscaDoenca} onChange={(e) => setBuscaDoenca(e.target.value)} placeholder="Pesquisar uma doença..." className={`${classeCampo} mb-6`} />
            <ListaDoencas lista={doencasPorPilar} vazia="Nenhuma doença publicada foi encontrada neste pilar." />
          </div>
        )}

        {/* ALERTAS */}
        {secaoAtiva === "alertas" && (
          <div>
            <p className="mb-5 text-slate-700">
              Consulte os alertas publicados pela administração do Observatório. Os níveis representam classificações atribuídas aos alertas e não significam, por si só, confirmação de surto.
            </p>
            <ListaAlertas lista={alertas} vazia="Não há alertas publicados no momento." />
          </div>
        )}

        {/* MAPA */}
        {secaoAtiva === "mapa" && <MapaEpidemiologico />}

        {/* BIBLIOTECA */}
        {secaoAtiva === "biblioteca" && <BibliotecaCientifica />}

        {/* CENTRAL DE NOTIFICAÇÕES */}
        {secaoAtiva === "notificacoes" && (
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Suas notificações</h3>
                <p className="mt-1 text-sm text-slate-600">Acompanhe os alertas enviados pelo Observatório.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => carregarNotificacoes(false)}
                  disabled={carregandoNotificacoes}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {carregandoNotificacoes ? "Atualizando..." : "↻ Atualizar"}
                </button>

                <button
                  onClick={marcarTodasComoLidas}
                  disabled={marcandoTodas || notificacoesNaoLidas === 0}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {marcandoTodas ? "Atualizando..." : "Marcar todas como lidas"}
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-600">Total de notificações</p>
                <p className="mt-2 text-3xl font-bold text-[#102b49]">{notificacoes.length}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-600">Não lidas</p>
                <p className="mt-2 text-3xl font-bold text-red-600">{notificacoesNaoLidas}</p>
              </article>
            </div>

            {erroNotificacoes && (
              <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{erroNotificacoes}</div>
            )}

            {carregandoNotificacoes ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600">Carregando suas notificações...</div>
            ) : notificacoes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <div className="text-4xl">🔔</div>
                <h3 className="mt-4 text-lg font-bold text-slate-800">Nenhuma notificação por enquanto</h3>
                <p className="mt-2 text-sm text-slate-600">Quando houver alertas destinados a você, eles aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notificacoes.map((notificacao) => (
                  <article key={notificacao.id} className={`rounded-xl border bg-white p-5 shadow-sm ${notificacao.lida ? "border-slate-200" : "border-teal-300 bg-teal-50/40"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">{notificacao.titulo}</h3>
                          {!notificacao.lida && <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-bold text-teal-800">NOVA</span>}
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{notificacao.mensagem}</p>
                      </div>

                      {notificacao.nivel_alerta && (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coresAlerta[notificacao.nivel_alerta] || coresAlerta.nao_avaliado}`}>
                          {nomesAlerta[notificacao.nivel_alerta] || notificacao.nivel_alerta}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                      <div className="text-xs text-slate-500">
                        <p><strong>Local:</strong> {notificacao.municipio || "Abrangência geral"}</p>
                        <p className="mt-1"><strong>Recebida em:</strong> {formatarDataHora(notificacao.criada_em)}</p>
                      </div>

                      {!notificacao.lida ? (
                        <button onClick={() => marcarComoLida(notificacao)} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                          Marcar como lida
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">✓ Lida</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MINHA CONTA */}
        {secaoAtiva === "minha-conta" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Minha conta</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Consulte seus dados de acesso e atualize seu e-mail ou sua senha.
                Essas alterações são realizadas na autenticação do Supabase.
              </p>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-2xl">👤</span>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Dados de acesso</h4>
                  <p className="text-sm text-slate-500">Informações vinculadas à sua conta.</p>
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  E-mail atual
                </label>
                <input
                  type="email"
                  value={usuario?.email || ""}
                  readOnly
                  className={`${classeCampo} bg-slate-100 text-slate-600`}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Este é o endereço utilizado atualmente para entrar na plataforma.
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h4 className="text-lg font-bold text-slate-900">✉️ Alterar e-mail</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Informe o novo endereço e confirme-o para solicitar a alteração.
                  O Supabase poderá enviar mensagens de confirmação para validar a mudança.
                </p>
              </div>

              <form onSubmit={alterarEmail} className="space-y-4">
                <div>
                  <label htmlFor="novo-email" className="mb-2 block text-sm font-semibold text-slate-700">
                    Novo e-mail
                  </label>
                  <input
                    id="novo-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={novoEmail}
                    onChange={(e) => {
                      setNovoEmail(e.target.value);
                      setErroEmail("");
                      setMensagemEmail("");
                    }}
                    placeholder="Digite seu novo e-mail"
                    className={classeCampo}
                  />
                </div>

                <div>
                  <label htmlFor="confirmar-email" className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirmar novo e-mail
                  </label>
                  <input
                    id="confirmar-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={confirmarEmail}
                    onChange={(e) => {
                      setConfirmarEmail(e.target.value);
                      setErroEmail("");
                      setMensagemEmail("");
                    }}
                    placeholder="Digite novamente seu novo e-mail"
                    className={classeCampo}
                  />
                </div>

                {erroEmail && (
                  <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                    {erroEmail}
                  </div>
                )}

                {mensagemEmail && (
                  <div role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm leading-6 text-green-800">
                    ✓ {mensagemEmail}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={salvandoEmail}
                  className="rounded-lg bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvandoEmail ? "Enviando solicitação..." : "Solicitar alteração de e-mail"}
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h4 className="text-lg font-bold text-slate-900">🔒 Alterar senha</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Crie uma nova senha para acessar sua conta. Recomendamos utilizar uma combinação
                  de letras, números e caracteres especiais.
                </p>
              </div>

              <form onSubmit={alterarSenha} className="space-y-4">
                <div>
                  <label htmlFor="nova-senha" className="mb-2 block text-sm font-semibold text-slate-700">
                    Nova senha
                  </label>
                  <input
                    id="nova-senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={novaSenha}
                    onChange={(e) => {
                      setNovaSenha(e.target.value);
                      setErroSenha("");
                      setMensagemSenha("");
                    }}
                    placeholder="Digite sua nova senha"
                    className={classeCampo}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Utilize pelo menos 8 caracteres.
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmar-senha" className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirmar-senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmarSenha}
                    onChange={(e) => {
                      setConfirmarSenha(e.target.value);
                      setErroSenha("");
                      setMensagemSenha("");
                    }}
                    placeholder="Digite novamente sua nova senha"
                    className={classeCampo}
                  />
                </div>

                {erroSenha && (
                  <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                    {erroSenha}
                  </div>
                )}

                {mensagemSenha && (
                  <div role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                    ✓ {mensagemSenha}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="rounded-lg bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvandoSenha ? "Atualizando senha..." : "Alterar minha senha"}
                </button>
              </form>
            </section>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h4 className="font-bold text-blue-900">Dica de segurança</h4>
              <p className="mt-2 text-sm leading-6 text-blue-900">
                Não compartilhe sua senha com outras pessoas. O Observatório não precisa
                que você informe sua senha por e-mail ou mensagem.
              </p>
            </div>
          </div>
        )}

        {/* DEFINIÇÕES */}
        {secaoAtiva === "definicoes" && (
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Definições</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gerencie as configurações da sua experiência no Observatório Saúde Única,
                incluindo os canais de notificação e os municípios que deseja acompanhar.
              </p>
            </div>

            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900">Minha conta e segurança</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Altere seu endereço de e-mail ou sua senha de acesso.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSecaoAtiva("minha-conta")}
                  className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                >
                  Gerenciar minha conta
                </button>
              </div>
            </section>

            <div className="mb-6">
              <h4 className="text-lg font-bold text-slate-900">Preferências de notificações</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Personalize como deseja receber os alertas epidemiológicos e as informações publicadas pelo Observatório Saúde Única.
              </p>
            </div>

            {carregandoPreferencias ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600">Carregando suas definições...</div>
            ) : (
              <form onSubmit={salvarPreferencias} className="space-y-6">
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900">Canais de recebimento</h4>
                  <p className="mt-2 text-sm text-slate-600">Escolha os canais pelos quais deseja receber as notificações.</p>

                  <label className="mt-6 flex cursor-pointer items-start gap-4 rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={preferencias.receber_no_site}
                      onChange={(e) => atualizarPreferencia("receber_no_site", e.target.checked)}
                      className="mt-1 h-5 w-5 accent-teal-700"
                    />
                    <span>
                      <strong className="block text-slate-900">🔔 Notificações no site</strong>
                      <span className="mt-1 block text-sm text-slate-600">
                        Receba avisos dentro da sua conta no Observatório. As notificações permanecerão disponíveis até serem marcadas como lidas.
                      </span>
                    </span>
                  </label>

                  <label className="mt-3 flex cursor-pointer items-start gap-4 rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={preferencias.receber_por_email}
                      onChange={(e) => atualizarPreferencia("receber_por_email", e.target.checked)}
                      className="mt-1 h-5 w-5 accent-teal-700"
                    />
                    <span>
                      <strong className="block text-slate-900">✉️ Notificações por e-mail</strong>
                      <span className="mt-1 block text-sm text-slate-600">
                        Autorize o recebimento de avisos no endereço de e-mail vinculado à sua conta.
                      </span>
                    </span>
                  </label>

                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <strong>Importante:</strong> a opção de e-mail ainda depende da integração de um serviço de envio no backend. Salvar esta preferência não envia mensagens por si só.
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900">Municípios de interesse</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Informe os municípios que deseja acompanhar. Você pode adicionar vários, separando os nomes por vírgulas. Os alertas municipais serão direcionados conforme os municípios cadastrados.
                  </p>

                  <label htmlFor="municipios-interesse" className="mb-2 mt-5 block text-sm font-semibold text-slate-700">
                    Seus municípios
                  </label>

                  <textarea
                    id="municipios-interesse"
                    value={textoMunicipios}
                    onChange={(e) => {
                      setTextoMunicipios(e.target.value);
                      setMensagemPreferencias("");
                    }}
                    rows={4}
                    placeholder="Ex.: Salvador, Madre de Deus, Candeias"
                    className={classeCampo}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Separe os municípios por vírgula. Utilize os nomes conforme aparecem nos alertas publicados pelo Observatório.
                  </p>

                  {preferencias.municipios_interesse.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {preferencias.municipios_interesse.map((municipio, indice) => (
                        <span key={`${municipio}-${indice}`} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
                          {municipio}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                {erroPreferencias && (
                  <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{erroPreferencias}</div>
                )}

                {mensagemPreferencias && (
                  <div role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">✓ {mensagemPreferencias}</div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={salvandoPreferencias} className="rounded-lg bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {salvandoPreferencias ? "Salvando..." : "Salvar definições"}
                  </button>

                  <button type="button" onClick={carregarPreferencias} disabled={salvandoPreferencias} className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                    Restaurar dados salvos
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <footer className="mt-12 border-t border-slate-300 pt-5 text-xs leading-5 text-slate-500">
          As informações exibidas dependem dos dados publicados e das fontes cadastradas. Registros demonstrativos não representam ocorrências reais. O Observatório não substitui os sistemas oficiais de vigilância em saúde.
        </footer>
      </section>
    </main>
  );
}
