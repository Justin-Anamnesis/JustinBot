// Every source file over 1,000 lines is listed here with its line count, and
// a count may only go down: a PR that grows one of these files, or adds a new
// file over 1,000 lines, fails here. A PR that shrinks a file leaves its number
// alone: scripts/tighten-ratchets.mjs lowers the numbers (and drops files under
// 1,000 lines) at each release, so two such PRs never conflict here. The split program
// (server/host/README.md) moves server/index.ts into modules of under 1,500
// lines; nothing new may exceed HARD_CAP, and the files listed above the cap
// are the ones that program takes apart. Tests, fixtures, goldens and
// vendored code are not counted.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const HARD_CAP = 2000;
const LISTED_FROM = 1000;

const LINES: Record<string, number> = {
  'server/index.ts': 28553,
  'electron/main.mjs': 5367,
  'src/state/store.tsx': 4941,
  'server/store.ts': 3218,
  'src/components/RoutineCalendarPage.tsx': 3021,
  'server/drivers/claude.ts': 2974,
  'src/components/Sidebar.tsx': 2968,
  'server/drivers/codex.ts': 2631,
  'server/drivers/acp/core.ts': 2596,
  'src/components/ComputerPanel.tsx': 2472,
  'server/routines.ts': 2224,
  'src/components/ChatView.tsx': 2203,
  'electron/cloud-account.node-test.mjs': 2097,
  'electron/cloud-account.mjs': 1956,
  'electron/home-window.node-test.mjs': 1830,
  'electron/computer-sharing.mjs': 1791,
  'server/routine-requests.ts': 1783,
  'scripts/mcp-server.ts': 1776,
  'server/config.ts': 1752,
  'scripts/verify-data.ts': 1746,
  'electron/cloud-send.mjs': 1741,
  'electron/cloud-rail.node-test.mjs': 1731,
  'server/data/tools.ts': 1707,
  'server/cli.ts': 1675,
  'shared/widget.ts': 1669,
  'electron/cloud-send.node-test.mjs': 1658,
  'src/components/ModelPicker.tsx': 1640,
  'server/workspace-backup.ts': 1638,
  'src/components/GroupView.tsx': 1638,
  'server/skills.ts': 1622,
  'src/components/LocalComputerSection.tsx': 1612,
  'src/components/SettingsModal.tsx': 1599,
  'server/meetings/meetbot.ts': 1577,
  'server/browser-live.ts': 1575,
  'scripts/bench-desktop.ts': 1574,
  'server/drivers/openai-chat.ts': 1573,
  'server/browser-runtime.ts': 1546,
  'server/boat.ts': 1539,
  'server/vps-computer.ts': 1528,
  'server/drivers/agents-call.ts': 1493,
  'server/drivers/agents-catalog.ts': 1487,
  'electron/home-window.mjs': 1432,
  'electron/cloud-home.node-test.mjs': 1428,
  'src/components/McpServersPanel.tsx': 1418,
  'server/composio.ts': 1415,
  'server/routes/bot-messages.ts': 1403,
  'electron/shared-computer-access.node-test.mjs': 1368,
  'electron/one-home.mjs': 1357,
  'server/container-computer.ts': 1354,
  'server/browser/viewers/core.ts': 1344,
  'server/message-db.ts': 1339,
  'src/components/PluginsPanel.tsx': 1326,
  'src/components/Composer.tsx': 1325,
  'server/memory-upkeep.ts': 1299,
  'server/drivers/muse-code.ts': 1298,
  'server/org-library.ts': 1295,
  'shared/package-format.ts': 1289,
  'electron/org-library.node-test.mjs': 1270,
  'electron/updates-consent.node-test.mjs': 1252,
  'electron/lend-automatically.node-test.mjs': 1251,
  'server/runtime/runtime.ts': 1237,
  'server/plan-usage.ts': 1231,
  'server/drivers/pi.ts': 1227,
  'src/components/AttachmentPreview.tsx': 1217,
  'src/components/bot-settings/AccessSection.tsx': 1210,
  'src/components/ChatMarkdown.tsx': 1196,
  'server/live-call-controller.ts': 1178,
  'electron/environments.node-test.mjs': 1177,
  'server/drivers/chat-mcp-tools.ts': 1175,
  'server/engine-standalone.ts': 1175,
  'electron/managed-desktop.node-test.mjs': 1168,
  'src/components/TeamLibraryPanel.tsx': 1162,
  'server/host/secret-cards.ts': 1158,
  'companion/src/e2e/gen-vectors.ts': 1156,
  'server/app-triggers.ts': 1154,
  'server/browser-engine.ts': 1151,
  'shared/wire.ts': 1149,
  'src/components/PlacesRail.tsx': 1146,
  'server/routes/bot-patch.ts': 1143,
  'scripts/smoke-approval-modes.cjs': 1141,
  'src/components/TeamCanvas.tsx': 1137,
  'src/components/PhoneSetupFlow.tsx': 1112,
  'src/components/SidebarProfileMenu.tsx': 1111,
  'server/webhooks.ts': 1107,
  'server/runtime-coordinator.ts': 1089,
  'electron/use-my-mac.node-test.mjs': 1088,
  'scripts/verify-company-backups.mjs': 1081,
  'electron/cloud-send-move.node-test.mjs': 1071,
  'src/components/browser/StreamSurface.tsx': 1071,
  'server/sessions.ts': 1065,
  'electron/managed-desktop.mjs': 1058,
  'server/browser-steps.ts': 1058,
  'src/components/CursorAvatar.tsx': 1052,
  'server/setup-import.ts': 1048,
  'electron/updater-coordinator.node-test.mjs': 1042,
  'electron/companion-account-service.mjs': 1041,
  'electron/one-home.node-test.mjs': 1038,
  'server/chat-apps.ts': 1034,
  'server/data/engine.ts': 1030,
  'electron/app-permissions.node-test.mjs': 1013,
  'electron/preload.cjs': 1003,
  'scripts/defender-check-win.mjs': 1002,
  'src/lib/composer-attachments.ts': 1001,
};

function sourceFiles(): string[] {
  const out = execFileSync(
    'git',
    ['ls-files', 'server', 'shared', 'src', 'scripts', 'evals', 'electron', 'companion'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return out
    .split('\n')
    .filter((file) => /\.(ts|tsx|mjs|cjs)$/.test(file))
    .filter(
      (file) =>
        !file.includes('.test.') &&
        !file.includes('/testing/') &&
        !file.includes('goldens') &&
        !file.startsWith('electron/vendor/'),
    );
}

const count = (file: string) => readFileSync(new URL(file, ROOT), 'utf8').split('\n').length - 1;

describe('source files stay a readable size', () => {
  it('no listed file grows, and no new file over 1,000 lines goes unlisted', () => {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const file of sourceFiles()) {
      const lines = count(file);
      const pinned = LINES[file];
      if (pinned !== undefined) {
        seen.add(file);
        if (lines > pinned)
          problems.push(
            `${file} grew to ${lines} lines (listed at ${pinned}): move code out, do not add here`,
          );
      } else if (lines > LISTED_FROM) {
        problems.push(
          lines > HARD_CAP
            ? `${file} is ${lines} lines, over the ${HARD_CAP}-line cap: split it`
            : `${file} is ${lines} lines: a new file over ${LISTED_FROM} lines needs a line here and a reason in the PR`,
        );
      }
    }
    expect(problems, 'See server/host/README.md').toEqual([]);
  });
});
