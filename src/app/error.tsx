'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="auth-shell"><section className="auth-card"><h1>Não foi possível carregar o espaço.</h1><p>Confira sua conexão e tente novamente. Nenhum dado foi apresentado sem validar seu acesso.</p><button onClick={reset}>Tentar novamente</button><a href="/login">Voltar ao login</a></section></main>;
}
