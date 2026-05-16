package data

// C9Order is the C9 League (九校联盟) in conventional prestige order.
var C9Order = []string{
	"pku", "tsinghua",
	"fudan", "sjtu", "zju", "nju", "ustc", "hit", "xjtu",
}

// Order985 is the 985 Project — 39 schools in approximate conventional prestige order.
var Order985 = []string{
	// C9
	"pku", "tsinghua", "fudan", "sjtu", "zju", "nju", "ustc", "hit", "xjtu",
	// Tier 2
	"ruc", "bnu", "nankai", "tju", "dlut", "jlu", "hrbu",
	"tongji", "seu", "xmu", "sdu",
	"whu", "hust", "csu", "sysu", "scut", "cqu",
	"uestc", "nwpu", "lzu",
	// Tier 3
	"buaa", "bit", "cau", "muc", "neu", "neau", "zzu",
	"nju-normal", "hunan",
}

// Order211 is the 211 Project — ~116 schools, ordered by tier then geography.
var Order211 = []string{
	// 985 schools first (all 39 of them are also 211)
	"pku", "tsinghua", "fudan", "sjtu", "zju", "nju", "ustc", "hit", "xjtu",
	"ruc", "bnu", "nankai", "tju", "dlut", "jlu", "hrbu",
	"tongji", "seu", "xmu", "sdu",
	"whu", "hust", "csu", "sysu", "scut", "cqu",
	"uestc", "nwpu", "lzu",
	"buaa", "bit", "cau", "muc", "neu", "neau", "zzu",
	"nju-normal", "hunan",
	// Pure 211 (non-985)
	// Beijing
	"bfsu", "bupt", "ustb", "cuc", "cupl", "cueb", "bju", "bjut", "cuf",
	"bjlg", "ncepu", "bjty", "bjhy",
	// Shanghai
	"shu", "ecnu", "shisu", "shufe", "ecust", "dhu",
	// Jiangsu
	"suda", "nuaa", "njust", "cumt", "hhdx", "jiangnan", "nanjing-nongye",
	// Hubei
	"whut", "ccnu", "znufe", "huanong",
	// Guangdong
	"jnu", "scnu",
	// Shaanxi
	"xidian", "snnu", "nwafu", "chd",
	// Sichuan
	"swjtu", "swufe", "sicau",
	// Tianjin
	"tjmu", "hebut",
	// Liaoning
	"lnu", "dlmu",
	// Heilongjiang
	"hlju", "nefu",
	// Shandong
	"ouc",
	// Anhui
	"ahu", "hfut",
	// Zhejiang
	"zju-tech",
	// Fujian
	"fzu",
	// Hunan
	"hnu", "csust",
	// Chongqing
	"swu",
	// Gansu
	"gsu",
	// Yunnan
	"ynu",
	// Guizhou
	"gzu",
	// Guangxi
	"gxu",
	// Xinjiang
	"xju", "shzu",
	// Inner Mongolia
	"imu",
	// Ningxia
	"nxu",
	// Qinghai
	"qhu",
	// Tibet
	"tibet-university",
	// Hainan
	"hainu",
	// Henan
	"henu",
	// Jiangxi
	"ncu",
	// Shanxi
	"sxu",
	// Hebei
	"hebau",
	// Jilin
	"nenu",
}

// OrderQS30 is Chinese universities in 2026 QS World top 30, by QS rank.
var OrderQS30 = []string{
	"pku",      // #14
	"tsinghua", // #20
}
