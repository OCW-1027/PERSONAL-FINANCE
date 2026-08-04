// ============================================================
// PERSONAL-FINANCE : app.js  v1.0
// 個人事業主 財務管理システム
// ============================================================
'use strict';
const PFX = 'pf_';
let D = {}, SET = {}, A = [];

// ---------- Storage ----------
function loadD() {
  try { D = JSON.parse(localStorage.getItem(PFX + 'data')) || {}; } catch (e) { D = {}; }
  try { SET = JSON.parse(localStorage.getItem(PFX + 'set')) || {}; } catch (e) { SET = {}; }
  D.journals = D.journals || INIT_JOURNALS.slice();
  D.vendors = D.vendors || INIT_VENDORS.slice();
  D.templates = D.templates || INIT_TEMPLATES.slice();
  D.assets = D.assets || INIT_ASSETS.slice();
  D.realEstate = D.realEstate || INIT_REALESTATE.slice();
  D.customAccts = D.customAccts || [];
  D.seq = D.seq || 0;
  SET = Object.assign({}, DEF_SET, SET);
  A = ACCT_INIT.concat(D.customAccts);
}
function saveD() { D._saved = new Date().toISOString(); localStorage.setItem(PFX + 'data', JSON.stringify(D)); }
function saveS() { localStorage.setItem(PFX + 'set', JSON.stringify(SET)); }
function nid() { return ++D.seq; }

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const yen = n => (n == null || isNaN(n)) ? '-' : Math.round(n).toLocaleString('ja-JP');
const acct = c => A.find(a => a.c == +c) || { c: c, n: '?', k: 'E' };
const acctName = c => acct(c).n;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2600);
}
function inFY(dt) { const y = +String(dt).slice(0, 4); return y === +SET.fy; }
function jOfFY() { return D.journals.filter(j => inFY(j.dt)); }

// ---------- 家事按分 ----------
function ratioOf(code) {
  const a = acct(code);
  if (!a.h) return 1;
  const r = SET.ratios[code];
  return (r == null) ? 1 : r;
}
// 事業分金額
function bizAmt(j) { return Math.round((j.amt || 0) * (j.ratio != null ? j.ratio : ratioOf(j.dr))); }

// ---------- 開業費 ----------
function openingExpTotal() {
  const od = SET.openDate;
  if (!od) return 0;
  return D.journals.filter(j => j.dt < od && acct(j.dr).k === 'E')
    .reduce((s, j) => s + bizAmt(j), 0);
}
function openingExpAmort(y) { return (SET.openingExpense.amortized || {})[y || SET.fy] || 0; }

// ---------- 集計エンジン ----------
function acctBal(code, incType) {
  let s = 0;
  jOfFY().forEach(j => {
    if (incType && j.inc && j.inc !== incType) return;
    if (SET.openDate && j.dt < SET.openDate && acct(j.dr).k === 'E') return; // 開業費は除外
    const amt = bizAmt(j);
    if (j.dr == code) s += amt;
    if (j.cr == code) s -= amt;
  });
  return s;
}
// 収益/費用は符号調整
function plAmt(code) {
  const k = acct(code).k;
  const v = acctBal(code);
  return (k === 'R') ? -v : v;
}

// 損益計算 (income: BIZ | RE)
function calcPL(inc) {
  const rev = [], exp = [];
  A.forEach(a => {
    if (a.k !== 'R' && a.k !== 'E') return;
    if (inc === 'BIZ' && (a.inc === 'RE')) return;
    if (inc === 'RE' && a.inc !== 'RE') return;
    let s = 0;
    jOfFY().forEach(j => {
      if (SET.openDate && j.dt < SET.openDate && acct(j.dr).k === 'E') return;
      const ji = j.inc || 'BIZ';
      if (inc && ji !== inc) return;
      const amt = bizAmt(j);
      if (j.dr == a.c) s += amt;
      if (j.cr == a.c) s -= amt;
    });
    if (!s) return;
    if (a.k === 'R') rev.push({ c: a.c, n: a.n, v: -s });
    else exp.push({ c: a.c, n: a.n, v: s, d: a.d || 99 });
  });
  exp.sort((x, y) => x.d - y.d);
  // 開業費償却を費用に加算
  const am = openingExpAmort();
  if (inc !== 'RE' && am) exp.push({ c: 530, n: '開業費償却', v: am, d: 23 });
  const rv = rev.reduce((s, x) => s + x.v, 0);
  const ev = exp.reduce((s, x) => s + x.v, 0);
  return { rev, exp, revTotal: rv, expTotal: ev, income: rv - ev };
}

