# JUSTIN-MEMORY：项目记忆

这个仓是 OpenMausBot 的 fork，明昊准备大改成自己的 Agent 工作台。本文记录跨会话都要知道的事：目标、分支约定、已定事项、已核实事实、未决问题。代码入口在 `JUSTIN-MAP.md`。

写入规则：只收已核实的事实和明昊拍板的事项；每条带日期；被推翻的直接改掉，不留旧说法。

## 目标

用这个项目替代 Orca（并行编码会话）和 inbox-app（agent 找人拍板的收件箱），作为明昊私人侧的主入口：收件、决策、对话、派工都在这里。team 事务仍归 Multica。（明昊，2026-11-11）

## 仓库与分支

- 本地：`/Users/mac/Desktop/Study/JustinBot`
- `origin`：`git@github.com:Justin-Anamnesis/JustinBot.git`（我们的 fork）
- `upstream`：`https://github.com/milind-soni/OpenMausBot.git`（只拉不推，push URL 已设为 DISABLED）

| 分支 | 用途 | 规则 |
| --- | --- | --- |
| `main` | 跟上游同步 | 只做 fast-forward，不放任何我们的提交 |
| `main-fmt` | 上游代码按我们的格式重排后的镜像 | 只放机器生成的提交，不手改；worktree 在 `/Users/mac/Desktop/Study/.tmp/worktrees/JustinBot/main-fmt` |
| `justin-main` | 我们的改造主线 | 所有改动在这里；上游的变化只从 `main-fmt` 合进来，取不取由我们定 |

（明昊，2026-11-11：「保留 main 用于 sync fork 最新的变化，justin-main 我们实际确定用不用这些变化」；同日批准全仓格式化与 `main-fmt` 中间分支）

为什么要 `main-fmt`：全仓代码按我们的 prettier 配置重排后，直接把 `main` 合进 `justin-main` 会让每个文件都冲突。先把上游的新代码也重排成同一格式再合，冲突只剩两边真正改到同一处的地方。

同步上游，分三步。

第一步，`main` 跟上游：

```
git switch main
git fetch upstream
git merge --ff-only upstream/main
git push origin main
```

第二步，在 `main-fmt` 的 worktree 里生成「新上游的格式化版」。提交要以上一个 `main-fmt` 提交为父，这样下一步合并的基准才是格式化过的旧代码：

```
cd /Users/mac/Desktop/Study/.tmp/worktrees/JustinBot/main-fmt
git merge -s ours --no-commit main          # 记下 main 为父提交，暂不取内容
git read-tree -u --reset main               # 工作区与暂存区换成 main 的内容
node /Users/mac/Desktop/Study/JustinBot/justin/scripts/format-source-tree.ts "$PWD"
git add -A && git commit -m "style: format upstream <短 sha> (generated)"
```

第三步，看新增了什么，决定取到哪个提交，再合进 `justin-main`：

```
git log --oneline justin-main..main-fmt
git switch justin-main && git merge main-fmt
```

第二步的命令是按 git 语义写的，第一次真实同步时要验证一遍（2026-11-11 只做过从零生成，没做过增量同步）。上游提交很密（2026-11-07 到 11-10 发了 5 个版本），逐个 cherry-pick 不现实；Justin 的建议是按「合并到某个上游提交为止」来取，并在下表记下取到哪。

| 日期 | `justin-main` 已含上游到 | 对应 `main-fmt` 提交 | 备注 |
| --- | --- | --- | --- |
| 2026-11-11 | `2e1ff4bc0` | `097ce520b` | 首次全仓格式化 |

## 格式与 lint

- **格式**：全仓代码文件（ts、tsx、mts、cts、js、mjs、cjs、jsx）用 `@cognirail/eslint-config` 的 prettier 配置。构建产物与 vendored 代码不动；Markdown、JSON、YAML 不动（JSON 里有逐字节比对的测试夹具）。（明昊，2026-11-11）
- **lint 用 ESLint 预设，不迁 Oxlint**。（明昊，2026-11-11）依据是他做的对照：预设在普通 TS 文件上启用 697 条规则，Oxlint 1.93.0 原生同名的只有 270 条；SonarJS 205 条为 0，其中 47 条需要类型信息，Oxlint 的 JS 插件还不支持；`name-replacements` 等 Unicorn 规则没有对应实现；禁止内联禁用指令的守卫认不出 `oxlint-disable`。
- 现状：我们的 ESLint 预设目前只对 `justin/` 下的代码强制通过。上游代码只做了格式化，没有做 `eslint --fix`，也没有清 lint 错误。
- 上游自己的 `pnpm lint`（oxlint）仍留在仓里，格式化后的代码能过（2026-11-11 实测退出码 0）。上游文件里的 `eslint-disable-next-line` / `oxlint-disable-next-line` 指令上方都加了 `// prettier-ignore`，否则折行后指令失效（实测会多出 17 条警告）。

