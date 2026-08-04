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
function saveD() {
  D._saved = new Date().toISOString();
  try { localStorage.setItem(PFX + 'data', JSON.stringify(D)); }
  catch (e) { alert(T('storageFull')); }
  if (typeof SAFE !== 'undefined') {
    D._snapCnt = (D._snapCnt || 0) + 1;
    if (D._snapCnt % 5 === 0) SAFE.snapshot(D, SET, 'auto');   // 5回に1回
  }
  if (SET.autoSync && typeof FB !== 'undefined' && FB.ready && FB.user && !FB.syncing) {
    clearTimeout(window._syncT);
    window._syncT = setTimeout(() => FB.upload(D, SET).catch(() => {}), 4000);  // 4秒デバウンス
  }
}
function saveS() { localStorage.setItem(PFX + 'set', JSON.stringify(SET)); }
function nid() { return ++D.seq; }

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const yen = n => (n == null || isNaN(n)) ? '-' : Math.round(n).toLocaleString('ja-JP');
const acct = c => A.find(a => a.c == +c) || { c: c, n: '?', k: 'E' };
const acctName = c => acct(c).n;
const acctDisp = c => (typeof tAcct==='function'? tAcct(c, acct(c).n) : acct(c).n);
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
function isPreOpen(j) {
  return SET.openDate && j.dt < SET.openDate && (j.inc || 'BIZ') === 'BIZ' && acct(j.dr).k === 'E';
}
function openingExpTotal() {
  if (!SET.openDate) return 0;
  return D.journals.filter(j => inFY(j.dt) && isPreOpen(j)).reduce((s, j) => s + bizAmt(j), 0);
}
function openingExpAmort(y) { return (SET.openingExpense.amortized || {})[y || SET.fy] || 0; }

// ---------- 集計エンジン ----------
function acctBal(code, incType) {
  let s = 0;
  jOfFY().forEach(j => {
    if (incType && j.inc && j.inc !== incType) return;
    if (isPreOpen(j)) return; // 開業費は除外
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
      if (isPreOpen(j)) return;
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
      if (isPreOpen(j)) return;   // 開業前(事業)は開業費に集約
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
  jOfFY().forEach(j => { if (!isPreOpen(j)) draw += (j.amt || 0) - bizAmt(j); });
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
  const f = { dash: rDash, slip: rSlip, jrn: rJrn, gl: rGL, fs: rFS, re: rRE, tax: rTax, sync: rSync, set: rSet }[p];
  if (f) f();
}

// ---------- ダッシュボード ----------
function rDash() {
  const t = calcTax();
  const pct = Math.min(100, t.limit ? t.judge / t.limit * 100 : 0);
  const bar = t.keep ? (pct > 85 ? 'warn' : 'ok') : 'bad';
  const pl = calcPL('BIZ');
  let h = `<h2>${T('dash')} <span class="sub">${SET.fy}</span></h2>`;
  if (SET.allowanceTrack) {
    h += `<div class="card gauge">
      <div class="grow"><b>${T('judgeIncome')}</b> <span class="big">${yen(t.judge)}</span> / ${yen(t.limit)}
      <div class="bar"><i class="${bar}" style="width:${pct}%"></i></div>
      <small>${T('judgeNote')}</small></div>
      <div class="badge ${t.keep ? 'ok' : 'bad'}">${t.keep ? T('allowanceKeep') : T('allowanceStop')}</div></div>`;
    if (!t.keep) {
      const need = t.judge - t.limit + 1;
      h += `<div class="alert bad">⚠ ${T('overNote',{n:yen(need)})}</div>`;
    }
  }
  if (typeof SAFE !== 'undefined' && SAFE.needBackup()) {
    const dd = SAFE.daysSinceBackup();
    h += `<div class="alert warn bkwarn">💾 ${dd > 9000 ? T('backupNever') : T('backupOld', { n: dd })}
      <button class="btn sm" onclick="expBackup()">${T('backup')}</button></div>`;
  }
  h += `<div class="grid4">
    ${kpi(T('revenue'), pl.revTotal)}${kpi(T('expense'), pl.expTotal)}${kpi(T('bizIncome'), pl.income)}${kpi(T('taxIns'), t.totalTax + t.kokuho)}
  </div>`;
  h += `<div class="grid2">
    <div class="card"><h3>${T('taxBreak')}</h3><table class="tb">
      <tr><td>${T('incomeTax')}</td><td class="r">${yen(t.incomeTax)}</td></tr>
      <tr><td>${T('residentTax')}</td><td class="r">${yen(t.residentTax)}</td></tr>
      <tr><td>${T('bizTax')}</td><td class="r">${yen(t.bizTax)}</td></tr>
      ${t.sepTax ? `<tr><td>${T('sepTax')}</td><td class="r">${yen(t.sepTax)}</td></tr>` : ''}
      <tr class="tot"><td>${T('total')}</td><td class="r">${yen(t.totalTax)}</td></tr>
      <tr><td class="mut">${T('kokuho')}</td><td class="r mut">${yen(t.kokuho)}</td></tr>
    </table></div>
    <div class="card"><h3>${T('notice')}</h3>${alerts()}</div></div>`;
  h += `<div class="card"><h3>${T('monthly')}</h3>${monthTable()}</div>`;
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
  if (!list.length) return '<p class="mut">'+T('noSchedule')+'</p>';
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
    if (a.k === 'E' && !isPreOpen(j)) m[k].e += bizAmt(j);
  });
  const ks = Object.keys(m).sort();
  if (!ks.length) return '<p class="mut">'+T('noData')+'</p>';
  return `<table class="tb"><tr><th>${T('date')}</th><th class="r">${T('revenue')}</th><th class="r">${T('expense')}</th><th class="r">${T('diff')}</th></tr>` +
    ks.map(k => `<tr><td>${k}</td><td class="r">${yen(m[k].r)}</td><td class="r">${yen(m[k].e)}</td><td class="r">${yen(m[k].r - m[k].e)}</td></tr>`).join('') + '</table>';
}