// 貸借対照表
function calcBS() {
  const asset = [], liab = [], cap = [];
  const amort = Object.values(SET.openingExpense.amortized || {}).reduce((x, y) => x + y, 0);
  const openTot = openingExpTotal();
  A.forEach(a => {
    if (a.k === 'R' || a.k === 'E') return;
    if (a.c === 135 || a.c === 150 || a.c === 250 || a.c === 310) return; // 後で個別計上
    let s = 0;
    jOfFY().forEach(j => {
      if (SET.openDate && j.dt < SET.openDate) return;   // 開業前は開業費に集約
      const amt = bizAmt(j);
      if (j.dr == a.c) s += amt;
      if (j.cr == a.c) s -= amt;
    });
    if (!s) return;
    if (a.k === 'A') asset.push({ c: a.c, n: a.n, v: s, g: a.g });
    else if (a.k === 'L') liab.push({ c: a.c, n: a.n, v: -s, g: a.g });
    else cap.push({ c: a.c, n: a.n, v: -s, g: a.g });
  });
  // 開業費 (繰延資産) = 開業前支出 − 償却済
  const openBal = openTot - amort;
  if (openBal) asset.push({ c: 135, n: '開業費', v: openBal, g: '繰延資産' });
  // 事業主貸 = 家事分 (開業後)
  let draw = 0;
  jOfFY().forEach(j => { if (!(SET.openDate && j.dt < SET.openDate)) draw += (j.amt || 0) - bizAmt(j); });
  if (draw) asset.push({ c: 150, n: '事業主貸', v: draw, g: '事業主' });
  const at = asset.reduce((s, x) => s + x.v, 0);
  const lt = liab.reduce((s, x) => s + x.v, 0);
  const pl = calcPL('BIZ'), plRE = calcPL('RE');
  const income = pl.income + plRE.income;
  // 事業主借 = 貸借を一致させる調達額 (個人資金の投入)
  const motoire = D.motoire || 0;
  const borrow = at - lt - motoire - income;
  if (borrow) liab.push({ c: 250, n: '事業主借', v: borrow, g: '事業主' });
  if (motoire) cap.push({ c: 300, n: '元入金', v: motoire, g: '資本' });
  cap.push({ c: 310, n: '青色申告特別控除前所得', v: income, g: '資本' });
  const lt2 = liab.reduce((s, x) => s + x.v, 0);
  const ct = cap.reduce((s, x) => s + x.v, 0);
  return { asset, liab, cap, assetTotal: at, liabTotal: lt2, capTotal: ct, diff: at - lt2 - ct };
}

// ---------- 税額計算 ----------
function blueDed() {
  const t = SET.filingType;
  return TAX.blueDeduction[t === 'blue65' ? 'etax' : t === 'blue55' ? 'paper' : t === 'blue10' ? 'simple' : 'white'];
}
function basicDed(total) {
  for (const [cap, v] of TAX.basicDeduction) if (total <= cap) return v;
  return 0;
}
function disabledDed(resident) {
  const t = SET.deductionSet.disabledType, d = TAX.deductions;
  if (t === 'liveTogether') return resident ? d.disabledLiveTogetherResident : d.disabledLiveTogether;
  if (t === 'special') return resident ? d.disabledSpecialResident : d.disabledSpecial;
  if (t === 'normal') return resident ? d.disabledResident : d.disabled;
  return 0;
}
function incomeTax(g) {
  for (const [cap, r, ded] of TAX.brackets) if (g <= cap) return Math.max(0, (g * r - ded)) * (1 + TAX.reconstructionRate);
  return 0;
}
function kokuhoPremium(income) {
  const k = TAX.kokuho;
  const base = Math.min(k.cap, Math.max(k.base, (Math.max(0, income) - k.deduction) * k.rate + k.base));
  return Math.round(base);
}
function calcTax() {
  const biz = calcPL('BIZ').income, re = calcPL('RE').income;
  const bd = blueDed();
  const bizNet = Math.max(0, biz - bd);
  const total = bizNet + re;                      // 総合課税 合計所得
  const ds = SET.deductionSet;
  const social = ds.socialInsurance || 0;
  const dedI = social + basicDed(total) + (ds.spouse ? TAX.deductions.spouse : 0) + disabledDed(false)
    + (ds.lifeInsurance || 0) + (ds.medical || 0) + (ds.other || 0);
  const dedR = social + TAX.basicDeductionResident + (ds.spouse ? TAX.deductions.spouseResident : 0) + disabledDed(true)
    + (ds.lifeInsurance || 0) + (ds.medical || 0) + (ds.other || 0);
  const taxableI = Math.max(0, total - dedI);
  const taxableR = Math.max(0, total - dedR);
  const it = Math.round(incomeTax(taxableI));
  const rt = Math.round(taxableR * TAX.residentRate + TAX.residentPerCapita);
  const bt = Math.round(Math.max(0, (biz + re) - TAX.bizTaxDeduction) * TAX.bizTaxRate);
  // 分離課税
  const sep = SET.separateIncome || {};
  const sepTax = Math.round((Math.max(0, sep.stock || 0) + Math.max(0, sep.cfd || 0)) * 0.20315);
  // 手当 判定所得
  const th = TAX.allowanceThreshold;
  const limit = th.base + Math.max(0, (ds.dependents || 0) - th.baseDependents) * th.perDependent;
  const judge = Math.max(0, total - 80000 - disabledDed(false));
  return {
    biz, re, blueDed: bd, total, taxableI, taxableR,
    incomeTax: it, residentTax: rt, bizTax: bt, sepTax,
    totalTax: it + rt + bt + sepTax,
    judge, limit, keep: judge < limit,
    kokuho: kokuhoPremium(total)
  };
}

