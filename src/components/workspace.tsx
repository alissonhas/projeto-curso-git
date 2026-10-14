'use client';
import { useState } from 'react';
import Image from 'next/image';
import { sections, type Section } from '@/lib/navigation';
export function Workspace({ configurationStatus }: { configurationStatus: 'missing' | 'invalid' | 'configured' }) {
  const [active, setActive] = useState<Section>('inicio');
  const [menuOpen, setMenuOpen] = useState(false);
  const selected = sections.find(section => section.slug === active)!;
  function navigate(section: Section) { setActive(section); setMenuOpen(false); }
  return <div className="workspace">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <aside className="sidebar">
      <a href="/" className="brand" aria-label="Marca AH Produções — início"><Image className="brand-logo" src="/logo-ah.png" alt="Logo AH Produções" width={52} height={52} priority /><span>MARCA AH<small>PRODUÇÕES</small></span></a>
      <button className="menu-button" aria-expanded={menuOpen} aria-controls="navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Fechar menu' : 'Abrir menu'}</button>
      <nav id="navigation" aria-label="Navegação principal" className={menuOpen ? 'navigation open' : 'navigation'}>
        <p className="nav-caption">SEU ESPAÇO</p>
        {sections.map(section => <button key={section.slug} aria-current={active === section.slug ? 'page' : undefined} onClick={() => navigate(section.slug)}><span aria-hidden="true">{section.symbol}</span>{section.label}</button>)}
      </nav>
      <div className="sidebar-footer"><span className="avatar">AH</span><div>Espaço pessoal<small>Acesso privado em preparação</small></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><span>Organização que dá palco às suas ideias.</span><span className="version">FUNDAÇÃO · V0.1</span></header>
      <main id="conteudo" tabIndex={-1}>
        <div className="eyebrow">MARCA AH PRODUÇÕES / {selected.label.toLocaleUpperCase('pt-BR')}</div>
        <div className="page-heading"><div><h1>{active === 'inicio' ? 'Tudo começa com uma boa organização.' : selected.label}</h1><p>{active === 'inicio' ? 'Um espaço para planejar, acompanhar e fazer acontecer.' : 'Este módulo será desenvolvido em uma próxima entrega.'}</p></div><span className="foundation-badge">Base inicial</span></div>
        {active === 'inicio' ? <>
          <section className="hero" aria-labelledby="hero-title"><div><span className="eyebrow">DO PRIMEIRO RASCUNHO AO GRANDE DIA</span><h2 id="hero-title">Mais clareza.<br/>Mais espaço para criar.</h2><p>Eventos, compromissos e recursos conectados em um só lugar. Sua próxima produção começa aqui.</p><button onClick={() => navigate('eventos')}>Conhecer o espaço de eventos <span aria-hidden="true">↗</span></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><Image className="hero-logo" src="/logo-ah.png" alt="" width={220} height={220} priority /><small>IDEIAS EM MOVIMENTO</small></div></section>
          <section aria-labelledby="areas-title" className="areas"><div className="section-heading"><h2 id="areas-title">Seu trabalho, por área</h2><span>Uma base para crescer com você</span></div><div className="card-grid">{sections.filter(section => section.slug !== 'inicio').map(section => <button className="area-card" key={section.slug} onClick={() => navigate(section.slug)}><span className="card-icon" aria-hidden="true">{section.symbol}</span><span className="card-title">{section.label}<span aria-hidden="true">↗</span></span><span className="card-description">{({ eventos: 'Planejamento de cada produção.', agenda: 'Compromissos e datas importantes.', tarefas: 'Próximos passos com foco.', materiais: 'Recursos para cada evento.', contatos: 'Pessoas que fazem acontecer.', despesas: 'Despesas realizadas, separadas das estimativas.' })[section.slug]}</span><span className="card-status">Em preparação</span></button>)}</div></section>
        </> : <section className="empty-state"><span className="empty-icon" aria-hidden="true">{selected.symbol}</span><h2>Um espaço para {selected.label.toLocaleLowerCase('pt-BR')}</h2><p>A navegação está pronta. O cadastro e a consulta de dados ainda não estão disponíveis.</p><button onClick={() => navigate('inicio')}>Voltar à visão geral</button></section>}
        <section className="setup-notice" aria-label="Estado da configuração"><span aria-hidden="true">ⓘ</span><div><strong>Fundação em desenvolvimento</strong><p>{configurationStatus === 'missing' ? 'Supabase ainda não configurado.' : configurationStatus === 'invalid' ? 'Revise as variáveis públicas do Supabase.' : 'Variáveis públicas presentes; conexão e autenticação ainda não validadas.'} Autenticação, armazenamento de dados, instalação PWA e sincronização offline serão entregues nas próximas etapas. Não insira informações privadas nesta versão.</p></div></section>
        <footer>MARCA AH PRODUÇÕES<span>Planejar. Produzir. Realizar.</span></footer>
      </main>
    </div>
  </div>;
}
