# SOP — 新增 / 更新学校数据

> 一所学校一次 "data pass" 的标准动作。覆盖：核对当前开放状态、填齐字段、提交接口、记录待办。新增与更新走同一套流程，仅 Step 1 和 Step 4 略有差异。

## 何时跑这套 SOP

- 一所学校第一次进系统（新增）
- 距上次 `lastUpdate` 超过 3 个月、且没有用户共建数据可信地推翻它（例行更新）
- 收到学校开放政策变更的官方公告 / 媒体报道，需要核对实情（事件驱动更新）

## Step 0 — 准备

- 本地后端跑起来：`cd backend && make run`
- 确定目标学校的 slug（规则：`https://www.<X>.edu.cn` 的 `<X>`，如 pku / tsinghua / cau）
- 准备一个空文档放调研笔记（备查、备追溯）

## Step 1 — 拉当前数据（仅 update）

新增时跳过本步。更新时：

```bash
curl -s http://localhost:8080/api/v1/schools/<id> | python3 -m json.tool
```

明确"什么字段已有、什么字段是占位（`placehold.co` 之类）、什么字段为空"。占位 hint 经常是想当然写的，**别默认它准**。

## Step 2 — 走三层权威源

按下面这个**优先级**查。前一层有明确表态，就**不必再下钻**。

| 层级 | 来源 | 找什么 |
|---|---|---|
| **L1** 校官网最新公告 | `https://news.<X>.edu.cn/`、`https://www.<X>.edu.cn/tzgg/`（通知公告栏目） | 校园开放整体政策、入校方式 |
| **L2** 保卫部 / 信息化办公室 | `https://bwc.<X>.edu.cn/`、`https://io.<X>.edu.cn/` 类页面 | 校门开放时间、入校证件要求、预约系统名称 |
| **L3** 设施单独官网 | 图书馆 `https://lib.<X>.edu.cn/`、体育馆专题页 | 单设施的对外开放政策、预约入口 |

辅助源（**仅作交叉验证用**，不当一手依据）：本地宝 / 小红书 / 微博 / 新华网。这些口径滞后，且常把"对师生开放"和"对公众开放"混淆。

**多通道并存不算冲突**：一所学校同时有"公众通道"（不预约自由入校）和"师生为亲友报备的旧通道"是常见现象，并存不冲突——按主通道（最宽松的那条）记。"冲突时偏保守"只对**同一通道**的相反表态生效。

## Step 3 — 七项字段决策

按下表逐项填。更新时遵循**"无相反证据 → 保留现值"**——别因为"看上去不对"就改。

| 字段 | 决策依据 | 备注 |
|---|---|---|
| `address` | 校官网联系方式页 / 保卫部页面 | 多校区学校：选**与 lat/lng 一致**的那个校区，后缀加「（东校区）/（主校区）」消歧 |
| `logo` | 中文/英文 Wikipedia infobox（优先 SVG，文件名通常 `<X>_Logo.svg`） | 见下方「关于 `logo`」 |
| `lat`/`lng` | 与 address 同一校区门口；GCJ-02 坐标（腾讯/高德取点） | 现值多数已对，不动；若改 address 跨校区，**必须同步改坐标** |
| `status` | L1/L2 最新公告 | 4 值：`open` / `appt` / `alumni` / `closed`。**冲突时偏保守**——宁少报"开放"也不让用户白跑 |
| `reservation`（校级） | 仅 `status=appt` 时填 | 需校级总预约入口（如清华「参观清华」）才填，否则 `null` |
| `facilities.{library,track,gym,canteen}.status` | L3 设施单独页面 + L1 公告 | 4 项必填（schema 强制） |
| `facilities.*.reservation` | 仅 `status=appt` 时填 | 写**真实操作路径**到 hint，例："关注「中国农大图书馆」公众号 → 菜单「入馆预约」"。占位 hint 一律视为不可信，要重新核对 |

### 关于 `logo`

1. 去中文 Wikipedia 学校词条 (`https://zh.wikipedia.org/wiki/<学校名>`) 的 infobox 找 `File:<X>_Logo.svg`。
2. 直链 `https://upload.wikimedia.org/wikipedia/zh/<hash-path>/<X>_Logo.svg` 下载，存到**项目根目录**命名为 `<id>.svg`（如 `cau.svg` / `pku.svg`），等一次性批量上传到 CDN。
3. `logo` 字段直接写 prospective CDN URL：`https://static.ddxy.xiaoyuanzhu.com/images/logo/<id>.svg`——上传发生前会 404，但前端 `<img onError>` 会优雅隐藏（见 [frontend/src/screens/EditScreen.jsx](../frontend/src/screens/EditScreen.jsx)），影响可接受。
4. Wikipedia 没有 SVG 时（如英文 Wikipedia 经常只有 PNG）：先去校官网首页 / footer 找；再没有就**留空**并加入"补 logo"清单。**不要为了凑齐字段去用劣质 PNG。**

### 关于 `reservation.qrcodeUrl`

真实的微信 QR / 小程序码**无法从 web 直接获取**，需要：
1. 用手机微信扫码 / 截图
2. 上传到 `static.ddxy.xiaoyuanzhu.com/images/qr/<id>_<facility>.jpg`
3. 把 URL 填回 reservation

这是**单独的"补 QR"维护轮次**，不阻塞本 SOP 的本轮数据更新。本轮保持 `placehold.co` 占位 URL，但 **hint 必须写准确**——hint 是用户拿到的真信息，QR 只是入口；hint 准了，用户照样能找到入口。

### 状态枚举速查

| 值 | 何时用 |
|---|---|
| `open` | 自由出入；可能需身份证刷卡登记，但**不需提前预约** |
| `appt` | 需预约（小程序 / 公众号 / 网页表单） |
| `alumni` | 仅校友 / 师生 / 师生亲友 |
| `closed` | 暂不对外，或没找到任何公开入口 |

**"师生健身房只对师生开放"= `closed`**（不是 `alumni`——这里只对在校师生，不含校友）。
**"师生可申请亲友入校"= `alumni`**（语义上是"亲友通道"，普通公众不能直接走）。

## Step 4 — 提交

服务器会自动写 `lastUpdate`，不要在 body 里传它。`facilities` 必须包含全部 4 个 key（library / track / gym / canteen），缺一个会 400。

**新增**（POST）：

```bash
curl -X POST http://localhost:8080/api/v1/schools \
  -H "Content-Type: application/json" \
  -d @<id>.json
```

**更新**（PUT）：

```bash
curl -X PUT http://localhost:8080/api/v1/schools/<id> \
  -H "Content-Type: application/json" \
  -d @<id>.json
```

返回 200 + 完整 school 对象 = 成功。

## Step 5 — 记 TODO 清单

每次 pass 完，把以下条目挂到 [docs/data-todos.md](data-todos.md)（统一的"补丁"清单）：

- [ ] `<id>` 缺校徽（待 CDN 上传）
- [ ] `<id>` 缺 `<facility>` 真实 QR
- [ ] `<id>` 状态有歧义（列出冲突源 + 时间）
- [ ] `<id>` 某字段是假设值，需要实地或用户共建反馈来确认/修正

下一轮**补丁专项**统一过这份清单。

## Step 6 — 同步到 prod（可选，独立步骤）

本地写入完成后，prod 仍是旧数据。同步到 `ddxy.xiaoyuanzhu.com` 的工作流目前**未文档化**——按 docker compose 部署直接覆盖 sqlite 文件，或在 prod 上重复请求。等同步流程定型后补到本 SOP。
