import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TARGET_DIRS = [
  path.join(rootDir, 'src', 'assets'),
  path.join(rootDir, 'public'),
];

function findPngFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        results = results.concat(findPngFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function optimizePng(filePath) {
  const relPath = path.relative(rootDir, filePath);
  const oldStats = fs.statSync(filePath);
  const oldSize = oldStats.size;

  const tempFilePath = `${filePath}.opt_tmp_${Date.now()}.png`;

  try {
    await sharp(filePath)
      .png({
        palette: true,
        quality: 80,
        compressionLevel: 9,
        effort: 10,
      })
      .toFile(tempFilePath);

    const newStats = fs.statSync(tempFilePath);
    const newSize = newStats.size;

    if (newSize < oldSize) {
      fs.copyFileSync(tempFilePath, filePath);
      fs.unlinkSync(tempFilePath);
      const savedBytes = oldSize - newSize;
      const percent = Math.round((savedBytes / oldSize) * 100);
      console.log(
        `✅ [Optimizado] ${relPath}: ${(oldSize / 1024).toFixed(1)} KB -> ${(newSize / 1024).toFixed(1)} KB (-${percent}%)`
      );
      return { oldSize, newSize, optimized: true };
    } else {
      fs.unlinkSync(tempFilePath);
      console.log(
        `ℹ️  [Omitido] ${relPath}: el archivo original ya es óptimo (${(oldSize / 1024).toFixed(1)} KB)`
      );
      return { oldSize, newSize: oldSize, optimized: false };
    }
  } catch (error) {
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // ignore
      }
    }
    console.error(`❌ Error optimizando ${relPath}:`, error.message);
    return { oldSize, newSize: oldSize, optimized: false, error };
  }
}

async function main() {
  console.log('🚀 Iniciando optimización de imágenes PNG con sharp...');

  const allPngs = [];
  for (const dir of TARGET_DIRS) {
    const pngs = findPngFiles(dir);
    allPngs.push(...pngs);
  }

  // Deduplicate in case directories overlap
  const uniquePngs = [...new Set(allPngs)];
  console.log(`📁 Encontrados ${uniquePngs.length} archivos PNG para procesar.\n`);

  let totalOld = 0;
  let totalNew = 0;
  let countOptimized = 0;

  for (const pngPath of uniquePngs) {
    const result = await optimizePng(pngPath);
    totalOld += result.oldSize;
    totalNew += result.newSize;
    if (result.optimized) countOptimized++;
  }

  const totalSaved = totalOld - totalNew;
  const totalPercent = totalOld > 0 ? Math.round((totalSaved / totalOld) * 100) : 0;

  console.log('\n=============================================');
  console.log(`✨ Resumen de Optimización:`);
  console.log(`   Archivos procesados:  ${uniquePngs.length}`);
  console.log(`   Archivos reducidos:   ${countOptimized}`);
  console.log(`   Peso anterior:        ${(totalOld / 1024).toFixed(1)} KB`);
  console.log(`   Peso nuevo:           ${(totalNew / 1024).toFixed(1)} KB`);
  console.log(`   Ahorro total:         ${(totalSaved / 1024).toFixed(1)} KB (-${totalPercent}%)`);
  console.log('=============================================\n');
}

main().catch((err) => {
  console.error('Fatal error in optimize-images:', err);
  process.exit(1);
});
