import Link from 'next/link';
export function ModuleHeader({ title }: { title: string }) {
  return <><header className="event-header"><div><p className="eyebrow">MARCA AH PRODUÇÕES</p><h1>{title}</h1></div><Link href="/">← Visão geral</Link></header>
    <nav className="module-nav" aria-label="Áreas de produção">{[['/eventos','Eventos'],['/agenda','Agenda'],['/materiais','Materiais'],['/tarefas','Ações e responsáveis'],['/fornecedores','Fornecedores']].map(([href,label]) => <Link key={href} href={href} aria-current={title === label ? 'page' : undefined}>{label}</Link>)}</nav></>;
}