// ---------- 伝票入力 ----------
function rSlip() {
  const opts = k => A.filter(a => !k || a.k === k).map(a => `<option value="${a.c}">${a.c} ${esc(acctDisp(a.c))}</option>`).join('');
  $('#v').innerHTML = `<h2>${T('slip')}</h2>
  <div class="card"><h3>${T('slipNew')}</h3>
    <div class="form">
      <label>${T('date')}<input type="date" id="f_dt" value="${new Date().toISOString().slice(0, 10)}"></label>
      <label>${T('slipDr')}<select id="f_dr">${opts()}</select></label>
      <label>${T('slipCr')}<select id="f_cr">${opts()}</select></label>
      <label>${T('amtIncl')}<input type="number" id="f_amt" placeholder="0"></label>
      <label>${T('desc')}<input id="f_desc" placeholder=""></label>
      <label>${T('vendor')} <span class="req">${T('required')}</span><input id="f_ven" placeholder="${T('vendorPh')}"></label>
      <label>${T('taxCls')}<select id="f_tax"><option>課10</option><option>課8</option><option>不課税</option><option>非課税</option><option>免税</option></select></label>
      <label>${T('incType')}<select id="f_inc"><option value="BIZ">${T('incBiz')}</option><option value="RE">${T('incRE')}</option></select></label>
    </div>
    <div class="row"><button class="btn" onclick="addSlip()">${T('add')}</button>
    <span id="f_hint" class="mut"></span></div>
  </div>
  <div class="card"><h3>${T('importTitle')}</h3>
    <p class="mut">${T('importNote')}</p>
    <textarea id="f_csv" rows="6" placeholder="2026-07-31	旅費交通費	ASE渋谷出張 往復航空券	JAL	課10	37420"></textarea>
    <div class="row"><button class="btn" onclick="importCSV()">${T('importBtn')}</button>
    <button class="btn gray" onclick="$('#f_csv').value=''">${T('clear')}</button></div>
    <div id="imp"></div>
  </div>`;
  $('#f_cr').value = 250;
}
function addSlip() {
  const dt = $('#f_dt').value, dr = +$('#f_dr').value, cr = +$('#f_cr').value;
  const amt = +$('#f_amt').value, desc = $('#f_desc').value.trim(), ven = $('#f_ven').value.trim();
  if (!dt || !amt) return toast(T('errDate'), 'bad');
  if (!ven) return toast(T('errVendor'), 'bad');
  D.journals.push({ id: nid(), dt, dr, cr, amt, desc, vendor: ven, tax: $('#f_tax').value, inc: $('#f_inc').value });
  saveD(); toast(T('registered'), 'ok');
  $('#f_amt').value = ''; $('#f_desc').value = '';
}
const ACCT_ALIAS = {};
function buildAlias() { A.forEach(a => { ACCT_ALIAS[a.n] = a.c; }); }
function importCSV() {
  buildAlias();
  const txt = $('#f_csv').value.trim();
  if (!txt) return toast(T('errPaste'), 'bad');
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
  $('#imp').innerHTML = `<div class="alert ${err.length ? 'warn' : 'ok'}">${T('imported',{ok:ok,skip:skip,err:err.length})}
    ${err.length ? '<ul><li>' + err.slice(0, 10).map(esc).join('</li><li>') + '</li></ul>' : ''}</div>`;
  toast(T('imported',{ok:ok,skip:skip,err:err.length}), 'ok');
}

