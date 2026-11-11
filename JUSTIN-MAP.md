# JUSTIN-MAP：改造用的定位地图

只收我们要改的那几条线的入口，不是全仓地图。全仓约 53 万行，其余靠 LSP 与 `rg`。

规则：

- 一行 = 做什么 → 文件 → 符号 → 一句机制。写符号不写行号（上游改动后行号会漂）。
- 只收实际读过、确认过的入口。上限约 150 行，超了删最少用的。
- 表格第 2、3 列必须能被文末的自检命令 grep 到；失效就当场改。符号里不带引号（格式化会统一成单引号）。
- 项目背景、分支约定、已定事项见 `JUSTIN-MEMORY.md`。

核对基线：上游提交 `2e1ff4bc0` 经格式化后的 `097ce520b`（2026-11-11）。

## 1. Prompt 与上下文分层

| 做什么 | 文件 | 符号 | 机制 |
| --- | --- | --- | --- |
| system prompt 总装 | `server/system-prompt.ts` | `export function buildSystemPrompt` | 顺序：persona → every-bot-rules → soul → tool-bridge → reply-style → 各功能段 → reply-habits |
| 身份一句话 | `server/system-prompt.ts` | `export function botPersona` | `You are <name>, a personal bot…`，默认 bot 追加 MausBot 人设 |
| 全体 bot 规则与优先级措辞 | `server/system-prompt.ts` | `export function everyBotRulesPrompt` | 写明 SOUL > 部门上下文 > 全体规则；与我们的 L0 最高相反 |
| 哪些段每轮重拼 | `server/system-prompt.ts` | `const VOLATILE_SECTIONS` | 稳定半进进程启动参数，易变半随首条消息走，为命中缓存 |
| 稳定半 / 易变半拆分 | `server/drivers/prompt-split.ts` | `export function promptHalves` | 驱动按稳定半决定是否重启 CLI 进程 |
| SOUL 包装 | `server/bot-folder.ts` | `export function soulSystemPrompt` | 声明高于记忆与 skill、低于当前请求与安全边界 |
| Chief of Staff 附加段 | `server/chief-of-staff.ts` | `export function chiefOfStaffSystemPrompt` | 队友名单 + 派工规则，不是另一套机制 |
| 记忆段 | `server/workspace.ts` | `export function memorySystemPrompt` | 每个 bot 自己的 MEMORY.md 与 topic 文件 |
| 功能段清单与预览 | `server/index.ts` | `function previewSystemPrompt` | 「模型实际看到什么」预览与真实回合共用同一套段 |
| 全体规则 / 关于我 的配置 | `server/config.ts` | `everyBotRules: z.string()` | 上限 24000 字符，对所有 bot 生效 |

## 2. 启动 Claude Code 与隔离

| 做什么 | 文件 | 符号 | 机制 |
| --- | --- | --- | --- |
| 拼 CLI 参数 | `server/drivers/claude.ts` | `--setting-sources` | 默认只读启动目录的项目级配置，跳过用户级 CLAUDE.md、skills、hooks |
| 隔离总开关 | `server/drivers/claude.ts` | `function inheritsUserConfig` | 环境变量 `OMB_CLAUDE_INHERIT_USER_CONFIG=1`，对所有 Claude bot 生效 |
| 追加而非替换 system prompt | `server/drivers/claude.ts` | `--append-system-prompt-file` | Claude Code 自带 prompt 原样保留 |
| 批准走哪个工具 | `server/drivers/claude.ts` | `--permission-prompt-tool` | 指向 `mcp__ogb__approve` |
| 审批模式映射 | `server/drivers/claude.ts` | `turn.approvalMode ===` | full → bypassPermissions，auto，edits → acceptEdits，其余 default |
| 只继承用户级 skills | `server/turn-settings.ts` | `export function claudeUserSkillsEnabled` | `features.claudeUserSkills`，把 `~/.claude/skills` 用 `--add-dir` 带入 |
| 只继承用户级 MCP | `server/config.ts` | `export function claudeUserMcpEnabled` | `features.claudeUserMcp` |
| 开继承后 tool bridge 被拒 | `server/agents-bridge-switch.ts` | `function claudeRefusal` | 还会检查启动目录 `.claude/settings.json` 里的 PreToolUse hook |
| Codex 驱动 | `server/drivers/codex.ts` | `app-server` | 走 `codex app-server` JSON-RPC |
| 其余引擎 | `server/drivers/acp/core.ts` | `acp` | ACP 协议的一组 CLI |

