// 値段タイムマシンの問題を作る（ブラウザと node の両方で使う）。
// 中身は、総務省統計局の次の2つの数字と、消費者物価指数のページに書いてあることだけ（2026-11-26 に読んだ。要点は共有フォルダ games/nedan-research.md）。
//  - 消費者物価指数 2025年基準 長期時系列データ 東京都区部 年平均「持家の帰属家賃を除く総合指数（1947年～最新年）」（e-Stat）
//  - 小売物価統計調査「主要品目の東京都区部小売価格：昭和25年(1950年)～平成22年(2010年)」と、同 2025年 年報の東京都区部の年平均価格
//    （はがき・封書・新聞・映画は全国統一価格品目の価格）
// 品物の名前は一般名だけ（銘柄の商品名・会社名は書かない）。銘柄の決め方が途中で変わった品物は、今と同じ決め方の年だけを使う。
// 1問は、昔の値段を物価指数で今（2025年）のお金に直すと約いくらかを選び（1段目）、正解したら今の本当の値段とくらべてどちらが高いかを選ぶ（2段目）。
// 物価指数の決まりの問題もある（2段目なし）。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・言い回し・まちがいの選び肢は、足すだけでも過去の日の問題が変わる（選ぶ範囲が変わるため）。公開したあとは変えず、変えるときは qa/run.mjs の PINS を作り直して PR に理由を書く。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const NOW = 2025;

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    cpi: ["総務省統計局「消費者物価指数（CPI）」", "https://www.stat.go.jp/data/cpi/index.html"],
    kouri: ["総務省統計局「小売物価統計調査（動向編）調査結果」", "https://www.stat.go.jp/data/kouri/doukou/3.html"],
  };

  // 消費者物価指数（東京都区部・持家の帰属家賃を除く総合・年平均・2025年=100）
  const CPI = { 1955: 14.2, 1960: 15.7, 1965: 21.2, 1970: 27.7, 1975: 47.4, 1980: 65.3, 1985: 75.7, 1990: 81.5, 1995: 86.5, 2000: 87.1, 2005: 84.6, 2010: 83.7, 2025: 100 };

  // 品物：一般名・数え方・今（2025年の年平均）の値段・昔の値段（東京都区部の年平均）
  // 年は、銘柄の決め方が今と同じ年だけ（例：食パンは1961年まで400g、ノートは1983年まで別の大きさ、卵とカップめんは2001年まで別の数え方）
  const ITEMS = {
    hagaki: { name: "はがき", per: "1通", now: 85, old: { 1955: 5, 1960: 5, 1965: 5, 1970: 7, 1975: 10, 1980: 20, 1985: 40, 1990: 41, 1995: 50, 2000: 50, 2005: 50, 2010: 50 } },
    fusho: { name: "手紙（封書）", per: "1通", now: 110, old: { 1955: 10, 1960: 10, 1965: 10, 1970: 15, 1975: 20, 1980: 50, 1985: 60, 1990: 62, 1995: 80, 2000: 80, 2005: 80, 2010: 80 } },
    shinbun: { name: "新聞（朝夕刊）", per: "1か月", now: 5025, old: { 1955: 330, 1960: 390, 1965: 580, 1970: 750, 1975: 1700, 1980: 1800, 1985: 2600, 1990: 3190, 1995: 3850, 2000: 3925, 2005: 3925, 2010: 3925 } },
    eiga: { name: "映画館（大人）", per: "1回", now: 1933, old: { 1955: 133, 1960: 119, 1965: 236, 1970: 351, 1975: 982, 1980: 1357, 1985: 1496, 1990: 1615, 1995: 1796, 2000: 1800, 2005: 1800, 2010: 1800 } },
    rihatsu: { name: "床屋さん（大人）", per: "1回", now: 4208, old: { 1955: 154, 1960: 163, 1965: 352, 1970: 555, 1975: 1430, 1980: 2227, 1985: 2603, 1990: 3006, 1995: 3437, 2000: 3612, 2005: 3701, 2010: 3686 } },
    pan: { name: "食パン", per: "1kg", now: 535, old: { 1965: 94.9, 1970: 116, 1975: 238, 1980: 316, 1985: 374, 1990: 386, 1995: 408, 2000: 422, 2005: 415, 2010: 438 } },
    ramen: { name: "ラーメン（お店）", per: "1杯", now: 604, old: { 1965: 62.9, 1970: 96, 1975: 211, 1980: 311, 1985: 383, 1990: 451, 1995: 486, 2000: 543, 2005: 559, 2010: 594 } },
    curry: { name: "カレーライス（お店）", per: "1皿", now: 873, old: { 1965: 105, 1970: 136, 1975: 284, 1980: 401, 1985: 489, 1990: 539, 1995: 610, 2000: 656, 2005: 668, 2010: 742 } },
    sushi: { name: "にぎりずし（お店）", per: "1人前", now: 1742, old: { 1970: 200, 1975: 476, 1980: 685, 1985: 812, 1990: 930, 1995: 1058, 2000: 1211, 2005: 1248, 2010: 1371 } },
    coffee: { name: "喫茶店のコーヒー", per: "1杯", now: 613, old: { 1965: 71.5, 1970: 95, 1975: 194, 1980: 247, 1985: 280, 1990: 351, 1995: 399, 2000: 418, 2005: 445, 2010: 411 } },
    note: { name: "ノート", per: "1冊", now: 207, old: { 1985: 102, 1990: 114, 1995: 126, 2000: 129, 2005: 130, 2010: 144 } },
    tamago: { name: "卵（10個）", per: "1パック", now: 307, old: { 2005: 231, 2010: 219 } },
    cupmen: { name: "カップめん", per: "1個", now: 192, old: { 2005: 140, 2010: 145 } },
  };

  // 2段目「今の本当の値段とくらべると？」の3つ。ちがいが1割までなら「ほぼ同じ」。
  // sub に数を書かない（書くと1段目の答えから2段目が分かる）
  const GROUPS = {
    ima: { name: "今のほうが高い", sub: "物価の上がり方より、値上がりが大きい" },
    onaji: { name: "ほぼ同じ", sub: "ちがいは一割まで" },
    mukashi: { name: "昔のほうが高い", sub: "物価ほどは値上がりしていない" },
  };
  // 境目（1割）に近すぎる組（比が 0.88〜0.92・1.08〜1.12）は、四捨五入で答えが変わりうるので問題にしない
  const ratioOf = (it, y) => (it.now * CPI[y]) / (it.old[y] * 100);
  const grpOfR = (r) => (r > 1.1 ? "ima" : r < 0.9 ? "mukashi" : "onaji");
  const nearEdge = (r) => (r >= 0.88 && r <= 0.92) || (r >= 1.08 && r <= 1.12);

  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end
  const MEDIA = { nedan: "昔の値札", kakeibo: "古い家計簿", kimari: "物価のきまり" };

  // 「約○円」の丸め方：100円未満は1円、1000円未満は10円、それより上は100円の単位
  const roundYen = (x) => (x < 100 ? Math.round(x) : x < 1000 ? Math.round(x / 10) * 10 : Math.round(x / 100) * 100);
  const yen = (x) => `${Number.isInteger(x) ? x.toLocaleString("en-US") : x.toFixed(1)}円`;
  const yen0 = (x) => `約${roundYen(x).toLocaleString("en-US")}円`;
  const mult = (y) => (100 / CPI[y]).toFixed(1);

  // 1段目のまちがいの選び肢：答えの何倍か。やさしいは遠いものから2つ、ふつうは3つ、むずかしいは近いもの（1.3倍・0.75倍）を1つ必ず入れて3つ
  const FAR = [0.5, 2, 3, 0.33, 0.2];
  const NEAR = [1.3, 0.75];
  function distract(R, ans, lv) {
    const ok = (f) => roundYen(ans * f) !== roundYen(ans);
    if (lv === 0) return pickN(R, FAR.filter(ok), 2);
    if (lv === 2) { const n1 = pickN(R, NEAR.filter(ok), 1); return [...n1, ...pickN(R, FAR.filter(ok), 2)]; }
    return pickN(R, FAR.filter(ok), 3);
  }
  // 問いの言い方（n：品物、p：昔の値段の文字、y：年）
  const SIT = [
    (n, p, y) => `${y}年の${n}は${p}。今のお金に直すと、約いくら？`,
    (n, p, y) => `タイムマシンで${y}年へ。${n}が${p}。今のお金だと？`,
    (n, p, y) => `${y}年の値札「${n} ${p}」。今のお金なら約いくら？`,
  ];
  const INFO = [
    (y) => `物価は${y}年から約${mult(y)}倍`,
    (y) => `物価は${y}年から約${mult(y)}倍`,
    (y) => `物価指数：${y}年 ${CPI[y]}・${NOW}年 100`,
  ];
  function conv(it, y) {
    const ans = (it.old[y] * 100) / CPI[y];
    return (R, lv) => {
      const si = ri(R, 0, SIT.length - 1), fs = distract(R, ans, lv);
      const opts = shuffle(R, [1, ...fs]).map((f) => yen0(ans * f));
      return { type: "act", media: si === 2 ? MEDIA.nedan : MEDIA.kakeibo, q: SIT[si](it.name, yen(it.old[y]), y), info: INFO[lv](y), opts, ans: yen0(ans), rev: false, v: `${si}:${fs.map((f) => (FAR.includes(f) ? "f" + FAR.indexOf(f) : "n" + NEAR.indexOf(f))).join(".")}` };
    };
  }
  // 年で難しさを決める：1970年まではやさしい（物価の差が大きい）、1975〜1990年はふつう、1995年からはむずかしい（差が小さく、ほぼ同じもある）
  const lvOfYear = (y) => (y <= 1970 ? 0 : y <= 1990 ? 1 : 2);
  const C = (iid, y) => {
    const it = ITEMS[iid], a = (it.old[y] * 100) / CPI[y], r = ratioOf(it, y), g = grpOfR(r), m = it.now / it.old[y];
    return {
      id: `${iid}${String(y).slice(2)}`, lv: lvOfYear(y), ans: yen0(a), grp: g, col: "conv", item: iid, year: y,
      name: `${y}年の${it.name}`,
      look: `昔の値段に、物価の倍率（約${mult(y)}倍）をかけます。`,
      key: `${yen(it.old[y])}×約${mult(y)}倍で、${yen0(a)}です。`,
      why: `${y}年の物価指数は${CPI[y]}、${NOW}年は100です。${yen(it.old[y])}×100÷${CPI[y]}で${yen0(a)}になります。`,
      gwhy: `今の${it.name}は${yen(it.now)}（${it.per}）。${yen0(a)}より${r >= 1 ? `約${Math.round((r - 1) * 100)}%高い` : `約${Math.round((1 - r) * 100)}%安い`}です。値段そのものは${y}年の約${m.toFixed(1)}倍です。`,
      ask2: `今の${it.name}は${yen(it.now)}。今のお金に直した昔の値段とくらべると？`,
      src: ["cpi", "kouri"], make: conv(it, y), r, m,
    };
  };
  // 決まりの問題。ans：答え、ws：まちがいの選び肢の候補（やさしいは2つ、ほかは3つ使う）、sit：問いの言い方
  function fact(col, sit, ans, ws) {
    return (R, lv) => {
      const si = ri(R, 0, sit.length - 1), ds = pickN(R, ws, lv === 0 ? 2 : 3);
      return { type: "fact", media: MEDIA[col], q: sit[si], info: "", opts: shuffle(R, [ans, ...ds]), ans, rev: false, v: `${si}:${ds.map((d) => ws.indexOf(d)).join(".")}` };
    };
  }
  const F = (id, lv, name, look, key, why, sit, ans, ws) => ({ id, lv, ans, grp: null, col: "kimari", name, look, key, why, gwhy: "", src: ["cpi"], make: fact("kimari", sit, ans, ws) });

  const FACTS = [
    F("hakaru", 0, "物価指数は値段の動きをはかる", "1つの品物でなく、まとめた値段です。", "消費者物価指数は、世帯が買う物やサービスの値段の動きをはかります。",
      "総務省統計局によると、消費者物価指数は、全国の世帯が買う物やサービスの値段をまとめた物価の動きをはかるものです。",
      ["消費者物価指数がはかるものは？", "物価指数は、何の動きを表す数？", "消費者物価指数で分かることは？"], "世帯が買う物やサービスの値段の動き", ["日本の人口の動き", "会社の数の動き", "1つの店の売り上げ", "給料の平均", "天気の変わり方"]),
    F("kijun", 0, "基準の年の指数は100", "今のゲームは2025年基準です。", "2025年基準の物価指数では、2025年が100です。",
      "総務省統計局の2025年基準の消費者物価指数では、2025年の年平均が100です。ほかの年は、それとくらべた数で表します。",
      ["2025年基準の物価指数で、2025年の値はいくつ？", "物価指数の「基準の年」の値は？", "2025年基準なら、2025年の指数は？"], "100", ["0", "1", "10", "1000", "50"]),
    F("maitsuki", 0, "物価指数は毎月作る", "年に1回ではありません。", "消費者物価指数は毎月作られています。",
      "総務省統計局は、消費者物価指数を毎月作っています。このゲームでは、1年分をならした年平均を使います。",
      ["消費者物価指数は、どのくらいの間かくで作られる？", "物価指数が作られるのは？", "総務省統計局が物価指数を作る間かくは？"], "毎月", ["10年に1回", "毎日", "5年に1回", "選挙のたび", "100年に1回"]),
    F("soumu", 1, "物価指数を作るのは総務省統計局", "国の統計を作る役所です。", "消費者物価指数は、総務省統計局が作っています。",
      "消費者物価指数は、総務省統計局が作っています。データを使うときは、出典を「総務省「消費者物価指数」」と書きます。",
      ["消費者物価指数を作っているのは？", "物価指数を作る国の役所は？", "このゲームの物価指数の出どころは？"], "総務省統計局", ["消防庁", "国税庁", "警察庁", "文化庁", "特許庁"]),
    F("kouri", 1, "品物の値段は小売物価統計調査から", "お店の値段を調べる調査です。", "物価指数に使う品物の値段は、小売物価統計調査で調べた小売価格です。",
      "総務省統計局によると、物価指数の品目の値段には、小売物価統計調査で調べた小売価格を使います。",
      ["物価指数の品物の値段は、どの調査から？", "物価指数に使う小売価格を調べる調査は？", "お店の値段を調べ、物価指数に使う調査は？"], "小売物価統計調査", ["国勢調査", "学校保健統計調査", "人口動態調査", "住宅・土地統計調査", "農林業センサス"]),
    F("weight", 1, "品物の重みは家計調査から", "家でどれだけお金を使うかの調査です。", "品物ごとの重み（ウエイト）は、家計調査の結果などをもとに決めます。",
      "総務省統計局によると、指数の計算に使う品目ごとのウエイト（重み）は、家計調査の結果などにもとづきます。",
      ["物価指数で、品物ごとの重みを決めるもとは？", "ウエイト（重み）のもとになる調査は？", "家でよく買う物ほど重くするための調査は？"], "家計調査", ["国勢調査", "経済センサス", "交通量調査", "体力テスト", "人口動態調査"]),
    F("nenkin", 2, "物価指数は年金の改定などに使われる", "くらしのお金の決まりに関係します。", "物価指数の結果は、経済の施策や年金の改定などに使われます。",
      "総務省統計局によると、消費者物価指数の結果は、いろいろな経済の施策や年金の改定などに使われています。",
      ["物価指数の結果が使われるのは？", "総務省統計局が挙げる、物価指数の使い道は？", "物価指数は何の改定に使われる？"], "年金の改定など", ["天気予報", "テストの点数", "地震の大きさ", "郵便番号", "電車の時刻表"]),
    F("tokyo", 2, "東京都区部の物価指数は全国より先に出る", "中旬の速報があります。", "東京都区部の物価指数は、その月の中旬の速報として、全国より先に出ます。",
      "総務省統計局のページでは、2026年10月分の東京都区部（中旬速報値）が10月30日、全国が11月20日に出ています。",
      ["東京都区部の物価指数と全国の物価指数。先に出るのは？", "物価指数で、中旬の速報があるのは？", "全国より早く出る物価指数は？"], "東京都区部", ["全国", "大阪市", "那覇市", "どれも同じ日", "札幌市"]),
  ];

  // 品物と年の組（境目に近すぎる組は入れない）
  const PAIRS = [];
  for (const iid of Object.keys(ITEMS)) for (const y of Object.keys(ITEMS[iid].old).map(Number)) if (!nearEdge(ratioOf(ITEMS[iid], y))) PAIRS.push(C(iid, y));
  const KINDS = [...PAIRS, ...FACTS];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  // 1問を作る。tag は「種類|種」（例 "hagaki70|2026-11-27:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: k.grp, gwhy: k.gwhy, ask2: k.ask2 || "", src: k.src.map((s) => SRC[s]), ...p };
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}`;

  // 今日の5問：やさしい2・ふつう2・むずかしい1（同じ品物は1日に1回まで）
  function takeN(R, ids, n, used) {
    const out = [];
    for (const id of shuffle(R, ids)) { if (out.length >= n) break; const it = BY[id].item; if (it && used.has(it)) continue; if (it) used.add(it); out.push(id); }
    return out;
  }
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), used = new Set();
    const ids = [...takeN(R, kindsOf(0), 2, used), ...takeN(R, kindsOf(1), 2, used), ...takeN(R, kindsOf(2), 1, used)];
    return ids.map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), used = new Set(BY[dh].item ? [BY[dh].item] : []);
    return takeN(R, kindsOf(2).filter((x) => x !== dh), 3, used).map((id, i) => `${id}|${date}:h${i}`);
  }

  const NDT = { KINDS, BY, GROUPS, LV, SRC, CPI, ITEMS, NOW, MEDIA, FAR, NEAR, roundYen, ratioOf, grpOfR, nearEdge, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = NDT; else root.NDT = NDT;
})(typeof self !== "undefined" ? self : this);
