
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function UsuariosAdminPage() {
  const router = useRouter();

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [processando, setProcessando] = useState("");

  async function carregarUsuarios() {
    setCarregando(true);
    setErro("");

    const { data: { user }, error: erroLogin } =
      await supabase.auth.getUser();

    if (erroLogin || !user) {
      router.replace("/login");
      return;
    }

    const { data: superAdmin, error: erroNivel } =
      await supabase.rpc("eh_superadministrador");

    if (erroNivel || superAdmin !== true) {
      setErro("Acesso exclusivo ao superadministrador.");
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase.rpc(
      "listar_usuarios_administracao"
    );

    if (error) {
      setErro("Não foi possível carregar os usuários: " + error.message);
      setCarregando(false);
      return;
    }

    setUsuarios(data || []);
    setCarregando(false);
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function alterarNivel(usuario) {
    const promovendo = usuario.nivel === "usuario";

    const acao = promovendo ? "promover" : "rebaixar";

    const confirmacao = window.confirm(
      promovendo
        ? `Deseja promover ${usuario.nome_completo || usuario.email} a administrador?`
        : `Deseja remover o acesso administrativo de ${usuario.nome_completo || usuario.email} e torná-lo usuário comum?`
    );

    if (!confirmacao) return;

    setProcessando(usuario.id);
    setMensagem("");
    setErro("");

    const { error } = await supabase.rpc(
      "gerenciar_nivel_administrativo",
      {
        p_usuario_id: usuario.id,
        p_acao: acao,
      }
    );

    if (error) {
      setErro("Não foi possível alterar o acesso: " + error.message);
      setProcessando("");
      return;
    }

    setMensagem("Nível de acesso atualizado com sucesso!");
    setProcessando("");
    await carregarUsuarios();
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-800">
        Carregando usuários...
      </main>
    );
  }

  if (erro && usuarios.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-800">
        <h1 className="text-2xl font-bold text-red-700">
          Acesso não autorizado
        </h1>

        <p className="mt-3">{erro}</p>

        <button
          onClick={() => router.push("/admin")}
          className="mt-6 rounded-lg bg-[#102b49] px-5 py-3 text-white"
        >
          Voltar ao painel
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#102b49] px-6 py-7 text-white">
        <p className="text-sm font-semibold text-teal-300">
          OBSERVATÓRIO SAÚDE ÚNICA
        </p>

        <h1 className="mt-2 text-2xl font-bold">
          Gerenciamento de Usuários
        </h1>

        <p className="mt-2 text-sm text-slate-200">
          Administração de contas e níveis de acesso.
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold"
        >
          ← Voltar ao painel
        </button>

        <div className="mb-6 rounded-xl border border-teal-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Total de contas cadastradas
          </p>

          <p className="mt-1 text-3xl font-bold text-[#102b49]">
            {usuarios.length}
          </p>
        </div>

        {mensagem && (
          <div className="mb-5 rounded-lg bg-green-100 p-4 text-green-800">
            {mensagem}
          </div>
        )}

        {erro && (
          <div className="mb-5 rounded-lg bg-red-100 p-4 text-red-800">
            {erro}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-[#102b49] text-white">
              <tr>
                <th className="p-4">Usuário</th>
                <th className="p-4">Perfil</th>
                <th className="p-4">Nível de acesso</th>
                <th className="p-4">Cadastro</th>
                <th className="p-4">Ação</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-t">
                  <td className="p-4">
                    <p className="font-semibold">
                      {usuario.nome_completo || "Nome não informado"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {usuario.email}
                    </p>
                  </td>

                  <td className="p-4">
                    {usuario.tipo_perfil}
                  </td>

                  <td className="p-4">
                    {usuario.nivel === "superadministrador" ? (
                      <span className="font-bold text-purple-700">
                        👑 Superadministrador
                      </span>
                    ) : usuario.nivel === "administrador" ? (
                      <span className="font-semibold text-blue-700">
                        Administrador
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        Usuário comum
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    {usuario.criado_em
                      ? new Date(usuario.criado_em).toLocaleDateString("pt-BR")
                      : "Não informado"}
                  </td>

                  <td className="p-4">
                    {usuario.nivel === "superadministrador" ? (
                      <span className="text-xs font-semibold text-purple-700">
                        Conta protegida
                      </span>
                    ) : (
                      <button
                        disabled={processando === usuario.id}
                        onClick={() => alterarNivel(usuario)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                          usuario.nivel === "administrador"
                            ? "bg-red-700 hover:bg-red-800"
                            : "bg-teal-700 hover:bg-teal-800"
                        }`}
                      >
                        {processando === usuario.id
                          ? "Aguarde..."
                          : usuario.nivel === "administrador"
                          ? "Remover acesso administrativo"
                          : "Promover a administrador"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {usuarios.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}