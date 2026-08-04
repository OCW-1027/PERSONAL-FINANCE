// ============================================================
// PERSONAL-FINANCE : lang.js
// 한국어 / 日本語 전환 — UI 문구 + 계정과목 병기
// ============================================================

const LANG = {
  ko: {
    // --- 공통 ---
    appTitle: "개인사업 재무관리", appSub: "재무관리",
    dash: "대시보드", slip: "전표입력", jrn: "전표조회", gl: "총계정원장",
    fs: "결산서", re: "부동산", tax: "세액시뮬", set: "설정",
    save: "저장", del: "삭제", add: "등록", cancel: "취소", apply: "적용",
    clear: "지우기", search: "검색", total: "합계", amount: "금액", date: "일자",
    // --- 대시보드 ---
    judgeIncome: "판정소득", allowanceKeep: "수당 유지", allowanceStop: "수당 정지",
    judgeNote: "사업소득＋부동산소득 − 80,000 − 장애인공제",
    overNote: "판정소득이 한도를 {n} 초과. 경비 {n} 추가하면 유지 가능합니다.",
    revenue: "수입", expense: "경비", bizIncome: "사업소득", taxIns: "세금＋보험",
    taxBreak: "세액 내역", notice: "알림", monthly: "월별 추이", diff: "차액",
    incomeTax: "소득세", residentTax: "주민세", bizTax: "개인사업세",
    sepTax: "분리과세(주식·CFD)", kokuho: "국민건강보험(추정)", noSchedule: "예정 없음",
    noData: "데이터 없음",
    // --- 전표 ---
    slipNew: "신규 입력", slipDr: "차변(비용·자산)", slipCr: "대변(지급수단)",
    desc: "적요", vendor: "거래처", vendorPh: "모르면 업종(레스토랑 등)",
    required: "*필수", taxCls: "세구분", incType: "소득구분",
    incBiz: "사업", incRE: "부동산", amtIncl: "금액(세포함)",
    importTitle: "CSV / Excel 일괄 취입",
    importNote: "열: 일자, 계정과목, 적요, 거래처, 세구분, 금액 — 경비대장 그대로 붙여넣기 가능",
    importBtn: "취입", imported: "{ok}건 취입 / 중복 {skip}건 / 오류 {err}건",
    errDate: "일자와 금액을 입력하세요", errVendor: "거래처는 필수입니다(모르면 업종명)",
    errPaste: "데이터를 붙여넣으세요", registered: "등록했습니다", deleted: "삭제했습니다",
    confirmDel: "삭제하시겠습니까?",
    // --- 원장 ---
    debit: "차변", credit: "대변", balance: "잔액", bizPart: "사업분",
    // --- 결산서 ---
    tabPL: "손익계산서", tabBS: "대차대조표", tabBlue: "청색신고결산서",
    tabWhite: "수지내역서(백색)", tabRatio: "가사안분", tabOpen: "개업비",
    revSec: "【수입】", expSec: "【경비】", revTotal: "수입 계", expTotal: "경비 계",
    netIncome: "차인금액", assets: "자산의 부", liabilities: "부채의 부", capital: "자본의 부",
    bsMatch: "차대일치 ✓", bsDiff: "차대차액 {n} — 사업주대/차 조정 필요",
    blueDed: "청색신고특별공제액", incomeAmt: "소득금액", filingType: "신고종별",
    expDetail: "경비 내역", ratioPct: "구성비",
    ratioTitle: "가사안분", ratioBasis: "안분근거", ratioRate: "안분율",
    ratioBiz: "사업분", ratioHome: "가사분(사업주대)",
    ratioNote: "※ 가사분은 자동으로 사업주대에 대체됩니다. 세무조사 대비 업무시간 기록을 보관하세요.",
    openTitle: "개업비 (이연자산·임의상각)", openDate: "개업일", openNotSet: "미설정",
    openTotal: "개업 전 지출 합계", openUsed: "상각 완료", openLeft: "미상각 잔액",
    openAmort: "{y}년 상각액", openAll: "전액 상각",
    openNote: "임의상각이므로 금액·시기는 자유. 세율이 높은 해에 상각할수록 유리합니다.",
    amortSet: "상각액을 설정했습니다",
    // --- 부동산 ---
    reTitle: "부동산소득", reExp: "【필요경비】", reIncome: "부동산소득",
    reNote: "※ 사업소득과 손익통산됩니다. 토지 취득 차입금 이자에 대응하는 손실은 통산 불가(요확인).",
    none: "없음",
    // --- 세액 ---
    taxTitle: "세액 시뮬레이션", income: "소득", taxAmt: "세액",
    taxableI: "과세소득(소득세)", totalIncome: "합계소득금액", taxTotal: "세액 합계",
    sepTitle: "분리과세 소득 (필요시 입력)", stockGain: "주식양도소득",
    cfdGain: "CFD·선물 (선물거래 잡소득 등)", reflect: "반영",
    sepNote: "※ 주식과 CFD는 상호 손익통산 불가. 사업소득과도 통산되지 않으며 수당 판정소득에도 영향 없음.",
    openSim: "개업비 상각 시뮬레이션",
    openSimNote: "미상각 잔액 {n} — 결산서 탭에서 상각액을 바꾸면 세액이 즉시 재계산됩니다.",
    // --- 설정 ---
    setBasic: "기본", ownerName: "성명", bizName: "상호", fy: "대상연도",
    typeWhite: "백색", typeBlue65: "청색 65만 (복식부기+e-Tax)",
    typeBlue55: "청색 55만", typeBlue10: "청색 10만",
    setDed: "소득공제", socialIns: "사회보험료(연)", spouseDed: "배우자공제",
    disabledDed: "장애인공제", disNone: "없음", disNormal: "일반 (27만)",
    disSpecial: "특별 (40만)", disTogether: "동거특별 (75만)",
    dependents: "부양인원(수당판정용)", lifeIns: "생명보험료공제", medical: "의료비공제",
    yes: "있음", no: "없음", trackChk: "수당 판정소득 트래커 표시",
    setData: "데이터", saveSet: "설정 저장", backup: "백업 출력", restore: "복원",
    resetAll: "전체 삭제", saved: "저장했습니다", restored: "복원했습니다",
    badFile: "파일이 올바르지 않습니다", confirmReset: "전체 데이터를 삭제합니다. 계속하시겠습니까?",
    setLang: "언어 / 言語",
    backupNever: "⚠ 아직 백업하지 않았습니다",
    backupOld: "⚠ 마지막 백업으로부터 {n}일 경과 — 백업을 권장합니다",
    backupLast: "마지막 백업: {n}일 전",
    backupDone: "백업 파일을 저장했습니다",
    storageFull: "저장 공간이 부족합니다. 백업 후 오래된 연도를 정리해주세요.",
    snapTitle: "자동 스냅샷 (브라우저 내부)",
    snapNote: "저장할 때마다 자동으로 세대를 남깁니다. 캐시 삭제 시에도 여기서 복구할 수 있습니다. 단 브라우저 데이터 전체 삭제 시에는 사라지므로, 정기적으로 백업 파일을 내려받으세요.",
    snapNone: "스냅샷 없음",
    snapConfirm: "이 시점으로 되돌립니다. 현재 데이터는 덮어써집니다. 계속할까요?",
    recovered: "이전 데이터를 복구했습니다",
    recoverAsk: "저장된 데이터가 없지만 백업 스냅샷({n}건)이 있습니다. 복구할까요?",
    installApp: "앱으로 설치",
    installed: "설치했습니다",
    // --- 마법사 ---
    welcome: "환영합니다",
    welcomeMsg: "개인사업자를 위한 재무관리 시스템입니다. 먼저 기본정보를 설정해주세요.",
    start: "시작하기", namePh: "홍길동"
  },

  ja: {
    appTitle: "個人事業 財務管理", appSub: "財務管理",
    dash: "ダッシュボード", slip: "伝票処理", jrn: "伝票照会", gl: "総勘定元帳",
    fs: "決算書", re: "不動産", tax: "税額シミュ", set: "設定",
    save: "保存", del: "削除", add: "登録", cancel: "取消", apply: "適用",
    clear: "クリア", search: "検索", total: "合計", amount: "金額", date: "日付",
    judgeIncome: "判定所得", allowanceKeep: "手当 維持", allowanceStop: "手当 停止",
    judgeNote: "事業所得＋不動産所得 − 80,000 − 障害者控除",
    overNote: "判定所得が限度を {n} 超過。経費 {n} 追加で維持可能です。",
    revenue: "収入", expense: "経費", bizIncome: "事業所得", taxIns: "税金＋保険",
    taxBreak: "税額内訳", notice: "お知らせ", monthly: "月別 推移", diff: "差引",
    incomeTax: "所得税", residentTax: "住民税", bizTax: "個人事業税",
    sepTax: "分離課税(株式・CFD)", kokuho: "国民健康保険(目安)", noSchedule: "予定なし",
    noData: "データなし",
    slipNew: "新規入力", slipDr: "借方(費用・資産)", slipCr: "貸方(支払元)",
    desc: "摘要", vendor: "相手先", vendorPh: "不明時は業種(レストラン等)",
    required: "*必須", taxCls: "税区分", incType: "所得区分",
    incBiz: "事業", incRE: "不動産", amtIncl: "金額(税込)",
    importTitle: "CSV / Excel 一括取込",
    importNote: "列: 日付, 勘定科目, 摘要, 相手先, 税区分, 金額 — 経費台帳をそのまま貼り付け可",
    importBtn: "取込", imported: "取込 {ok}件 / 重複 {skip}件 / エラー {err}件",
    errDate: "日付と金額を入力してください", errVendor: "相手先は必須です(不明時は業種名)",
    errPaste: "データを貼り付けてください", registered: "登録しました", deleted: "削除しました",
    confirmDel: "削除しますか？",
    debit: "借方", credit: "貸方", balance: "残高", bizPart: "事業分",
    tabPL: "損益計算書", tabBS: "貸借対照表", tabBlue: "青色申告決算書",
    tabWhite: "収支内訳書(白色)", tabRatio: "家事按分", tabOpen: "開業費",
    revSec: "【収入】", expSec: "【経費】", revTotal: "収入 計", expTotal: "経費 計",
    netIncome: "差引金額", assets: "資産の部", liabilities: "負債の部", capital: "資本の部",
    bsMatch: "貸借一致 ✓", bsDiff: "貸借差額 {n} — 事業主貸/借の調整が必要です",
    blueDed: "青色申告特別控除額", incomeAmt: "所得金額", filingType: "申告種別",
    expDetail: "経費内訳", ratioPct: "構成比",
    ratioTitle: "家事按分", ratioBasis: "按分根拠", ratioRate: "按分率",
    ratioBiz: "事業分", ratioHome: "家事分(事業主貸)",
    ratioNote: "※ 家事分は自動的に事業主貸へ振替されます。税務調査に備え業務時間記録を保管してください。",
    openTitle: "開業費 (繰延資産・任意償却)", openDate: "開業日", openNotSet: "未設定",
    openTotal: "開業前 支出 合計", openUsed: "償却済", openLeft: "未償却残高",
    openAmort: "{y}年 償却額", openAll: "全額償却",
    openNote: "任意償却のため金額・時期は自由。高税率の年に償却するほど有利です。",
    amortSet: "償却額を設定しました",
    reTitle: "不動産所得", reExp: "【必要経費】", reIncome: "不動産所得",
    reNote: "※ 事業所得と損益通算されます。土地取得の借入金利子に対応する損失は通算不可(要確認)。",
    none: "なし",
    taxTitle: "税額シミュレーション", income: "所得", taxAmt: "税額",
    taxableI: "課税所得(所得税)", totalIncome: "合計所得金額", taxTotal: "税額 合計",
    sepTitle: "分離課税所得 (必要時に入力)", stockGain: "株式譲渡所得",
    cfdGain: "CFD・先物 (先物取引に係る雑所得等)", reflect: "反映",
    sepNote: "※ 株式とCFDは相互に損益通算できません。事業所得とも通算されず、手当の判定所得にも影響しません。",
    openSim: "開業費 償却シミュレーション",
    openSimNote: "未償却残高 {n} — 決算書タブで償却額を変更すると税額が即時再計算されます。",
    setBasic: "基本", ownerName: "氏名", bizName: "屋号", fy: "対象年度",
    typeWhite: "白色", typeBlue65: "青色 65万 (複式簿記+e-Tax)",
    typeBlue55: "青色 55万", typeBlue10: "青色 10万",
    setDed: "所得控除", socialIns: "社会保険料(年)", spouseDed: "配偶者控除",
    disabledDed: "障害者控除", disNone: "なし", disNormal: "一般 (27万)",
    disSpecial: "特別 (40万)", disTogether: "同居特別 (75万)",
    dependents: "扶養人数(手当判定用)", lifeIns: "生命保険料控除", medical: "医療費控除",
    yes: "あり", no: "なし", trackChk: "手当 判定所得トラッカーを表示",
    setData: "データ", saveSet: "設定を保存", backup: "バックアップ出力", restore: "復元",
    resetAll: "全削除", saved: "保存しました", restored: "復元しました",
    badFile: "ファイルが不正です", confirmReset: "全データを削除します。よろしいですか？",
    setLang: "言語 / 언어",
    backupNever: "⚠ まだバックアップしていません",
    backupOld: "⚠ 最終バックアップから {n}日経過 — バックアップを推奨します",
    backupLast: "最終バックアップ: {n}日前",
    backupDone: "バックアップファイルを保存しました",
    storageFull: "保存容量が不足しています。バックアップ後、古い年度を整理してください。",
    snapTitle: "自動スナップショット (ブラウザ内)",
    snapNote: "保存のたびに自動で世代を残します。キャッシュ削除時もここから復旧できます。ただしブラウザデータの全削除では消えるため、定期的にバックアップファイルをダウンロードしてください。",
    snapNone: "スナップショットなし",
    snapConfirm: "この時点に戻します。現在のデータは上書きされます。続けますか？",
    recovered: "以前のデータを復旧しました",
    recoverAsk: "保存データがありませんが、バックアップスナップショット({n}件)があります。復旧しますか？",
    installApp: "アプリとしてインストール",
    installed: "インストールしました",
    welcome: "ようこそ",
    welcomeMsg: "個人事業主のための財務管理システムです。まず基本情報を設定してください。",
    start: "開始する", namePh: "山田 太郎"
  }
};