// ---------- 伝票照会 ----------
function rJrn() {
  const js = jOfFY().slice().sort((a, b) => a.dt < b.dt ? 1 : -1);
  $('#v').innerHTML = `<h2>${T('jrn')} <span class="sub">${js.length}</span></h2>
  <div class="card"><input id="q" placeholder="${T('search')}" oninput="rJrnList()"><div id="jl"></div></div>`;
  rJrnList();
}
function rJrnList() {
  const q = ($('#q') && $('#q').value || '').toLowerCase();
  const js = jOfFY().filter(j => !q || (j.desc || '').toLowerCase().includes(q) || (j.vendor || '').toLowerCase().includes(q))
    .sort((a, b) => a.dt < b.dt ? 1 : -1);
  // PC: テーブル / モバイル: カード (CSSで切替)
  const tbl = `<table class="tb only-pc"><tr><th>${T('date')}</th><th>${T('slipDr')}</th><th>${T('desc')}</th><th>${T('vendor')}</th><th class="r">${T('amount')}</th><th class="r">${T('bizPart')}</th><th></th></tr>` +
    js.map(j => `<tr><td>${j.dt}</td><td>${esc(acctDisp(j.dr))}</td><td>${esc(j.desc)}</td><td class="mut">${esc(j.vendor)}</td>
    <td class="r">${yen(j.amt)}</td><td class="r">${bizAmt(j) !== j.amt ? '<b>' + yen(bizAmt(j)) + '</b>' : ''}</td>
    <td><a href="#" onclick="delSlip(${j.id});return false" class="del">×</a></td></tr>`).join('') + '</table>';
  const cards = `<div class="only-mb jcards">` + js.map(j => {
    const bp = bizAmt(j);
    return `<div class="jc">
      <div class="jc-h"><span class="jc-d">${j.dt.slice(5)}</span>
        <span class="jc-a">${yen(j.amt)}</span>
        <a href="#" onclick="delSlip(${j.id});return false" class="del">×</a></div>
      <div class="jc-t">${esc(j.desc)}</div>
      <div class="jc-m"><span class="tag">${esc(tAcctShort(j.dr, acct(j.dr).n))}</span>
        <span>${esc(j.vendor)}</span>
        ${bp !== j.amt ? `<span class="tag g">${T('bizPart')} ${yen(bp)}</span>` : ''}</div>
    </div>`;
  }).join('') + '</div>';
  $('#jl').innerHTML = tbl + cards;
}
function delSlip(id) {
  if (!confirm(T('confirmDel'))) return;
  D.journals = D.journals.filter(j => j.id !== id); saveD(); rJrnList(); toast(T('deleted'));
}

// ---------- 総勘定元帳 ----------
function rGL() {
  const used = [...new Set(jOfFY().flatMap(j => [j.dr, j.cr]))].sort((a, b) => a - b);
  $('#v').innerHTML = `<h2>${T('gl')}</h2><div class="card">
    <select id="glc" onchange="rGLBody()">${used.map(c => `<option value="${c}">${c} ${esc(acctDisp(c))}</option>`).join('')}</select>
    <div id="glb"></div></div>`;
  rGLBody();
}
function rGLBody() {
  const c = +$('#glc').value; let bal = 0;
  const js = jOfFY().filter(j => j.dr == c || j.cr == c).sort((a, b) => a.dt > b.dt ? 1 : -1);
  $('#glb').innerHTML = `<h3>${c} ${esc(acctDisp(c))}</h3><div class="scrollx"><table class="tb gl">
    <tr><th>${T('date')}</th><th class="hide-mb">${T('desc')}</th><th class="hide-mb">${T('vendor')}</th><th class="r">${T('debit')}</th><th class="r">${T('credit')}</th><th class="r">${T('balance')}</th></tr>` +
    js.map(j => {
      const v = bizAmt(j), dr = j.dr == c ? v : 0, cr = j.cr == c ? v : 0;
      bal += dr - cr;
      return `<tr><td>${j.dt.slice(5)}<span class="only-mb mbdesc">${esc(j.desc)}</span></td>
      <td class="hide-mb">${esc(j.desc)}</td><td class="mut hide-mb">${esc(j.vendor)}</td>
      <td class="r">${dr ? yen(dr) : ''}</td><td class="r">${cr ? yen(cr) : ''}</td><td class="r">${yen(bal)}</td></tr>`;
    }).join('') + `<tr class="tot"><td colspan="3" class="tot-l">${T('balance')}</td><td class="r">${yen(bal)}</td></tr></table></div>`;
}

