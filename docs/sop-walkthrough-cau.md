# SOP walk-through · 中国农业大学（cau）

本文档是 [sop-school-data-update.md](sop-school-data-update.md) 的**首次执行记录**——用 CAU 当样本走一遍，凡是 SOP 没覆盖到的歧义都在这里留痕。

**执行日期**：2026-05-17

## Step 1 · 拉当前数据

```json
{
  "id": "cau",
  "address": "",
  "logo": "",
  "lat": 40.001, "lng": 116.351,
  "status": "open",
  "reservation": null,
  "facilities": {
    "canteen": { "status": "open" },
    "gym":     { "status": "appt",   "reservation": { "qrcodeUrl": "placeholder", "hint": "识别小程序码进入「农大体育场馆预约」" } },
    "library": { "status": "appt",   "reservation": { "qrcodeUrl": "placeholder", "hint": "关注「中国农大图书馆」公众号 → 菜单「入馆预约」" } },
    "track":   { "status": "open" }
  },
  "lastUpdate": "2026-05-10T00:00:00Z"
}
```

**观察**：address/logo 空；gym 和 library 的 QR 都是 `placehold.co` 占位；hint 是"想当然"，没有实际核对过。

## Step 2 · 走权威源

### L1 校官网新闻

[又有多所高校面向社会开放](https://news.cau.edu.cn/mtndnew/8d9b1c44dc87401496c452d861ecbaed.htm)（cau 校园新闻转载）：

> 校外游客**不需要预约、刷身份证即可入校参观**。

→ 一手依据：`school.status = open`，校级 `reservation = null`。

### L2 保卫部 / 信息化办

[保卫部 2024-02 通知](https://bwc1.cau.edu.cn/art/2024/2/2/art_24392_1011630.html) 说"师生可通过『网上办事大厅-1105 校外人员入校申请』提交亲友入校申请"——但这是**师生为亲友报备**的旧通道，不是"公众入校"的主通道。

→ 与 L1 不冲突：L2 是"亲友通道"，L1 是"公众通道"。CAU 把两条通道并行保留。本系统记 `open`（取最宽松的主通道），SOP §Step 3 备注的"冲突时保守"在此**不触发**——两套通道并存不算冲突。

### L3 设施单独官网

| 设施 | 来源 | 结论 |
|---|---|---|
| 图书馆 | [中国农业大学图书馆 - 入馆须知](https://lib.cau.edu.cn/) | "校外读者来馆查阅文献，请到本馆办公室接待处，凭本人有效证件办理入馆手续。" → **appt**（凭证件办理，不是自由入馆）|
| 体育馆 健身场地 | [体育馆健身场地试运行通知](https://cau.edu.cn/tzgg/593656.htm) | "健身场地暂定**只对本校师生开放**" → **closed**（无公开预约渠道）|
| 体育馆 其他场地 | [奥运体育馆专题页](https://www.cau.edu.cn/whsh/aytyg/index.htm) | 有羽毛球/乒乓球/篮球/健身房 + 文化艺术馆。**未明确**对外开放政策。保守起见与健身场地一致 → **closed**。如果后续找到公开预约渠道再升级。 |
| 操场 | （未单独公告） | 校园整体 open，操场无独立限制 → **open** |
| 食堂 | （未单独公告） | 校园整体 open，食堂无独立限制——但传统上校外用餐需饭卡或现金；现值是 `open`，**无相反证据 → 保留 open**。下次有用户共建反馈再调整。 |

### 多校区 / 坐标核对

- 东校区：北京市海淀区清华东路 17 号（奥运体育馆所在地）
- 西校区：北京市海淀区圆明园西路 2 号
- 当前 `lat=40.001, lng=116.351` → 清华东路 17 号附近 → **东校区**
- 决策：`address = "北京市海淀区清华东路 17 号（东校区）"`，lat/lng 不动。

## Step 3 · 字段决策表

| 字段 | 现值 | 新值 | 变动？ |
|---|---|---|---|
| address | `""` | `"北京市海淀区清华东路 17 号（东校区）"` | ✅ 改 |
| logo | `""` | `"https://static.ddxy.xiaoyuanzhu.com/images/logo/cau.svg"` | ✅ 改（SVG 已下载到项目根 `cau.svg`，待批量上传 CDN） |
| lat / lng | 40.001 / 116.351 | 同 | 不动 |
| status | `open` | `open` | 不动 |
| reservation | null | null | 不动 |
| facilities.library.status | `appt` | `appt` | 不动 |
| facilities.library.reservation.hint | "关注「中国农大图书馆」公众号 → 菜单「入馆预约」" | **"校外读者凭本人有效证件到本馆办公室接待处办理入馆手续"** | ✅ 改（旧 hint 是想当然，没核对过） |
| facilities.library.reservation.qrcodeUrl | placeholder | placeholder | 不动；加入"补 QR"清单 |
| facilities.track.status | `open` | `open` | 不动 |
| facilities.gym.status | `appt` | **`closed`** | ✅ 改（占位 hint 暗示有面向校外的小程序，但官方资料里没找到此通道；保守降级） |
| facilities.gym.reservation | { placeholder QR, ... } | null | ✅ 改（status=closed 不需要 reservation） |
| facilities.canteen.status | `open` | `open` | 不动 |

## Step 4 · PUT 请求体

[cau-update.json](#)（见仓库内对应文件 / 命令行 heredoc）

## Step 5 · 本次产生的 TODO

- [x] `cau` — 校徽 SVG 已下载（项目根 `cau.svg`，从 zh.wikipedia.org/wiki/中国农业大学 取得），待批量上传到 `static.ddxy.xiaoyuanzhu.com/images/logo/cau.svg`
- [ ] `cau` — `library` 缺真实 QR（需扫「中国农大图书馆」公众号）
- [ ] `cau` — `canteen` 现状 `open` 是**假设**，需要一次实地或用户共建反馈来确认/修正

## SOP 改进建议（从本次 walk-through 反推）

1. SOP §Step 3 的"冲突偏保守"原则需要补一句：**多通道并存不算冲突**（如 CAU 的"公众通道 + 亲友通道"），按主通道记。
2. `gym` 的体育馆有"健身场地"和"其他场馆"的细分，长尾设施可以用 `others` 数组承载子项；但本系统当前 4 项固定设施已盖住"gym"这一层，下钻意义不大。SOP 不需要为此改动。
3. 应该建一个 `docs/data-todos.md` 累积所有学校的"补 logo / 补 QR / 待复核"清单——单次 SOP pass 写一次，专项轮次清理。**已在 SOP §Step 5 提及但未建文件——下一所学校开始前建。**