## 3. 提问卡、批准卡、Inbox

| 做什么 | 文件 | 符号 | 机制 |
| --- | --- | --- | --- |
| bot 侧的提问与批准工具 | `server/permission-proxy.ts` | `ask_user` | stdio MCP 代理，经 unix socket 到服务端；调用一直挂着，人答完作为工具结果回到同一进程 |
| 卡片生命周期 | `server/host/ask-cards.ts` | `export function createAskCards` | 提问卡是线程里的一条消息，没有单独的待办表 |
| 卡片数据形状 | `shared/wire.ts` | `OptionCardData` | 含 `answered`、`answeredText`、`answeredBy` |
| 人作答的入口 | `server/index.ts` | `async function answerRequest` | 界面答题最终走这里 |
| 单人 Inbox 数据 | `server/host/place-inbox.ts` | `export function createPlaceInbox` | 汇总所有 bot 的待办卡 |
| Inbox 接口 | `server/routes/inbox.ts` | `export function createInboxRoutes` | 标记完成对提问卡返回 409，必须作答 |
| Inbox 分栏 | `shared/inbox.ts` | `export type InboxTab` | needs-you / info / done |
| Inbox 页面 | `src/components/inbox/InboxPanel.tsx` | `InboxPanel` | 侧栏面板，不是独立页面 |
| Inbox 阅读区 | `src/components/inbox/InboxReading.tsx` | `InboxReading` | 逐行批注若要做，嵌在这里 |
| 模型自动批准 | `server/auto-approve.ts` | `export function autoVerdict` | 与「批准只能人给」冲突，改造时要关或限 |
| 授权日志 | `server/decision-log.ts` | `DecisionRow` | `<data>/decisions/YYYY-MM.ndjson`，只记授权，不记问答 |

## 4. 线程、派工、并行

| 做什么 | 文件 | 符号 | 机制 |
| --- | --- | --- | --- |
| 建线程 | `server/store.ts` | `createTask(` | 线程可带自己的 cwd，建后固定，否则用 bot 的 cwd |
| cwd 校验 | `server/bot-cwd.ts` | `export function validateBotCwd` | 任意已存在的绝对路径 |
| 选目录的界面 | `src/components/NewTaskFolderDialog.tsx` | `NewTaskFolderDialog` | worktree 自动创建若要做，从这里和 createTask 接 |
| 一轮的起点 | `server/index.ts` | `async function beginTurn` | 拼 prompt、选引擎、启动驱动 |
| 房间里的一轮 | `server/index.ts` | `async function runClaimedGroupMemberTurn` | 频道内 bot 的回合 |
| bot 派工 | `server/drivers/agents-catalog.ts` | `coordinate_bots` | 1–4 个 bot；`consult`、`done_when`；结果自动唤醒发起方 |
| bot 自开线程 | `server/drivers/agents-catalog.ts` | `start_thread` | 一个 bot 可同时跑多个线程 |
| 并行上限 | `server/bot-thread-limits.ts` | `MAX_CONCURRENT_BOT_THREADS` | 上限 16，默认按内存算 |
| 延时检查 | `server/drivers/agents-wait-tools.ts` | `wait_until` | 纯代码检查（URL、文件、进程、bot 空闲），到点发 follow_up |
| 每轮改动摘要 | `server/index.ts` | `async function scheduleTurnDigest` | 只列文件名，没有行级 diff |
| 影子 git 检查点 | `server/checkpoints.ts` | `diffWorkingTree` | 独立 GIT_DIR，不碰用户的 .git；不是 worktree |

## 5. 界面骨架

| 做什么 | 文件 | 符号 | 机制 |
| --- | --- | --- | --- |
| 页面切换 | `src/state/store.tsx` | `activeView:` | 没有路由，靠这个联合类型切页 |
| 全局 reducer | `src/state/store.tsx` | `export function reducer` | Context + useReducer |
| 状态入口 | `src/state/store.tsx` | `export function StoreProvider` | 服务端事件在这里落进状态 |
| 页面分支 | `src/App.tsx` | `activeView` | 新页面在这里加分支 |
| 侧栏 | `src/components/Sidebar.tsx` | `SidebarInboxRow` | Inbox 入口挂在侧栏 |
| 底部导航 | `src/components/SidebarFooterNav.tsx` | `SidebarFooterNav` | 新的顶层入口加在这里 |
| 懒加载页面 | `src/components/lazy-screens.tsx` | `lazy` | 大页面按需加载 |
| 前端功能开关 | `src/lib/feature-flags.ts` | `claudeUserMcpEnabled` | 读配置里的 `features.*` |

