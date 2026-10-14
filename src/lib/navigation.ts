export const sections = [
  { slug: 'inicio', label: 'Visão geral', symbol: '◈' },
  { slug: 'eventos', label: 'Eventos', symbol: '◇' },
  { slug: 'agenda', label: 'Agenda', symbol: '▦' },
  { slug: 'tarefas', label: 'Tarefas', symbol: '✓' },
  { slug: 'materiais', label: 'Materiais', symbol: '▤' },
  { slug: 'fornecedores', label: 'Fornecedores', symbol: '◉' },
  { slug: 'contatos', label: 'Contatos', symbol: '◎' },
  { slug: 'despesas', label: 'Despesas', symbol: '$' },
] as const;
export type Section = (typeof sections)[number]['slug'];

export const moduleRoutes: Partial<Record<Section,string>> = { eventos: "/eventos", agenda: "/agenda", tarefas: "/tarefas", materiais: "/materiais", fornecedores: "/fornecedores" };
