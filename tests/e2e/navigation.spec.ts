import { test, expect } from '@playwright/test';
test('acesso privado e login sem configuração', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.headers()['cache-control']).toContain('no-store');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle('Marca AH Produções');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  const logo = page.getByRole('img', { name: 'Logo AH Produções' });
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seu espaço, com acesso privado.');
  await expect(page.getByLabel('E-mail')).toBeDisabled();
  await expect(page.getByLabel('Senha', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeDisabled();
  await expect(page.getByText('IDEIAS EM MOVIMENTO', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('/eventos');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Eventos', exact: true })).toHaveCount(0);
});
test('manifesto e ícones válidos, worker e tela offline sem dados privados', async ({ page, context }) => {
  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe('Marca AH Produções');
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) {
    const response = await page.request.get(icon.src);
    expect(response.headers()['content-type']).toContain('image/png');
    const png = await response.body();
    expect(png.readUInt32BE(16)).toBe(Number(icon.sizes.split('x')[0]));
    expect(png.readUInt32BE(20)).toBe(Number(icon.sizes.split('x')[1]));
  }
  await page.goto('/login');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const paths = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (await Promise.all(keys.map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat();
  });
  expect(paths.sort()).toEqual(['/offline.html', '/logo-ah.png', '/pwa-icon/192', '/pwa-icon/512'].sort());
  await context.setOffline(true);
  await page.goto('/eventos');
  await expect(page.getByRole('heading', { name: 'Você está sem conexão.' })).toBeVisible();
  await expect(page.getByText('não armazena dados privados no dispositivo', { exact: false })).toBeVisible();
  await context.setOffline(false);
  await page.getByRole('link', { name: 'Tentar novamente' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
