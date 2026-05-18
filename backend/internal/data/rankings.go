package data

// Ranking lists below are static slug lists in conventional prestige order.
// Slug = school file name in data/schools/cn/. Entries without a data file
// are silently skipped at request time (repo.Schools.ListByIDs), so it's safe
// to list canonical members even before we've added their data file.

// C9Order — 九校联盟, 9 schools.
var C9Order = []string{
	"pku", "tsinghua",
	"fudan", "sjtu", "zju", "nju", "ustc", "hit", "xjtu",
}

// Order985 — 985工程, 39 schools (官方名单).
var Order985 = []string{
	// C9
	"pku", "tsinghua", "fudan", "sjtu", "zju", "nju", "ustc", "hit", "xjtu",
	// 北京
	"ruc", "bnu", "buaa", "bit", "cau", "muc",
	// 华北/东北
	"nankai", "tju", "dlut", "neu", "jlu",
	// 华东
	"tongji", "ecnu", "seu", "xmu", "sdu", "ouc",
	// 华中/华南
	"whu", "hust", "hnu", "csu", "sysu", "scut",
	// 西南/西北
	"scu", "uestc", "cqu", "nwpu", "nwafu", "lzu",
	// 军校
	"nudt",
}

// Order211 — 211工程, 116 schools (官方名单).
// All 39 of 985 are also 211; rest grouped by province.
var Order211 = []string{
	// 985 first
	"pku", "tsinghua", "fudan", "sjtu", "zju", "nju", "ustc", "hit", "xjtu",
	"ruc", "bnu", "buaa", "bit", "cau", "muc",
	"nankai", "tju", "dlut", "neu", "jlu",
	"tongji", "ecnu", "seu", "xmu", "sdu", "ouc",
	"whu", "hust", "hnu", "csu", "sysu", "scut",
	"scu", "uestc", "cqu", "nwpu", "nwafu", "lzu", "nudt",
	// 非985 211 —— 北京
	"bjtu", "bjut", "ustb", "buct", "bupt", "bjfu", "bucm", "bfsu",
	"cuc", "cufe", "uibe", "cupl", "ncepu",
	"cumtb", "cup", "cugb", "ccom", "bsu",
	// 天津 / 河北 / 山西 / 内蒙
	"tjmu", "hebut", "tyut", "imu",
	// 辽宁 / 吉林 / 黑龙江
	"lnu", "dlmu", "ybu", "nenu", "hrbeu", "neau", "nefu",
	// 上海
	"ecust", "dhu", "shu", "shufe", "shisu", "smmu",
	// 江苏
	"suda", "njnu", "njust", "nuaa", "hhu", "jiangnan", "cumt", "njau", "cpu",
	// 安徽 / 福建 / 江西 / 山东
	"hfut", "ahu", "fzu", "ncu", "upc",
	// 河南 / 湖北 / 湖南
	"zzu",
	"whut", "cug", "ccnu", "hzau", "zuel",
	"hunnu",
	// 广东 / 广西 / 海南
	"jnu", "scnu", "gxu", "hainanu",
	// 重庆 / 四川 / 云南 / 贵州 / 西藏
	"swu", "swjtu", "swufe", "sicau", "ynu", "gzu", "utibet",
	// 陕西 / 甘肃 / 青海 / 宁夏 / 新疆
	"xidian", "chd", "snnu", "fmmu",
	"qhu", "nxu", "xju", "shzu",
}

// OrderQS30 — 中国大陆高校进入 QS 世界大学排名前 30 名（2026 版）.
var OrderQS30 = []string{
	"pku",      // #14
	"tsinghua", // #20
}

// OrderShuangYiLiu — 双一流建设高校（2022 年第二轮，共 147 所）.
// 顺序：985 / 211非985 / 非211一流学科建设高校 / 2022年新增.
var OrderShuangYiLiu = []string{
	// 985 (39)
	"pku", "tsinghua", "fudan", "sjtu", "zju", "nju", "ustc", "hit", "xjtu",
	"ruc", "bnu", "buaa", "bit", "cau", "muc",
	"nankai", "tju", "dlut", "neu", "jlu",
	"tongji", "ecnu", "seu", "xmu", "sdu", "ouc",
	"whu", "hust", "hnu", "csu", "sysu", "scut",
	"scu", "uestc", "cqu", "nwpu", "nwafu", "lzu", "nudt",
	// 211 非985
	"bjtu", "bjut", "ustb", "buct", "bupt", "bjfu", "bucm", "bfsu",
	"cuc", "cufe", "uibe", "cupl", "ncepu",
	"cumtb", "cup", "cugb", "ccom", "bsu",
	"tjmu", "hebut", "tyut", "imu",
	"lnu", "dlmu", "ybu", "nenu", "hrbeu", "neau", "nefu",
	"ecust", "dhu", "shu", "shufe", "shisu", "smmu",
	"suda", "njnu", "njust", "nuaa", "hhu", "jiangnan", "cumt", "njau", "cpu",
	"hfut", "ahu", "fzu", "ncu", "upc",
	"zzu", "whut", "cug", "ccnu", "hzau", "zuel", "hunnu",
	"jnu", "scnu", "gxu", "hainanu",
	"swu", "swjtu", "swufe", "sicau", "ynu", "gzu", "utibet",
	"xidian", "chd", "snnu", "fmmu",
	"qhu", "nxu", "xju", "shzu",
	// 非211 一流学科建设高校（2017年首轮新增）
	"pumc",                              // 北京协和医学院
	"cafa", "chntheatre", "ccmusic",     // 北京艺术院校
	"caa", "shcmusic", "sus",            // 长三角艺术体育院校
	"shutcm", "shou", "shmtu",           // 上海专业院校
	"njucm", "njupt", "nuist", "njfu",   // 南京专业院校
	"henu", "nbu", "cdut",               // 河南/浙江/四川
	"tiangong", "tjutcm",                    // 天津专业院校
	"gzucm", "cdutcm", "hljucm",         // 中医药院校
	"fjnu", "ppsuc",                     // 福建师大 / 公安大学
	// 2022 年新增（7 所）
	"sxu", "njmu", "xtu", "scau", "gzhmu", "sustech", "shanghaitech",
}
