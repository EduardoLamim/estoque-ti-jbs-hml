import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk('dist');
const forbidden = [
  /sb_secret_[A-Za-z0-9_-]+/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /pbkdf2:600000:/,
  /BEGIN (?:RSA |EC )?PRIVATE KEY/,
  /HML_ADMIN_PASSWORD/,
  /pin\s*[:=]\s*['"]5555['"]/i,
];
for (const file of files) {
  if (!/\.(js|html|css|json|map)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (forbidden.some((pattern) => pattern.test(text)))
    throw new Error(`Possível segredo encontrado: ${file}`);
}
console.log(`Bundle verificado: ${files.length} arquivos; nenhum padrão de segredo encontrado.`);
