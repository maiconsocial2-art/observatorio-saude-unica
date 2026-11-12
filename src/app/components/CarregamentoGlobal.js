
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function CarregamentoGlobal() {
  const pathname = usePathname();

  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    setCarregando(true);

    const timer = setTimeout(() => {
      setCarregando(false);
    }, 900);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!carregando) return null;

  return (
    <div
      className="tela-carregamento"
      role="status"
      aria-live="polite"
      aria-label="Carregando Observatório Saúde Única"
    >
      {/* Folhas caindo pela tela */}
      <div className="folhas-container" aria-hidden="true">
        <span className="folha folha-1">🌿</span>
        <span className="folha folha-2">🍃</span>
        <span className="folha folha-3">🌱</span>
        <span className="folha folha-4">🍃</span>
        <span className="folha folha-5">🌿</span>
        <span className="folha folha-6">🍀</span>
        <span className="folha folha-7">🌱</span>
      </div>

      {/* Conteúdo central */}
      <div className="conteudo-carregamento">
        <div className="simbolo-carregamento">
          <span aria-hidden="true">🌿</span>
        </div>

        <h1>Observatório Saúde Única</h1>

        <p>
          Conectando saúde, vida e ambiente...
        </p>

        <div
          className="barra-carregamento"
          aria-hidden="true"
        >
          <div className="barra-progresso" />
        </div>

        <span className="texto-carregamento">
          PREPARANDO INFORMAÇÕES
        </span>
      </div>
    </div>
  );
}