import { test, expect } from '@playwright/test';
test('identidade, navegação e estado real dos módulos', async ({ page, isMobile }) => {
  await page.goto('/');
  const logo = page.getByRole('img', { name: 'Logo AH Produções' });
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page).toHaveTitle('Marca AH Produções');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tudo começa com uma boa organização.');
  await expect(page.getByText('Autenticação, armazenamento de dados, instalação PWA', { exact: false })).toBeVisible();
  if (isMobile) {
    await expect(page.getByRole('navigation')).toBeHidden();
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');
  }
  await page.getByRole('navigation').getByRole('button', { name: 'Despesas' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Despesas');
  await expect(page.getByText('O cadastro e a consulta de dados ainda não estão disponíveis.', { exact: false })).toBeVisible();
  if (isMobile) await expect(page.getByRole('navigation')).toBeHidden();
  await page.getByRole('button', { name: 'Voltar à visão geral' }).click();
  await expect(page.getByRole('heading', { name: 'Seu trabalho, por área' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('todas as áreas abrem a partir dos cartões', async ({ page }) => {
  await page.goto('/');
  const logo = page.getByRole('img', { name: 'Logo AH Produções' });
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  for (const label of ['Eventos', 'Agenda', 'Tarefas', 'Materiais', 'Contatos', 'Despesas']) {
    await page.locator('.area-card').filter({ hasText: label }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label);
    await page.getByRole('button', { name: 'Voltar à visão geral' }).click();
  }
});