// ---------- 계정과목 한국어 대역 ----------
// 일본어명은 신고서 기재용이므로 항상 유지, 한국어는 병기 표시
const ACCT_KO = {
  110: "현금", 111: "보통예금", 112: "사업용예금", 120: "외상매출금", 125: "선급금",
  130: "미수금", 135: "개업비", 140: "공구기구비품", 141: "차량운반구", 142: "건물",
  143: "건물부속설비", 144: "토지", 145: "감가상각누계액", 150: "사업주대", 154: "가지급소비세",
  210: "외상매입금", 211: "미지급금", 215: "선수금", 216: "예수금", 220: "차입금",
  230: "가수소비세", 231: "미지급소비세등", 250: "사업주차",
  300: "원입금", 310: "청색신고특별공제전소득",
  401: "매출액", 405: "잡수입", 411: "부동산임대료", 412: "권리금·갱신료",
  501: "조세공과", 502: "하조운임", 503: "수도광열비", 504: "여비교통비", 505: "통신비",
  506: "광고선전비", 507: "접대교제비", 508: "손해보험료", 509: "수선비", 510: "소모품비",
  511: "감가상각비", 512: "복리후생비", 513: "급료임금", 514: "외주공임", 515: "이자할인료",
  516: "지대가임", 517: "대손금", 518: "회의비", 519: "지급수수료", 520: "도서연구비",
  521: "차량비", 522: "잡비", 530: "개업비상각",
  611: "감가상각비(부동산)", 612: "차입금이자(부동산)", 613: "조세공과(부동산)",
  614: "손해보험료(부동산)", 615: "수선비(부동산)", 616: "관리비(부동산)",
  617: "위탁관리비(부동산)", 618: "교통비(부동산)", 619: "잡비(부동산)"
};

