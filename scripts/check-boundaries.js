#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(repositoryRoot, 'src');
const compositionRoot = resolve(sourceRoot, 'gateway-server.js');
const routeRoot = resolve(sourceRoot, 'gateway/routes');

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await javascriptFiles(path));
    else if (extname(entry.name) === '.js') files.push(path);
  }
  return files;
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function exportedNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/\bexport\s+(?:async\s+)?(?:const|function|class)\s+([A-Za-z_$][\w$]*)/gu)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/\bexport\s*\{([\s\S]*?)\}(?:\s*from\s*['"][^'"]+['"])?/gu)) {
    for (const item of match[1].split(',')) {
      const [, exported] = item.trim().match(/^(?:[A-Za-z_$][\w$]*\s+as\s+)?([A-Za-z_$][\w$]*)$/u) ?? [];
      if (exported !== undefined) names.add(exported);
    }
  }
  if (/\bexport\s+default\b/u.test(source)) names.add('default');
  return names;
}

function importedNames(clause) {
  const names = [];
  const trimmed = clause.trim();
  if (trimmed.startsWith('{')) {
    for (const item of trimmed.slice(1, trimmed.lastIndexOf('}')).split(',')) {
      const [, imported] = item.trim().match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+[A-Za-z_$][\w$]*)?$/u) ?? [];
      if (imported !== undefined) names.push(imported);
    }
    return names;
  }
  if (trimmed.startsWith('*')) return names;
  const defaultName = trimmed.match(/^([A-Za-z_$][\w$]*)/u)?.[1];
  if (defaultName !== undefined) names.push('default');
  const namedStart = trimmed.indexOf('{');
  if (namedStart !== -1) {
    names.push(...importedNames(trimmed.slice(namedStart)));
  }
  return names;
}

function resolveLocalImport(sourcePath, specifier) {
  if (!specifier.startsWith('.')) return null;
  const candidate = resolve(dirname(sourcePath), specifier);
  if (candidate.endsWith('.js')) return candidate;
  return `${candidate}.js`;
}

function localImports(sourcePath, source) {
  const imports = [];
  const importPattern = /\bimport\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gu;
  for (const match of source.matchAll(importPattern)) {
    const target = resolveLocalImport(sourcePath, match[2]);
    if (target !== null) imports.push({ target, names: importedNames(match[1]), line: lineNumber(source, match.index) });
  }
  const sideEffectPattern = /\bimport\s*['"]([^'"]+)['"]/gu;
  for (const match of source.matchAll(sideEffectPattern)) {
    const target = resolveLocalImport(sourcePath, match[1]);
    if (target !== null) imports.push({ target, names: [], line: lineNumber(source, match.index) });
  }
  const reExportPattern = /\bexport\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/gu;
  for (const match of source.matchAll(reExportPattern)) {
    const target = resolveLocalImport(sourcePath, match[2]);
    if (target !== null) imports.push({ target, names: importedNames(`{${match[1]}}`), line: lineNumber(source, match.index) });
  }
  return imports;
}

const files = await javascriptFiles(sourceRoot);
const modules = new Map();
for (const file of files) {
  const source = await readFile(file, 'utf8');
  modules.set(file, { source, exports: exportedNames(source) });
}

const violations = [];
let localEdgeCount = 0;
for (const [sourcePath, module] of modules) {
  for (const edge of localImports(sourcePath, module.source)) {
    const target = modules.get(edge.target);
    if (target === undefined) continue;
    localEdgeCount += 1;
    const sourceIsRoute = sourcePath.startsWith(`${routeRoot}/`);
    const targetIsRoute = edge.target.startsWith(`${routeRoot}/`);
    if (sourceIsRoute && targetIsRoute) {
      violations.push(`route-imports-route: ${relative(repositoryRoot, sourcePath)}:${edge.line} imports ${relative(repositoryRoot, edge.target)}`);
    }
    if (sourcePath !== compositionRoot
      && sourcePath.startsWith(`${resolve(sourceRoot, 'gateway')}/`)
      && edge.target === compositionRoot) {
      violations.push(`internal-imports-composition-root: ${relative(repositoryRoot, sourcePath)}:${edge.line}`);
    }
    for (const name of edge.names) {
      if (!target.exports.has(name)) {
        violations.push(`non-exported-import: ${relative(repositoryRoot, sourcePath)}:${edge.line} imports ${name} from ${relative(repositoryRoot, edge.target)}`);
      }
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Boundary check passed: ${modules.size} source modules, ${localEdgeCount} local edges.\n`);
}
