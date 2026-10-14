import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  if (!['192', '512', '180'].includes(size)) return new Response('Not found', { status: 404 });
  const dimension = Number(size);
  const logo = await readFile(join(process.cwd(), 'public/logo-ah.png'));
  const source = `data:image/png;base64,${logo.toString('base64')}`;
  return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#202126' }}><img src={source} alt="" width={dimension} height={dimension} /></div>, { width: dimension, height: dimension });
}
