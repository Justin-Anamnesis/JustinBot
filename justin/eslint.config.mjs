// 规则零 override：全部来自 @cognirail/eslint-config。只管 justin/ 下我们自己的代码；
// 上游文件继续用仓根的 oxlint（实测 12 个上游文件 1894 行在本预设下 322 个错误，无法罩全仓）。
import { defineConfig } from '@cognirail/eslint-config';

export default defineConfig({ tsconfigRootDir: import.meta.dirname });