// ---------- ナビ ----------
function go(p) {
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.p === p));
  location.hash = p;
  const f = { dash: rDash, slip: rSlip, jrn: rJrn, gl: rGL, fs: rFS, re: rRE, tax: rTax, set: rSet }[p];
  if (f) f();
}

// ---------- ダッシュボード ----------
function rDash() {
  const t = calcTax();
  const pct = Math.min(100, t.limit ? t.judge / t.limit * 100 : 0);
  const bar = t.keep ? (pct > 85 ? 'warn' : 'ok') : 'bad';
  const pl = calcPL('BIZ');
  let h = `<h2>ダッシュボード <span class="sub">${SET.fy}年</span></h2>`;
  if (SET.allowanceTrack) {
    h += `<div class="card gauge">
      <div class="grow"><b>判定所得</b> <span class="big">${yen(t.judge)}</span> / ${yen(t.limit)}
      <div class="bar"><i class="${bar}" style="width:${pct}%"></i></div>
      <small>事業所得＋不動産所得 − 80,000 − 障害者控除</small></div>
      <div class="badge ${t.keep ? 'ok' : 'bad'}">${t.keep ? '手当 維持' : '手当 停止'}</div></div>`;
    if (!t.keep) {
      const need = t.judge - t.limit + 1;
      h += `<div class="alert bad">⚠ 判定所得が限度を ${yen(need)} 超過。経費 ${yen(need)} 追加で維持可能。</div>`;
    }
  }
  h += `<div class="grid4">
    ${kpi('売上', pl.revTotal)}${kpi('経費', pl.expTotal)}${kpi('事業所得', pl.income)}${kpi('税金＋保険', t.totalTax + t.kokuho)}
  </div>`;
  h += `<div class="grid2">
    <div class="card"><h3>税額内訳</h3><table class="tb">
      <tr><td>所得税</td><td class="r">${yen(t.incomeTax)}</td></tr>
      <tr><td>住民税</td><td class="r">${yen(t.residentTax)}</td></tr>
      <tr><td>個人事業税</td><td class="r">${yen(t.bizTax)}</td></tr>
      ${t.sepTax ? `<tr><td>分離課税(株式・CFD)</td><td class="r">${yen(t.sepTax)}</td></tr>` : ''}
      <tr class="tot"><td>合計</td><td class="r">${yen(t.totalTax)}</td></tr>
      <tr><td class="mut">国民健康保険(目安)</td><td class="r mut">${yen(t.kokuho)}</td></tr>
    </table></div>
    <div class="card"><h3>お知らせ</h3>${alerts()}</div></div>`;
  h += `<div class="card"><h3>月別 推移</h3>${monthTable()}</div>`;
  $('#v').innerHTML = h;
}
function kpi(l, v) { return `<div class="card kpi"><small>${l}</small><b>${yen(v)}</b></div>`; }
function alerts() {
  const now = new Date().toISOString().slice(0, 10);
  const list = [
    ['2026-12-31', '消費税課税事業者選択届 (還付を受ける場合)'],
    ['2027-03-15', '⚠ 青色申告承認申請書 提出期限 (65万控除)'],
    ['2027-03-15', `${SET.fy}年分 確定申告`],
    ['2027-08-31', '障害児手当 現況届'],
  ].filter(x => x[0] >= now);
  if (!list.length) return '<p class="mut">予定なし</p>';
  return '<table class="tb">' + list.map(x => {
    const d = Math.ceil((new Date(x[0]) - new Date(now)) / 86400000);
    return `<tr><td>${x[0]}</td><td>${x[1]}</td><td class="r ${d < 60 ? 'bad' : ''}">D-${d}</td></tr>`;
  }).join('') + '</table>';
}
function monthTable() {
  const m = {};
  jOfFY().forEach(j => {
    const k = j.dt.slice(0, 7), a = acct(j.dr);
    m[k] = m[k] || { r: 0, e: 0 };
    if (acct(j.cr).k === 'R') m[k].r += bizAmt(j);
    if (a.k === 'E' && !(SET.openDate && j.dt < SET.openDate)) m[k].e += bizAmt(j);
  });
  const ks = Object.keys(m).sort();
  if (!ks.length) return '<p class="mut">データなし</p>';
  return `<table class="tb"><tr><th>月</th><th class="r">収入</th><th class="r">経費</th><th class="r">差引</th></tr>` +
    ks.map(k => `<tr><td>${k}</td><td class="r">${yen(m[k].r)}</td><td class="r">${yen(m[k].e)}</td><td class="r">${yen(m[k].r - m[k].e)}</td></tr>`).join('') + '</table>';
}