首次格式化的验证（2026-11-11）：5952 个文件逐个比对格式化前后的语法树，5949 个完全一致；另 3 个的差异是去掉一个空语句和把 `a ?? (b ?? c)` 写成 `a ?? b ?? c`，语义相同。没验证的：全量依赖没装，上游的 `pnpm typecheck` 与测试没跑。

## 改动约定

- `justin/` 是格式化工具目录：prettier 配置、格式化脚本和它们的依赖，自带 `package.json` 与锁文件，不在上游 pnpm workspace 内。放在根 `package.json` 里的话，每次同步上游都要解 `package.json` 与锁文件的冲突，而且预设要求 TS 6.0.3，上游用 5.8。脚本本身过 `@cognirail/eslint-config` 3.1.1（零 override）。
- 改上游文件后跑 `cd justin && pnpm format:tree:check`（格式）和仓根的 `pnpm typecheck`（TS 5.8）。上游文件暂不要求过我们的 ESLint 规则：12 个上游文件 1894 行实测 322 个错误，其中 125 个不能自动修。
- 需求直接改代码（`server/`、`src/` 等），不另起目录隔离我们的逻辑；`main-fmt` 中转就是为了让这样改之后还能合上游。（明昊，2026-11-11）
- 每处改动在 `JUSTIN-MAP.md` 第 8 节记一行，合并冲突时据此判断保留哪边。
- 上游的 `AGENTS.md` 讲的是它的注释与代码规范，在这个仓里写代码时遵守；明昊的 baseline 另由各 harness 的全局配置加载。
- 包管理用 pnpm。

## 已核实的事实

都读过源码或在本机实测过，日期 2026-11-10 至 11-11，基于上游 `2e1ff4bc0`。

**它怎么运行**

- 每个 bot 回合是一个本机 Claude Code CLI 进程（`sdk-cli` 方式），复用 Claude Code 的登录与订阅额度。
- system prompt 是三层：Claude Code 自带的原样保留；本项目追加一段（身份 → 全体规则 → SOUL → 约二十个功能段 → 回复习惯）；用户级的 `~/.claude/CLAUDE.md`、skills、hooks 默认被切掉。
- 切掉的原因是成本：官方文档称一台机器每次调用多出约 407 个工具、1 万 token。
- 开关：环境变量 `OMB_CLAUDE_INHERIT_USER_CONFIG=1` 恢复全部继承（对所有 Claude bot 生效）；`features.claudeUserSkills` 只带 skills；`features.claudeUserMcp` 只带 MCP。

**与明昊体系的冲突**

- 优先级相反：它写明 SOUL > 部门上下文 > 全体 bot 规则；明昊的 L0（baseline 与红线）必须压过一切。所以 baseline 不能放进「全体 bot 规则」。
- 它有模型自动批准，Full access 下队友的问题会交给发起的 bot。明昊的门禁是「答案和批准只有人能写」。
- 它的分层是稳定半 / 易变半，为命中缓存；与 L0–L3（约束层级与最小上下文）是两个维度。

**能力现状**

| 能力 | 现状 |
| --- | --- |
| 跨 bot 的 Inbox、问题卡、批准卡、答案回原会话 | 有 |
| 延时检查、定时与事件触发、通知、稍后处理 | 有 |
| 多线程并行、bot 间派工、多引擎（Claude Code、Codex 等） | 有 |
| 线程指定任意目录作 cwd | 有 |
| 每任务一个 git worktree | 无 |
| Markdown / diff 逐行批注 | 无 |
| 行级 diff 审查、内嵌终端 | 无 |
| 外部会话（终端里起的 Claude Code / Codex）来提问并收答案 | 无，对外 MCP 与 Bot API 都明确不支持 |
| 答案作为独立记录 | 部分，答案存在卡片消息的字段里 |

**许可**

Apache 2.0，`enterprise/` 目录除外（另有许可，含 whitelabel、admin、budgets、billing）。

## 未决问题

| 问题 | 卡在哪 |
| --- | --- |
| 编码会话是否都从本项目里起 | 明昊未答。是 → 不用做「外部会话提问」，inbox-app 可停 |
| L0 怎么进来 | 两条路：开继承开关（走 Claude Code 原生通道 + hooks），或在 `buildSystemPrompt` 最前加 L0 段并改优先级措辞。未实测继承模式下 SOUL 与 baseline 冲突时模型听谁的 |
| 开继承后明昊的 PreToolUse 守卫是否误拦本项目自己的工具 | 未实测 |
| 上游变化的取用方式 | 见上，待明昊定 || 要不要对上游代码跑 `eslint --fix` | 自动修有小概率改行为，要先装全量依赖、跑通上游测试才能确认；明昊已定先只做格式化 |
| 隔离模式下 `~/.claude/rules/` 仍被加载 | 本机会话记录里观察到 3 次，原因未查清 |

## 没读过的部分

`server/index.ts` 只做了定向搜索；`companion/`（手机端）、`electron/`、`relay/`、`connector/` 没读；全量测试没跑过。
