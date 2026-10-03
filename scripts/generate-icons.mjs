import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourcePath = path.join(rootDir, 'public', 'denzil.png');
const iconsDir = path.join(rootDir, 'public', 'icons');

async function generateIcons() {
  console.log('🚀 Generando íconos PWA a partir de public/denzil.png...');

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Archivo fuente no encontrado: ${sourcePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. icon-192.png (192x192, transparente, con margen del ~6-7% para no ser recortado en diálogos de instalación)
  const icon192Path = path.join(iconsDir, 'icon-192.png');
  const inner192 = 168; // ~87.5% de 192 (12px de margen por lado)
  const seal192 = await sharp(sourcePath)
    .resize(inner192, inner192, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: seal192, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(icon192Path);
  console.log('✅ Generado: public/icons/icon-192.png (192x192, nítido y completo)');

  // 2. icon-512.png (512x512, transparente, con margen para verse 100% completo en cualquier navegador)
  const icon512Path = path.join(iconsDir, 'icon-512.png');
  const inner512 = 448; // ~87.5% de 512 (32px de margen por lado)
  const seal512 = await sharp(sourcePath)
    .resize(inner512, inner512, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: seal512, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(icon512Path);
  console.log('✅ Generado: public/icons/icon-512.png (512x512, nítido y completo)');

  // 3. maskable-512.png (512x512, fondo sólido #0b2a6b, sello al 70% para zona segura de Android)
  const maskable512Path = path.join(iconsDir, 'maskable-512.png');
  const innerMaskable512 = Math.round(512 * 0.7); // 358px
  const sealMaskable512 = await sharp(sourcePath)
    .resize(innerMaskable512, innerMaskable512, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 42, b: 107, alpha: 1 }, // #0b2a6b
    },
  })
    .composite([{ input: sealMaskable512, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(maskable512Path);
  console.log('✅ Generado: public/icons/maskable-512.png (512x512, zona segura 70% en #0b2a6b)');

  // 4. maskable-192.png (192x192, fondo sólido #0b2a6b, sello al 70%)
  const maskable192Path = path.join(iconsDir, 'maskable-192.png');
  const innerMaskable192 = Math.round(192 * 0.7); // 134px
  const sealMaskable192 = await sharp(sourcePath)
    .resize(innerMaskable192, innerMaskable192, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 11, g: 42, b: 107, alpha: 1 }, // #0b2a6b
    },
  })
    .composite([{ input: sealMaskable192, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(maskable192Path);
  console.log('✅ Generado: public/icons/maskable-192.png (192x192, zona segura 70% en #0b2a6b)');

  // 5. apple-touch-icon.png (180x180, fondo sólido #0b2a6b, logo al 78% para que iOS Safari no recorte esquinas ni muestre fondo negro)
  const appleTouchPath = path.join(iconsDir, 'apple-touch-icon.png');
  const appleTouchRootPath = path.join(rootDir, 'public', 'apple-touch-icon.png');
  const innerApple = 140; // ~78% de 180
  const sealApple = await sharp(sourcePath)
    .resize(innerApple, innerApple, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 11, g: 42, b: 107, alpha: 1 }, // #0b2a6b
    },
  })
    .composite([{ input: sealApple, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(appleTouchPath);

  // Duplicar en public/apple-touch-icon.png para compatibilidad universal con Safari
  fs.copyFileSync(appleTouchPath, appleTouchRootPath);
  console.log('✅ Generado: public/icons/apple-touch-icon.png y public/apple-touch-icon.png (180x180, iOS opaco nítido)');

  console.log('🎉 Todos los íconos generados exitosamente con máxima nitidez y proporciones completas.');
}

generateIcons().catch((err) => {
  console.error('❌ Error generando íconos:', err);
  process.exit(1);
});
