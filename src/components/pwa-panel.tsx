'use client';
import { useEffect, useState } from 'react';
type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
export function PwaPanel() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);
    function offer(event: Event) { event.preventDefault(); setPrompt(event as InstallPrompt); }
    function complete() { setInstalled(true); setPrompt(null); }
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', complete);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => setStatus('Não foi possível preparar a instalação offline. Recarregue conectado para tentar novamente.'));
    }
    return () => { window.removeEventListener('beforeinstallprompt', offer); window.removeEventListener('appinstalled', complete); };
  }, []);
  async function install() {
    if (!prompt) return;
    try { await prompt.prompt(); const result = await prompt.userChoice; setStatus(result.outcome === 'accepted' ? 'Instalação solicitada ao navegador.' : 'Você pode instalar mais tarde.'); }
    catch { setStatus('Use a opção de instalação no menu do navegador.'); }
    setPrompt(null);
  }
  if (installed) return <aside className="pwa-panel">AH Produções instalado · consulta e edição exigem conexão.</aside>;
  return <aside className="pwa-panel" aria-label="Instalação do aplicativo"><span>Leve AH Produções para sua tela inicial.</span>{prompt ? <button onClick={install}>Instalar aplicativo</button> : <p>No Android ou computador, use “Instalar app” no menu do navegador, quando disponível. No iPhone, abra no Safari e use Compartilhar → Adicionar à Tela de Início.</p>}{status && <p role="status">{status}</p>}</aside>;
}