// ---------- 決算書 ----------
let fsTab = 'pl';
function rFS() {
  $('#v').innerHTML = `<h2>${T('fs')}</h2>
  <div class="tabs">${[['pl', T('tabPL')], ['bs', T('tabBS')], ['blue', T('tabBlue')], ['white', T('tabWhite')], ['ratio', T('tabRatio')], ['open', T('tabOpen')]]
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
    <tr class="hd"><td>${T('revSec')}</td><td class="r"></td></tr>
    ${o.rev.map(x => `<tr><td>${esc(acctDisp(x.c))}</td><td class="r">${yen(x.v)}</td></tr>`).join('')}
    <tr class="sub2"><td>${T('revTotal')}</td><td class="r">${yen(o.revTotal)}</td></tr>
    <tr class="hd"><td>${T('expSec')}</td><td class="r"></td></tr>
    ${o.exp.map(x => `<tr><td>${esc(acctDisp(x.c))}</td><td class="r">${yen(x.v)}</td></tr>`).join('')}
    <tr class="sub2"><td>${T('expTotal')}</td><td class="r">${yen(o.expTotal)}</td></tr>
    <tr class="tot"><td>${T('netIncome')}</td><td class="r">${yen(o.income)}</td></tr></table></div>`;
  return `<div class="grid2">${sec(T('bizIncome'), b)}${r.revTotal || r.expTotal ? sec(T('reIncome'), r) : ''}</div>`;
}
function fsBS() {
  const b = calcBS();
  const col = (t, arr, tot) => `<div class="card"><h3>${t}</h3><table class="tb">
    ${arr.map(x => `<tr><td>${esc(acctDisp(x.c))}</td><td class="r">${yen(x.v)}</td></tr>`).join('')}
    <tr class="tot"><td>${T('total')}</td><td class="r">${yen(tot)}</td></tr></table></div>`;
  return `<div class="grid2">${col(T('assets'), b.asset, b.assetTotal)}
    <div>${col(T('liabilities'), b.liab, b.liabTotal)}${col(T('capital'), b.cap, b.capTotal)}</div></div>
    ${Math.abs(b.diff) > 1 ? `<div class="alert warn">${T('bsDiff',{n:yen(b.diff)})}</div>` : `<div class="alert ok">${T('bsMatch')}</div>`}`;
}
function fsBlue() {
  const t = calcTax(), b = calcPL('BIZ');
  return `<div class="card"><h3>${T('tabBlue')}</h3>
  <table class="tb">
    <tr><td>${T('revenue')}</td><td class="r">${yen(b.revTotal)}</td></tr>
    <tr><td>${T('expTotal')}</td><td class="r">${yen(b.expTotal)}</td></tr>
    <tr class="sub2"><td>${T('netIncome')}</td><td class="r">${yen(b.income)}</td></tr>
    <tr><td>${T('blueDed')}</td><td class="r">${yen(t.blueDed)}</td></tr>
    <tr class="tot"><td>${T('incomeAmt')}</td><td class="r">${yen(Math.max(0, b.income - t.blueDed))}</td></tr>
  </table>
  <p class="mut">${T('filingType')}: ${{ white: T('typeWhite'), blue65: T('typeBlue65'), blue55: T('typeBlue55'), blue10: T('typeBlue10') }[SET.filingType]}</p></div>
  ${fsExpDetail()}`;
}
function fsWhite() {
  const b = calcPL('BIZ');
  return `<div class="card"><h3>${T('tabWhite')}</h3>
  <table class="tb"><tr><td>${T('revenue')}</td><td class="r">${yen(b.revTotal)}</td></tr>
  <tr><td>${T('expTotal')}</td><td class="r">${yen(b.expTotal)}</td></tr>
  <tr class="tot"><td>${T('incomeAmt')}</td><td class="r">${yen(b.income)}</td></tr></table></div>${fsExpDetail()}`;
}
function fsExpDetail() {
  const b = calcPL('BIZ');
  return `<div class="card"><h3>${T('expDetail')}</h3><div class="scrollx"><table class="tb">
    <tr><th>${T('slipDr')}</th><th class="r">${T('amount')}</th><th class="r">${T('ratioPct')}</th></tr>
    ${b.exp.map(x => `<tr><td>${esc(acctDisp(x.c))}</td><td class="r">${yen(x.v)}</td><td class="r mut">${b.expTotal ? (x.v / b.expTotal * 100).toFixed(1) : 0}%</td></tr>`).join('')}
    <tr class="tot"><td>${T('total')}</td><td class="r">${yen(b.expTotal)}</td><td></td></tr></table></div></div>`;
}
function fsRatio() {
  const rows = A.filter(a => a.h).map(a => {
    const tot = jOfFY().filter(j => j.dr == a.c).reduce((s, j) => s + j.amt, 0);
    const r = ratioOf(a.c);
    return `<tr><td>${a.c} ${esc(acctDisp(a.c))}</td><td class="r">${yen(tot)}</td>
      <td class="r"><input type="number" value="${Math.round(r * 100)}" min="0" max="100" style="width:70px"
        onchange="SET.ratios[${a.c}]=this.value/100;saveS();rFSBody()">%</td>
      <td class="r"><b>${yen(tot * r)}</b></td><td class="r mut">${yen(tot * (1 - r))}</td></tr>`;
  }).join('');
  return `<div class="card"><h3>${T('ratioTitle')}</h3>
    <p class="mut">${T('ratioBasis')}: ${esc(SET.ratioBasis)}</p>
    <table class="tb"><tr><th>${T('slipDr')}</th><th class="r">${T('total')}</th><th class="r">${T('ratioRate')}</th><th class="r">${T('ratioBiz')}</th><th class="r">${T('ratioHome')}</th></tr>
    ${rows}</table>
    <p class="mut">${T('ratioNote')}</p></div>`;
}
function fsOpen() {
  const tot = openingExpTotal();
  const am = SET.openingExpense.amortized || {};
  const used = Object.values(am).reduce((s, v) => s + v, 0);
  return `<div class="card"><h3>${T('openTitle')}</h3>
    <table class="tb">
      <tr><td>${T('openDate')}</td><td class="r">${esc(SET.openDate || T('openNotSet'))}</td></tr>
      <tr><td>${T('openTotal')}</td><td class="r">${yen(tot)}</td></tr>
      <tr><td>${T('openUsed')}</td><td class="r">${yen(used)}</td></tr>
      <tr class="tot"><td>${T('openLeft')}</td><td class="r">${yen(tot - used)}</td></tr>
    </table>
    <h4>${T('openAmort',{y:SET.fy})}</h4>
    <input type="number" id="amt_am" value="${am[SET.fy] || 0}" style="width:160px">
    <button class="btn" onclick="setAmort()">${T('apply')}</button>
    <button class="btn gray" onclick="$('#amt_am').value=${tot - used + (am[SET.fy] || 0)};setAmort()">${T('openAll')}</button>
    <p class="mut">${T('openNote')}</p></div>`;
}
function setAmort() {
  SET.openingExpense.amortized = SET.openingExpense.amortized || {};
  SET.openingExpense.amortized[SET.fy] = +$('#amt_am').value || 0;
  saveS(); rFSBody(); toast(T('amortSet'), 'ok');
}

