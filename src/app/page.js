
import AvatarMenu from "./components/AvatarMenu.js";

const pilares = [
  {
    numero: "01",
    nome: "Saúde Humana",
    descricao:
      "Acompanhamento de doenças, agravos e indicadores relacionados à saúde das pessoas.",
    simbolo: "✚",
    destino: "/plataforma?secao=humana",
  },
  {
    numero: "02",
    nome: "Saúde Animal",
    descricao:
      "Informações sobre zoonoses, animais domésticos, silvestres e saúde animal.",
    simbolo: "⌁",
    destino: "/plataforma?secao=animal",
  },
  {
    numero: "03",
    nome: "Saúde Ambiental",
    descricao:
      "Monitoramento de fatores ambientais que podem afetar a saúde dos seres vivos.",
    simbolo: "◉",
    destino: "/plataforma?secao=ambiental",
  },
];

const servicos = [
  {
    numero: "01",
    titulo: "Mapa epidemiológico",
    descricao:
      "Visualize informações territoriais e classificações de alerta por localidade.",
    simbolo: "⌖",
    destino: "/plataforma?secao=mapa",
  },
  {
    numero: "02",
    titulo: "Consulta de doenças",
    descricao:
      "Conheça doenças e suas relações com humanos, animais e meio ambiente.",
    simbolo: "⌕",
    destino: "/plataforma?secao=doencas",
  },
  {
    numero: "03",
    titulo: "Central de alertas",
    descricao:
      "Acompanhe alertas e orientações relacionados à saúde pública.",
    simbolo: "!",
    destino: "/plataforma?secao=alertas",
  },
  {
    numero: "04",
    titulo: "Biblioteca educativa",
    descricao:
      "Acesse artigos, materiais científicos, campanhas e conteúdos informativos.",
    simbolo: "▤",
    destino: "/plataforma?secao=biblioteca",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* MENU PRINCIPAL */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <a href="#inicio" className="flex shrink-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#102b49] text-2xl font-bold text-white">
              ✚
            </div>

            <div>
              <h1 className="text-base font-black tracking-tight text-[#102b49]">
                OBSERVATÓRIO
              </h1>
              <p className="text-[9px] font-bold tracking-[0.18em] text-teal-700">
                SAÚDE ÚNICA | ONE HEALTH
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-700 xl:flex">
            <a href="#inicio" className="hover:text-teal-700">Início</a>
            <a href="#sobre" className="hover:text-teal-700">Institucional</a>
            <a href="#pilares" className="hover:text-teal-700">Saúde Única</a>
            <a href="#servicos" className="hover:text-teal-700">Explorar</a>
            <a href="#doencas" className="hover:text-teal-700">Doenças</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#servicos"
              className="hidden rounded-lg bg-[#102b49] px-4 py-3 text-xs font-bold text-white transition hover:bg-teal-700 sm:block"
            >
              Explorar portal
            </a>
            <AvatarMenu />
          </div>
        </div>
      </header>

      {/* APRESENTAÇÃO */}
      <section
        id="inicio"
        className="relative overflow-hidden bg-[#102b49] text-white"
      >
        <div className="pointer-events-none absolute -right-32 -top-32 h-[550px] w-[550px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 top-10 h-[350px] w-[350px] rounded-full border border-white/10" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-32">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-300">
              Ciência • Vigilância • Prevenção
            </p>

            <h2 className="mt-7 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Uma só saúde. Um olhar integrado sobre o nosso planeta.
            </h2>

            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-200">
              Conectamos informações sobre saúde humana, animal e ambiental
              para ampliar o conhecimento, fortalecer a prevenção e contribuir
              para a vigilância em saúde pública.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#servicos"
                className="rounded-lg bg-teal-400 px-7 py-4 text-sm font-bold text-[#102b49] transition hover:bg-teal-300"
              >
                Explorar o Observatório →
              </a>

              <a
                href="#sobre"
                className="rounded-lg border border-white/60 px-7 py-4 text-sm font-bold text-white transition hover:bg-white hover:text-[#102b49]"
              >
                Conhecer o projeto
              </a>
            </div>

            <p className="mt-8 text-xs text-slate-300">
              Atuação inicial: Salvador e Região Metropolitana, Bahia.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/5 p-8 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
              Abordagem One Health
            </p>

            <h3 className="mt-4 text-2xl font-bold">
              Tudo está conectado.
            </h3>

            <div className="mt-8 space-y-5">
              {pilares.map((pilar) => (
                <div
                  key={pilar.numero}
                  className="flex items-center gap-5 border-b border-white/15 pb-5 last:border-0"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-400 text-xl font-bold text-[#102b49]">
                    {pilar.simbolo}
                  </span>

                  <div>
                    <p className="text-sm font-bold tracking-wide">
                      {pilar.nome}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {pilar.descricao}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-white p-4 text-center text-sm font-bold text-[#102b49]">
              Três dimensões interdependentes. Uma só saúde.
            </div>
          </div>
        </div>
      </section>

      {/* APRESENTAÇÃO DO PROJETO */}
      <section id="sobre" className="border-b border-slate-200 bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
              Conheça o Observatório
            </p>

            <h2 className="mt-4 text-3xl font-black leading-tight text-[#102b49] md:text-4xl">
              Informação científica a serviço da saúde coletiva.
            </h2>
          </div>

          <div>
            <p className="text-lg leading-relaxed text-slate-600">
              O Observatório Saúde Única é um projeto de informação,
              educação e vigilância integrada. Sua proposta é reunir e
              organizar conhecimentos sobre doenças, agentes infecciosos,
              hospedeiros e fatores ambientais.
            </p>

            <p className="mt-5 leading-relaxed text-slate-600">
              A iniciativa busca facilitar o acesso à informação e contribuir
              para a compreensão das relações entre pessoas, animais e
              ecossistemas.
            </p>
          </div>
        </div>
      </section>

      {/* PILARES */}
      <section id="pilares" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
            Integração multidisciplinar
          </p>

          <h2 className="mt-4 text-3xl font-black text-[#102b49]">
            Os três pilares da Saúde Única
          </h2>

          <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
            A saúde de cada ser vivo está relacionada às condições do ambiente
            em que vive e às interações que estabelece.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pilares.map((pilar) => (
              <a
                key={pilar.numero}
                href={pilar.destino}
                className="group block rounded-2xl border border-slate-200 bg-white p-8 transition hover:-translate-y-1 hover:border-teal-500 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-light text-teal-700">
                    {pilar.simbolo}
                  </span>
                  <span className="text-sm font-bold text-slate-400">
                    {pilar.numero}
                  </span>
                </div>

                <h3 className="mt-8 text-xl font-extrabold text-[#102b49]">
                  {pilar.nome}
                </h3>

                <p className="mt-4 leading-relaxed text-slate-600">
                  {pilar.descricao}
                </p>

                <p className="mt-6 text-sm font-bold text-teal-700">
                  Acessar seção →
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
            Explore a plataforma
          </p>

          <h2 className="mt-4 text-3xl font-black text-[#102b49]">
            Conhecimento ao alcance de todos.
          </h2>

          <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
            Conheça as áreas de informação e os recursos que fazem parte da
            proposta do Observatório.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {servicos.map((servico) => (
              <a
                key={servico.numero}
                href={servico.destino}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-teal-500 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-2xl font-bold text-teal-700 transition group-hover:bg-teal-600 group-hover:text-white">
                    {servico.simbolo}
                  </span>

                  <span className="text-xs font-bold text-slate-400">
                    {servico.numero}
                  </span>
                </div>

                <h3 className="mt-7 text-lg font-bold text-[#102b49]">
                  {servico.titulo}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {servico.descricao}
                </p>

                <p className="mt-6 text-sm font-bold text-teal-700">
                  Conhecer recurso →
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* MAPA */}
      <section id="mapa" className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
              Vigilância territorial
            </p>

            <h2 className="mt-4 text-3xl font-black text-[#102b49]">
              Mapa epidemiológico
            </h2>

            <p className="mt-5 leading-relaxed text-slate-600">
              Uma ferramenta para acompanhar informações epidemiológicas e
              classificações de alerta por bairro, contribuindo para a
              compreensão dos riscos e das condições de saúde no território.
            </p>

            <p className="mt-4 text-sm text-slate-500">
              Área de consulta pública em desenvolvimento.
            </p>
          </div>

          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="text-5xl text-teal-700">⌖</span>
            <h3 className="mt-4 text-xl font-bold text-[#102b49]">
              Salvador e Região Metropolitana
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Visualização territorial integrada em desenvolvimento.
            </p>
          </div>
        </div>
      </section>

      {/* DOENÇAS */}
      <section id="doencas" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
            Base de conhecimento
          </p>

          <h2 className="mt-4 text-3xl font-black text-[#102b49]">
            Consulta de doenças
          </h2>

          <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
            Pesquise doenças de interesse epidemiológico e conheça suas
            relações com a saúde humana, animal e ambiental.
          </p>

          <div className="mt-9 rounded-2xl border border-slate-200 bg-slate-50 p-7">
            <label htmlFor="busca" className="text-sm font-bold text-[#102b49]">
              Pesquisar doença ou agravo
            </label>

            <input
              id="busca"
              type="search"
              placeholder="A consulta ao catálogo será disponibilizada em breve..."
              disabled
              className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-100 px-5 py-4 text-slate-500 outline-none"
            />

            <p className="mt-4 text-xs text-slate-500">
              O catálogo público será conectado às doenças cadastradas e
              publicadas pela administração.
            </p>
          </div>
        </div>
      </section>

      {/* ALERTAS */}
      <section id="alertas" className="bg-[#102b49] py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
              Informação e prevenção
            </p>

            <h2 className="mt-4 text-3xl font-black">
              Central de alertas
            </h2>

            <p className="mt-4 max-w-2xl leading-relaxed text-slate-200">
              Consulte alertas e recomendações publicados pelo Observatório
              sobre riscos epidemiológicos, ambientais e de saúde pública.
            </p>

            <p className="mt-3 text-xs text-slate-300">
              Área pública em desenvolvimento.
            </p>
          </div>

          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-5xl text-teal-300">
            !
          </div>
        </div>
      </section>

      {/* CONTEÚDOS */}
      <section id="conteudos" className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
              Educação e conhecimento
            </p>

            <h2 className="mt-4 text-3xl font-black text-[#102b49]">
              Biblioteca de conteúdos
            </h2>

            <p className="mt-5 leading-relaxed text-slate-600">
              Um espaço destinado à divulgação de artigos científicos,
              materiais educativos, notícias, campanhas e histórias
              relacionadas à Saúde Única.
            </p>

            <p className="mt-4 text-sm text-slate-500">
              Biblioteca pública em desenvolvimento.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
            <div className="text-5xl text-teal-700">▤</div>
            <h3 className="mt-5 text-xl font-bold text-[#102b49]">
              Conhecimento que promove prevenção
            </h3>
            <p className="mt-3 leading-relaxed text-slate-600">
              Informação científica acessível para estudantes, profissionais
              e toda a comunidade.
            </p>
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="bg-[#102b49] px-6 py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2">
          <div>
            <p className="text-lg font-black">
              OBSERVATÓRIO SAÚDE ÚNICA
            </p>
            <p className="mt-2 text-sm text-teal-300">
              ONE HEALTH OBSERVATORY
            </p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">
              Informação, ciência e prevenção integradas para a saúde das
              pessoas, dos animais e do ambiente.
            </p>
          </div>

          <div>
            <p className="font-bold">Navegação</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
              <a href="#sobre" className="hover:text-teal-300">Institucional</a>
              <a href="#pilares" className="hover:text-teal-300">Saúde Única</a>
              <a href="#mapa" className="hover:text-teal-300">Mapa epidemiológico</a>
              <a href="#doencas" className="hover:text-teal-300">Doenças</a>
              <a href="#alertas" className="hover:text-teal-300">Alertas</a>
              <a href="#conteudos" className="hover:text-teal-300">Conteúdos</a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-white/20 pt-6 text-center text-xs text-slate-300">
          <p>Projeto em desenvolvimento • Salvador, Bahia, Brasil</p>
          <p className="mt-2">
            As informações disponibilizadas deverão ser consultadas conforme
            suas fontes e datas de atualização.
          </p>
        </div>
      </footer>
    </main>
  );
}