// ---------- 伝票入力 ----------
function rSlip() {
  const opts = k => A.filter(a => !k || a.k === k).map(a => `<option value="${a.c}">${a.c} ${a.n}</option>`).join('');
  $('#v').innerHTML = `<h2>伝票処理</h2>
  <div class="card"><h3>新規入力</h3>
    <div class="form">
      <label>日付<input type="date" id="f_dt" value="${new Date().toISOString().slice(0, 10)}"></label>
      <label>借方(費用・資産)<select id="f_dr">${opts()}</select></label>
      <label>貸方(支払元)<select id="f_cr">${opts()}</select></label>
      <label>金額(税込)<input type="number" id="f_amt" placeholder="0"></label>
      <label>摘要<input id="f_desc" placeholder="内容"></label>
      <label>相手先 <span class="req">*必須</span><input id="f_ven" placeholder="不明時は業種(レストラン等)"></label>
      <label>税区分<select id="f_tax"><option>課10</option><option>課8</option><option>不課税</option><option>非課税</option><option>免税</option></select></label>
      <label>所得区分<select id="f_inc"><option value="BIZ">事業</option><option value="RE">不動産</option></select></label>
    </div>
    <div class="row"><button class="btn" onclick="addSlip()">登録</button>
    <span id="f_hint" class="mut"></span></div>
  </div>
  <div class="card"><h3>CSV / Excel 一括取込</h3>
    <p class="mut">列: 日付, 勘定科目, 摘要, 相手先, 税区分, 金額 — 経費台帳をそのまま貼り付け可</p>
    <textarea id="f_csv" rows="6" placeholder="2026-07-31	旅費交通費	ASE渋谷出張 往復航空券	JAL	課10	37420"></textarea>
    <div class="row"><button class="btn" onclick="importCSV()">取込</button>
    <button class="btn gray" onclick="$('#f_csv').value=''">クリア</button></div>
    <div id="imp"></div>
  </div>`;
  $('#f_cr').value = 250;
}
function addSlip() {
  const dt = $('#f_dt').value, dr = +$('#f_dr').value, cr = +$('#f_cr').value;
  const amt = +$('#f_amt').value, desc = $('#f_desc').value.trim(), ven = $('#f_ven').value.trim();
  if (!dt || !amt) return toast('日付と金額を入力してください', 'bad');
  if (!ven) return toast('相手先は必須です(不明時は業種名)', 'bad');
  D.journals.push({ id: nid(), dt, dr, cr, amt, desc, vendor: ven, tax: $('#f_tax').value, inc: $('#f_inc').value });
  saveD(); toast('登録しました', 'ok');
  $('#f_amt').value = ''; $('#f_desc').value = '';
}
const ACCT_ALIAS = {};
function buildAlias() { A.forEach(a => { ACCT_ALIAS[a.n] = a.c; }); }
function importCSV() {
  buildAlias();
  const txt = $('#f_csv').value.trim();
  if (!txt) return toast('データを貼り付けてください', 'bad');
  const rows = txt.split('\n').map(l => l.split(/\t|,/).map(s => s.trim().replace(/^"|"$/g, '')));
  let ok = 0, skip = 0, err = [];
  const seen = new Set(D.journals.map(j => j.dt + '|' + j.amt + '|' + (j.desc || '')));
  rows.forEach((r, i) => {
    if (r.length < 3) return;
    const dt = r[0], an = r[1], desc = r[2] || '', ven = r[3] || '', tx = r[4] || '課10';
    const amt = +String(r[5] || r[4] || '').replace(/[^0-9.-]/g, '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dt) || !amt) { err.push(`${i + 1}行: 日付/金額`); return; }
    const code = ACCT_ALIAS[an];
    if (!code) { err.push(`${i + 1}行: 未知の科目「${an}」`); return; }
    const key = dt + '|' + amt + '|' + desc;
    if (seen.has(key)) { skip++; return; }
    D.journals.push({ id: nid(), dt, dr: code, cr: 250, amt, desc, vendor: ven || '(要確認)', tax: tx, inc: acct(code).inc || 'BIZ' });
    seen.add(key); ok++;
  });
  saveD();
  $('#imp').innerHTML = `<div class="alert ${err.length ? 'warn' : 'ok'}">取込 ${ok}件 / 重複スキップ ${skip}件 / エラー ${err.length}件
    ${err.length ? '<ul><li>' + err.slice(0, 10).map(esc).join('</li><li>') + '</li></ul>' : ''}</div>`;
  toast(`${ok}件 取込`, 'ok');
}

// ---------- 伝票照会 ----------
function rJrn() {
  const js = jOfFY().slice().sort((a, b) => a.dt < b.dt ? 1 : -1);
  $('#v').innerHTML = `<h2>伝票照会 <span class="sub">${js.length}件</span></h2>
  <div class="card"><input id="q" placeholder="検索 (摘要・相手先)" oninput="rJrnList()"><div id="jl"></div></div>`;
  rJrnList();
}
function rJrnList() {
  const q = ($('#q') && $('#q').value || '').toLowerCase();
  const js = jOfFY().filter(j => !q || (j.desc || '').toLowerCase().includes(q) || (j.vendor || '').toLowerCase().includes(q))
    .sort((a, b) => a.dt < b.dt ? 1 : -1);
  $('#jl').innerHTML = `<table class="tb"><tr><th>日付</th><th>科目</th><th>摘要</th><th>相手先</th><th class="r">金額</th><th class="r">事業分</th><th></th></tr>` +
    js.map(j => `<tr><td>${j.dt}</td><td>${esc(acctName(j.dr))}</td><td>${esc(j.desc)}</td><td class="mut">${esc(j.vendor)}</td>
    <td class="r">${yen(j.amt)}</td><td class="r">${bizAmt(j) !== j.amt ? '<b>' + yen(bizAmt(j)) + '</b>' : ''}</td>
    <td><a href="#" onclick="delSlip(${j.id});return false" class="del">×</a></td></tr>`).join('') + '</table>';
}
function delSlip(id) {
  if (!confirm('削除しますか？')) return;
  D.journals = D.journals.filter(j => j.id !== id); saveD(); rJrnList(); toast('削除しました');
}

// ---------- 総勘定元帳 ----------
function rGL() {
  const used = [...new Set(jOfFY().flatMap(j => [j.dr, j.cr]))].sort((a, b) => a - b);
  $('#v').innerHTML = `<h2>総勘定元帳</h2><div class="card">
    <select id="glc" onchange="rGLBody()">${used.map(c => `<option value="${c}">${c} ${esc(acctName(c))}</option>`).join('')}</select>
    <div id="glb"></div></div>`;
  rGLBody();
}
function rGLBody() {
  const c = +$('#glc').value; let bal = 0;
  const js = jOfFY().filter(j => j.dr == c || j.cr == c).sort((a, b) => a.dt > b.dt ? 1 : -1);
  $('#glb').innerHTML = `<h3>${c} ${esc(acctName(c))}</h3><table class="tb">
    <tr><th>日付</th><th>摘要</th><th>相手先</th><th class="r">借方</th><th class="r">貸方</th><th class="r">残高</th></tr>` +
    js.map(j => {
      const v = bizAmt(j), dr = j.dr == c ? v : 0, cr = j.cr == c ? v : 0;
      bal += dr - cr;
      return `<tr><td>${j.dt}</td><td>${esc(j.desc)}</td><td class="mut">${esc(j.vendor)}</td>
      <td class="r">${dr ? yen(dr) : ''}</td><td class="r">${cr ? yen(cr) : ''}</td><td class="r">${yen(bal)}</td></tr>`;
    }).join('') + `<tr class="tot"><td colspan="5">残高</td><td class="r">${yen(bal)}</td></tr></table>`;
}

// ---------- 決算書 ----------
let fsTab = 'pl';
function rFS() {
  $('#v').innerHTML = `<h2>決算書</h2>
  <div class="tabs">${[['pl', '損益計算書'], ['bs', '貸借対照表'], ['blue', '青色申告決算書'], ['white', '収支内訳書(白色)'], ['ratio', '家事按分'], ['open', '開業費']]
      .map(t => `<a href="#" onclick="fsTab='${t[0]}';rFSBody();return false" class="${fsTab === t[0] ? 'on' : ''}">${t[1]}</a>`).join('')}</div>
  <div id="fsb"></div>`;
  rFSBody();
}
function rFSBody() {
  document.querySelectorAll('.tabs a').forEach((a, i) => a.classList.toggle('on', ['pl', 'bs', 'blue', 'white', 'ratio', 'open'][i] === fsTab));
  const f = { pl: fsPL, bs: fsBS, blue: fsBlue, white: fsWhite, ratio: fsRatio, open: fsOpen }[fsTab];
  $('#fsb').innerHTML = f();
}
function fsPL() {
  const b = calcPL('BIZ'), r = calcPL('RE');
  const sec = (t, o) => `<div class="card"><h3>${t}</h3><table class="tb">
    <tr class="hd"><td>【収入】</td><td class="r"></td></tr>
    ${o.rev.map(x => `<tr><td>${esc(x.n)}</td><td class="r">${yen(x.v)}</td></tr>`).join('')}
    <tr class="sub2"><td>収入 計</td><td class="r">${yen(o.revTotal)}</td></tr>
    <tr class="hd"><td>【経費】</td><td class="r"></td></tr>
    ${o.exp.map(x => `<tr><td>${esc(x.n)}</td><td class="r">${yen(x.v)}</td></tr>`).join('')}
    <tr class="sub2"><td>経費 計</td><td class="r">${yen(o.expTotal)}</td></tr>
    <tr class="tot"><td>差引金額</td><td class="r">${yen(o.income)}</td></tr></table></div>`;
  return `<div class="grid2">${sec('事業所得', b)}${r.revTotal || r.expTotal ? sec('不動産所得', r) : ''}</div>`;
}
function fsBS() {
  const b = calcBS();
  const col = (t, arr, tot) => `<div class="card"><h3>${t}</h3><table class="tb">
    ${arr.map(x => `<tr><td>${esc(x.n)}</td><td class="r">${yen(x.v)}</td></tr>`).join('')}
    <tr class="tot"><td>合計</td><td class="r">${yen(tot)}</td></tr></table></div>`;
  return `<div class="grid2">${col('資産の部', b.asset, b.assetTotal)}
    <div>${col('負債の部', b.liab, b.liabTotal)}${col('資本の部', b.cap, b.capTotal)}</div></div>
    ${Math.abs(b.diff) > 1 ? `<div class="alert warn">貸借差額 ${yen(b.diff)} — 事業主貸/借の調整が必要です</div>` : '<div class="alert ok">貸借一致 ✓</div>'}`;
}
function fsBlue() {
  const t = calcTax(), b = calcPL('BIZ');
  return `<div class="card"><h3>青色申告決算書 (一般用) — 損益計算書</h3>
  <table class="tb">
    <tr><td>売上(収入)金額</td><td class="r">${yen(b.revTotal)}</td></tr>
    <tr><td>経費 計</td><td class="r">${yen(b.expTotal)}</td></tr>
    <tr class="sub2"><td>差引金額</td><td class="r">${yen(b.income)}</td></tr>
    <tr><td>青色申告特別控除額</td><td class="r">${yen(t.blueDed)}</td></tr>
    <tr class="tot"><td>所得金額</td><td class="r">${yen(Math.max(0, b.income - t.blueDed))}</td></tr>
  </table>
  <p class="mut">申告種別: ${{ white: '白色', blue65: '青色65万', blue55: '青色55万', blue10: '青色10万' }[SET.filingType]} — 設定で変更</p></div>
  ${fsExpDetail()}`;
}
function fsWhite() {
  const b = calcPL('BIZ');
  return `<div class="card"><h3>収支内訳書 (白色申告)</h3>
  <table class="tb"><tr><td>収入金額</td><td class="r">${yen(b.revTotal)}</td></tr>
  <tr><td>経費 計</td><td class="r">${yen(b.expTotal)}</td></tr>
  <tr class="tot"><td>所得金額</td><td class="r">${yen(b.income)}</td></tr></table></div>${fsExpDetail()}`;
}
function fsExpDetail() {
  const b = calcPL('BIZ');
  return `<div class="card"><h3>経費内訳</h3><table class="tb">
    <tr><th>科目</th><th class="r">金額</th><th class="r">構成比</th></tr>
    ${b.exp.map(x => `<tr><td>${esc(x.n)}</td><td class="r">${yen(x.v)}</td><td class="r mut">${b.expTotal ? (x.v / b.expTotal * 100).toFixed(1) : 0}%</td></tr>`).join('')}
    <tr class="tot"><td>合計</td><td class="r">${yen(b.expTotal)}</td><td></td></tr></table></div>`;
}
function fsRatio() {
  const rows = A.filter(a => a.h).map(a => {
    const tot = jOfFY().filter(j => j.dr == a.c).reduce((s, j) => s + j.amt, 0);
    const r = ratioOf(a.c);
    return `<tr><td>${a.c} ${esc(a.n)}</td><td class="r">${yen(tot)}</td>
      <td class="r"><input type="number" value="${Math.round(r * 100)}" min="0" max="100" style="width:70px"
        onchange="SET.ratios[${a.c}]=this.value/100;saveS();rFSBody()">%</td>
      <td class="r"><b>${yen(tot * r)}</b></td><td class="r mut">${yen(tot * (1 - r))}</td></tr>`;
  }).join('');
  return `<div class="card"><h3>家事按分</h3>
    <p class="mut">按分根拠: ${esc(SET.ratioBasis)}</p>
    <table class="tb"><tr><th>科目</th><th class="r">総額</th><th class="r">按分率</th><th class="r">事業分</th><th class="r">家事分(事業主貸)</th></tr>
    ${rows}</table>
    <p class="mut">※ 家事分は自動的に事業主貸へ振替されます。税務調査に備え業務時間記録を保管してください。</p></div>`;
}
function fsOpen() {
  const tot = openingExpTotal();
  const am = SET.openingExpense.amortized || {};
  const used = Object.values(am).reduce((s, v) => s + v, 0);
  return `<div class="card"><h3>開業費 (繰延資産・任意償却)</h3>
    <table class="tb">
      <tr><td>開業日</td><td class="r">${esc(SET.openDate || '未設定')}</td></tr>
      <tr><td>開業前 支出 合計</td><td class="r">${yen(tot)}</td></tr>
      <tr><td>償却済</td><td class="r">${yen(used)}</td></tr>
      <tr class="tot"><td>未償却残高</td><td class="r">${yen(tot - used)}</td></tr>
    </table>
    <h4>${SET.fy}年 償却額</h4>
    <input type="number" id="amt_am" value="${am[SET.fy] || 0}" style="width:160px">
    <button class="btn" onclick="setAmort()">適用</button>
    <button class="btn gray" onclick="$('#amt_am').value=${tot - used + (am[SET.fy] || 0)};setAmort()">全額償却</button>
    <p class="mut">任意償却のため金額・時期は自由。高税率の年に償却するほど有利です。</p></div>`;
}
function setAmort() {
  SET.openingExpense.amortized = SET.openingExpense.amortized || {};
  SET.openingExpense.amortized[SET.fy] = +$('#amt_am').value || 0;
  saveS(); rFSBody(); toast('償却額を設定しました', 'ok');
}

// ---------- 不動産 ----------
function rRE() {
  const p = calcPL('RE');
  $('#v').innerHTML = `<h2>不動産所得</h2>
  <div class="card"><table class="tb">
    <tr class="hd"><td>【収入】</td><td class="r"></td></tr>
    ${p.rev.map(x => `<tr><td>${esc(x.n)}</td><td class="r">${yen(x.v)}</td></tr>`).join('') || '<tr><td class="mut">なし</td><td></td></tr>'}
    <tr class="sub2"><td>収入 計</td><td class="r">${yen(p.revTotal)}</td></tr>
    <tr class="hd"><td>【必要経費】</td><td class="r"></td></tr>
    ${p.exp.map(x => `<tr><td>${esc(x.n)}</td><td class="r">${yen(x.v)}</td></tr>`).join('') || '<tr><td class="mut">なし</td><td></td></tr>'}
    <tr class="sub2"><td>経費 計</td><td class="r">${yen(p.expTotal)}</td></tr>
    <tr class="tot"><td>不動産所得</td><td class="r">${yen(p.income)}</td></tr>
  </table>
  <p class="mut">※ 事業所得と損益通算されます。土地取得の借入金利子に対応する損失は通算不可(要確認)。</p></div>`;
}

// ---------- 税額シミュレーション ----------
function rTax() {
  const t = calcTax();
  $('#v').innerHTML = `<h2>税額シミュレーション</h2>
  <div class="grid2">
  <div class="card"><h3>所得</h3><table class="tb">
    <tr><td>事業所得</td><td class="r">${yen(t.biz)}</td></tr>
    <tr><td>青色申告特別控除</td><td class="r">−${yen(t.blueDed)}</td></tr>
    <tr><td>不動産所得</td><td class="r">${yen(t.re)}</td></tr>
    <tr class="tot"><td>合計所得金額</td><td class="r">${yen(t.total)}</td></tr>
  </table></div>
  <div class="card"><h3>税額</h3><table class="tb">
    <tr><td>課税所得(所得税)</td><td class="r">${yen(t.taxableI)}</td></tr>
    <tr><td>所得税</td><td class="r">${yen(t.incomeTax)}</td></tr>
    <tr><td>住民税</td><td class="r">${yen(t.residentTax)}</td></tr>
    <tr><td>個人事業税</td><td class="r">${yen(t.bizTax)}</td></tr>
    <tr><td>分離課税(株式・CFD)</td><td class="r">${yen(t.sepTax)}</td></tr>
    <tr class="tot"><td>税額 合計</td><td class="r">${yen(t.totalTax)}</td></tr>
    <tr><td class="mut">国民健康保険(目安)</td><td class="r mut">${yen(t.kokuho)}</td></tr>
  </table></div></div>
  <div class="card"><h3>分離課税所得 (必要時に入力)</h3>
    <div class="form">
      <label>株式譲渡所得<input type="number" id="s_stk" value="${(SET.separateIncome || {}).stock || 0}"></label>
      <label>CFD・先物 (先物取引に係る雑所得等)<input type="number" id="s_cfd" value="${(SET.separateIncome || {}).cfd || 0}"></label>
    </div>
    <button class="btn" onclick="saveSep()">反映</button>
    <p class="mut">※ 株式とCFDは相互に損益通算できません。事業所得とも通算されず、手当の判定所得にも影響しません。</p>
  </div>
  <div class="card"><h3>開業費 償却シミュレーション</h3>
    <p>未償却残高 <b>${yen(openingExpTotal() - Object.values(SET.openingExpense.amortized || {}).reduce((s, v) => s + v, 0) + openingExpAmort())}</b> —
    決算書タブで償却額を変更すると税額が即時再計算されます。</p></div>`;
}
function saveSep() {
  SET.separateIncome = { stock: +$('#s_stk').value || 0, cfd: +$('#s_cfd').value || 0 };
  saveS(); rTax(); toast('反映しました', 'ok');
}

// ---------- 設定 ----------
function rSet() {
  const ds = SET.deductionSet;
  $('#v').innerHTML = `<h2>設定</h2>
  <div class="card"><h3>基本</h3><div class="form">
    <label>氏名<input id="c_name" value="${esc(SET.ownerName)}"></label>
    <label>屋号<input id="c_biz" value="${esc(SET.bizName)}"></label>
    <label>対象年度<input type="number" id="c_fy" value="${SET.fy}"></label>
    <label>開業日<input type="date" id="c_open" value="${esc(SET.openDate)}"></label>
    <label>申告種別<select id="c_type">
      <option value="white"${SET.filingType === 'white' ? ' selected' : ''}>白色</option>
      <option value="blue65"${SET.filingType === 'blue65' ? ' selected' : ''}>青色 65万 (複式簿記+e-Tax)</option>
      <option value="blue55"${SET.filingType === 'blue55' ? ' selected' : ''}>青色 55万</option>
      <option value="blue10"${SET.filingType === 'blue10' ? ' selected' : ''}>青色 10万</option></select></label>
  </div></div>
  <div class="card"><h3>所得控除</h3><div class="form">
    <label>社会保険料(年)<input type="number" id="c_soc" value="${ds.socialInsurance || 0}"></label>
    <label>配偶者控除<select id="c_sp"><option value="1"${ds.spouse ? ' selected' : ''}>あり</option><option value="0"${!ds.spouse ? ' selected' : ''}>なし</option></select></label>
    <label>障害者控除<select id="c_dis">
      <option value="none"${ds.disabledType === 'none' ? ' selected' : ''}>なし</option>
      <option value="normal"${ds.disabledType === 'normal' ? ' selected' : ''}>一般 (27万)</option>
      <option value="special"${ds.disabledType === 'special' ? ' selected' : ''}>特別 (40万)</option>
      <option value="liveTogether"${ds.disabledType === 'liveTogether' ? ' selected' : ''}>同居特別 (75万)</option></select></label>
    <label>扶養人数(手当判定用)<input type="number" id="c_dep" value="${ds.dependents || 0}"></label>
    <label>生命保険料控除<input type="number" id="c_life" value="${ds.lifeInsurance || 0}"></label>
    <label>医療費控除<input type="number" id="c_med" value="${ds.medical || 0}"></label>
  </div>
  <label class="chk"><input type="checkbox" id="c_track" ${SET.allowanceTrack ? 'checked' : ''}> 手当 判定所得トラッカーを表示</label>
  </div>
  <div class="card"><h3>データ</h3>
    <button class="btn" onclick="saveSet()">設定を保存</button>
    <button class="btn gray" onclick="expBackup()">バックアップ出力</button>
    <label class="btn gray file">復元<input type="file" hidden onchange="impBackup(this)"></label>
    <button class="btn red" onclick="resetAll()">全削除</button>
  </div>`;
}
function saveSet() {
  SET.ownerName = $('#c_name').value; SET.bizName = $('#c_biz').value;
  SET.fy = +$('#c_fy').value || SET.fy; SET.openDate = $('#c_open').value;
  SET.filingType = $('#c_type').value;
  SET.deductionSet = Object.assign(SET.deductionSet, {
    socialInsurance: +$('#c_soc').value || 0, spouse: $('#c_sp').value === '1',
    disabledType: $('#c_dis').value, dependents: +$('#c_dep').value || 0,
    lifeInsurance: +$('#c_life').value || 0, medical: +$('#c_med').value || 0
  });
  SET.allowanceTrack = $('#c_track').checked;
  saveS(); toast('保存しました', 'ok'); go('dash');
}
function expBackup() {
  const b = new Blob([JSON.stringify({ D, SET }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = `pf_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
}
function impBackup(el) {
  const f = el.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const o = JSON.parse(e.target.result);
      if (o.D) D = o.D; if (o.SET) SET = o.SET;
      saveD(); saveS(); loadD(); toast('復元しました', 'ok'); go('dash');
    } catch (x) { toast('ファイルが不正です', 'bad'); }
  };
  r.readAsText(f);
}
function resetAll() {
  if (!confirm('全データを削除します。よろしいですか？')) return;
  localStorage.removeItem(PFX + 'data'); localStorage.removeItem(PFX + 'set');
  location.reload();
}

// ---------- 初期化 ----------
window.addEventListener('DOMContentLoaded', () => {
  loadD();
  if (!SET.ownerName && !D.journals.length) {
    // 初回セットアップ
    $('#v').innerHTML = `<div class="card wiz"><h2>ようこそ</h2>
      <p>個人事業主のための財務管理システムです。まず基本情報を設定してください。</p>
      <div class="form">
        <label>氏名<input id="w_name" placeholder="山田 太郎"></label>
        <label>開業日<input type="date" id="w_open"></label>
        <label>対象年度<input type="number" id="w_fy" value="${new Date().getFullYear()}"></label>
      </div>
      <button class="btn" onclick="wizDone()">開始する</button></div>`;
    return;
  }
  go((location.hash || '#dash').slice(1));
});
function wizDone() {
  SET.ownerName = $('#w_name').value || '未設定';
  SET.openDate = $('#w_open').value;
  SET.fy = +$('#w_fy').value || new Date().getFullYear();
  saveS(); saveD(); toast('設定しました', 'ok'); go('dash');
}