// ---------- 不動産 ----------
function rRE() {
  const p = calcPL('RE');
  $('#v').innerHTML = `<h2>${T('reTitle')}</h2>
  <div class="card"><table class="tb">
    <tr class="hd"><td>${T('revSec')}</td><td class="r"></td></tr>
    ${p.rev.map(x => `<tr><td>${esc(acctDisp(x.c))}</td><td class="r">${yen(x.v)}</td></tr>`).join('') || `<tr><td class="mut">${T('none')}</td><td></td></tr>`}
    <tr class="sub2"><td>${T('revTotal')}</td><td class="r">${yen(p.revTotal)}</td></tr>
    <tr class="hd"><td>${T('reExp')}</td><td class="r"></td></tr>
    ${p.exp.map(x => `<tr><td>${esc(acctDisp(x.c))}</td><td class="r">${yen(x.v)}</td></tr>`).join('') || `<tr><td class="mut">${T('none')}</td><td></td></tr>`}
    <tr class="sub2"><td>${T('expTotal')}</td><td class="r">${yen(p.expTotal)}</td></tr>
    <tr class="tot"><td>${T('reIncome')}</td><td class="r">${yen(p.income)}</td></tr>
  </table>
  <p class="mut">${T('reNote')}</p></div>`;
}

// ---------- 税額シミュレーション ----------
function rTax() {
  const t = calcTax();
  $('#v').innerHTML = `<h2>${T('taxTitle')}</h2>
  <div class="grid2">
  <div class="card"><h3>${T('income')}</h3><table class="tb">
    <tr><td>${T('bizIncome')}</td><td class="r">${yen(t.biz)}</td></tr>
    <tr><td>${T('blueDed')}</td><td class="r">−${yen(t.blueDed)}</td></tr>
    <tr><td>${T('reIncome')}</td><td class="r">${yen(t.re)}</td></tr>
    <tr class="tot"><td>${T('totalIncome')}</td><td class="r">${yen(t.total)}</td></tr>
  </table></div>
  <div class="card"><h3>${T('taxAmt')}</h3><table class="tb">
    <tr><td>${T('taxableI')}</td><td class="r">${yen(t.taxableI)}</td></tr>
    <tr><td>${T('incomeTax')}</td><td class="r">${yen(t.incomeTax)}</td></tr>
    <tr><td>${T('residentTax')}</td><td class="r">${yen(t.residentTax)}</td></tr>
    <tr><td>${T('bizTax')}</td><td class="r">${yen(t.bizTax)}</td></tr>
    <tr><td>${T('sepTax')}</td><td class="r">${yen(t.sepTax)}</td></tr>
    <tr class="tot"><td>${T('taxTotal')}</td><td class="r">${yen(t.totalTax)}</td></tr>
    <tr><td class="mut">${T('kokuho')}</td><td class="r mut">${yen(t.kokuho)}</td></tr>
  </table></div></div>
  <div class="card"><h3>${T('sepTitle')}</h3>
    <div class="form">
      <label>${T('stockGain')}<input type="number" id="s_stk" value="${(SET.separateIncome || {}).stock || 0}"></label>
      <label>${T('cfdGain')}<input type="number" id="s_cfd" value="${(SET.separateIncome || {}).cfd || 0}"></label>
    </div>
    <button class="btn" onclick="saveSep()">${T('reflect')}</button>
    <p class="mut">${T('sepNote')}</p>
  </div>
  <div class="card"><h3>${T('openSim')}</h3>
    <p>未償却残高 <b>${yen(openingExpTotal() - Object.values(SET.openingExpense.amortized || {}).reduce((s, v) => s + v, 0) + openingExpAmort())}</b> —
    決算書タブで償却額を変更すると税額が即時再計算されます。</p></div>`;
}
function saveSep() {
  SET.separateIncome = { stock: +$('#s_stk').value || 0, cfd: +$('#s_cfd').value || 0 };
  saveS(); rTax(); toast(T('saved'), 'ok');
}

