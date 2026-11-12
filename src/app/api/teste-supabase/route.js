export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const resposta = await fetch(`${url}/auth/v1/health`, {
      headers: {
        apikey: chave,
      },
    });

    return Response.json({
      conectado: resposta.ok,
      status: resposta.status,
      mensagem: resposta.ok
        ? "Supabase conectado com sucesso!"
        : "Não foi possível confirmar a conexão.",
    });
  } catch (erro) {
    return Response.json({
      conectado: false,
      mensagem: erro.message,
    }, { status: 500 });
  }
}