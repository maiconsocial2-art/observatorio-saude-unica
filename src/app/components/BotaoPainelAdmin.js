
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function BotaoPainelAdmin() {
  const router = useRouter();
  const [ehAdministrador, setEhAdministrador] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function verificarAdministrador() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          if (ativo) {
            setEhAdministrador(false);
            setVerificando(false);
          }
          return;
        }

        const { data, error: erroAdmin } = await supabase
          .from("administradores")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (ativo) {
          setEhAdministrador(!erroAdmin && Boolean(data));
          setVerificando(false);
        }
      } catch (erro) {
        console.error("Erro ao verificar administrador:", erro);

        if (ativo) {
          setEhAdministrador(false);
          setVerificando(false);
        }
      }
    }

    verificarAdministrador();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      verificarAdministrador();
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  if (verificando || !ehAdministrador) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/admin")}
      title="Acessar painel administrativo"
      className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 rounded-full bg-[#102b49] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-teal-700 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-teal-200"
    >
      <span className="text-lg">⚙</span>
      <span>Painel administrativo</span>
    </button>
  );
}