## 6. 对外接口与配置

| 做什么 | 文件 | 符号 | 机制 |
| --- | --- | --- | --- |
| 对外 MCP server | `scripts/mcp-server.ts` | `needs-user` | 能给 bot 发活、等完成；不能批准，不能代外部会话提问 |
| Bot HTTP API | `server/bot-api.ts` | `export function botApiPrompt` | 外部发消息给 bot 并轮询回复 |
| 路由表 | `server/routes/table.ts` | `ROUTES` | 各模块 `ROUTES.push(...)` 注册 |
| 数据目录 | `server/config.ts` | `export const DATA_DIR` | 默认 `~/.openmausbot` |
| 品牌 | `server/brand.ts` | `brand` | brand.json，改名需要 enterprise 的 whitelabel |

## 7. 巨型文件路标

`server/index.ts`（格式化后约 28500 行，383 个顶层函数）：

| 符号 | 管什么 |
| --- | --- |
| `async function answeringCardAs` | 以某身份答卡的包装 |
| `function previewSystemPrompt` | prompt 预览 |
| `async function answerRequest` | 人答题 / 批准的落点 |
| `async function scheduleTurnDigest` | 每轮摘要与改动文件 |
| `async function beginTurn` | 单聊回合全流程（最长的一个函数） |
| `async function runClaimedGroupMemberTurn` | 房间回合 |
| `function configStatus` | 下发给前端的配置快照 |

`src/state/store.tsx`（格式化后约 4900 行）：

| 符号 | 管什么 |
| --- | --- |
| `export type Action` | 全部 action 的联合类型 |
| `export function reducer` | 状态迁移 |
| `export const initialState` | 初始状态 |
| `export function StoreProvider` | 订阅服务端事件 |

## 8. 我们改过什么

每处对上游文件的改动记一行，合并冲突时据此判断保留哪边。

| 日期 | 文件 | 改了什么 | 为什么 |
| --- | --- | --- | --- |
| 2026-11-11 | `JUSTIN-MAP.md`、`JUSTIN-MEMORY.md` | 新增 | 定位地图与项目记忆 |
| 2026-11-11 | `AGENTS.md` | 末尾加一行指向本文 | 各 harness 的会话自动读到 |
| 2026-11-11 | `justin/` | 新增格式化工具目录（prettier 配置 + 格式化脚本 + 自带锁文件） | 全仓格式化与每次同步上游后的重新生成都靠它；不进根 `package.json`，免得同步时冲突 |
| 2026-11-11 | 全仓 5952 个代码文件 | 按我们的 prettier 配置重排，由 `justin/scripts/format-source-tree.ts` 机器生成，经 `main-fmt` 分支进入 | 明昊定：项目代码用 eslint-config 的格式；不手改，每次同步上游后重新生成 |

## 常用命令

```
pnpm typecheck      # tsc -b && tsc -p tsconfig.server.json
pnpm lint           # oxlint --deny-warnings .
pnpm test           # vitest + broker + electron + packaged-server，全量很慢
pnpm exec vitest run server/system-prompt.test.ts   # 单文件
pnpm dev:server     # 只起服务端
pnpm dev:desktop    # 起桌面应用
```

格式化工具（`justin/` 下）：

```
cd justin && pnpm install --ignore-workspace   # 首次；不进上游 workspace，锁文件是 justin/pnpm-lock.yaml
cd justin && pnpm lint && pnpm format:check && pnpm typecheck
cd justin && pnpm format:tree:check                 # 全仓代码是否符合我们的 prettier 配置
pnpm dlx oxlint@1.80.0 --deny-warnings .             # 上游自己的 lint，不装全量依赖也能跑
```

## 自检：地图是否过期

在仓根运行，输出为空即全部有效：

```
awk -F'|' '/^\| / && $3 ~ /`/ && $4 ~ /`/ {f=$3; s=$4; gsub(/^ *`|` *$/,"",f); gsub(/^ *`|` *$/,"",s); print f "\t" s}' JUSTIN-MAP.md | while IFS=$'\t' read -r f s; do rg -qF -- "$s" "$f" || echo "STALE: $f :: $s"; done
```
