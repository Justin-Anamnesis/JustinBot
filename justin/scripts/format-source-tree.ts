// 做什么：用 @cognirail/eslint-config 的 prettier 配置格式化一棵 OpenMausBot 源码树，只动代码文件。
// 用法：node justin/scripts/format-source-tree.ts [目标目录] [--check]；目标目录默认是本仓根。
// 生成 main-fmt 分支时把目标目录指向 main-fmt 的 worktree（那里没有 justin/，工具链从本目录取）。
import { spawnSync } from 'node:child_process';
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const justinDirectory = path.resolve(import.meta.dirname, '..');
const CODE_EXTENSIONS = ['ts', 'tsx', 'mts', 'cts', 'js', 'mjs', 'cjs', 'jsx'];

// 来源：仓根 .oxlintrc.json 的 ignorePatterns（上游自己也不检查的构建产物与 vendored 代码）；
// justin/ 由它自己的 pnpm format:check 管，不在这里重复。
const EXCLUDED_DIRECTORIES = [
  'dist',
  'dist-electron',
  'dist-native',
  'dist-server',
  'release',
  'third_party',
  'electron/vendor',
  'electron/resources',
  'justin',
];

// 生成器的产物：上游测试会重跑生成器并与仓里的文件逐字比对（scripts/mascot-bodies/*.test.mjs），
// 格式化后对不上，所以保持生成器的原始输出。
const EXCLUDED_FILES = ['shared/mascot-bodies.ts', 'shared/carved-bodies.ts'];

// prettier 单次运行不保证收敛（2026-11-11 实测：第一遍后仍有 57 个文件会再变），第二遍稳定；留一遍余量。
const MAX_PASSES = 3;

const DIRECTIVE_LINE = /^(\s*)\/\/ (?:eslint|oxlint)-disable-next-line/u;
const IGNORE_MARK = '// prettier-ignore';

function didPrettierPass(directory: string, mode: '--check' | '--write'): boolean {
  const result = spawnSync(
    path.join(justinDirectory, 'node_modules', '.bin', 'prettier'),
    [
      mode,
      '--config',
      path.join(justinDirectory, 'prettier.config.mjs'),
      '--log-level',
      'warn',
      `**/*.{${CODE_EXTENSIONS.join(',')}}`,
      ...EXCLUDED_DIRECTORIES.map((excluded) => `!${excluded}/**`),
      ...EXCLUDED_FILES.map((excluded) => `!${excluded}`),
    ],
    { cwd: directory, stdio: 'inherit' },
  );
  return result.status === 0;
}

// 「禁用下一行」指令只对紧邻的下一行生效；prettier 把语句折行后，被禁用的代码会落到更后面的行，
// 上游的 oxlint 就重新报错（实测 17 条 no-control-regex）。在指令上方加 prettier-ignore，让那条语句保持原排版。
function protectDirectives(directory: string): number {
  const skipped = new Set(['node_modules', '.git', ...EXCLUDED_DIRECTORIES]);
  const codeFiles = globSync(`**/*.{${CODE_EXTENSIONS.join(',')}}`, {
    cwd: directory,
    exclude: (entry) => skipped.has(entry),
  });
  let insertedCount = 0;
  for (const relativePath of codeFiles) {
    if (
      EXCLUDED_FILES.includes(relativePath) ||
      EXCLUDED_DIRECTORIES.some((excluded) => relativePath.startsWith(`${excluded}/`))
    ) {
      continue;
    }
    const filePath = path.join(directory, relativePath);
    const source = readFileSync(filePath, 'utf8');
    if (!source.includes('-disable-next-line')) {
      continue;
    }
    const output: string[] = [];
    let previousLine = '';
    for (const line of source.split('\n')) {
      const indent = DIRECTIVE_LINE.exec(line)?.[1];
      if (indent !== undefined && !previousLine.includes(IGNORE_MARK)) {
        output.push(`${indent}${IGNORE_MARK}`);
        insertedCount += 1;
      }
      output.push(line);
      previousLine = line;
    }
    writeFileSync(filePath, output.join('\n'));
  }
  return insertedCount;
}

function didFormatConverge(directory: string): boolean {
  process.stdout.write(`protected directives: ${protectDirectives(directory)}\n`);
  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    didPrettierPass(directory, '--write');
    if (didPrettierPass(directory, '--check')) {
      process.stdout.write(`stable after ${pass} pass(es)\n`);
      return true;
    }
  }
  return false;
}

const cliArguments = process.argv.slice(2);
const targetDirectory =
  cliArguments.find((argument) => !argument.startsWith('--')) ??
  path.resolve(justinDirectory, '..');
const isSuccessful = cliArguments.includes('--check')
  ? didPrettierPass(targetDirectory, '--check')
  : didFormatConverge(targetDirectory);

process.exitCode = isSuccessful ? 0 : 1;
