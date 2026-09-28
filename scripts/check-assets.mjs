import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Iniciando verificación de activos y guardas anti-regresión...');

// 1. Archivos de imagen obligatorios en public/
const REQUIRED_ASSETS = [
  'public/sello_denzil.png',
  'public/logo_cat.png',
  'public/denzil.png',
];

let hasError = false;

for (const relPath of REQUIRED_ASSETS) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ ERROR: Archivo obligatorio no encontrado: ${relPath}`);
    hasError = true;
  } else {
    const stats = fs.statSync(fullPath);
    if (stats.size < 1000) {
      console.error(`❌ ERROR: Archivo vacío o corrupto (${stats.size} bytes): ${relPath}`);
      hasError = true;
    } else {
      console.log(`✅ Activo verificado: ${relPath} (${Math.round(stats.size / 1024)} KB)`);
    }
  }
}

// 2. Escanear src/ en busca de SVGs o duplicación de membrete fuera de src/config/membrete.ts
const FORBIDDEN_PATTERNS = [
  { regex: /<svg\b/i, desc: 'Elemento SVG prohibido (<svg)' },
  { regex: /data:image\/svg\+xml/i, desc: 'SVG embebido prohibido (data:image/svg+xml)' },
];

const MEMBRETE_STRINGS = [
  'Aprobado mediante Decreto # 248 del 2002',
  'Reg. DANE 144001003404',
  'NIT. 8250006500',
  'rector@denzilescolar.edu.co',
  'www.denzilescolar.edu.co',
];

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        scanDirectory(fullPath);
      }
    } else if (/\.(tsx?|jsx?|html)$/.test(file)) {
      const relPath = path.relative(rootDir, fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check forbidden SVG patterns
      for (const { regex, desc } of FORBIDDEN_PATTERNS) {
        if (regex.test(content)) {
          console.error(`❌ ERROR: ${desc} encontrado en ${relPath}`);
          hasError = true;
        }
      }

      // Check letterhead texts outside src/config/membrete.ts and scripts
      if (relPath !== 'src/config/membrete.ts' && !relPath.startsWith('scripts/')) {
        for (const text of MEMBRETE_STRINGS) {
          if (content.includes(text)) {
            // Check if it's storage seed or allowed fallback
            if (!relPath.includes('storage.ts') && !relPath.includes('server.ts')) {
              console.error(`❌ ERROR: Texto de membrete hardcodeado "${text}" fuera de src/config/membrete.ts en ${relPath}`);
              hasError = true;
            }
          }
        }
      }
    }
  }
}

scanDirectory(path.join(rootDir, 'src'));

if (hasError) {
  console.error('\n🚨 Falló la verificación de activos o reglas anti-regresión.');
  process.exit(1);
} else {
  console.log('\n🎉 Todos los activos y reglas anti-regresión verificados exitosamente.');
  process.exit(0);
}