let L = 'ko';                       // 현재 언어
function T(k, vars) {               // 문구 반환
  let s = (LANG[L] && LANG[L][k]) || (LANG.ja[k]) || k;
  if (vars) for (const v in vars) s = s.replace(new RegExp('\\{' + v + '\\}', 'g'), vars[v]);
  return s;
}
// 계정과목명: 한국어 모드는 「일본어 (한국어)」 병기
function tAcct(code, jaName) {
  const ja = jaName || (typeof acctName === 'function' ? acctName(code) : '');
  if (L === 'ja') return ja;
  const ko = ACCT_KO[code];
  return ko ? ja + ' (' + ko + ')' : ja;
}
// 검색·선택용 짧은 표기
function tAcctShort(code, jaName) {
  const ja = jaName || (typeof acctName === 'function' ? acctName(code) : '');
  if (L === 'ja') return ja;
  return ACCT_KO[code] || ja;
}
function setLang(v) {
  L = v; localStorage.setItem('pf_lang', v);
  document.documentElement.lang = (v === 'ko' ? 'ko' : 'ja');
  if (typeof applyNavLabels === 'function') applyNavLabels();
  if (typeof go === 'function') go((location.hash || '#dash').slice(1));
}
function initLang() {
  L = localStorage.getItem('pf_lang') || 'ko';
  document.documentElement.lang = (L === 'ko' ? 'ko' : 'ja');
}