// ---------- 設定 ----------
function rSet() {
  const ds = SET.deductionSet;
  $('#v').innerHTML = `<h2>${T('set')}</h2>
  <div class="card"><h3>${T('setBasic')}</h3>
  <div class="form"><label>${T('setLang')}<select onchange="setLang(this.value)">
    <option value="ko"${L==='ko'?' selected':''}>한국어</option>
    <option value="ja"${L==='ja'?' selected':''}>日本語</option></select></label></div><div class="form">
    <label>${T('ownerName')}<input id="c_name" value="${esc(SET.ownerName)}"></label>
    <label>${T('bizName')}<input id="c_biz" value="${esc(SET.bizName)}"></label>
    <label>${T('fy')}<input type="number" id="c_fy" value="${SET.fy}"></label>
    <label>${T('openDate')}<input type="date" id="c_open" value="${esc(SET.openDate)}"></label>
    <label>${T('filingType')}<select id="c_type">
      <option value="white"${SET.filingType === 'white' ? ' selected' : ''}>${T('typeWhite')}</option>
      <option value="blue65"${SET.filingType === 'blue65' ? ' selected' : ''}>${T('typeBlue65')}</option>
      <option value="blue55"${SET.filingType === 'blue55' ? ' selected' : ''}>${T('typeBlue55')}</option>
      <option value="blue10"${SET.filingType === 'blue10' ? ' selected' : ''}>${T('typeBlue10')}</option></select></label>
  </div></div>
  <div class="card"><h3>${T('setDed')}</h3><div class="form">
    <label>${T('socialIns')}<input type="number" id="c_soc" value="${ds.socialInsurance || 0}"></label>
    <label>${T('spouseDed')}<select id="c_sp"><option value="1"${ds.spouse ? ' selected' : ''}>${T('yes')}</option><option value="0"${!ds.spouse ? ' selected' : ''}>なし</option></select></label>
    <label>${T('disabledDed')}<select id="c_dis">
      <option value="none"${ds.disabledType === 'none' ? ' selected' : ''}>${T('disNone')}</option>
      <option value="normal"${ds.disabledType === 'normal' ? ' selected' : ''}>${T('disNormal')}</option>
      <option value="special"${ds.disabledType === 'special' ? ' selected' : ''}>${T('disSpecial')}</option>
      <option value="liveTogether"${ds.disabledType === 'liveTogether' ? ' selected' : ''}>${T('disTogether')}</option></select></label>
    <label>${T('dependents')}<input type="number" id="c_dep" value="${ds.dependents || 0}"></label>
    <label>${T('lifeIns')}<input type="number" id="c_life" value="${ds.lifeInsurance || 0}"></label>
    <label>${T('medical')}<input type="number" id="c_med" value="${ds.medical || 0}"></label>
  </div>
  <label class="chk"><input type="checkbox" id="c_track" ${SET.allowanceTrack ? 'checked' : ''}> ${T('trackChk')}</label>
  </div>
  <div class="card"><h3>${T('setData')}</h3>
    <div class="row btns">
      <button class="btn" onclick="saveSet()">${T('saveSet')}</button>
      <button class="btn gray" onclick="expBackup()">${T('backup')}</button>
      <label class="btn gray file">${T('restore')}<input type="file" hidden onchange="impBackup(this)"></label>
      <button class="btn red" onclick="resetAll()">${T('resetAll')}</button>
    </div>
    <p class="mut" id="bkinfo"></p>
  </div>
  <div class="card"><h3>${T('snapTitle')}</h3>
    <p class="mut">${T('snapNote')}</p>
    <div id="snaps" class="mut">…</div>
  </div>`;
  showBackupInfo(); listSnaps();
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
  saveS(); toast(T('saved'), 'ok'); go('dash');
}
function expBackup() {
  const b = new Blob([JSON.stringify({ D, SET }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = `pf_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  if (typeof SAFE !== 'undefined') { SAFE.markBackup(); SAFE.snapshot(D, SET, 'manual'); }
  toast(T('backupDone'), 'ok');
}
function impBackup(el) {
  const f = el.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const o = JSON.parse(e.target.result);
      if (o.D) D = o.D; if (o.SET) SET = o.SET;
      saveD(); saveS(); loadD(); toast(T('restored'), 'ok'); go('dash');
    } catch (x) { toast(T('badFile'), 'bad'); }
  };
  r.readAsText(f);
}
function resetAll() {
  if (!confirm(T('confirmReset'))) return;
  localStorage.removeItem(PFX + 'data'); localStorage.removeItem(PFX + 'set');
  location.reload();
}

// ---------- 初期化 ----------
// ---------- PWA ----------
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  const b = document.getElementById('installBtn');
  if (b) b.style.display = 'inline-block';
});
function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    const b = document.getElementById('installBtn'); if (b) b.style.display = 'none';
  });
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}

window.addEventListener('DOMContentLoaded', () => {
  if (typeof initLang === 'function') initLang();
  if (typeof FB !== 'undefined') FB.init();
  applyNavLabels();
  const hasLocal = !!localStorage.getItem(PFX + 'data');
  // キャッシュ消去などで localStorage が空 → スナップショットから復旧提案
  if (!hasLocal && typeof SAFE !== 'undefined') {
    SAFE.checkRecovery(false).then(s => {
      if (s && confirm(T('recoverAsk', { n: s.count }))) {
        const o = JSON.parse(s.data);
        if (o.D) D = o.D; if (o.SET) SET = o.SET;
        saveD(); saveS(); loadD(); toast(T('recovered'), 'ok'); go('dash');
      }
    }).catch(() => {});
  }
  loadD();
  if (!SET.ownerName && !D.journals.length) {
    // 初回セットアップ
    $('#v').innerHTML = `<div class="card wiz"><h2>${T('welcome')}</h2>
      <p>${T('welcomeMsg')}</p>
      <div class="form"><label>${T('setLang')}<select onchange="setLang(this.value)">
        <option value="ko"${L==='ko'?' selected':''}>한국어</option><option value="ja"${L==='ja'?' selected':''}>日本語</option></select></label></div>
      <div class="form">
        <label>${T('ownerName')}<input id="w_name" placeholder="${T('namePh')}"></label>
        <label>${T('openDate')}<input type="date" id="w_open"></label>
        <label>${T('fy')}<input type="number" id="w_fy" value="${new Date().getFullYear()}"></label>
      </div>
      <button class="btn" onclick="wizDone()">${T('start')}</button></div>`;
    return;
  }
  go((location.hash || '#dash').slice(1));
});
function wizDone() {
  SET.ownerName = $('#w_name').value || '-';
  SET.openDate = $('#w_open').value;
  SET.fy = +$('#w_fy').value || new Date().getFullYear();
  saveS(); saveD(); toast(T('saved'), 'ok'); go('dash');
}

// ---------- ナビ ラベル ----------
function applyNavLabels() {
  const map = { dash:'dash', slip:'slip', jrn:'jrn', gl:'gl', fs:'fs', re:'re', tax:'tax', sync:'sync', set:'set' };
  document.querySelectorAll('.nav a').forEach(a => {
    const k = map[a.dataset.p]; if (!k) return;
    const sp = a.querySelector('span'); if (sp) sp.textContent = T(k);
    a.title = T(k);
  });
  const lg = document.querySelector('.nav .logo');
  if (lg) lg.innerHTML = '<b>' + T('appTitle') + '</b><small>' + T('appSub') + '</small>';
}

// ---------- データ保護 UI ----------
function showBackupInfo() {
  const el = $('#bkinfo'); if (!el || typeof SAFE === 'undefined') return;
  const d = SAFE.daysSinceBackup();
  const kb = Math.round(SAFE.usage() / 1024);
  el.innerHTML = (d > 9000 ? T('backupNever') : T('backupLast', { n: d })) + ' / ' + kb + ' KB';
}
function listSnaps() {
  const el = $('#snaps'); if (!el || typeof SAFE === 'undefined') return;
  SAFE.list().then(l => {
    if (!l.length) { el.textContent = T('snapNone'); return; }
    el.innerHTML = '<table class="tb"><tr><th>' + T('date') + '</th><th class="r">'
      + T('slip') + '</th><th></th></tr>' + l.map(s =>
        `<tr><td>${s.ts.slice(0, 16).replace('T', ' ')}</td><td class="r">${s.count}</td>
         <td><a href="#" onclick="restoreSnap('${s.ts}');return false">${T('restore')}</a></td></tr>`).join('')
      + '</table>';
  });
}
function restoreSnap(ts) {
  if (!confirm(T('snapConfirm'))) return;
  SAFE.restore(ts).then(o => {
    if (o.D) D = o.D; if (o.SET) SET = o.SET;
    saveD(); saveS(); loadD(); toast(T('restored'), 'ok'); go('dash');
  }).catch(() => toast(T('badFile'), 'bad'));
}

// ---------- クラウド同期 ----------
function rSync() {
  const on = (typeof FB !== 'undefined' && FB.ready);
  const u = on ? FB.user : null;
  let h = `<h2>${T('syncTitle')}</h2>`;
  if (!on) { $('#v').innerHTML = h + `<div class="alert warn">Firebase SDK ${T('syncErr')}</div>`; return; }
  h += `<div class="card"><div id="fbst"></div>
    <p class="mut">${T('loginNote')}</p></div>`;
  if (u) {
    h += `<div class="card"><h3>${T('sync')}</h3>
      <div id="cloudinfo" class="mut">…</div>
      <div class="row btns" style="margin-top:10px">
        <button class="btn" onclick="doUpload()">${T('upload')}</button>
        <button class="btn gray" onclick="doDownload()">${T('download')}</button>
      </div>
      <label class="chk"><input type="checkbox" id="c_auto" ${SET.autoSync ? 'checked' : ''}
        onchange="SET.autoSync=this.checked;saveS();toast(T('saved'),'ok')"> ${T('autoSync')}</label>
      <p class="mut" id="syncinfo"></p></div>`;
  }
  $('#v').innerHTML = h;
  renderFBStatus();
  if (u) { refreshCloud(); showSyncInfo(); }
}
function renderFBStatus() {
  const el = document.getElementById('fbst'); if (!el) return;
  const u = (typeof FB !== 'undefined') ? FB.user : null;
  el.innerHTML = u
    ? `<div class="row"><b>${esc(u.email || '')}</b>
       <button class="btn gray sm" onclick="doLogout()">${T('logout')}</button></div>`
    : `<button class="btn" onclick="doLogin()">${T('login')}</button>
       <span class="mut" style="margin-left:10px">${T('notLoggedIn')}</span>`;
}
function doLogin() { FB.login().catch(() => toast(T('syncErr'), 'bad')); }
function doLogout() { FB.logout().then(() => { toast(T('logout'), 'ok'); go('sync'); }); }
function onFBLogin() { if ((location.hash || '') === '#sync') go('sync'); }
function refreshCloud() {
  const el = document.getElementById('cloudinfo'); if (!el) return;
  FB.peek().then(m => {
    el.textContent = m ? T('cloudInfo', { n: m.count, d: (m.updated || '').slice(0, 16).replace('T', ' ') })
                       : T('cloudEmpty');
  });
}
function showSyncInfo() {
  const el = document.getElementById('syncinfo'); if (!el) return;
  const d = FB.daysSinceSync();
  el.textContent = d > 9000 ? T('syncNever') : T('syncLast', { n: d });
}
function doUpload() {
  FB.peek().then(m => {
    const n = m ? m.count : 0;
    if (n && !confirm(T('confirmUpload', { n: n, m: D.journals.length }))) return;
    FB.upload(D, SET).then(() => { toast(T('uploaded'), 'ok'); refreshCloud(); showSyncInfo(); })
      .catch(() => toast(T('syncErr'), 'bad'));
  });
}
function doDownload() {
  FB.download().then(r => {
    if (!r) return toast(T('cloudEmpty'), 'bad');
    if (!confirm(T('confirmDownload', { n: r.meta.count, m: D.journals.length }))) return;
    if (typeof SAFE !== 'undefined') SAFE.snapshot(D, SET, 'before-download');
    if (r.obj.D) D = r.obj.D; if (r.obj.SET) SET = r.obj.SET;
    saveD(); saveS(); loadD();
    toast(T('downloaded'), 'ok'); go('dash');
  }).catch(() => toast(T('syncErr'), 'bad'));
}
