/* IRON LOG — static data: muscles, exercise patterns, equipment, foods, references */
'use strict';

/* ---------- muscles ---------- */
const MUSCLES = ['가슴', '등', '어깨', '팔', '다리', '코어', '유산소', '전신'];
const STRENGTH_MUSCLES = ['가슴', '등', '어깨', '팔', '다리', '코어'];
const MKEY = { '가슴': 'chest', '등': 'back', '어깨': 'shoulder', '팔': 'arm', '다리': 'leg', '코어': 'core', '유산소': 'cardio', '전신': 'full' };

/* ---------- exercise patterns ----------
   m   : primary muscle (1 set)
   sec : indirect muscles, counted as 0.5 set each (fractional counting, Pelland et al. 2024)
   tag : push / pull / quad / ham — used for balance checks
   cardio: true → logged as minutes, excluded from strength volume                */
const TYPE_INFO = {
  '벤치프레스':        { m: '가슴', sec: { '어깨': .5, '팔': .5 }, tag: 'push' },
  '인클라인 프레스':   { m: '가슴', sec: { '어깨': .5, '팔': .5 }, tag: 'push' },
  '체스트 프레스':     { m: '가슴', sec: { '어깨': .5, '팔': .5 }, tag: 'push' },
  '펙 플라이':         { m: '가슴', sec: {}, tag: 'push' },
  '딥스':              { m: '가슴', sec: { '팔': .5, '어깨': .5 }, tag: 'push' },
  '푸시업':            { m: '가슴', sec: { '팔': .5, '어깨': .5 }, tag: 'push' },
  '랫 풀다운':         { m: '등', sec: { '팔': .5 }, tag: 'pull' },
  '풀업':              { m: '등', sec: { '팔': .5 }, tag: 'pull' },
  '로우':              { m: '등', sec: { '팔': .5, '어깨': .5 }, tag: 'pull' },
  '풀오버':            { m: '등', sec: { '가슴': .5 }, tag: 'pull' },
  '숄더 프레스':       { m: '어깨', sec: { '팔': .5 }, tag: 'push' },
  '레터럴 레이즈':     { m: '어깨', sec: {}, tag: 'push' },
  '리어 델트':         { m: '어깨', sec: { '등': .5 }, tag: 'pull' },
  '슈러그':            { m: '등', sec: {}, tag: 'pull' },
  '바이셉 컬':         { m: '팔', sec: {}, tag: 'pull' },
  '트라이셉 익스텐션': { m: '팔', sec: {}, tag: 'push' },
  '트라이셉 딥':       { m: '팔', sec: { '가슴': .5 }, tag: 'push' },
  '스쿼트':            { m: '다리', sec: { '코어': .5 }, tag: 'quad' },
  '레그 프레스':       { m: '다리', sec: {}, tag: 'quad' },
  '런지':              { m: '다리', sec: {}, tag: 'quad' },
  '레그 익스텐션':     { m: '다리', sec: {}, tag: 'quad' },
  '레그 컬':           { m: '다리', sec: {}, tag: 'ham' },
  '데드리프트':        { m: '다리', sec: { '등': .5, '코어': .5 }, tag: 'ham' },
  '루마니안 데드리프트': { m: '다리', sec: { '등': .5 }, tag: 'ham' },
  '힙 쓰러스트':       { m: '다리', sec: {}, tag: 'ham' },
  '힙 익스텐션':       { m: '다리', sec: {}, tag: 'ham' },
  '힙 어브덕션':       { m: '다리', sec: {}, tag: null },
  '힙 어덕션':         { m: '다리', sec: {}, tag: null },
  '카프 레이즈':       { m: '다리', sec: {}, tag: null },
  '복근 크런치':       { m: '코어', sec: {}, tag: null },
  '레그 레이즈':       { m: '코어', sec: {}, tag: null },
  '코어 로테이션':     { m: '코어', sec: {}, tag: null },
  '백 익스텐션':       { m: '코어', sec: { '다리': .5 }, tag: 'ham' },
  '케틀벨 스윙':       { m: '전신', sec: { '다리': .5, '코어': .5 }, tag: 'ham' },
  '기능성 전신':       { m: '전신', sec: {}, tag: null },
  '캐리':              { m: '전신', sec: { '코어': .5 }, tag: null },
  // CrossFit
  '클린':              { m: '다리', sec: { '등': .5, '어깨': .5 }, tag: 'ham' },
  '스내치':            { m: '다리', sec: { '등': .5, '어깨': .5 }, tag: 'ham' },
  '클린 앤 저크':      { m: '다리', sec: { '어깨': .5, '등': .5 }, tag: 'ham' },
  '쓰러스터':          { m: '다리', sec: { '어깨': .5, '코어': .5 }, tag: 'quad' },
  '월볼':              { m: '다리', sec: { '어깨': .5 }, tag: 'quad' },
  '박스 점프':         { m: '다리', sec: {}, tag: 'quad' },
  '버피':              { m: '전신', sec: { '가슴': .5, '다리': .5 }, tag: null },
  '줄넘기':            { m: '전신', sec: { '다리': .5 }, tag: null },
  '토투바':            { m: '코어', sec: { '등': .5 }, tag: null },
  '머슬업':            { m: '등', sec: { '가슴': .5, '팔': .5 }, tag: 'pull' },
  '핸드스탠드 푸시업': { m: '어깨', sec: { '팔': .5 }, tag: 'push' },
  '로프 클라임':       { m: '등', sec: { '팔': .5 }, tag: 'pull' },
  '러닝/걷기':         { m: '유산소', sec: {}, cardio: true },
  '사이클':            { m: '유산소', sec: {}, cardio: true },
  '일립티컬':          { m: '유산소', sec: {}, cardio: true },
  '계단':              { m: '유산소', sec: {}, cardio: true },
  '로잉':              { m: '유산소', sec: {}, cardio: true },
};
const TYPE_NAMES = Object.keys(TYPE_INFO);

/* keyword → pattern, most specific first. Muscle-aware fallbacks live in inferType() */
const TYPE_KEYWORDS = [
  // machine nicknames and brand model names that don't contain the movement word
  ['바이킹', '숄더 프레스'], ['viking', '숄더 프레스'], ['재머', '숄더 프레스'], ['잼머', '숄더 프레스'], ['jammer', '숄더 프레스'], ['랜드마인 프레스', '숄더 프레스'],
  ['글루트 드라이브', '힙 쓰러스트'], ['글루트드라이브', '힙 쓰러스트'], ['glute drive', '힙 쓰러스트'], ['힙 트러스트', '힙 쓰러스트'], ['힙트러스트', '힙 쓰러스트'], ['hip thrust', '힙 쓰러스트'], ['힙 프레스', '힙 쓰러스트'],
  ['리버스 하이퍼', '힙 익스텐션'], ['reverse hyper', '힙 익스텐션'], ['노르딕', '레그 컬'], ['nordic', '레그 컬'],
  ['벨트 스쿼트', '스쿼트'], ['belt squat', '스쿼트'], ['브이 스쿼트', '스쿼트'], ['v-스쿼트', '스쿼트'], ['v 스쿼트', '스쿼트'], ['v스쿼트', '스쿼트'], ['핵 프레스', '스쿼트'], ['pendulum', '스쿼트'], ['hack', '스쿼트'], ['squat', '스쿼트'],
  ['d.y.', '로우'], ['dy 로우', '로우'], ['티바', '로우'], ['t-바', '로우'], ['t바', '로우'], ['t-bar', '로우'], ['체스트 서포티드', '로우'], ['씰 로우', '로우'], ['row', '로우'],
  ['친&딥', '풀업'], ['친 딥', '풀업'], ['어시스트 풀업', '풀업'], ['어시스트 친업', '풀업'], ['chin', '풀업'], ['pull-up', '풀업'], ['pull up', '풀업'], ['pulldown', '랫 풀다운'], ['pull down', '랫 풀다운'],
  ['토르소', '코어 로테이션'], ['토소', '코어 로테이션'], ['torso', '코어 로테이션'], ['오블리크', '복근 크런치'], ['앱도미널', '복근 크런치'], ['앱 크런치', '복근 크런치'], ['abdominal', '복근 크런치'], ['crunch', '복근 크런치'],
  ['아브덕션', '힙 어브덕션'], ['애브덕션', '힙 어브덕션'], ['어브덕터', '힙 어브덕션'], ['abduct', '힙 어브덕션'], ['아덕션', '힙 어덕션'], ['어덕터', '힙 어덕션'], ['adduct', '힙 어덕션'],
  ['리어 델트', '리어 델트'], ['리어델트', '리어 델트'], ['rear delt', '리어 델트'], ['리버스 플라이', '리어 델트'], ['리버스 펙', '리어 델트'],
  ['래터럴', '레터럴 레이즈'], ['lateral raise', '레터럴 레이즈'], ['쇼울더', '숄더 프레스'], ['어깨 프레스', '숄더 프레스'], ['오버헤드', '숄더 프레스'], ['shoulder press', '숄더 프레스'], ['overhead press', '숄더 프레스'], ['military', '숄더 프레스'],
  ['암 컬', '바이셉 컬'], ['암컬', '바이셉 컬'], ['arm curl', '바이셉 컬'], ['biceps', '바이셉 컬'], ['bicep', '바이셉 컬'], ['시티드 바이셉', '바이셉 컬'],
  ['암 익스텐션', '트라이셉 익스텐션'], ['arm extension', '트라이셉 익스텐션'], ['트라이셉스', '트라이셉 익스텐션'], ['triceps', '트라이셉 익스텐션'], ['tricep', '트라이셉 익스텐션'], ['시티드 딥', '트라이셉 딥'], ['seated dip', '트라이셉 딥'],
  ['leg extension', '레그 익스텐션'], ['leg curl', '레그 컬'], ['닐링 컬', '레그 컬'], ['프론 컬', '레그 컬'], ['시티드 레그컬', '레그 컬'], ['leg press', '레그 프레스'], ['calf', '카프 레이즈'],
  ['슈퍼 플라이', '펙 플라이'], ['pec deck', '펙 플라이'], ['pec fly', '펙 플라이'], ['chest fly', '펙 플라이'], ['incline', '인클라인 프레스'], ['decline', '체스트 프레스'], ['디클라인', '체스트 프레스'],
  ['chest press', '체스트 프레스'], ['bench press', '벤치프레스'], ['shrug', '슈러그'], ['pullover', '풀오버'], ['back extension', '백 익스텐션'], ['lunge', '런지'], ['deadlift', '데드리프트'], ['rdl', '루마니안 데드리프트'],
  ['클린 앤 저크', '클린 앤 저크'], ['용상', '클린 앤 저크'], ['스내치', '스내치'], ['인상', '스내치'],
  ['클린', '클린'], ['쓰러스터', '쓰러스터'], ['스러스터', '쓰러스터'], ['월볼', '월볼'], ['월 볼', '월볼'],
  ['박스 점프', '박스 점프'], ['박스점프', '박스 점프'], ['버피', '버피'], ['더블 언더', '줄넘기'], ['더블언더', '줄넘기'], ['줄넘기', '줄넘기'],
  ['토투바', '토투바'], ['토즈 투 바', '토투바'], ['T2B', '토투바'], ['머슬업', '머슬업'], ['머슬 업', '머슬업'],
  ['핸드스탠드', '핸드스탠드 푸시업'], ['HSPU', '핸드스탠드 푸시업'], ['로프', '로프 클라임'],
  ['푸시 프레스', '숄더 프레스'], ['푸시 저크', '숄더 프레스'], ['저크', '숄더 프레스'], ['GHD', '복근 크런치'],
  ['루마니안', '루마니안 데드리프트'], ['RDL', '루마니안 데드리프트'], ['스티프', '루마니안 데드리프트'],
  ['데드', '데드리프트'], ['굿모닝', '루마니안 데드리프트'],
  ['힙 쓰러스트', '힙 쓰러스트'], ['힙쓰러스트', '힙 쓰러스트'], ['글루트 브릿지', '힙 쓰러스트'],
  ['킥백', '힙 익스텐션'], ['글루트', '힙 익스텐션'],
  ['어브덕션', '힙 어브덕션'], ['어덕션', '힙 어덕션'],
  ['레그 익스텐션', '레그 익스텐션'], ['레그익스텐션', '레그 익스텐션'],
  ['레그 컬', '레그 컬'], ['레그컬', '레그 컬'], ['라잉 컬', '레그 컬'],
  ['레그 프레스', '레그 프레스'], ['레그프레스', '레그 프레스'],
  ['핵', '스쿼트'], ['스쿼트', '스쿼트'], ['펜듈럼', '스쿼트'],
  ['런지', '런지'], ['스플릿', '런지'], ['스텝업', '런지'],
  ['카프', '카프 레이즈'],
  ['인클라인', '인클라인 프레스'],
  ['벤치', '벤치프레스'],
  ['체스트 프레스', '체스트 프레스'], ['체스트프레스', '체스트 프레스'],
  ['플라이', '펙 플라이'], ['펙덱', '펙 플라이'], ['펙 덱', '펙 플라이'], ['크로스오버', '펙 플라이'],
  ['와이드 체스트', '체스트 프레스'], ['체스트', '체스트 프레스'], ['가슴 프레스', '체스트 프레스'],
  ['푸시업', '푸시업'], ['푸쉬업', '푸시업'],
  ['트라이셉 딥', '트라이셉 딥'], ['딥', '딥스'],
  ['풀다운', '랫 풀다운'], ['랫풀', '랫 풀다운'],
  ['풀업', '풀업'], ['친업', '풀업'], ['턱걸이', '풀업'],
  ['로우', '로우'], ['풀오버', '풀오버'], ['슈러그', '슈러그'],
  ['리어', '리어 델트'], ['페이스풀', '리어 델트'],
  ['레터럴', '레터럴 레이즈'], ['사이드 레이즈', '레터럴 레이즈'],
  ['숄더 프레스', '숄더 프레스'], ['숄더프레스', '숄더 프레스'], ['오버헤드 프레스', '숄더 프레스'], ['밀리터리', '숄더 프레스'], ['OHP', '숄더 프레스'],
  ['푸시다운', '트라이셉 익스텐션'], ['푸쉬다운', '트라이셉 익스텐션'], ['스컬', '트라이셉 익스텐션'], ['트라이셉', '트라이셉 익스텐션'], ['삼두', '트라이셉 익스텐션'],
  ['해머 컬', '바이셉 컬'], ['프리처', '바이셉 컬'], ['바이셉', '바이셉 컬'], ['이두', '바이셉 컬'], ['컬', null],
  ['크런치', '복근 크런치'], ['레그 레이즈', '레그 레이즈'], ['레그레이즈', '레그 레이즈'], ['롤아웃', '복근 크런치'],
  ['로테이션', '코어 로테이션'], ['백 익스텐션', '백 익스텐션'], ['백익스텐션', '백 익스텐션'],
  ['스윙', '케틀벨 스윙'], ['파머', '캐리'], ['캐리', '캐리'],
  ['트레드밀', '러닝/걷기'], ['러닝', '러닝/걷기'], ['걷기', '러닝/걷기'],
  ['바이크', '사이클'], ['사이클', '사이클'], ['일립티컬', '일립티컬'], ['스텝밀', '계단'], ['천국의 계단', '계단'],
  ['로잉', '로잉'], ['스키에르그', '로잉'],
];

function inferType(name, m) {
  // "Iso-Lateral" is Hammer Strength's series name, not a lateral raise
  const n = String(name || '').toLowerCase().replace(/아이소\s*-?\s*[래레]터럴|iso\s*-?\s*lateral/g, ' ');
  for (const [kw, t] of TYPE_KEYWORDS) {
    if (n.indexOf(kw) > -1) {
      if (t) return t;
      break; // ambiguous keyword (e.g. "컬") → decide by muscle below
    }
  }
  // brand-agnostic fallbacks using the chosen muscle (e.g. "뉴텍 익스텐션" + 다리 → 레그 익스텐션)
  if (n.indexOf('익스텐션') > -1) return m === '팔' ? '트라이셉 익스텐션' : m === '코어' ? '백 익스텐션' : '레그 익스텐션';
  if (n.indexOf('컬') > -1) return m === '다리' ? '레그 컬' : '바이셉 컬';
  if (n.indexOf('프레스') > -1) return m === '어깨' ? '숄더 프레스' : m === '다리' ? '레그 프레스' : m === '팔' ? '트라이셉 딥' : '체스트 프레스';
  if (n.indexOf('레이즈') > -1) return m === '다리' ? '카프 레이즈' : m === '코어' ? '레그 레이즈' : '레터럴 레이즈';
  if (m === '유산소') return '러닝/걷기';
  if (m === '전신') return '기능성 전신';
  return null; // unknown → caller uses the exercise's own name as its pattern
}

/* ---------- equipment ----------
   kind: machine | free | cardio ; sec: sector for free weights               */
const FREE_SECTORS = [
  ['bw', '맨몸 (기구 없이)'],
  ['press', '벤치·가슴 프레스'], ['squat', '스쿼트·하체'], ['hinge', '데드리프트·힌지'],
  ['ohp', '어깨 프레스·레이즈'], ['pull', '로우·풀업'], ['arm', '팔'], ['kb', '케틀벨·기능성'], ['core', '코어'],
];

const EQ_RAW = [
  // ── 가슴 (machine)
  ['hs-superinc', 'Hammer Strength', '아이소-래터럴 슈퍼 인클라인 프레스', '가슴', '인클라인 프레스'],
  ['hs-widechest', 'Hammer Strength', '아이소-래터럴 와이드 체스트', '가슴', '체스트 프레스'],
  ['hs-horizbench', 'Hammer Strength', '아이소-래터럴 호리존탈 벤치프레스', '가슴', '체스트 프레스'],
  ['hs-chestback', 'Hammer Strength', '아이소-래터럴 체스트/백', '가슴', '체스트 프레스'],
  ['hs-superfly', 'Hammer Strength', '슈퍼 플라이', '가슴', '펙 플라이'],
  ['cy-chest', 'Cybex', '체스트 프레스', '가슴', '체스트 프레스'],
  ['cy-incline', 'Cybex', '인클라인 프레스', '가슴', '인클라인 프레스'],
  ['nw-seatchest', '뉴텍 (Newtech)', '시티드 체스트 프레스', '가슴', '체스트 프레스'],
  ['nw-incline', '뉴텍 (Newtech)', '인클라인 체스트 프레스', '가슴', '인클라인 프레스'],
  ['nw-chestdecline', '뉴텍 (Newtech)', '체스트 & 디클라인 콤보', '가슴', '체스트 프레스'],
  ['nw-standfly', '뉴텍 (Newtech)', '스탠딩 플라이 체스트&백', '가슴', '펙 플라이'],
  ['lf-chest-press', 'Life Fitness', '체스트 프레스', '가슴', '체스트 프레스'],
  ['hs-iso-bench', 'Hammer Strength', '아이소-래터럴 벤치프레스', '가슴', '체스트 프레스'],
  ['hs-incline', 'Hammer Strength', '아이소-래터럴 인클라인 프레스', '가슴', '인클라인 프레스'],
  ['hs-decline', 'Hammer Strength', '디클라인 프레스', '가슴', '체스트 프레스'],
  ['tg-pecdeck', 'Technogym', '펙 덱 플라이', '가슴', '펙 플라이'],
  ['cy-fly', 'Cybex', '체스트 플라이', '가슴', '펙 플라이'],
  ['nt-chest', 'Nautilus', '체스트 프레스', '가슴', '체스트 프레스'],
  ['pt-chest', 'Panatta', '슈퍼 체스트 프레스', '가슴', '체스트 프레스'],
  ['g80-chest', 'Gym80', '체스트 프레스', '가슴', '체스트 프레스'],
  ['at-incline', 'Atlantis', '인클라인 체스트 프레스', '가슴', '인클라인 프레스'],
  ['ks-chest', 'Keiser', '에어 체스트 프레스', '가슴', '체스트 프레스'],
  ['nw-chest', '뉴텍 (Newtech)', '체스트 프레스', '가슴', '체스트 프레스'],
  ['nw-pecfly', '뉴텍 (Newtech)', '펙 플라이 / 리어 델트', '가슴', '펙 플라이'],
  ['cb-cross', '케이블', '케이블 크로스오버', '가슴', '펙 플라이'],
  // ── 등
  ['hs-dyrow', 'Hammer Strength', '아이소-래터럴 DY 로우', '등', '로우'],
  ['hs-widepull', 'Hammer Strength', '아이소-래터럴 와이드 풀다운', '등', '랫 풀다운'],
  ['hs-lowrow', 'Hammer Strength', '아이소-래터럴 로우 로우', '등', '로우'],
  ['hs-tbar', 'Hammer Strength', '아이소-래터럴 T-바 로우', '등', '로우'],
  ['hs-pullover', 'Hammer Strength', '풀오버', '등', '풀오버'],
  ['hs-shrug', 'Hammer Strength', '시티드/스탠딩 슈러그', '등', '슈러그'],
  ['cy-pulldown', 'Cybex', '풀다운', '등', '랫 풀다운'],
  ['cy-backext', 'Cybex', '백 익스텐션', '코어', '백 익스텐션'],
  ['nw-lowrow', '뉴텍 (Newtech)', '토크라인 로우 로우', '등', '로우'],
  ['nw-frontrow', '뉴텍 (Newtech)', '토크라인 프론트 로우', '등', '로우'],
  ['nw-highrow', '뉴텍 (Newtech)', '토쳐 하이 로우', '등', '로우'],
  ['nw-tbar', '뉴텍 (Newtech)', '토쳐 리니어 T-바 로우', '등', '로우'],
  ['nw-widepullf', '뉴텍 (Newtech)', '와이드 풀다운 (프론트)', '등', '랫 풀다운'],
  ['nw-widepullr', '뉴텍 (Newtech)', '와이드 풀다운 (리어)', '등', '랫 풀다운'],
  ['nw-chindip', '뉴텍 (Newtech)', '친&딥 어시스트', '등', '풀업'],
  ['lf-pulldown', 'Life Fitness', '랫 풀다운', '등', '랫 풀다운'],
  ['lf-assist', 'Life Fitness', '어시스트 풀업/딥', '등', '풀업'],
  ['cy-row', 'Cybex', '시티드 로우', '등', '로우'],
  ['hs-highrow', 'Hammer Strength', '아이소-래터럴 하이 로우', '등', '로우'],
  ['hs-row', 'Hammer Strength', '아이소-래터럴 로우', '등', '로우'],
  ['hs-pulldown', 'Hammer Strength', '아이소-래터럴 프론트 풀다운', '등', '랫 풀다운'],
  ['mx-pulldown', 'Matrix', '랫 풀다운', '등', '랫 풀다운'],
  ['nt-row', 'Nautilus', '로우', '등', '로우'],
  ['nt-pullover', 'Nautilus', '풀오버', '등', '풀오버'],
  ['g80-pulldown', 'Gym80', '랫 풀다운', '등', '랫 풀다운'],
  ['at-tbar', 'Atlantis', '티바 로우', '등', '로우'],
  ['pt-lowrow', 'Panatta', '로우 로우', '등', '로우'],
  ['nw-pulldown', '뉴텍 (Newtech)', '랫 풀다운', '등', '랫 풀다운'],
  ['nw-row', '뉴텍 (Newtech)', '시티드 로우', '등', '로우'],
  ['cb-row', '케이블', '시티드 케이블 로우', '등', '로우'],
  ['cb-straight', '케이블', '스트레이트 암 풀다운', '등', '풀오버'],
  // ── 어깨
  ['hs-lateral', 'Hammer Strength', '레터럴 레이즈', '어깨', '레터럴 레이즈'],
  ['hs-jammer', 'Hammer Strength', '그라운드 베이스 재머', '어깨', '숄더 프레스'],
  ['cy-ohp', 'Cybex', '오버헤드 프레스', '어깨', '숄더 프레스'],
  ['cy-lateral', 'Cybex', '레터럴 레이즈', '어깨', '레터럴 레이즈'],
  ['cy-flyrear', 'Cybex', '플라이 / 리어 델트', '어깨', '리어 델트'],
  ['nw-lateral', '뉴텍 (Newtech)', '레터럴 레이즈', '어깨', '레터럴 레이즈'],
  ['nw-standlat', '뉴텍 (Newtech)', '스탠딩 레터럴 레이즈', '어깨', '레터럴 레이즈'],
  ['nw-singlelat', '뉴텍 (Newtech)', '싱글 레터럴 레이즈', '어깨', '레터럴 레이즈'],
  ['nw-pecrev', '뉴텍 (Newtech)', '펙덱 플라이 (리버스 겸용) · 리어', '어깨', '리어 델트'],
  ['pl-viking', '플레이트 머신', '바이킹 프레스', '어깨', '숄더 프레스'],
  ['lf-shoulder', 'Life Fitness', '숄더 프레스', '어깨', '숄더 프레스'],
  ['hs-shoulder', 'Hammer Strength', '아이소-래터럴 숄더 프레스', '어깨', '숄더 프레스'],
  ['tg-lateral', 'Technogym', '레터럴 레이즈', '어깨', '레터럴 레이즈'],
  ['nt-shoulder', 'Nautilus', '숄더 프레스', '어깨', '숄더 프레스'],
  ['g80-rear', 'Gym80', '리어 델트', '어깨', '리어 델트'],
  ['at-lateral', 'Atlantis', '스탠딩 레터럴 레이즈', '어깨', '레터럴 레이즈'],
  ['pt-shoulder', 'Panatta', '숄더 프레스', '어깨', '숄더 프레스'],
  ['nw-shoulder', '뉴텍 (Newtech)', '숄더 프레스', '어깨', '숄더 프레스'],
  ['cb-facepull', '케이블', '페이스풀', '어깨', '리어 델트'],
  ['cb-lateral', '케이블', '케이블 레터럴 레이즈', '어깨', '레터럴 레이즈'],
  // ── 팔
  ['hs-biceps', 'Hammer Strength', '시티드 바이셉', '팔', '바이셉 컬'],
  ['hs-dip', 'Hammer Strength', '시티드 딥', '팔', '트라이셉 딥'],
  ['cy-armext', 'Cybex', '암 익스텐션', '팔', '트라이셉 익스텐션'],
  ['nw-armcurl', '뉴텍 (Newtech)', '암컬', '팔', '바이셉 컬'],
  ['cy-curl', 'Cybex', '바이셉 컬', '팔', '바이셉 컬'],
  ['lf-tri', 'Life Fitness', '트라이셉 익스텐션', '팔', '트라이셉 익스텐션'],
  ['mx-curl', 'Matrix', '암 컬', '팔', '바이셉 컬'],
  ['nt-preacher', 'Nautilus', '프리처 컬', '팔', '바이셉 컬'],
  ['g80-dip', 'Gym80', '시티드 트라이셉 딥', '팔', '트라이셉 딥'],
  ['at-armcombo', 'Atlantis', '바이셉/트라이셉 콤보', '팔', '바이셉 컬'],
  ['cb-pushdown', '케이블', '트라이셉 푸시다운', '팔', '트라이셉 익스텐션'],
  ['cb-curl', '케이블', '케이블 컬', '팔', '바이셉 컬'],
  // ── 다리
  ['hs-linearlp', 'Hammer Strength', '리니어 레그 프레스', '다리', '레그 프레스'],
  ['hs-beltsq', 'Hammer Strength', '벨트 스쿼트', '다리', '스쿼트'],
  ['hs-pendulum', 'Hammer Strength', '펜듈럼-X 스쿼트', '다리', '스쿼트'],
  ['hs-revv', 'Hammer Strength', '리버스 V-스쿼트', '다리', '스쿼트'],
  ['hs-supersq', 'Hammer Strength', '슈퍼 스쿼트 프레스', '다리', '스쿼트'],
  ['hs-multisq', 'Hammer Strength', '그라운드 베이스 멀티 스쿼트', '다리', '스쿼트'],
  ['hs-glutedrive', 'Hammer Strength', '글루트 드라이브', '다리', '힙 쓰러스트'],
  ['hs-kneelcurl', 'Hammer Strength', '아이소-래터럴 닐링 레그 컬', '다리', '레그 컬'],
  ['hs-legcurl', 'Hammer Strength', '아이소-래터럴 레그 컬', '다리', '레그 컬'],
  ['hs-seatcalf', 'Hammer Strength', '시티드 카프 레이즈', '다리', '카프 레이즈'],
  ['hs-revhyper', 'Hammer Strength', '글루트 햄 / 리버스 하이퍼', '다리', '힙 익스텐션'],
  ['hs-nordic', 'Hammer Strength', '어시스트 노르딕 햄', '다리', '레그 컬'],
  ['cy-legpress', 'Cybex', '레그 프레스', '다리', '레그 프레스'],
  ['cy-seatcurl', 'Cybex', '시티드 레그 컬', '다리', '레그 컬'],
  ['cy-pronecurl', 'Cybex', '프론 레그 컬', '다리', '레그 컬'],
  ['cy-calf', 'Cybex', '카프', '다리', '카프 레이즈'],
  ['cy-abduction', 'Cybex', '힙 어브덕션', '다리', '힙 어브덕션'],
  ['cy-adduction', 'Cybex', '힙 어덕션', '다리', '힙 어덕션'],
  ['cy-glute', 'Cybex', '글루트', '다리', '힙 익스텐션'],
  ['nw-seatlp', '뉴텍 (Newtech)', '시티드 레그 프레스', '다리', '레그 프레스'],
  ['nw-kneelcurl', '뉴텍 (Newtech)', '토크라인 닐링 레그 컬', '다리', '레그 컬'],
  ['nw-hackpress', '뉴텍 (Newtech)', '토쳐 핵 프레스', '다리', '스쿼트'],
  ['nw-hacksq', '뉴텍 (Newtech)', '토쳐 핵스쿼트 (무빙)', '다리', '스쿼트'],
  ['nw-beltsq', '뉴텍 (Newtech)', '토쳐 벨트 스쿼트', '다리', '스쿼트'],
  ['nw-sqcalf', '뉴텍 (Newtech)', '토쳐 스쿼트 & 카프 레이즈', '다리', '스쿼트'],
  ['nw-hipthrust', '뉴텍 (Newtech)', '토쳐 힙 트러스트', '다리', '힙 쓰러스트'],
  ['nw-adduction', '뉴텍 (Newtech)', '힙 어덕션', '다리', '힙 어덕션'],
  ['nw-standcalf', '뉴텍 (Newtech)', '스탠딩 카프 레이즈', '다리', '카프 레이즈'],
  ['lf-legpress', 'Life Fitness', '레그 프레스', '다리', '레그 프레스'],
  ['hs-legpress', 'Hammer Strength', '레그 프레스 (플레이트)', '다리', '레그 프레스'],
  ['hs-legext', 'Hammer Strength', '레그 익스텐션', '다리', '레그 익스텐션'],
  ['hs-hack', 'Hammer Strength', 'V-스쿼트 / 핵 스쿼트', '다리', '스쿼트'],
  ['cy-legext', 'Cybex', '레그 익스텐션', '다리', '레그 익스텐션'],
  ['cy-squat', 'Cybex', '스쿼트 머신', '다리', '스쿼트'],
  ['tg-legcurl', 'Technogym', '시티드 레그 컬', '다리', '레그 컬'],
  ['lf-lyingcurl', 'Life Fitness', '라잉 레그 컬', '다리', '레그 컬'],
  ['at-hack', 'Atlantis', '핵 스쿼트', '다리', '스쿼트'],
  ['pt-legpress', 'Panatta', '레그 프레스', '다리', '레그 프레스'],
  ['g80-legpress', 'Gym80', '레그 프레스', '다리', '레그 프레스'],
  ['g80-glute', 'Gym80', '글루트 킥백', '다리', '힙 익스텐션'],
  ['mx-calf', 'Matrix', '카프 레이즈', '다리', '카프 레이즈'],
  ['tg-abduction', 'Technogym', '힙 어브덕션', '다리', '힙 어브덕션'],
  ['pt-adduction', 'Panatta', '힙 어덕션', '다리', '힙 어덕션'],
  ['bs-smith-sq', 'Body-Solid', '스미스 머신 스쿼트', '다리', '스쿼트'],
  ['nw-legext', '뉴텍 (Newtech)', '레그 익스텐션', '다리', '레그 익스텐션'],
  ['nw-legcurl', '뉴텍 (Newtech)', '레그 컬', '다리', '레그 컬'],
  ['nw-legpress', '뉴텍 (Newtech)', '레그 프레스', '다리', '레그 프레스'],
  ['nw-abduction', '뉴텍 (Newtech)', '힙 어브덕션', '다리', '힙 어브덕션'],
  // ── 코어
  ['hs-abcrunch', 'Hammer Strength', '앱도미널 / 오블리크 크런치', '코어', '복근 크런치'],
  ['cy-torso', 'Cybex', '토르소 로테이션', '코어', '코어 로테이션'],
  ['mx-abcrunch', 'Matrix', '앱 크런치', '코어', '복근 크런치'],
  ['cy-abcrunch', 'Cybex', '앱도미널 크런치', '코어', '복근 크런치'],
  ['nt-rotation', 'Nautilus', '토르소 로테이션', '코어', '코어 로테이션'],
  ['lf-backext', 'Life Fitness', '백 익스텐션', '코어', '백 익스텐션'],
  ['cb-crunch', '케이블', '케이블 크런치', '코어', '복근 크런치'],
  // ── 전신/기능성
  ['trx', 'TRX', '서스펜션 트레이닝', '전신', '기능성 전신'],
  ['sled', 'Torque', '슬레드 푸시', '전신', '기능성 전신'],
];

const FREE_RAW = [
  // [id, name, m, type, sector]
  ['fw-bench', '바벨 벤치프레스', '가슴', '벤치프레스', 'press'],
  ['fw-incline-bb', '인클라인 바벨 벤치프레스', '가슴', '인클라인 프레스', 'press'],
  ['fw-db-bench', '덤벨 벤치프레스', '가슴', '벤치프레스', 'press'],
  ['fw-incline-db', '인클라인 덤벨 프레스', '가슴', '인클라인 프레스', 'press'],
  ['fw-db-fly', '덤벨 플라이', '가슴', '펙 플라이', 'press'],
  ['fw-smith-bench', '스미스 머신 벤치프레스', '가슴', '벤치프레스', 'press'],
  ['fw-dips', '딥스 (맨몸/가중)', '가슴', '딥스', 'press'],
  ['fw-pushup', '푸시업', '가슴', '푸시업', 'press'],
  ['fw-squat', '바벨 백스쿼트', '다리', '스쿼트', 'squat'],
  ['fw-front', '프론트 스쿼트', '다리', '스쿼트', 'squat'],
  ['fw-goblet', '고블릿 스쿼트', '다리', '스쿼트', 'squat'],
  ['fw-bss', '불가리안 스플릿 스쿼트', '다리', '런지', 'squat'],
  ['fw-lunge', '덤벨 런지', '다리', '런지', 'squat'],
  ['fw-deadlift', '컨벤셔널 데드리프트', '다리', '데드리프트', 'hinge'],
  ['fw-sumo', '스모 데드리프트', '다리', '데드리프트', 'hinge'],
  ['fw-trapbar', '트랩바 데드리프트', '다리', '데드리프트', 'hinge'],
  ['fw-rdl', '루마니안 데드리프트', '다리', '루마니안 데드리프트', 'hinge'],
  ['fw-glutebridge', '글루트 브릿지 (맨몸/바벨)', '다리', '힙 쓰러스트', 'hinge'],
  ['fw-slbridge', '싱글레그 글루트 브릿지', '다리', '힙 쓰러스트', 'hinge'],
  ['fw-slhipthrust', '싱글레그 힙 쓰러스트', '다리', '힙 쓰러스트', 'hinge'],
  ['fw-sl-rdl', '싱글레그 루마니안 데드리프트', '다리', '루마니안 데드리프트', 'hinge'],
  ['fw-boxsquat', '박스 스쿼트', '다리', '스쿼트', 'squat'],
  ['fw-stepup', '덤벨 스텝업', '다리', '런지', 'squat'],
  ['fw-clam', '사이드 클램쉘 (밴드)', '다리', '힙 어브덕션', 'hinge'],
  ['fw-invrow', '인버티드 로우 (맨몸)', '등', '로우', 'pull'],
  ['fw-plank', '플랭크 (회 = 초)', '코어', '복근 크런치', 'core'],
  ['fw-sideplank', '사이드 플랭크 (회 = 초)', '코어', '코어 로테이션', 'core'],
  ['fw-crunch', '크런치 (맨몸)', '코어', '복근 크런치', 'core'],
  ['fw-woodchop', '케이블 우드찹 (트위스트)', '코어', '코어 로테이션', 'core'],
  ['fw-hipthrust', '바벨 힙 쓰러스트', '다리', '힙 쓰러스트', 'hinge'],
  ['fw-goodmorning', '굿모닝', '다리', '루마니안 데드리프트', 'hinge'],
  ['fw-ohp', '바벨 오버헤드 프레스', '어깨', '숄더 프레스', 'ohp'],
  ['fw-db-ohp', '덤벨 숄더 프레스', '어깨', '숄더 프레스', 'ohp'],
  ['fw-lateral', '덤벨 레터럴 레이즈', '어깨', '레터럴 레이즈', 'ohp'],
  ['fw-reardelt', '덤벨 리어 델트 플라이', '어깨', '리어 델트', 'ohp'],
  ['fw-shrug', '덤벨 슈러그', '등', '슈러그', 'ohp'],
  ['fw-bbrow', '바벨 로우', '등', '로우', 'pull'],
  ['fw-dbrow', '원암 덤벨 로우', '등', '로우', 'pull'],
  ['fw-landmine', '티바 로우 (랜드마인)', '등', '로우', 'pull'],
  ['fw-pullup', '풀업 (맨몸/가중)', '등', '풀업', 'pull'],
  ['fw-chinup', '친업', '등', '풀업', 'pull'],
  ['fw-bbcurl', '바벨 컬', '팔', '바이셉 컬', 'arm'],
  ['fw-dbcurl', '덤벨 컬', '팔', '바이셉 컬', 'arm'],
  ['fw-hammer', '해머 컬', '팔', '바이셉 컬', 'arm'],
  ['fw-skull', 'EZ바 스컬크러셔', '팔', '트라이셉 익스텐션', 'arm'],
  ['fw-ohext', '오버헤드 덤벨 익스텐션', '팔', '트라이셉 익스텐션', 'arm'],
  ['fw-kbswing', '케틀벨 스윙', '전신', '케틀벨 스윙', 'kb'],
  ['fw-kbgoblet', '케틀벨 고블릿 스쿼트', '다리', '스쿼트', 'kb'],
  ['fw-farmer', '파머스 워크', '전신', '캐리', 'kb'],
  ['fw-hangleg', '행잉 레그 레이즈', '코어', '레그 레이즈', 'core'],
  ['fw-rollout', '앱 롤아웃', '코어', '복근 크런치', 'core'],
  ['fw-roman', '45° 백 익스텐션', '코어', '백 익스텐션', 'core'],
];

const CARDIO_RAW = [
  ['pc-tread', 'Precor', '트레드밀', '러닝/걷기'],
  ['tg-tread', 'Technogym', '트레드밀', '러닝/걷기'],
  ['wd-curve', 'Woodway', '커브 트레드밀', '러닝/걷기'],
  ['mx-ellip', 'Matrix', '일립티컬', '일립티컬'],
  ['lf-ellip', 'Life Fitness', '일립티컬', '일립티컬'],
  ['sm-step', 'StairMaster', '스텝밀 (천국의 계단)', '계단'],
  ['c2-row', 'Concept2', '로잉 머신', '로잉'],
  ['c2-ski', 'Concept2', '스키에르그', '로잉'],
  ['af-bike', 'Assault Fitness', '에어 바이크', '사이클'],
  ['wb-bike', 'Wattbike', '스마트 사이클', '사이클'],
  ['ks-m3', 'Keiser', 'M3 실내 사이클', '사이클'],
  ['out-run', '야외', '러닝 / 걷기', '러닝/걷기'],
];

/* CrossFit: [id, name, muscle, pattern, sector] */
// CrossFit: a short list of the most common box movements, shown as one group under 프리
const CF_RAW = [
  ['cf-powerclean', '파워 클린', '다리', '클린'],
  ['cf-powersnatch', '파워 스내치', '다리', '스내치'],
  ['cf-cnj', '클린 앤 저크', '다리', '클린 앤 저크'],
  ['cf-thruster', '쓰러스터', '다리', '쓰러스터'],
  ['cf-pullup', '풀업 (키핑·버터플라이)', '등', '풀업'],
  ['cf-t2b', '토투바', '코어', '토투바'],
  ['cf-barmu', '머슬업', '등', '머슬업'],
  ['cf-hspu', '핸드스탠드 푸시업', '어깨', '핸드스탠드 푸시업'],
  ['cf-wallball', '월볼', '다리', '월볼'],
  ['cf-boxjump', '박스 점프', '다리', '박스 점프'],
  ['cf-burpee', '버피', '전신', '버피'],
  ['cf-du', '더블 언더', '전신', '줄넘기'],
];

/* bodyweight: no equipment, or a bar / table / chair. Weight stays empty (or extra load from a vest). */
const BW_RAW = [
  ['bw-squat', '맨몸 스쿼트', '다리', '스쿼트'],
  ['bw-jumpsquat', '점프 스쿼트', '다리', '스쿼트'],
  ['bw-revlunge', '리버스 런지 (맨몸)', '다리', '런지'],
  ['bw-bss', '맨몸 불가리안 스플릿 스쿼트', '다리', '런지'],
  ['bw-pistol', '피스톨 스쿼트 (박스·의자 보조)', '다리', '스쿼트'],
  ['bw-nordic', '노르딕 햄스트링 컬', '다리', '레그 컬'],
  ['bw-sliderc', '슬라이딩 레그 컬 (수건·양말)', '다리', '레그 컬'],
  ['bw-calf', '싱글레그 카프 레이즈 (계단)', '다리', '카프 레이즈'],
  ['bw-kneepush', '무릎 푸시업', '가슴', '푸시업'],
  ['bw-inclinepush', '인클라인 푸시업 (책상·벤치 짚고)', '가슴', '푸시업'],
  ['bw-declinepush', '디클라인 푸시업 (발 올리고)', '가슴', '인클라인 프레스'],
  ['bw-diamond', '다이아몬드 푸시업', '팔', '트라이셉 딥'],
  ['bw-benchdip', '벤치 딥스 (의자)', '팔', '트라이셉 딥'],
  ['bw-pike', '파이크 푸시업', '어깨', '핸드스탠드 푸시업'],
  ['bw-wallhspu', '벽 핸드스탠드 푸시업', '어깨', '핸드스탠드 푸시업'],
  ['bw-negpull', '네거티브 풀업 (천천히 내려오기)', '등', '풀업'],
  ['bw-ytw', '엎드려 Y·T 레이즈 (맨몸)', '어깨', '리어 델트'],
  ['bw-hollow', '할로우 홀드 (회 = 초)', '코어', '복근 크런치'],
  ['bw-legraise', '라잉 레그 레이즈', '코어', '레그 레이즈'],
  ['bw-mtclimb', '마운틴 클라이머 (회 = 초)', '전신', '기능성 전신'],
  ['bw-superman', '슈퍼맨 (엎드려 등 들기)', '코어', '백 익스텐션'],
];

// free-weight entries that are done with bodyweight
const BW_FREE = new Set(['fw-pushup', 'fw-dips', 'fw-pullup', 'fw-chinup', 'fw-invrow', 'fw-plank', 'fw-sideplank', 'fw-crunch', 'fw-hangleg', 'fw-glutebridge', 'fw-slbridge']);
const BUILTIN_EQ = [
  ...EQ_RAW.map(([id, brand, name, m, type]) => ({ id, brand, name, m, type, kind: 'machine' })),
  ...FREE_RAW.map(([id, name, m, type, sector]) => ({ id, brand: '프리웨이트', name, m, type, kind: 'free', sector, ...(BW_FREE.has(id) ? { bw: 1 } : {}) })),
  ...BW_RAW.map(([id, name, m, type]) => ({ id, brand: '맨몸', name, m, type, kind: 'free', sector: 'bw', bw: 1 })),
  ...CARDIO_RAW.map(([id, brand, name, type]) => ({ id, brand, name, m: '유산소', type, kind: 'cardio' })),
  ...CF_RAW.map(([id, name, m, type]) => ({ id, brand: '크로스핏', name, m, type, kind: 'crossfit' })),
];

/* ---------- foods ----------
   Values per serving. Approximations from public nutrition databases
   (식약처 식품영양성분DB, USDA FoodData Central) and typical Korean product labels.
   [name, serving label, grams per serving (null = not weight-based), kcal, protein, carbs, fat, category] */
const FOOD_CATS = ['단백질', '곡물·빵', '채소', '과일', '유제품', '견과·지방', '한식', '외식·분식', '편의점', '음료·주류', '보충제'];
const FOOD_RAW = [
  ['닭가슴살 (익힌 것)', '100g', 100, 165, 31, 0, 3.6, '단백질'],
  ['닭가슴살 (생)', '100g', 100, 109, 23, 0, 1.2, '단백질'],
  ['훈제 닭가슴살', '1팩 100g', 100, 110, 23, 1, 1.5, '단백질'],
  ['닭가슴살 소시지', '1개 70g', 70, 100, 12, 4, 4, '단백질'],
  ['닭다리살 (껍질 제거, 익힌 것)', '100g', 100, 179, 25, 0, 8.2, '단백질'],
  ['계란', '1개 (50g)', 50, 72, 6.3, 0.4, 4.8, '단백질'],
  ['계란 흰자', '1개분 (33g)', 33, 17, 3.6, 0.2, 0.1, '단백질'],
  ['소고기 우둔 (생)', '100g', 100, 135, 22, 0, 5, '단백질'],
  ['소고기 안심 (생)', '100g', 100, 160, 21, 0, 8, '단백질'],
  ['소고기 등심 (생)', '100g', 100, 218, 19, 0, 15, '단백질'],
  ['돼지 안심 (생)', '100g', 100, 120, 22, 0, 3.5, '단백질'],
  ['돼지 목살 (생)', '100g', 100, 220, 17, 0, 17, '단백질'],
  ['삼겹살 (생)', '100g', 100, 331, 17, 0, 29, '단백질'],
  ['연어 (생)', '100g', 100, 208, 20, 0, 13, '단백질'],
  ['고등어 구이', '100g', 100, 230, 21, 0, 16, '단백질'],
  ['참치캔 (기름 뺀 것)', '100g', 100, 190, 25, 0, 10, '단백질'],
  ['새우 (익힌 것)', '100g', 100, 99, 24, 0.2, 0.3, '단백질'],
  ['오징어 (익힌 것)', '100g', 100, 95, 18, 3, 1.4, '단백질'],
  ['두부 (부침용)', '100g', 100, 84, 9, 2, 4.6, '단백질'],
  ['순두부', '100g', 100, 47, 4.5, 1.8, 2.5, '단백질'],
  ['백미밥', '1공기 (210g)', 210, 313, 5.4, 69, 0.6, '곡물·빵'],
  ['현미밥', '1공기 (210g)', 210, 235, 5.5, 49, 1.9, '곡물·빵'],
  ['잡곡밥', '1공기 (210g)', 210, 300, 7, 64, 1.5, '곡물·빵'],
  ['즉석밥 (햇반 류)', '1개 (210g)', 210, 315, 5, 70, 0.8, '곡물·빵'],
  ['고구마 (찐 것)', '100g', 100, 120, 1.5, 28, 0.2, '곡물·빵'],
  ['감자 (찐 것)', '100g', 100, 87, 1.9, 20, 0.1, '곡물·빵'],
  ['오트밀 (건조)', '40g', 40, 156, 6.8, 26, 2.8, '곡물·빵'],
  ['통밀식빵', '1장 (35g)', 35, 90, 4, 16, 1.2, '곡물·빵'],
  ['식빵', '1장 (40g)', 40, 110, 3.5, 20, 1.5, '곡물·빵'],
  ['베이글', '1개 (100g)', 100, 260, 10, 51, 1.6, '곡물·빵'],
  ['파스타면 (삶은 것)', '100g', 100, 158, 5.8, 31, 0.9, '곡물·빵'],
  ['가래떡', '100g', 100, 230, 4, 52, 0.4, '곡물·빵'],
  ['그래놀라', '40g', 40, 180, 4, 27, 6, '곡물·빵'],
  ['콘푸레이크', '30g', 30, 113, 2, 26, 0.2, '곡물·빵'],
  ['브로콜리', '100g', 100, 34, 2.8, 7, 0.4, '채소'],
  ['시금치', '100g', 100, 23, 2.9, 3.6, 0.4, '채소'],
  ['양배추', '100g', 100, 25, 1.3, 5.8, 0.1, '채소'],
  ['샐러드 채소 믹스', '100g', 100, 20, 1.5, 3.5, 0.2, '채소'],
  ['오이', '100g', 100, 15, 0.7, 3.6, 0.1, '채소'],
  ['토마토', '100g', 100, 18, 0.9, 3.9, 0.2, '채소'],
  ['방울토마토', '10개 (150g)', 150, 27, 1.4, 5.8, 0.3, '채소'],
  ['파프리카', '1개 (150g)', 150, 39, 1.5, 9, 0.5, '채소'],
  ['당근', '100g', 100, 41, 0.9, 10, 0.2, '채소'],
  ['버섯 (새송이)', '100g', 100, 35, 3, 6, 0.4, '채소'],
  ['배추김치', '100g', 100, 18, 1.5, 3, 0.5, '채소'],
  ['아보카도', '1/2개 (70g)', 70, 112, 1.4, 6, 10, '채소'],
  ['바나나', '1개 (120g)', 120, 107, 1.3, 27, 0.4, '과일'],
  ['사과', '1개 (200g)', 200, 104, 0.5, 28, 0.3, '과일'],
  ['블루베리', '100g', 100, 57, 0.7, 14.5, 0.3, '과일'],
  ['딸기', '100g', 100, 32, 0.7, 7.7, 0.3, '과일'],
  ['귤', '1개 (100g)', 100, 39, 0.6, 10, 0.1, '과일'],
  ['오렌지', '1개 (130g)', 130, 62, 1.2, 15.4, 0.2, '과일'],
  ['포도', '100g', 100, 69, 0.7, 18, 0.2, '과일'],
  ['키위', '1개 (75g)', 75, 46, 0.9, 11, 0.4, '과일'],
  ['수박', '200g', 200, 60, 1.2, 15, 0.3, '과일'],
  ['우유', '200ml', null, 130, 6.4, 9.6, 7.6, '유제품'],
  ['저지방 우유', '200ml', null, 90, 6.6, 10, 2, '유제품'],
  ['그릭요거트 (무가당)', '100g', 100, 59, 10, 3.6, 0.4, '유제품'],
  ['플레인 요거트', '100g', 100, 62, 3.5, 4.7, 3.3, '유제품'],
  ['슬라이스 치즈', '1장 (18g)', 18, 60, 3.5, 0.5, 4.8, '유제품'],
  ['코티지 치즈', '100g', 100, 98, 11, 3.4, 4.3, '유제품'],
  ['두유', '1팩 (190ml)', null, 120, 6, 12, 5.5, '유제품'],
  ['아몬드', '30g', 30, 173, 6.4, 6.5, 15, '견과·지방'],
  ['호두', '30g', 30, 196, 4.6, 4.1, 19.6, '견과·지방'],
  ['하루견과', '1봉 (25g)', 25, 150, 4.5, 6, 12, '견과·지방'],
  ['땅콩버터', '1큰술 (16g)', 16, 94, 3.6, 3.4, 8, '견과·지방'],
  ['올리브오일', '1큰술 (13g)', 13, 117, 0, 0, 13.5, '견과·지방'],
  ['김치찌개', '1인분', null, 230, 15, 10, 14, '한식'],
  ['된장찌개', '1인분', null, 150, 10, 12, 7, '한식'],
  ['순두부찌개', '1인분', null, 250, 15, 10, 16, '한식'],
  ['부대찌개', '1인분', null, 550, 25, 40, 32, '한식'],
  ['삼계탕', '1그릇', null, 800, 70, 40, 40, '한식'],
  ['갈비탕 (밥 제외)', '1그릇', null, 500, 35, 30, 25, '한식'],
  ['설렁탕 (밥 제외)', '1그릇', null, 300, 25, 10, 17, '한식'],
  ['제육볶음', '1인분 (200g)', 200, 450, 25, 20, 30, '한식'],
  ['불고기', '1인분 (200g)', 200, 400, 30, 20, 22, '한식'],
  ['닭갈비', '1인분 (250g)', 250, 450, 35, 25, 22, '한식'],
  ['비빔밥', '1그릇', null, 550, 18, 85, 14, '한식'],
  ['김치볶음밥', '1그릇', null, 600, 14, 85, 22, '한식'],
  ['냉면 (물)', '1그릇', null, 480, 15, 90, 5, '한식'],
  ['돈까스', '1인분', null, 800, 30, 70, 42, '외식·분식'],
  ['짜장면', '1그릇', null, 700, 20, 110, 20, '외식·분식'],
  ['짬뽕', '1그릇', null, 600, 30, 80, 18, '외식·분식'],
  ['김밥', '1줄', null, 330, 9, 55, 8, '외식·분식'],
  ['참치김밥', '1줄', null, 450, 15, 58, 17, '외식·분식'],
  ['떡볶이', '1인분 (300g)', 300, 480, 10, 100, 5, '외식·분식'],
  ['순대', '1인분 (200g)', 200, 380, 16, 50, 12, '외식·분식'],
  ['라면', '1봉', null, 500, 10, 79, 16, '외식·분식'],
  ['후라이드 치킨', '1조각 (100g)', 100, 290, 18, 12, 19, '외식·분식'],
  ['양념치킨', '1조각 (100g)', 100, 320, 17, 20, 19, '외식·분식'],
  ['피자', '1조각 (L)', null, 300, 12, 34, 12, '외식·분식'],
  ['햄버거 (일반)', '1개', null, 400, 15, 45, 17, '외식·분식'],
  ['빅맥 류 버거', '1개', null, 580, 27, 46, 31, '외식·분식'],
  ['감자튀김 (M)', '1개', null, 340, 4, 43, 16, '외식·분식'],
  ['삼각김밥', '1개', null, 210, 5, 36, 5, '편의점'],
  ['편의점 도시락', '1개', null, 750, 25, 100, 25, '편의점'],
  ['샌드위치', '1개', null, 350, 15, 40, 14, '편의점'],
  ['컵라면 (큰컵)', '1개', null, 500, 10, 70, 19, '편의점'],
  ['단백질 음료', '1병 (250ml)', null, 150, 20, 10, 3, '편의점'],
  ['아메리카노', '1잔', null, 10, 0.3, 1.7, 0, '음료·주류'],
  ['카페라떼 (톨)', '1잔', null, 180, 9, 14, 9, '음료·주류'],
  ['바닐라 라떼 (톨)', '1잔', null, 250, 8, 35, 8, '음료·주류'],
  ['콜라', '1캔 (250ml)', null, 108, 0, 27, 0, '음료·주류'],
  ['제로 콜라', '1캔', null, 0, 0, 0, 0, '음료·주류'],
  ['오렌지 주스', '200ml', null, 90, 1.4, 20, 0.4, '음료·주류'],
  ['이온음료', '500ml', null, 125, 0, 31, 0, '음료·주류'],
  ['맥주', '500ml', null, 210, 2, 16, 0, '음료·주류'],
  ['소주', '1병 (360ml)', null, 400, 0, 1, 0, '음료·주류'],
  ['막걸리', '1병 (750ml)', null, 345, 4, 25, 0, '음료·주류'],
  ['와인', '1잔 (150ml)', null, 125, 0.1, 4, 0, '음료·주류'],
  ['웨이 프로틴 (WPC)', '1스쿱 (30g)', 30, 120, 24, 3, 1.5, '보충제'],
  ['웨이 프로틴 (WPI)', '1스쿱 (30g)', 30, 110, 25, 1, 0.5, '보충제'],
  ['프로틴바', '1개', null, 220, 20, 22, 7, '보충제'],
  ['게이너', '1회 (100g)', 100, 380, 20, 70, 2.5, '보충제'],
];
const FOODS = FOOD_RAW.map(([n, s, g, k, p, c, f, cat], i) => ({ id: 'f' + i, n, s, g, k, p, c, f, cat }));

/* ---------- references used by the analysis ---------- */
const REFS = [
  { id: 'pelland', short: 'Pelland 외 2024', text: 'Pelland JC 외. The Resistance Training Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain. SportRxiv 프리프린트 (2024). 67개 연구·2,058명.', url: 'https://sportrxiv.org/index.php/server/preprint/view/460', use: '주간 세트가 늘수록 근비대·근력 모두 증가하되 수확 체감. 볼륨이 같으면 빈도의 근비대 효과는 미미, 근력엔 빈도도 도움. 간접 세트는 0.5세트로 계산.' },
  { id: 'schoenfeld19', short: 'Schoenfeld 외 2019', text: 'Schoenfeld BJ, Contreras B, Krieger J 외. Resistance Training Volume Enhances Muscle Hypertrophy but Not Strength in Trained Men. Med Sci Sports Exerc 51(1):94–103, 2019.', url: 'https://doi.org/10.1249/MSS.0000000000001764', use: '훈련 경험자 8주: 종목당 1·3·5세트(부위당 주 약 6–9 / 18–27 / 30–45세트) 비교 — 근비대는 고볼륨일수록 컸고, 근력 향상은 비슷.' },
  { id: 'bazvalle22', short: 'Baz-Valle 외 2022', text: 'Baz-Valle E, Balsalobre-Fernández C, Alix-Fages C, Santos-Concejero J. A Systematic Review of The Effects of Different Resistance Training Volumes on Muscle Hypertrophy. J Hum Kinet 81:199–210, 2022.', url: 'https://doi.org/10.2478/hukin-2022-0017', use: '훈련 경험자 기준 부위당 주 12–20세트를 표준 권장 범위로 제시. 대퇴사두·이두는 20세트 초과 이득 불명확, 삼두는 20세트 초과가 더 효과적.' },
  { id: 'aube22', short: 'Aube 외 2022', text: 'Aube D 외. Progressive Resistance Training Volume: Effects on Muscle Thickness, Mass, and Strength Adaptations in Resistance-Trained Individuals. J Strength Cond Res 36(3):600–607, 2022.', url: 'https://pubmed.ncbi.nlm.nih.gov/32058362/', use: '훈련 경험자에게 주 12·18·24세트를 비교 — 근비대 차이가 뚜렷하지 않음. 고볼륨의 추가 이득은 연구마다 엇갈림.' },
  { id: 'gallagher00', short: 'Gallagher 외 2000', text: 'Gallagher D, Heymsfield SB, Heo M 외. Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. Am J Clin Nutr 72:694–701, 2000.', url: 'https://doi.org/10.1093/ajcn/72.3.694', use: '성별·나이별 체지방률 건강 범위(BMI 18.5/25/30에 대응하는 체지방률).' },
  { id: 'kouri95', short: 'Kouri 외 1995', text: 'Kouri EM, Pope HG, Katz DL, Oliva P. Fat-free mass index in users and nonusers of anabolic-androgenic steroids. Clin J Sport Med 5(4):223–228, 1995.', url: 'https://doi.org/10.1097/00042752-199510000-00003', use: 'FFMI(제지방량/키², 키 보정) — 약물 미사용 남성 선수 대부분 25 이하.' },
  { id: 'garthe11', short: 'Garthe 외 2011', text: 'Garthe I, Raastad T, Refsnes PE, Koivisto A, Sundgot-Borgen J. Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes. Int J Sport Nutr Exerc Metab 21(2):97–104, 2011.', url: 'https://doi.org/10.1123/ijsnem.21.2.97', use: '주 0.7% 감량 그룹은 제지방 +2.1%, 빠른 그룹(실제 주 1%)은 변화 없음 → 근력운동 중 감량은 주 0.7% 안팎 권장.' },
  { id: 'kyle04', short: 'Kyle 외 2004', text: 'Kyle UG 외. Bioelectrical impedance analysis — part II: utilization in clinical practice. Clin Nutr 23(6):1430–1453, 2004.', url: 'https://doi.org/10.1016/j.clnu.2004.09.012', use: '체성분 측정(BIA)은 수분 상태에 민감 — 같은 조건(공복·시간대·운동 전)에서 측정해야 비교 가능.' },
  { id: 'chaves20', short: 'Chaves 외 2020', text: 'Chaves SFN 외. Effects of Horizontal and Incline Bench Press on Neuromuscular Adaptations in Untrained Young Men. Int J Exerc Sci 13(6):859–872, 2020.', url: 'https://digitalcommons.wku.edu/ijes/vol13/iss6/', use: '인클라인 벤치만 한 그룹이 윗가슴(쇄골부) 두께 증가가 더 컸음. 초보자 대상 단일 연구.' },
  { id: 'kubo19', short: 'Kubo 외 2019', text: 'Kubo K, Ikebukuro T, Yata H. Effects of squat training with different depths on lower limb muscle volumes. Eur J Appl Physiol 119(9):1933–1942, 2019.', url: 'https://doi.org/10.1007/s00421-019-04181-y', use: '스쿼트 10주: 광근·내전근·대둔근은 증가, 대퇴직근과 햄스트링은 변화 없음.' },
  { id: 'maeo21', short: 'Maeo 외 2021', text: 'Maeo S 외. Greater Hamstrings Muscle Hypertrophy but Similar Damage Protection after Training at Long versus Short Muscle Lengths. Med Sci Sports Exerc 53(4):825–837, 2021.', url: 'https://doi.org/10.1249/MSS.0000000000002523', use: '시티드 레그 컬(엉덩이 굽힌 자세)이 라잉 레그 컬보다 햄스트링 근비대가 더 큼.' },
  { id: 'maeo23', short: 'Maeo 외 2023', text: 'Maeo S 외. Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position. Eur J Sport Sci 23(7):1240–1250, 2023.', url: 'https://doi.org/10.1080/17461391.2022.2100279', use: '오버헤드 익스텐션이 팔을 내린 자세보다 삼두 전체 약 1.4배, 긴 갈래 약 1.5배 더 증가.' },
  { id: 'schoenfeld18', short: 'Schoenfeld & Aragon 2018', text: 'Schoenfeld BJ, Aragon AA. How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution. J Int Soc Sports Nutr 15:10, 2018.', url: 'https://doi.org/10.1186/s12970-018-0215-1', use: '근성장을 위해 한 끼 약 0.4g/kg씩 하루 4끼 이상으로 단백질을 나눠 먹기 권장.' },
  { id: 'mifflin90', short: 'Mifflin 외 1990', text: 'Mifflin MD, St Jeor ST 외. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr 51(2):241–247, 1990.', url: 'https://doi.org/10.1093/ajcn/51.2.241', use: '체성분 정보가 없을 때 체중·키·나이·성별로 안정 시 대사량 추정.' },
  { id: 'ainsworth11', short: 'Ainsworth 외 2011', text: 'Ainsworth BE 외. 2011 Compendium of Physical Activities: a second update of codes and MET values. Med Sci Sports Exerc 43(8):1575–1581, 2011.', url: 'https://doi.org/10.1249/MSS.0b013e31821ece12', use: '운동 칼로리 = MET × 체중(kg) × 시간. 근력운동 3.5(중간)–6.0(고강도), 걷기·달리기·사이클 등 종류·속도별 MET.' },
  { id: 'who04', short: 'WHO 2004', text: 'WHO Expert Consultation. Appropriate body-mass index for Asian populations and its implications for policy and intervention strategies. Lancet 363(9403):157–163, 2004.', url: 'https://doi.org/10.1016/S0140-6736(03)15268-3', use: '아시아인은 BMI 23 이상부터 건강 위험 증가(과체중), 25 이상 비만으로 보는 기준.' },
  { id: 'who08', short: 'WHO 2008', text: 'World Health Organization. Waist circumference and waist–hip ratio: report of a WHO expert consultation. Geneva, 2008.', url: 'https://www.who.int/publications/i/item/9789241501491', use: '허리-엉덩이 비율 남성 0.90, 여성 0.85 이상이면 복부비만(대사 위험 증가).' },
  { id: 'awgs19', short: 'AWGS 2019', text: 'Chen LK 외. Asian Working Group for Sarcopenia: 2019 Consensus Update on Sarcopenia Diagnosis and Treatment. J Am Med Dir Assoc 21(3):300–307, 2020.', url: 'https://doi.org/10.1016/j.jamda.2019.12.012', use: '체성분 측정(BIA) 팔다리 근육량/키² 남성 7.0, 여성 5.7kg/m² 미만이면 근육량 부족(근감소증 기준).' },
  { id: 'norman12', short: 'Norman 외 2012', text: 'Norman K, Stobäus N, Pirlich M, Bosy-Westphal A. Bioelectrical phase angle and impedance vector analysis — clinical relevance and applicability of impedance parameters. Clin Nutr 31(6):854–861, 2012.', url: 'https://doi.org/10.1016/j.clnu.2012.05.008', use: '위상각은 세포막 건강·근육 질을 반영 — 높을수록 좋은 영양·기능 상태와 관련.' },
  { id: 'schoenfeld17', short: 'Schoenfeld 외 2017', text: 'Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci 35(11), 2017.', url: 'https://doi.org/10.1080/02640414.2016.1210197', use: '부위별 주 10세트 이상에서 근비대 효과가 더 큼.' },
  { id: 'schoenfeld17ll', short: 'Schoenfeld 외 2017 (무게)', text: 'Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis. J Strength Cond Res 31(12):3508–3523, 2017.', url: 'https://doi.org/10.1519/JSC.0000000000002200', use: '실패 근처까지 하면 가벼운 무게(1RM 60% 이하)도 무거운 무게와 근비대가 비슷. 근력(1RM)은 무거운 쪽이 더 늘었음. 맨몸 루틴의 근거.' },
  { id: 'kikuchi17', short: 'Kikuchi & Nakazato 2017', text: 'Kikuchi N, Nakazato K. Low-load bench press and push-up induce similar muscle hypertrophy and strength gain. J Exerc Sci Fit 15(1):37–42, 2017.', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Kikuchi+Nakazato+2017+push-up+bench+press+hypertrophy', use: '8주간 같은 강도로 맞춘 푸시업과 벤치프레스는 가슴·삼두 근비대와 근력 향상이 비슷했음.' },
  { id: 'schoenfeld16r', short: 'Schoenfeld 외 2016 (휴식)', text: 'Schoenfeld BJ, Pope ZK, Benik FM, et al. Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men. J Strength Cond Res 30(7):1805–1812, 2016.', url: 'https://doi.org/10.1519/JSC.0000000000001272', use: '세트 사이 3분 휴식이 1분보다 근력·근비대 모두 더 늘었음 (훈련 경력자 남성).' },
  { id: 'singer24', short: 'Singer 외 2024', text: 'Singer A, Wolf M, Generoso L, et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. Front Sports Act Living 6:1429789, 2024.', url: 'https://doi.org/10.3389/fspor.2024.1429789', use: '60초 넘게 쉬면 근비대에 약간 유리, 90초를 넘기면 차이는 작음 — 결정적인 차이는 아님.' },
  { id: 'schoenfeld16', short: 'Schoenfeld 외 2016', text: 'Schoenfeld BJ, Ogborn D, Krieger JW. Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy. Sports Med 46(11), 2016.', url: 'https://doi.org/10.1007/s40279-016-0543-8', use: '부위당 주 2회가 1회보다 유리 (단, 이후 연구에서 볼륨을 맞추면 차이는 작음).' },
  { id: 'morton', short: 'Morton 외 2018', text: 'Morton RW 외. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength. Br J Sports Med 52(6), 2018.', url: 'https://bjsm.bmj.com/content/52/6/376', use: '하루 체중 1kg당 약 1.6g 이상에서 추가 이득이 거의 없음 (상한 추정 ~2.2g).' },
  { id: 'bell22', short: 'Bell 외 2022', text: 'Bell L 외. "You can\'t shoot another bullet until you\'ve reloaded the gun": Coaches\' perceptions, practices and experiences of deloading. Front Sports Act Living 4, 2022.', url: 'https://doi.org/10.3389/fspor.2022.1073223', use: '코치 실무: 4–8주마다, 5–7일, 볼륨 30–50% 감소, RIR 1–3 추가 또는 무게 약 10% 감소. 계획 + 데이터 기반 병행.' },
  { id: 'bell23', short: 'Bell 외 2023', text: 'Bell L 외. Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach. Sports Med Open 9, 2023.', url: 'https://doi.org/10.1186/s40798-023-00633-0', use: '디로딩 = 피로 해소를 위한 계획된 훈련 스트레스 감소 기간 (전문가 합의 정의).' },
  { id: 'helms14', short: 'Helms 외 2014', text: 'Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr 11:20, 2014.', url: 'https://doi.org/10.1186/1550-2783-11-20', use: '감량 시 주당 체중의 0.5–1% 감소, 단백질 제지방 1kg당 2.3–3.1g, 지방 칼로리의 15–30%, 나머지 탄수화물.' },
  { id: 'haugen23', short: 'Haugen 외 2023', text: 'Haugen ME 외. Effect of free-weight vs. machine-based strength training on maximal strength, hypertrophy and jump performance – a systematic review and meta-analysis. BMC Sports Sci Med Rehabil 15, 2023.', url: 'https://doi.org/10.1186/s13102-023-00713-4', use: '프리웨이트와 머신의 근력·근비대 효과는 직접 비교에서 차이 없음. 측정 방식과 같은 도구로 훈련한 쪽이 그 테스트에서 더 유리. 머신 입문 루틴의 근거.' },
  { id: 'campos20', short: 'Campos 외 2020', text: 'Campos YAC 외. Different Shoulder Exercises Affect the Activation of Deltoid Portions in Resistance-Trained Individuals. J Hum Kinet, 2020.', url: 'https://doi.org/10.2478/hukin-2020-0033', use: '벤치프레스·플라이는 옆어깨(5% MVIC 이하)·뒤어깨를 거의 안 씀. 숄더 프레스는 앞어깨 최고·옆어깨는 레터럴 레이즈와 비슷, 뒤어깨는 레터럴이 최고. 어깨는 직접 세트만 세는 근거.' },
  { id: 'korak15', short: 'Korak 외 2015', text: 'Korak JA, Green JM, O\'Neal EK. Resistance Training Recovery: Considerations for Single vs. Multi-joint Movements and Upper vs. Lower Body Muscles. Int J Exerc Sci 8(1):85–96, 2015.', url: 'https://digitalcommons.wku.edu/ijes/vol8/iss1/10', use: '24시간 뒤 회복된 종목은 상체 약 40%·하체 약 60%, 48시간 뒤 둘 다 약 80%. 상체(작은 근육)가 더 빨리 회복된다는 근거는 없었음. 같은 부위 사이 최소 이틀의 근거.' },
  { id: 'plotkin23', short: 'Plotkin 외 2023', text: 'Plotkin DL 외. Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift. Front Physiol 14:1279170, 2023.', url: 'https://doi.org/10.3389/fphys.2023.1279170', use: '9주간 힙 쓰러스트와 스쿼트의 엉덩이 근비대는 비슷했고, 스쿼트는 대퇴사두·내전근도 키움. 애플힙 루틴에 둘을 섞은 근거.' },
  { id: 'willis12', short: 'Willis 외 2012', text: 'Willis LH 외. Effects of aerobic and/or resistance training on body mass and fat mass in overweight or obese adults. J Appl Physiol 113(12):1831–1837, 2012.', url: 'https://pubmed.ncbi.nlm.nih.gov/23019316/', use: '체중·지방 감소는 유산소(단독·병행)가 컸고, 제지방 증가는 근력운동(단독·병행)에서만. 다이어트 루틴에 근력+유산소를 같이 넣은 근거.' },
  { id: 'bickel11', short: 'Bickel 외 2011', text: 'Bickel CS, Cross JM, Bamman MM. Exercise dosing to retain resistance training adaptations in young and older adults. Med Sci Sports Exerc 43(7):1177–1187, 2011.', url: 'https://doi.org/10.1249/MSS.0b013e318207c15d', use: '근비대를 만든 뒤 주 1회·볼륨 1/9로 줄여도 젊은 성인은 근육 크기를 유지. 줄일 땐 세트보다 강도(무게)를 지키는 게 핵심.' },
  { id: 'who20', short: 'WHO 2020', text: 'Bull FC 외. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med 54:1451–1462, 2020.', url: 'https://doi.org/10.1136/bjsports-2020-102955', use: '성인 중강도 유산소 주 150–300분(고강도 75–150분) + 근력운동 주 2회 이상.' },
  { id: 'vissers13', short: 'Vissers 외 2013', text: 'Vissers D 외. The effect of exercise on visceral adipose tissue in overweight adults: a systematic review and meta-analysis. PLoS One 8(2):e56415, 2013.', url: 'https://doi.org/10.1371/journal.pone.0056415', use: '체중 변화가 없어도 유산소 운동은 내장지방을 줄였고, 근력운동 단독 효과는 뚜렷하지 않았음.' },
  { id: 'barakat20', short: 'Barakat 외 2020', text: 'Barakat C, Pearson J, Escalante G, Campbell B, De Souza EO. Body Recomposition: Can Trained Individuals Build Muscle and Lose Fat at the Same Time? Strength Cond J 42(5):7–21, 2020.', url: 'https://doi.org/10.1519/SSC.0000000000000584', use: '리컴프: 유지 칼로리 근처 + 고단백(약 2g/kg 이상) + 꾸준한 근력운동이면 훈련 경험자도 근육 증가와 지방 감소가 동시에 가능.' },
  { id: 'iraki19', short: 'Iraki 외 2019', text: 'Iraki J 외. Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review. Sports 7(7):154, 2019.', url: 'https://doi.org/10.3390/sports7070154', use: '증량 시 주당 체중의 0.25–0.5% 증가, 칼로리 약 10–20% 잉여, 단백질 1.6–2.2g/kg.' },
  { id: 'coleman24', short: 'Coleman 외 2024', text: 'Coleman M 외. Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. PeerJ 12:e16777, 2024.', url: 'https://doi.org/10.7717/peerj.16777', use: '9주 중 1주 완전 휴식: 근비대 차이 없음, 하체 근력은 다소 불리 → 완전 휴식보다 가볍게 계속하는 디로딩 권장 근거.' },
];

/* ---------- 루틴 라이브러리 ----------
   ex: [equipment id, target]. Targets are "sets×reps"; programs that use percentages explain them in note. */
const PROGRAM_INFO = {
 "bwfb3": { "goal": "기구 없이 근육 만들기 (입문)", "for": "헬스장에 가기 어렵거나 운동을 집에서 시작하는 사람",
  "keys": ["맨몸도 실패 1–3회 전까지 하면 무거운 무게와 비슷하게 근육이 커져요 — 대신 횟수가 많아져요", "범위 위쪽 횟수를 모든 세트에서 채우면 더 어려운 동작으로 (앱이 다음 단계를 알려줘요)", "푸시업은 벤치프레스와 비슷한 근비대·근력 효과가 있었어요 (강도를 맞췄을 때)", "인버티드 로우·네거티브 풀업은 철봉이 없으면 식탁 아래에서 당기기로"],
  "refs": [{ "t": "Schoenfeld 외 2017 · 가벼운 무게 vs 무거운 무게", "u": "https://doi.org/10.1519/JSC.0000000000002200" }, { "t": "Kikuchi & Nakazato 2017 · 푸시업 vs 벤치프레스", "u": "https://pubmed.ncbi.nlm.nih.gov/?term=Kikuchi+Nakazato+2017+push-up+bench+press+hypertrophy" }], "yt": "맨몸 전신 운동 루틴 초보 홈트" },
 "bwdiet3": { "goal": "체지방 감량 + 근육 유지 (맨몸)", "for": "집에서 다이어트하는 입문자",
  "keys": ["한 바퀴는 쉬지 않고, 바퀴 사이에만 1–2분", "근육을 지키는 건 근력 자극이라 스쿼트·푸시업은 횟수를 채워요", "체중은 식사로 빠져요 — 단백질 체중 1kg당 1.6g 이상", "운동 안 하는 날 걷기 30분이면 주 150분 권장량에 가까워져요"],
  "refs": [{ "t": "Willis 외 2012 · 유산소+근력 병행", "u": "https://pubmed.ncbi.nlm.nih.gov/23019316/" }, { "t": "WHO 2020 신체활동 지침", "u": "https://doi.org/10.1136/bjsports-2020-102955" }], "yt": "맨몸 서킷 다이어트 홈트" },
 "bwul4": { "goal": "맨몸 근비대 (중급)", "for": "풀업 5개·딥스 6개 이상, 주 4회 가능한 사람",
  "keys": ["부위당 주 10세트 이상 — 맨몸이라도 볼륨 원칙은 같아요", "하체는 한 다리 동작으로 강도를 올려요", "노르딕 컬은 내려오는 것만 해도 햄스트링에 강한 자극", "쉬워지면 배낭·가중 조끼로 무게를 더해서 무게 칸에 기록"],
  "refs": [{ "t": "Schoenfeld 외 2017 · 가벼운 무게 vs 무거운 무게", "u": "https://doi.org/10.1519/JSC.0000000000002200" }, { "t": "Schoenfeld 외 2017 · 주간 세트와 근비대", "u": "https://doi.org/10.1080/02640414.2016.1210197" }], "yt": "맨몸 상하체 분할 루틴 철봉 평행봉" },
 "bwadv3": { "goal": "맨몸 근력·기술 (상급)", "for": "풀업 12개·딥스 15개 이상, 기술 동작을 배우고 싶은 사람",
  "keys": ["기술 동작은 세션 처음, 실패 전에 멈추기", "물구나무 푸시업은 벽을 등지고 시작 — 머리 아래 쿠션", "피스톨은 박스 높이를 조금씩 낮추며 깊이를 늘려요", "풀업·딥스는 가중으로 강도를 올려요"],
  "refs": [{ "t": "Schoenfeld 외 2017 · 가벼운 무게 vs 무거운 무게", "u": "https://doi.org/10.1519/JSC.0000000000002200" }], "yt": "맨몸 운동 머슬업 핸드스탠드 푸시업 피스톨 루틴" },
 "gg12": { "goal": "엉덩이 중심 근력·근비대 (중급)", "for": "입문 12주를 끝냈거나 바벨 기본 동작이 익숙한 사람",
  "keys": ["A는 주 2회(월·목), B·C는 1회 — 앱이 순서를 세어줘요", "힙 쓰러스트 변형이 매번 바뀌어요: 무겁게 → 버티기 → 레스트포즈·느리게", "로우와 스쿼트처럼 상·하체를 번갈아 하면(슈퍼세트) 시간이 줄어요", "단계 첫 주는 무게를 조금 낮춰 새 종목에 적응"],
  "refs": [{ "t": "Gluteal Goddess 구성 (StrongrFastr)", "u": "https://www.strongrfastr.com/en/api/v1/workout_routines/73546/preview_pdf.html" }, { "t": "Plotkin 외 2023 · 힙 쓰러스트 vs 스쿼트", "u": "https://doi.org/10.3389/fphys.2023.1279170" }], "yt": "스트롱 커브스 글루트 고데스" },
 "gluteadv5": { "goal": "엉덩이 근비대 극대화 (상급)", "for": "엉덩이 운동 2년 이상, 주 5회 가능한 사람",
  "keys": ["엉덩이 주 25세트 이상 — 회복이 따라올 때만", "드롭·레스트포즈는 표시된 마지막 세트에만", "4–6주마다 1주는 세트 절반(디로딩) — 분석 탭이 시점을 알려줘요", "무게가 2주 넘게 안 오르면 볼륨을 줄여보기"],
  "refs": [{ "t": "Schoenfeld 외 2017 · 주간 세트와 근비대", "u": "https://doi.org/10.1080/02640414.2016.1210197" }], "yt": "엉덩이 운동 루틴 상급" },
 "circuit3": { "goal": "체지방 감량 + 체력 (입문)", "for": "운동이 처음이고 살을 빼고 싶은 사람",
  "keys": ["종목 사이 30초, 한 바퀴 끝나면 2분 휴식", "근력운동은 근육을 지키고, 유산소는 소모를 늘려요 — 둘 다 해야 결과가 좋아요", "숨이 차서 말하기 힘든 정도면 적당해요", "체중보다 허리둘레·인바디 체지방이 줄어드는지 보세요"],
  "refs": [{ "t": "Willis 외 2012 · 유산소/근력/병행 비교", "u": "https://pubmed.ncbi.nlm.nih.gov/23019316/" }], "yt": "헬스장 다이어트 서킷 운동 초보" },
 "sc12": { "goal": "엉덩이 중심 전신 근력·근비대 (입문)", "for": "운동 처음이거나 엉덩이 라인을 만들고 싶은 사람",
  "keys": ["1단계는 맨몸·덤벨로 자세부터 — 무게 욕심 내지 않기", "브릿지·힙 쓰러스트는 맨 위에서 1–2초 멈추고 엉덩이 조이기, 허리 꺾지 않기", "4주마다 단계가 바뀌어요. 앱 루틴 카드의 'N주차'를 따라가면 돼요", "하체 10–20회, 상체 8–12회 범위를 다 채우면 증량"],
  "refs": [{ "t": "Strong Curves 입문 프로그램 구성 (Liftosaur)", "u": "https://www.liftosaur.com/programs/strongcurves" }, { "t": "Plotkin 외 2023 · 힙 쓰러스트 vs 스쿼트", "u": "https://doi.org/10.3389/fphys.2023.1279170" }], "yt": "스트롱 커브스 힙 운동" },
 "mach3": { "goal": "기초 근력 + 근육 (머신)", "for": "헬스장이 처음이거나 프리웨이트가 부담스러운 사람",
  "keys": ["머신과 프리웨이트는 근육·근력이 느는 정도가 비슷했어요 — 편한 쪽으로 시작해도 돼요", "의자 높이를 손잡이·발판이 관절 높이에 맞게 조절하기 (기구 스티커 참고)", "내리는 동작을 2초 정도 천천히", "12회가 쉬워지면 한 칸씩 올리기"],
  "refs": [{ "t": "Haugen 외 2023 · 프리웨이트 vs 머신 메타분석", "u": "https://doi.org/10.1186/s13102-023-00713-4" }], "yt": "헬스 초보 머신 운동 루틴" },
 "db2": { "goal": "건강 근력 유지 (주 2회)", "for": "시간이 없거나 집·작은 헬스장에서 하는 사람",
  "keys": ["근력운동 주 2회가 건강 권장량이에요 — 이것만 지켜도 충분히 의미 있어요", "세트 사이 60–90초 휴식으로 40분 안에", "각 세트를 1–2회 여유가 남을 정도로", "무게가 가벼워지면 덤벨 한 단계 올리기"],
  "refs": [{ "t": "WHO 2020 신체활동 지침", "u": "https://doi.org/10.1136/bjsports-2020-102955" }], "yt": "덤벨 전신 운동 루틴" },
 "glute3": { "goal": "엉덩이 근비대 (전신 3일)", "for": "엉덩이 라인을 키우고 싶은 사람, 입문–중급",
  "keys": ["힙 쓰러스트는 맨 위에서 1초 멈추고 엉덩이를 꽉 조이기 — 허리를 꺾지 말고 갈비뼈를 내린 채로", "스쿼트·런지도 엉덩이를 힙 쓰러스트만큼 키웠어요. 둘 다 섞는 게 좋아요", "스쿼트는 깊게 앉을수록 엉덩이가 더 컸어요 (허벅지가 바닥과 평행 이하)", "엉덩이 주 10–20세트, 같은 무게에서 횟수가 늘면 증량"],
  "refs": [{ "t": "Plotkin 외 2023 · 힙 쓰러스트 vs 스쿼트", "u": "https://doi.org/10.3389/fphys.2023.1279170" }, { "t": "Kubo 외 2019 · 스쿼트 깊이와 엉덩이", "u": "https://doi.org/10.1007/s00421-019-04181-y" }], "yt": "힙 쓰러스트 엉덩이 운동 루틴" },
 "wul4": { "goal": "하체·엉덩이 근비대 + 상체 유지", "for": "하체를 우선 키우고 싶은 초중급",
  "keys": ["하체 날을 먼저, 컨디션 좋은 날에", "엉덩이·하체는 주 2회 이상 자극 — 같은 볼륨이면 나눠 하는 게 회복에 유리", "상체는 등·어깨 위주로 자세 라인 잡기", "범위 위쪽 횟수를 채우면 증량"],
  "refs": [], "yt": "하체 엉덩이 상하체 분할 루틴" },
 "fatloss3": { "goal": "체지방 감량 + 근육 유지", "for": "다이어트 중인 입문자",
  "keys": ["체중·지방은 유산소가 더 많이 줄였고, 근육은 근력운동이 지켰어요 — 둘을 같이 할 때 결과가 가장 좋았어요", "유산소는 주 150–300분이 목표 (빠르게 걷기 포함)", "감량 중엔 무게를 줄이지 말고 세트를 줄이기", "식단이 감량의 대부분 — 바디 탭 목표를 '살 빼기'로"],
  "refs": [{ "t": "Willis 외 2012 · 유산소/근력/병행 비교", "u": "https://pubmed.ncbi.nlm.nih.gov/23019316/" }, { "t": "WHO 2020 신체활동 지침", "u": "https://doi.org/10.1136/bjsports-2020-102955" }], "yt": "다이어트 전신 운동 루틴 헬스장" },
 "fb3": {
  "goal": "기초 근력 + 근육",
  "for": "운동 입문, 쉬다가 복귀",
  "keys": [
   "처음 2주는 가볍게 동작부터 익히기 — 무게보다 자세",
   "세트마다 1–3회 여유를 남기고 끝내기",
   "모든 세트를 목표 횟수로 성공하면 다음에 한 단계 증량",
   "운동 사이 하루씩 쉬기 (예: 월·수·금)"
  ],
  "refs": [],
  "yt": "초보 전신 운동 루틴"
 },
 "sl5": {
  "goal": "근력",
  "for": "바벨이 처음이거나 근력을 빨리 올리고 싶은 입문자",
  "keys": [
   "빈 바(20kg)부터 시작해도 돼요 — 매 운동 +2.5kg씩 빠르게 올라가요",
   "세트 사이 충분히 쉬기: 쉬우면 1.5분, 힘들면 3–5분",
   "같은 무게에서 3번 연속 실패하면 10% 내리고 다시",
   "스쿼트는 매번, 데드리프트는 1세트만"
  ],
  "refs": [
   {
    "t": "StrongLifts 공식 가이드",
    "u": "https://stronglifts.com/stronglifts-5x5/workout-program/"
   }
  ],
  "yt": "StrongLifts 5x5"
 },
 "ul4": {
  "goal": "근력 + 근비대",
  "for": "주 4일 가능한 초중급",
  "keys": [
   "무거운 날은 2–3회 여유(RIR 2–3), 볼륨 날은 1–2회 여유",
   "부위당 주 2회 — 근비대 연구에서 무난한 빈도",
   "상체·하체 사이 쉬는 날은 자유롭게 (상-하-휴-상-하)"
  ],
  "refs": [],
  "yt": "상하체 분할 루틴"
 },
 "ppl": {
  "goal": "근비대 중심 + 근력",
  "for": "주 6일 운동할 시간이 있는 초중급",
  "keys": [
   "\"5+\"는 마지막 세트를 할 수 있는 만큼 (AMRAP)",
   "메인 종목은 성공하면 매번 +2.5kg (데드 +5kg)",
   "보조 종목은 범위 위쪽 횟수를 모든 세트에서 채우면 증량",
   "주 6일이 버거우면 한 바퀴(주 3일)만 해도 돼요"
  ],
  "refs": [
   {
    "t": "레딧 r/Fitness에서 원문 찾기",
    "u": "https://www.reddit.com/r/Fitness/search/?q=linear%20progression%20based%20PPL%20program%20for%20beginners"
   }
  ],
  "yt": "PPL 루틴 밀기 당기기 하체"
 },
 "phul": {
  "goal": "근력 + 근비대",
  "for": "주 4일, 힘과 크기 둘 다 원하는 중급",
  "keys": [
   "파워 날: 3–5회 무겁게, 세트 사이 2–3분",
   "근비대 날: 8–12회, 세트 사이 1–1.5분",
   "범위 위쪽 횟수를 모든 세트에서 채우면 증량"
  ],
  "refs": [
   {
    "t": "Muscle & Strength — PHUL 원문",
    "u": "https://www.muscleandstrength.com/workouts/phul-workout"
   }
  ],
  "yt": "PHUL 루틴"
 },
 "bbb": {
  "goal": "근력 (+볼륨으로 근비대)",
  "for": "천천히 오래 강해지고 싶은 중급",
  "keys": [
   "기준무게(TM) = 1RM의 90% — 일부러 가볍게 시작해요",
   "1주 5회 · 2주 3회 · 3주 5/3/1(마지막 세트는 최대 반복) · 4주 디로딩",
   "5×10은 TM의 50–60% — 쉬워도 올리지 않기",
   "4주 사이클마다 TM 상체 +2.5kg, 하체 +5kg"
  ],
  "refs": [
   {
    "t": "Jim Wendler — Boring But Big",
    "u": "https://www.jimwendler.com/blogs/jimwendler-com/101082438-boring-but-big-and-really-sore"
   }
  ],
  "yt": "531 BBB 웬들러"
 },
 "phat": {
  "goal": "근력 + 근비대 (고볼륨)",
  "for": "주 5일, 회복이 좋은 중상급",
  "keys": [
   "파워 날(1·2일차)은 3–5회 무겁게",
   "근비대 날 첫 종목은 파워 날 무게의 약 85%로 빠르게",
   "볼륨이 커요 — 회복이 안 되면 근비대 날 세트부터 줄이기"
  ],
  "refs": [
   {
    "t": "StrengthLog — PHAT 가이드",
    "u": "https://www.strengthlog.com/phat-workout-routine/"
   }
  ],
  "yt": "PHAT 레인 노튼"
 },
 "gvt": {
  "goal": "근비대 (단기 고볼륨)",
  "for": "정체를 깨고 싶은 중급 · 4–6주 한정",
  "keys": [
   "10×10은 1RM의 약 60%, 세트 사이 60–90초",
   "10회를 못 채우는 세트가 나와도 무게는 그대로",
   "4–6주만 하고 디로딩하거나 다른 루틴으로",
   "같은 부위 주 1회라 그 사이 회복이 중요"
  ],
  "refs": [
   {
    "t": "StrengthLog — GVT 가이드",
    "u": "https://www.strengthlog.com/?p=9460"
   }
  ],
  "yt": "German volume training 10x10"
 },
 "regpark": {
  "goal": "근력 + 기본 근육",
  "for": "바벨 입문자, 클래식 스타일을 원하는 사람",
  "keys": [
   "5세트 중 앞 2세트는 워밍업, 뒤 3세트가 5회 최대 무게",
   "A·B를 번갈아 주 3회 (1주 A-B-A, 2주 B-A-B)",
   "뒤 3세트를 모두 5회 성공하면 증량"
  ],
  "refs": [
   {
    "t": "Fitness Volt — Reg Park 루틴",
    "u": "https://fitnessvolt.com/5790/reg-parks-beginner-workout-routine"
   }
  ],
  "yt": "Reg Park 5x5"
 },
 "coleman": {
  "goal": "근비대 (상급 고볼륨)",
  "for": "수년 경력 + 회복(수면·식사)이 받쳐주는 상급자",
  "keys": [
   "처음엔 세트 수를 2/3 정도로 줄여 시작하기",
   "스쿼트·데드·벤치 같은 무거운 기본 종목이 중심",
   "주 6일이라 수면과 식사가 따라오지 않으면 오히려 정체"
  ],
  "refs": [
   {
    "t": "Lift Vault — 로니 콜먼 프로그램",
    "u": "https://liftvault.com/programs/bodybuilding/ronnie-coleman-workout-program-spreadsheet/"
   }
  ],
  "yt": "로니 콜먼 운동"
 },
 "haney": {
  "goal": "근비대 (회복 중심)",
  "for": "중상급, 과훈련이 걱정되는 사람",
  "keys": [
   "\"자극하되 망가뜨리지 마라\" — 매 세트를 실패까지 몰지 않기",
   "3일 운동 1일 휴식을 요일 상관없이 순환",
   "종아리·복근은 자주 짧게"
  ],
  "refs": [
   {
    "t": "Generation Iron — 리 헤이니 루틴",
    "u": "https://generationiron.com/old-school-workout-lee-haney/"
   }
  ],
  "yt": "리 헤이니 운동"
 },
 "mentzer": {
  "goal": "근력·근비대 (초저볼륨·고강도)",
  "for": "바쁜 사람, 실험해보고 싶은 중급",
  "keys": [
   "워밍업 1–3세트 뒤 본세트 1개를 진짜 실패 지점까지",
   "운동 사이 7–10일 휴식 — 매번 강해지지 않으면 더 쉬기",
   "연구 권장 볼륨(부위당 주 10세트)보다 훨씬 적어요 — 비교·실험용"
  ],
  "refs": [
   {
    "t": "Liftosaur — Mentzer Consolidated",
    "u": "https://www.liftosaur.com/programs/mike-mentzer-consolidated"
   }
  ],
  "yt": "마이크 멘처 헤비듀티"
 },
 "fst7": {
  "goal": "근비대 (펌핑 · 마무리 고밀도)",
  "for": "기본 볼륨에 자극을 더하고 싶은 중상급",
  "keys": [
   "마지막 종목만 7세트 · 세트 사이 30–45초 · 8–15회",
   "처음엔 1–2부위에만 적용 — 다른 부위는 평소대로",
   "초보는 고립 운동(레그 익스텐션·펙덱)으로",
   "근육통이 4–5일 가면 줄이기"
  ],
  "refs": [
   {
    "t": "Bodybuilding.com — 하니 램보드 인터뷰",
    "u": "https://www.bodybuilding.com/fun/hany-rambod-fst-7-interview.htm"
   },
   {
    "t": "Fitness Volt — FST-7 가이드",
    "u": "https://fitnessvolt.com/fst-7-workout-guide/"
   }
  ],
  "yt": "FST-7 하니 램보드"
 },
 "y3t": {
  "goal": "근비대 (주기 변화)",
  "for": "같은 루틴에 질린 상급자",
  "keys": [
   "1주차 무겁게(6–10회) → 2주차 중간(8–12회) → 3주차 가볍게 실패·드롭세트(20회+)",
   "3주 × 3 = 9주 뒤 5–7일 휴식",
   "3주차는 레스트포즈·드롭세트로 강도를 유지하는 게 핵심"
  ],
  "refs": [
   {
    "t": "BarBend — Y3T 가이드",
    "u": "https://barbend.com/y3t-training"
   }
  ],
  "yt": "Y3T 닐 힐"
 },
 "arnold": {
  "goal": "근비대 (고볼륨 · 높은 빈도)",
  "for": "회복이 좋은 중상급",
  "keys": [
   "가슴↔등을 같은 날 — 번갈아 슈퍼세트로 하면 시간 절약",
   "주 6일, 부위당 주 2회",
   "볼륨이 커서 초보는 세트를 줄여서"
  ],
  "refs": [
   {
    "t": "Fitness Volt — 아놀드 6일 분할",
    "u": "https://fitnessvolt.com/arnold-schwarzenegger-6-day-split/"
   }
  ],
  "yt": "아놀드 스플릿"
 },
 "yates": {
  "goal": "근비대 (저볼륨 · 고강도)",
  "for": "기본기가 잡힌 중상급",
  "keys": [
   "워밍업 뒤 본세트 1개를 실패 지점까지",
   "자세는 엄격하게, 내릴 때 천천히",
   "부위당 주 1회 — 대신 매번 기록 갱신을 노리기"
  ],
  "refs": [
   {
    "t": "Fitness Volt — Blood & Guts",
    "u": "https://fitnessvolt.com/dorian-yates-workout-natural-bodybuilding"
   }
  ],
  "yt": "도리안 예이츠 운동"
 }
};

const PROGRAMS = [
  { id: 'fb3', name: '초보 전신 3일', who: '입문 추천', lv: '초급', tier: 1, why: '주 3회 전신 · 동작 익히기', uni: 1, per: '주 3일', days: [
      { l: 'A', t: '전신 A', ex: [['fw-squat', '3×8'], ['fw-bench', '3×8'], ['cb-row', '3×10'], ['fw-lateral', '2×12'], ['cy-abcrunch', '2×12']] },
      { l: 'B', t: '전신 B', ex: [['fw-rdl', '3×8'], ['fw-ohp', '3×8'], ['lf-pulldown', '3×10'], ['lf-legpress', '2×12'], ['cb-pushdown', '2×12']] }],
    desc: 'A와 B를 번갈아 주 3회(예: 월 A · 수 B · 금 A). 운동을 막 시작했거나 쉬다가 돌아왔을 때.',
    note: '모든 세트를 목표 횟수로 성공하면 다음번에 무게를 한 단계 올리세요.' },
  { id: 'glute3', name: '애플힙 전신 3일', who: '엉덩이 집중 · Contreras 방식 참고', lv: '초급', tier: 1, why: '익숙한 기본 동작 위주 · 주 3회', per: '주 3일', fem: 1, days: [
      { l: 'A', t: '엉덩이 · 힙 쓰러스트 중심', ex: [['fw-hipthrust', '4×8–12'], ['fw-goblet', '3×10'], ['lf-pulldown', '3×10'], ['fw-db-ohp', '3×10'], ['tg-abduction', '3×15–20']] },
      { l: 'B', t: '엉덩이 · 허벅지 뒤 중심', ex: [['fw-rdl', '3×8–10'], ['fw-bss', '3×10'], ['cb-row', '3×10'], ['fw-incline-db', '3×10'], ['g80-glute', '3×12–15']] },
      { l: 'C', t: '엉덩이 · 고반복', ex: [['fw-hipthrust', '3×12–15'], ['lf-legpress', '3×12'], ['tg-legcurl', '3×12'], ['lf-pulldown', '3×12'], ['tg-abduction', '3×20']] }],
    desc: '엉덩이 운동을 매번 넣고 상체는 가볍게 유지하는 전신 3일. A·B·C를 돌아가며 주 3회.',
    note: '엉덩이는 주 10–20세트 정도가 쌓이도록 구성했어요. 범위 위쪽 횟수를 모든 세트에서 채우면 증량.' },
  { id: 'sc12', name: '스트롱 커브스 입문 12주', who: 'Bret Contreras · Strong Curves', lv: '초급', tier: 1, why: '맨몸부터 단계적으로 바벨까지', per: '주 3일', fem: 1, rep: 4, block: 3, days: [
      { l: '1A', t: '1단계 A · 맨몸·덤벨', ex: [['fw-glutebridge', '3×10'], ['fw-dbrow', '3×8'], ['fw-boxsquat', '3×10'], ['fw-db-bench', '3×8'], ['fw-rdl', '3×10'], ['fw-clam', '1×15'], ['fw-plank', '1×30초'], ['fw-sideplank', '1×30초']] },
      { l: '1B', t: '1단계 B · 맨몸·덤벨', ex: [['fw-slbridge', '3×10'], ['lf-pulldown', '3×8'], ['fw-stepup', '3×10'], ['fw-db-ohp', '3×8'], ['fw-roman', '3×10'], ['fw-clam', '1×15'], ['fw-crunch', '1×15']] },
      { l: '1C', t: '1단계 C · 맨몸·덤벨', ex: [['fw-glutebridge', '3×60초 (행진)'], ['cb-row', '3×8'], ['fw-goblet', '3×10'], ['fw-incline-db', '3×8'], ['fw-sl-rdl', '3×10'], ['fw-clam', '1×10'], ['fw-plank', '1×30초'], ['fw-woodchop', '1×10']] },
      { l: '2A', t: '2단계 A · 바벨 시작', ex: [['fw-hipthrust', '3×10'], ['cb-row', '3×8'], ['fw-stepup', '3×10'], ['fw-bench', '3×8'], ['fw-rdl', '3×10'], ['fw-clam', '1×15'], ['fw-plank', '1×45초'], ['fw-sideplank', '1×45초']] },
      { l: '2B', t: '2단계 B · 바벨 시작', ex: [['fw-slbridge', '3×10'], ['fw-chinup', '3×3 (내려오기만)'], ['fw-lunge', '3×10'], ['fw-db-ohp', '3×8'], ['fw-roman', '3×10'], ['fw-clam', '1×15'], ['fw-crunch', '1×15']] },
      { l: '2C', t: '2단계 C · 바벨 시작', ex: [['fw-hipthrust', '3×10'], ['fw-invrow', '3×8'], ['fw-goblet', '3×10'], ['fw-bench', '3×8 (좁게)'], ['fw-kbswing', '3×10'], ['fw-clam', '1×15'], ['fw-crunch', '1×15'], ['fw-woodchop', '1×10']] },
      { l: '3A', t: '3단계 A · 바벨 중심', ex: [['fw-hipthrust', '3×10'], ['fw-dbrow', '3×8'], ['fw-boxsquat', '3×10'], ['fw-pushup', '3×3–10'], ['fw-rdl', '3×10'], ['fw-clam', '1×15'], ['fw-crunch', '1×15'], ['fw-woodchop', '1×10']] },
      { l: '3B', t: '3단계 B · 바벨 중심', ex: [['fw-slhipthrust', '3×10'], ['fw-chinup', '3×1–5'], ['fw-bss', '3×10'], ['fw-db-ohp', '3×8'], ['fw-goodmorning', '3×10'], ['fw-clam', '1×15'], ['fw-plank', '1×60초']] },
      { l: '3C', t: '3단계 C · 바벨 중심', ex: [['fw-hipthrust', '3×8'], ['fw-dbrow', '3×8'], ['fw-squat', '3×10'], ['fw-incline-bb', '3×3'], ['fw-roman', '3×10'], ['fw-clam', '1×15'], ['fw-hangleg', '1×10'], ['fw-woodchop', '1×10']] }],
    desc: '엉덩이 운동으로 유명한 브렛 콘트레라스의 책 Strong Curves의 입문 프로그램(Booty-ful Beginnings). 4주마다 단계가 올라가고, 각 단계에서 A·B·C를 주 3회 4주 반복해요. 앱이 몇 주차인지 세어줘요.',
    note: '하체는 10–20회, 상체는 8–12회 범위에서 모든 세트가 위쪽 횟수를 채우면 약 2kg 올리고 아래쪽부터 다시. 코어 운동은 증량 없이 시간·횟수만 늘려요. 밴드·리버스 하이퍼 같은 일부 종목은 헬스장에 흔한 비슷한 동작(클램쉘, 백 익스텐션)으로 바꿨어요.' },
  { id: 'mach3', name: '머신으로 시작하는 3일', who: '입문 · 머신 위주 구성', lv: '초급', tier: 1, why: '머신이라 자세 부담이 적음', uni: 1, per: '주 3일', fem: 1, days: [
      { l: 'A', t: '머신 전신 A', ex: [['lf-legpress', '3×10–12'], ['lf-chest-press', '3×10–12'], ['lf-pulldown', '3×10–12'], ['tg-legcurl', '3×12'], ['tg-abduction', '2×15'], ['cy-abcrunch', '2×12']] },
      { l: 'B', t: '머신 전신 B', ex: [['lf-legpress', '3×12'], ['hs-shoulder', '3×10–12'], ['cy-row', '3×10–12'], ['g80-glute', '3×12–15'], ['hs-legext', '3×12'], ['lf-backext', '2×12']] }],
    desc: '프리웨이트 구역이 부담스러울 때. 자리에 앉아 핀만 꽂으면 되는 머신으로 전신을 A·B 번갈아 주 3회.',
    note: '모든 세트에서 12회(어브덕션 15회)를 채우면 한 칸 올리기. 4–8주 하고 익숙해지면 다른 루틴으로 넘어가도 좋아요.' },
  { id: 'db2', name: '덤벨 전신 2일 (40분)', who: '바쁠 때 · 최소 유효량', lv: '초급', tier: 1, why: '주 2회 최소 구성', uni: 1, per: '주 2일', fem: 1, days: [
      { l: 'A', t: '덤벨 전신 A', ex: [['fw-goblet', '3×10–12'], ['fw-db-bench', '3×10'], ['fw-dbrow', '3×10'], ['fw-rdl', '3×10'], ['fw-lateral', '2×15'], ['fw-plank', '2×30초']] },
      { l: 'B', t: '덤벨 전신 B', ex: [['fw-lunge', '3×10'], ['fw-db-ohp', '3×10'], ['fw-dbrow', '3×12'], ['fw-glutebridge', '3×12'], ['fw-dbcurl', '2×12'], ['fw-crunch', '2×15']] }],
    desc: '덤벨 한 쌍과 벤치만 있으면 되는 주 2회 전신. 바쁜 주에도 근력운동 권장량(주 2회)을 채우는 구성.',
    note: '세트 사이 60–90초 쉬면 40분 안에 끝나요. 범위 위쪽 횟수를 채우면 한 단계 무거운 덤벨로.' },
  { id: 'gg12', name: '스트롱 커브스 중급 12주', who: 'Bret Contreras · Strong Curves (Gluteal Goddess)', lv: '중급', tier: 2, why: '주 4회 · 바벨 중심 · 레스트포즈 같은 강도 기법', per: '주 4일', fem: 1, rep: 4, block: 4, days: [
      { l: '1A', t: '1단계 A · 엉덩이 무겁게', ex: [['fw-glutebridge', '3×20'], ['fw-dbrow', '3×8'], ['fw-boxsquat', '3×5'], ['fw-incline-db', '3×8'], ['fw-rdl', '3×5'], ['tg-abduction', '1×20'], ['fw-plank', '1×60초'], ['fw-sideplank', '1×60초']] },
      { l: '1B', t: '1단계 B · 한 다리', ex: [['fw-slhipthrust', '3×8–20'], ['fw-pullup', '3×5'], ['fw-stepup', '3×10'], ['fw-ohp', '3×8'], ['fw-roman', '2×12'], ['tg-abduction', '1×20'], ['fw-crunch', '1×20']] },
      { l: '1A', t: '1단계 A · 엉덩이 무겁게', ex: [['fw-glutebridge', '3×20'], ['fw-dbrow', '3×8'], ['fw-boxsquat', '3×5'], ['fw-incline-db', '3×8'], ['fw-rdl', '3×5'], ['tg-abduction', '1×20'], ['fw-plank', '1×60초'], ['fw-sideplank', '1×60초']] },
      { l: '1C', t: '1단계 C · 고반복', ex: [['fw-hipthrust', '3×20'], ['cb-row', '3×8'], ['fw-goblet', '3×5'], ['fw-db-bench', '3×8'], ['fw-rdl', '3×8–12'], ['fw-clam', '1×10'], ['fw-woodchop', '1×8–12']] },
      { l: '2A', t: '2단계 A · 엉덩이 무겁게', ex: [['fw-hipthrust', '3×3–8'], ['cb-row', '3×8'], ['fw-squat', '3×5'], ['fw-bench', '3×3–8'], ['fw-goodmorning', '3×8–12'], ['fw-clam', '1×10–30'], ['fw-rollout', '1×8–20'], ['fw-woodchop', '1×10–20']] },
      { l: '2B', t: '2단계 B · 한 다리', ex: [['fw-slhipthrust', '3×8–20'], ['fw-pullup', '3×3–8'], ['fw-lunge', '3×10'], ['fw-ohp', '3×6'], ['fw-roman', '2×20'], ['tg-abduction', '1×10–30'], ['fw-hangleg', '1×8–20']] },
      { l: '2A', t: '2단계 A · 엉덩이 무겁게', ex: [['fw-hipthrust', '3×3–8'], ['cb-row', '3×8'], ['fw-squat', '3×5'], ['fw-bench', '3×3–8'], ['fw-goodmorning', '3×8–12'], ['fw-clam', '1×10–30'], ['fw-rollout', '1×8–20'], ['fw-woodchop', '1×10–20']] },
      { l: '2C', t: '2단계 C · 버티기', ex: [['fw-hipthrust', '3×30–60초 (위에서 버티기)'], ['lf-pulldown', '3×8'], ['fw-bss', '3×8'], ['fw-pushup', '3×5–15'], ['fw-sl-rdl', '3×8–12'], ['fw-clam', '1×10–30'], ['fw-crunch', '1×10–20']] },
      { l: '3A', t: '3단계 A · 레스트포즈', ex: [['fw-hipthrust', '3×9 (6+1+1+1)'], ['fw-invrow', '3×6–12'], ['fw-squat', '3×5–10'], ['fw-pushup', '3×5–20'], ['fw-sumo', '3×6–12'], ['fw-clam', '1×20'], ['fw-crunch', '1×20']] },
      { l: '3B', t: '3단계 B · 느리게', ex: [['fw-hipthrust', '3×2–30 (1초 올려 3초 버티기)'], ['fw-pullup', '3×1–3'], ['fw-bss', '3×10'], ['fw-incline-bb', '3×6–10'], ['tg-legcurl', '2×6–15'], ['fw-woodchop', '1×8–15']] },
      { l: '3A', t: '3단계 A · 레스트포즈', ex: [['fw-hipthrust', '3×9 (6+1+1+1)'], ['fw-invrow', '3×6–12'], ['fw-squat', '3×5–10'], ['fw-pushup', '3×5–20'], ['fw-sumo', '3×6–12'], ['fw-clam', '1×20'], ['fw-crunch', '1×20']] },
      { l: '3C', t: '3단계 C · 무겁게', ex: [['fw-hipthrust', '3×5'], ['fw-dbrow', '3×6–12'], ['fw-stepup', '3×8–15'], ['fw-db-ohp', '3×8–12'], ['fw-roman', '3×8–15'], ['fw-hangleg', '1×8–20']] }],
    desc: '스트롱 커브스 책의 중급 프로그램(Gluteal Goddess). 주 4회(A·B·A·C), 4주마다 단계가 올라가요. 입문 12주를 끝냈거나 힙 쓰러스트·스쿼트·데드에 익숙할 때.',
    note: '원본은 5RM의 % 무게와 슈퍼세트(로우↔스쿼트처럼 상·하체 번갈아)를 써요. 범위 위쪽을 모든 세트에서 채우면 증량. 밴드·케이블 일부 종목은 비슷한 동작(클램쉘, 어브덕션 머신, 우드찹)으로 바꿨어요.' },
  { id: 'gluteadv5', name: '엉덩이 특화 5일', who: '앱 구성 · 상급 고볼륨', lv: '상급', tier: 3, why: '엉덩이 주 25세트 이상 + 레스트포즈·드롭세트', per: '주 5일', fem: 1, days: [
      { l: '하1', t: '하체 · 엉덩이 무겁게', ex: [['fw-hipthrust', '4×5–8'], ['fw-squat', '4×6'], ['fw-rdl', '3×8'], ['tg-abduction', '3×15 (마지막 세트 드롭)']] },
      { l: '상1', t: '상체 · 등·어깨', ex: [['lf-pulldown', '4×8–10'], ['cb-row', '3×10'], ['fw-db-ohp', '3×10'], ['fw-lateral', '4×15'], ['cb-facepull', '3×15']] },
      { l: '하2', t: '엉덩이 볼륨 · 한 다리', ex: [['fw-bss', '4×10'], ['fw-slhipthrust', '3×12'], ['g80-glute', '3×15'], ['tg-legcurl', '3×12'], ['fw-clam', '2×20']] },
      { l: '상2', t: '상체 · 가슴·팔', ex: [['fw-incline-db', '3×10'], ['lf-chest-press', '3×12'], ['fw-lateral', '3×15'], ['cb-pushdown', '3×12'], ['fw-dbcurl', '3×12']] },
      { l: '하3', t: '엉덩이 펌프 · 하체', ex: [['fw-hipthrust', '3×15 (마지막 세트 레스트포즈)'], ['lf-legpress', '4×12 (발판 높게)'], ['fw-sumo', '3×8'], ['tg-abduction', '3×20 (드롭)'], ['fw-hangleg', '3×12']] }],
    desc: '엉덩이를 주 3회, 25세트 이상 하는 상급 구성. 앱이 연구 기준(근육당 주 10–20세트 이상에서도 성장은 계속되지만 효율은 떨어짐)에 맞춰 짠 루틴이에요 — 유명 코치의 프로그램은 아니에요.',
    note: '세트 대부분은 1–2회 여유를 남기고, 드롭·레스트포즈는 표시된 마지막 세트에만. 4–6주마다 1주는 세트를 절반으로 줄여 쉬어가세요.' },
  { id: 'circuit3', name: '다이어트 서킷 3일', who: '입문 · 머신 서킷 + 걷기', lv: '초급', tier: 1, why: '머신만 쓰고 무게는 가볍게', per: '주 3일', fem: 1, uni: 1, days: [
      { l: 'A', t: '서킷 A + 인터벌 걷기', ex: [['lf-legpress', '3×15'], ['lf-chest-press', '3×15'], ['lf-pulldown', '3×15'], ['tg-abduction', '3×20'], ['cy-abcrunch', '3×15'], ['pc-tread', '1×20분 (빠르게 1분·천천히 2분 반복)']] },
      { l: 'B', t: '서킷 B + 일립티컬', ex: [['fw-goblet', '3×15'], ['cy-row', '3×15'], ['hs-shoulder', '3×12'], ['g80-glute', '3×15'], ['tg-legcurl', '3×15'], ['mx-ellip', '1×20분']] }],
    desc: '머신 5종목을 쉬지 않고 한 바퀴 돌고(종목 사이 30초), 2분 쉬고 3바퀴. 끝나고 유산소 20분. A·B 번갈아 주 3회.',
    note: '15회를 겨우 채우는 무게로. 3바퀴가 쉬워지면 무게를 한 칸 올리세요. 감량의 대부분은 식단이에요 — 바디 탭 목표를 "살 빼기"로.' },
  { id: 'wul4', name: '하체 비중 상하체 4일', who: '일반적인 구성 · 하체 위주', lv: '중급', tier: 2, why: '주 4일 분할 · 하체 볼륨 많음', per: '주 4일', fem: 1, days: [
      { l: '하1', t: '하체 · 엉덩이 무겁게', ex: [['fw-squat', '4×6–8'], ['fw-hipthrust', '4×8'], ['fw-rdl', '3×8'], ['tg-abduction', '3×15']] },
      { l: '상1', t: '상체 · 등·어깨', ex: [['lf-pulldown', '3×10'], ['cb-row', '3×10'], ['fw-db-ohp', '3×10'], ['fw-lateral', '3×15'], ['cb-pushdown', '2×12']] },
      { l: '하2', t: '하체 · 엉덩이 볼륨', ex: [['fw-bss', '3×10'], ['lf-legpress', '3×12'], ['tg-legcurl', '3×12'], ['g80-glute', '3×15'], ['fw-hipthrust', '2×15']] },
      { l: '상2', t: '상체 · 가슴·팔', ex: [['fw-incline-db', '3×10'], ['cb-row', '3×12'], ['fw-lateral', '3×15'], ['fw-dbcurl', '2×12'], ['cy-abcrunch', '3×12']] }],
    desc: '하체·엉덩이 2일, 상체 2일. 하체를 더 키우고 싶지만 상체 라인도 같이 잡고 싶을 때.',
    note: '하체 날은 2–3회 여유를 남기고, 엉덩이 볼륨 날은 1–2회 여유까지.' },
  { id: 'fatloss3', name: '다이어트 전신 3일 + 유산소', who: '근력+유산소 병행 · 연구 기반 구성', lv: '초급', tier: 1, why: '가벼운 전신 + 유산소', uni: 1, per: '주 3일', fem: 1, days: [
      { l: 'A', t: '전신 A + 유산소', ex: [['fw-goblet', '3×12'], ['lf-chest-press', '3×12'], ['lf-pulldown', '3×12'], ['fw-rdl', '3×12'], ['pc-tread', '1×20–30분']] },
      { l: 'B', t: '전신 B + 유산소', ex: [['lf-legpress', '3×12'], ['fw-db-ohp', '3×12'], ['cb-row', '3×12'], ['fw-hipthrust', '3×12'], ['mx-ellip', '1×20–30분']] }],
    desc: '근력운동으로 근육을 지키고 유산소로 소모를 늘리는 감량용 구성. A·B를 번갈아 주 3회, 다른 날 걷기를 더하면 좋아요.',
    note: '휴식은 60–90초로 짧게. 무게는 12회를 겨우 채우는 정도로 유지하고, 줄이지 마세요.' },
  { id: 'bwfb3', name: '맨몸 전신 3일 (집에서)', who: '기구 없이 · 앱 구성', lv: '초급', tier: 1, why: '쉬운 동작부터 단계적으로', uni: 1, fem: 1, bw: 1, per: '주 3일', days: [
      { l: 'A', t: '맨몸 전신 A', ex: [['bw-squat', '3×15–20'], ['bw-inclinepush', '3×8–15'], ['fw-invrow', '3×8–12'], ['fw-glutebridge', '3×15–20'], ['fw-plank', '3×30초']] },
      { l: 'B', t: '맨몸 전신 B', ex: [['bw-revlunge', '3×10–12'], ['fw-pushup', '3×5–12'], ['bw-negpull', '3×3–5'], ['bw-ytw', '2×10–12'], ['bw-hollow', '3×20초']] },
      { l: 'C', t: '맨몸 전신 C', ex: [['bw-bss', '3×8–12'], ['bw-pike', '3×5–10'], ['fw-invrow', '3×8–12'], ['fw-slbridge', '3×10–12'], ['bw-legraise', '3×10']] }],
    desc: '헬스장 없이 집에서 하는 전신 3일. A·B·C를 돌아가며 주 3회. 필요한 건 바닥, 튼튼한 식탁(인버티드 로우), 의자, 있으면 문틀 철봉 정도예요.',
    note: '맨몸은 무게 대신 횟수와 동작 난이도로 올려요. 모든 세트에서 범위 위쪽 횟수를 채우면 한 단계 어려운 동작으로 넘어가요(예: 인클라인 푸시업 → 푸시업 → 발 올린 푸시업). 기록하면 앱이 다음 단계를 알려줘요. 세트는 실패 1–3회 전까지 하는 게 핵심이에요.' },
  { id: 'bwdiet3', name: '맨몸 다이어트 서킷 3일', who: '기구 없이 · 근력+심박 서킷', lv: '초급', tier: 1, why: '짧은 휴식으로 이어서 · 30–35분', uni: 1, fem: 1, bw: 1, per: '주 3일', days: [
      { l: 'A', t: '맨몸 서킷 A', ex: [['bw-jumpsquat', '3×12'], ['fw-pushup', '3×8–12'], ['bw-revlunge', '3×10'], ['bw-mtclimb', '3×30초'], ['fw-glutebridge', '3×15'], ['cf-burpee', '3×8']] },
      { l: 'B', t: '맨몸 서킷 B', ex: [['bw-squat', '3×20'], ['bw-inclinepush', '3×12'], ['fw-invrow', '3×10'], ['bw-mtclimb', '3×30초'], ['bw-superman', '3×12'], ['bw-hollow', '3×20초']] }],
    desc: '한 종목씩 쉬지 않고 이어서 한 바퀴 → 1–2분 쉬고 → 3바퀴. 근육을 지키면서 심박을 올리는 감량용 구성이에요. A·B를 번갈아 주 3회, 다른 날엔 걷기 30분.',
    note: '점프가 무릎에 부담되면 점프 스쿼트는 맨몸 스쿼트로, 버피는 팔굽혀펴기 없이 일어서기만 해도 돼요. 감량은 식사가 결정하고, 이 루틴은 근육을 지키고 소모를 조금 늘리는 역할이에요.' },
  { id: 'bwul4', name: '맨몸 상하체 4일', who: '철봉·평행봉 있는 곳 · 앱 구성', lv: '중급', tier: 2, why: '풀업·딥스가 몇 개 되는 사람', uni: 1, bw: 1, per: '주 4일', days: [
      { l: '상A', t: '상체 A · 당기기 위주', ex: [['fw-pullup', '4×5–10'], ['fw-dips', '4×6–12'], ['bw-pike', '3×6–10'], ['fw-invrow', '3×10–15'], ['bw-diamond', '3×8–15'], ['bw-hollow', '3×30초']] },
      { l: '하A', t: '하체 A · 한 다리', ex: [['bw-bss', '4×10–15'], ['fw-sl-rdl', '3×10–12'], ['bw-nordic', '3×3–6'], ['bw-calf', '3×12–20'], ['bw-legraise', '3×10–15']] },
      { l: '상B', t: '상체 B · 밀기 위주', ex: [['fw-chinup', '4×6–10'], ['bw-declinepush', '4×8–15'], ['fw-invrow', '3×10–15'], ['bw-ytw', '3×10–12'], ['bw-benchdip', '3×10–15'], ['fw-sideplank', '2×30초']] },
      { l: '하B', t: '하체 B · 엉덩이·뒤쪽', ex: [['bw-pistol', '4×5–8'], ['fw-slhipthrust', '3×12–20'], ['bw-sliderc', '3×8–12'], ['bw-jumpsquat', '3×6–8'], ['bw-calf', '3×15–20'], ['bw-superman', '2×12']] }],
    desc: '공원 철봉·평행봉이나 집 문틀 철봉으로 하는 상하체 4일(예: 월 상A · 화 하A · 목 상B · 금 하B). 맨몸이지만 부위당 주 10세트 이상이 되게 짰어요.',
    note: '하체는 맨몸으로 무게를 못 올리니 한 다리 동작(불가리안·피스톨·싱글레그)으로 강도를 올려요. 노르딕 컬은 처음엔 천천히 내려오기만 해도 충분히 힘들어요. 배낭에 책·물병을 넣어 메면 무게를 더할 수 있어요(무게 칸에 입력).' },
  { id: 'bwadv3', name: '맨몸 스킬·근력 3일', who: '앱 구성 · 상급 맨몸', lv: '상급', tier: 3, why: '풀업 12개·딥스 15개 이상 되는 사람', uni: 1, bw: 1, per: '주 3일', days: [
      { l: 'A', t: '밀기 · 물구나무', ex: [['bw-wallhspu', '5×3–6'], ['fw-dips', '4×8–15'], ['bw-declinepush', '3×12–20'], ['bw-diamond', '3×10–15'], ['fw-hangleg', '3×8–12']] },
      { l: 'B', t: '다리 · 한 다리', ex: [['bw-pistol', '5×5–8'], ['bw-nordic', '4×4–8'], ['bw-bss', '3×12–15'], ['fw-slhipthrust', '3×15–20'], ['bw-calf', '3×20']] },
      { l: 'C', t: '당기기 · 머슬업', ex: [['fw-pullup', '5×6–12'], ['cf-barmu', '4×2–5'], ['fw-chinup', '3×8–12'], ['fw-invrow', '3×12–15'], ['bw-ytw', '3×12'], ['bw-hollow', '3×45초']] }],
    desc: '물구나무 푸시업·피스톨·머슬업 같은 기술 동작을 근력 운동으로 쓰는 3일. 맨몸으로 강도를 최대한 올리는 구성이에요.',
    note: '기술 동작은 힘이 남아 있을 때(세션 처음) 하고 실패까지 가지 마세요. 풀업·딥스가 범위 위쪽에서 쉬워지면 가중 조끼나 배낭으로 무게를 더해요(무게 칸에 추가 무게). 머슬업이 아직 안 되면 가슴까지 끌어올리는 풀업으로 대신해요.' },
  { id: 'sl5', name: '스트롱리프트 5×5', who: 'Mehdi · StrongLifts', lv: '초급', tier: 1, why: '매번 증량하는 초보 근력 프로그램', uni: 1, per: '주 3일', days: [
      { l: 'A', t: '워크아웃 A', ex: [['fw-squat', '5×5'], ['fw-bench', '5×5'], ['fw-bbrow', '5×5']] },
      { l: 'B', t: '워크아웃 B', ex: [['fw-squat', '5×5'], ['fw-ohp', '5×5'], ['fw-deadlift', '1×5']] }],
    desc: '바벨 5종목만으로 근력을 빠르게 올리는 대표적인 초보 프로그램. A/B를 번갈아 주 3회.',
    note: '5세트 모두 5회 성공하면 다음번 +2.5kg(데드리프트 +5kg). 같은 무게에서 3번 연속 실패하면 10% 낮춰 다시 올라가요.' },
  { id: 'ul4', name: '상하체 분할 4일', who: '일반적인 구성', lv: '중급', tier: 2, why: '주 4일 분할 · 무거운 날/볼륨 날 구분', uni: 1, per: '주 4일', days: [
      { l: '상1', t: '상체 · 무겁게', ex: [['fw-bench', '4×6'], ['fw-bbrow', '4×6'], ['fw-ohp', '3×8'], ['lf-pulldown', '3×10'], ['fw-bbcurl', '2×10'], ['cb-pushdown', '2×10']] },
      { l: '하1', t: '하체 · 무겁게', ex: [['fw-squat', '4×6'], ['fw-rdl', '3×8'], ['lf-legpress', '3×10'], ['tg-legcurl', '3×10'], ['mx-calf', '3×12']] },
      { l: '상2', t: '상체 · 볼륨', ex: [['fw-incline-db', '3×10'], ['cb-row', '3×10'], ['fw-db-ohp', '3×10'], ['cb-cross', '3×12'], ['fw-lateral', '3×15'], ['fw-hammer', '3×12'], ['fw-ohext', '3×12']] },
      { l: '하2', t: '하체 · 볼륨', ex: [['fw-deadlift', '3×5'], ['fw-bss', '3×10'], ['hs-legext', '3×12'], ['lf-lyingcurl', '3×12'], ['mx-calf', '3×15'], ['fw-hangleg', '3×12']] }],
    desc: '상체·하체를 주 2번씩. 부위당 주 2회 빈도로 근력과 근비대를 같이 챙기는 무난한 분할.',
    note: '무거운 날은 2–3회 여유(RIR 2–3)를 남기고, 볼륨 날은 1–2회 여유까지.' },
  { id: 'ppl', name: '레딧 PPL 6일', who: 'Metallicadpa · r/Fitness', lv: '중급', tier: 2, why: '주 6일 · 회복 관리 필요', per: '주 6일', days: [
      { l: '당A', t: '당기기 A', ex: [['fw-deadlift', '1×5+'], ['lf-pulldown', '3×8–12'], ['cb-row', '3×8–12'], ['cb-facepull', '5×15–20'], ['fw-hammer', '4×8–12'], ['fw-dbcurl', '4×8–12']] },
      { l: '밀A', t: '밀기 A', ex: [['fw-bench', '5×5+'], ['fw-ohp', '3×8–12'], ['fw-incline-db', '3×8–12'], ['cb-pushdown', '3×8–12'], ['fw-ohext', '3×8–12'], ['fw-lateral', '3×15–20']] },
      { l: '하A', t: '하체', ex: [['fw-squat', '3×5+'], ['fw-rdl', '3×8–12'], ['lf-legpress', '3×8–12'], ['tg-legcurl', '3×8–12'], ['mx-calf', '5×8–12']] },
      { l: '당B', t: '당기기 B', ex: [['fw-bbrow', '5×5+'], ['lf-pulldown', '3×8–12'], ['cb-row', '3×8–12'], ['cb-facepull', '5×15–20'], ['fw-hammer', '4×8–12'], ['fw-dbcurl', '4×8–12']] },
      { l: '밀B', t: '밀기 B', ex: [['fw-ohp', '5×5+'], ['fw-bench', '3×8–12'], ['fw-incline-db', '3×8–12'], ['cb-pushdown', '3×8–12'], ['fw-ohext', '3×8–12'], ['fw-lateral', '3×15–20']] },
      { l: '하B', t: '하체', ex: [['fw-squat', '3×5+'], ['fw-rdl', '3×8–12'], ['lf-legpress', '3×8–12'], ['tg-legcurl', '3×8–12'], ['mx-calf', '5×8–12']] }],
    desc: '당기기·밀기·하체를 두 바퀴, 주 6일. 레딧 r/Fitness에서 유명해진 초중급 PPL.',
    note: '"5+"는 마지막 세트를 할 수 있는 만큼(AMRAP). 메인 종목은 매번 +2.5kg(데드 +5kg), 보조 종목은 범위 위쪽 횟수를 채우면 증량.' },
  { id: 'phul', name: 'PHUL 4일', who: 'Brandon Campbell', lv: '중급', tier: 2, why: '근력·근비대 날을 나눠 관리', uni: 1, per: '주 4일', days: [
      { l: '파상', t: '파워 상체', ex: [['fw-bench', '3×3–5'], ['fw-incline-db', '3×6–10'], ['fw-bbrow', '3×3–5'], ['lf-pulldown', '3×6–10'], ['fw-ohp', '2×5–8'], ['fw-bbcurl', '2×6–10'], ['fw-skull', '2×6–10']] },
      { l: '파하', t: '파워 하체', ex: [['fw-squat', '3×3–5'], ['fw-deadlift', '3×3–5'], ['lf-legpress', '3×10–15'], ['tg-legcurl', '3×6–10'], ['mx-calf', '4×6–10']] },
      { l: '근상', t: '근비대 상체', ex: [['fw-incline-bb', '3×8–12'], ['fw-db-fly', '3×8–12'], ['cb-row', '3×8–12'], ['fw-dbrow', '3×8–12'], ['fw-lateral', '3×8–12'], ['fw-dbcurl', '3×8–12'], ['cb-pushdown', '3×8–12']] },
      { l: '근하', t: '근비대 하체', ex: [['fw-front', '3×8–12'], ['fw-lunge', '3×8–12'], ['hs-legext', '3×10–15'], ['lf-lyingcurl', '3×10–15'], ['mx-calf', '4×8–12']] }],
    desc: 'Power Hypertrophy Upper Lower. 주 2일은 무겁게(근력), 2일은 가볍고 많이(근비대).',
    note: '파워 날은 3–5회로 무겁게, 근비대 날은 8–12회. 범위 위쪽 횟수를 모든 세트에서 채우면 증량.' },
  { id: 'bbb', name: '5/3/1 BBB', who: 'Jim Wendler', lv: '중급', tier: 2, why: '1RM 기준 % 계산 · 주 단위 증량', uni: 1, per: '주 4일', days: [
      { l: '1', t: '오버헤드 프레스', ex: [['fw-ohp', '5/3/1'], ['fw-ohp', '5×10'], ['fw-chinup', '5×10']] },
      { l: '2', t: '데드리프트', ex: [['fw-deadlift', '5/3/1'], ['fw-deadlift', '5×10'], ['fw-hangleg', '5×10']] },
      { l: '3', t: '벤치프레스', ex: [['fw-bench', '5/3/1'], ['fw-bench', '5×10'], ['fw-dbrow', '5×10']] },
      { l: '4', t: '스쿼트', ex: [['fw-squat', '5/3/1'], ['fw-squat', '5×10'], ['tg-legcurl', '5×10']] }],
    desc: 'Boring But Big. 하루 메인 1종목을 퍼센트로 올리고, 같은 종목 5×10으로 볼륨을 채워요. 4주 사이클.',
    note: '기준 무게(TM) = 1RM의 90%. 메인 세트: 1주 65·75·85%×5, 2주 70·80·90%×3, 3주 75·85·95%×5·3·1, 4주 디로딩. 5×10은 TM의 50–60%. 사이클마다 TM 상체 +2.5kg, 하체 +5kg.' },
  { id: 'phat', name: 'PHAT 5일', who: 'Layne Norton', lv: '상급', tier: 3, why: '주 5일 · 근력+고볼륨 동시', per: '주 5일', days: [
      { l: '파상', t: '파워 상체', ex: [['fw-bbrow', '3×3–5'], ['fw-pullup', '2×6–10'], ['lf-pulldown', '2×6–10'], ['fw-db-bench', '3×3–5'], ['fw-dips', '2×6–10'], ['fw-db-ohp', '3×6–10'], ['fw-bbcurl', '3×6–10'], ['fw-skull', '3×6–10']] },
      { l: '파하', t: '파워 하체', ex: [['fw-squat', '3×3–5'], ['hs-hack', '2×6–10'], ['hs-legext', '2×6–10'], ['fw-rdl', '3×5–8'], ['lf-lyingcurl', '2×6–10'], ['mx-calf', '3×6–10']] },
      { l: '등어', t: '등 · 어깨 근비대', ex: [['fw-bbrow', '4×8–10'], ['lf-pulldown', '3×8–12'], ['cb-row', '3×8–12'], ['fw-dbrow', '2×12–15'], ['fw-db-ohp', '3×8–12'], ['fw-lateral', '3×12–20']] },
      { l: '하체', t: '하체 근비대', ex: [['fw-squat', '4×8–10'], ['hs-hack', '3×8–12'], ['lf-legpress', '2×12–15'], ['hs-legext', '3×15–20'], ['fw-rdl', '3×8–12'], ['lf-lyingcurl', '2×12–15'], ['tg-legcurl', '2×15–20'], ['mx-calf', '4×10–15']] },
      { l: '가팔', t: '가슴 · 팔 근비대', ex: [['fw-db-bench', '4×8–10'], ['fw-incline-db', '3×8–12'], ['lf-chest-press', '3×12–15'], ['cb-cross', '2×15–20'], ['nt-preacher', '3×8–12'], ['fw-dbcurl', '2×12–15'], ['fw-skull', '3×8–12'], ['cb-pushdown', '2×12–15']] }],
    desc: 'Power Hypertrophy Adaptive Training. 앞 2일은 상·하체를 무겁게(3–5회), 뒤 3일은 부위별로 볼륨을 크게. PHUL보다 볼륨이 많아요.',
    note: '근비대 날 첫 종목은 파워 날 무게의 약 85%로. 주 5일, 3일째와 7일째 휴식. 종목은 같은 동작의 다른 기구로 바꿔도 돼요.' },
  { id: 'gvt', name: '독일식 볼륨 트레이닝', who: 'Charles Poliquin · GVT', lv: '상급', tier: 3, why: '10×10 초고볼륨 · 회복 부담 큼', uni: 1, per: '주 3일', days: [
      { l: '가등', t: '가슴 · 등', ex: [['fw-bench', '10×10'], ['fw-bbrow', '10×10'], ['cb-cross', '3×10'], ['lf-pulldown', '3×10']] },
      { l: '하체', t: '하체 · 복근', ex: [['fw-squat', '10×10'], ['lf-lyingcurl', '10×10'], ['mx-calf', '3×10'], ['fw-hangleg', '3×10']] },
      { l: '팔어', t: '팔 · 어깨', ex: [['fw-bench', '10×6'], ['fw-bbcurl', '10×6'], ['fw-lateral', '3×6'], ['fw-reardelt', '3×6']] }],
    desc: '메인 종목을 10세트×10회로. 두 종목을 번갈아(슈퍼세트) 하고 사이 휴식은 60–90초. 4–6주 하고 디로딩.',
    note: '10×10은 1RM의 약 60%로 시작해 매주 약 2%씩 올려요. 10회를 다 못 채우는 세트가 나와도 무게는 유지. 팔 날 벤치는 좁게 잡는 클로즈그립으로.' },
  { id: 'regpark', name: '레그 파크 5×5', who: '레그 파크 · 선수 루틴', lv: '초급', tier: 1, why: '1단계는 초보용 5×5 전신', per: '주 3일', days: [
      { l: 'A', t: '전신 A', ex: [['fw-squat', '5×5'], ['fw-chinup', '5×5'], ['fw-bench', '5×5'], ['fw-bbcurl', '2×10'], ['mx-calf', '2×15–20']] },
      { l: 'B', t: '전신 B', ex: [['fw-front', '5×5'], ['fw-bbrow', '5×5'], ['fw-ohp', '5×5'], ['fw-deadlift', '3×5'], ['mx-calf', '2×15–20']] }],
    desc: '아놀드가 롤모델로 꼽은 미스터 유니버스 레그 파크의 초보 전신 루틴. A·B를 번갈아 주 3회(1주 A-B-A, 2주 B-A-B).',
    note: '5×5에서 앞 2세트는 워밍업, 뒤 3세트가 5회 최대 무게예요. 손목·전완 운동(2×10)도 원래 구성에 있어요.' },
  { id: 'coleman', name: '로니 콜먼 6일', who: '로니 콜먼 · 선수 루틴', lv: '상급', tier: 3, why: '선수 볼륨 · 초고중량', per: '주 6일', days: [
      { l: '등이어', t: '등 · 이두 · 어깨', ex: [['fw-deadlift', '4×6–12'], ['fw-bbrow', '4×10–12'], ['fw-landmine', '3×10–12'], ['fw-dbrow', '3×10–12'], ['fw-bbcurl', '4×12'], ['nt-preacher', '3×12'], ['fw-ohp', '4×10–12'], ['fw-lateral', '3×12']] },
      { l: '하체', t: '하체', ex: [['fw-squat', '6×2–12'], ['lf-legpress', '4×10–12'], ['fw-lunge', '2×길게'], ['fw-rdl', '3×10–12'], ['lf-lyingcurl', '3×10–12']] },
      { l: '가삼', t: '가슴 · 삼두 · 종아리', ex: [['fw-bench', '5×5–12'], ['fw-incline-bb', '3×10–12'], ['hs-decline', '3×10–12'], ['fw-db-fly', '3×12'], ['fw-skull', '4×12'], ['fw-ohext', '3×12'], ['mx-calf', '4×12–15']] }],
    desc: '미스터 올림피아 8연패. 등·이두·어깨 / 하체 / 가슴·삼두를 주 2바퀴.',
    note: '분할(주 6일, 2바퀴)은 잘 알려진 구성이고, 하체 날 종목은 공개된 프로그램 기준이에요. 나머지 날 종목은 그가 자주 한 운동으로 만든 대표 예시예요. 볼륨이 매우 커서 상급자용.' },
  { id: 'haney', name: '리 헤이니 3분할', who: '리 헤이니 · 선수 루틴', lv: '중급', tier: 2, why: '고전적 3분할 · 적당한 볼륨', per: '3일 운동 · 1일 휴식', days: [
      { l: '가팔', t: '가슴 · 팔', ex: [['fw-bench', '4×6–8'], ['fw-db-bench', '3×8–10'], ['fw-incline-bb', '4×6–8'], ['fw-incline-db', '3×8–10'], ['fw-bbcurl', '4×8–10'], ['nt-preacher', '4×8–10'], ['cb-pushdown', '4×10–12'], ['fw-skull', '4×6–8']] },
      { l: '하체', t: '하체', ex: [['hs-legext', '4×12–15'], ['lf-legpress', '4×10–12'], ['fw-squat', '4×8–10'], ['fw-rdl', '3×8–10'], ['mx-calf', '6×15–20']] },
      { l: '등어', t: '등 · 어깨', ex: [['lf-pulldown', '4×8–10'], ['fw-bbrow', '4×6–8'], ['cb-row', '4×8–10'], ['fw-ohp', '4×6–8'], ['fw-lateral', '4×8–10'], ['cy-abcrunch', '4×15–20']] }],
    desc: '미스터 올림피아 8연패. "자극하되 망가뜨리지 마라(Stimulate, don\'t annihilate)" — 3일 운동, 1일 휴식을 반복.',
    note: '원래는 종아리·복근을 매일 했어요. 요일 대신 3일 하고 하루 쉬는 순환이라 앱의 "다음 차례"를 따라가면 돼요.' },
  { id: 'mentzer', name: '마이크 멘처 헤비듀티', who: '마이크 멘처 · Heavy Duty II', lv: '중급', tier: 2, why: '세트는 적지만 실패 지점까지 — 자세가 잡혀 있어야 함', per: '7–10일에 1회', days: [
      { l: 'A', t: '하체 · 등', ex: [['fw-squat', '1×8–15'], ['lf-pulldown', '1×6–10']] },
      { l: 'B', t: '후면 · 가슴 · 삼두', ex: [['fw-deadlift', '1×5–8'], ['fw-dips', '1×6–10']] }],
    desc: '극단적으로 적은 볼륨: 워밍업 후 실패 지점까지 단 1세트, 운동 사이 7–10일 휴식. 멘처의 말기 "통합(Consolidated)" 루틴.',
    note: '워밍업 1–3세트는 실패 근처까지 가지 않게. 매번 강해지지 않으면 휴식을 10–14일로 늘리라고 했어요. 연구 근거(주 10세트 이상)와는 정반대 철학이라 비교용으로 넣었어요.' },
  { id: 'fst7', name: 'FST-7 5분할', who: '하니 램보드 · 트레이너 루틴', lv: '상급', tier: 3, why: '부위당 고볼륨 + 짧은 휴식 7세트', per: '주 5일', days: [
      { l: '가슴', t: '가슴', ex: [['fw-bench', '3×6–8'], ['fw-incline-db', '3×8–12'], ['lf-chest-press', '3×8–12'], ['tg-pecdeck', '7×12–15']] },
      { l: '등', t: '등', ex: [['fw-pullup', '3×6–8'], ['fw-bbrow', '3×8–12'], ['fw-dbrow', '3×8–12'], ['lf-pulldown', '7×12–15']] },
      { l: '하체', t: '하체', ex: [['fw-squat', '3×6–8'], ['fw-rdl', '3×6–8'], ['lf-legpress', '3×8–12'], ['hs-legext', '7×12–15'], ['tg-legcurl', '7×12–15']] },
      { l: '어깨', t: '어깨', ex: [['fw-ohp', '3×6–8'], ['fw-db-ohp', '3×8–12'], ['cb-facepull', '3×8–12'], ['fw-lateral', '7×12–15']] },
      { l: '팔', t: '팔', ex: [['fw-dips', '3×6–8'], ['fw-bbcurl', '3×6–8'], ['nt-preacher', '3×8–12'], ['fw-skull', '3×8–12'], ['cb-curl', '7×12–15'], ['cb-pushdown', '7×12–15']] }],
    desc: '제이 커틀러·필 히스를 미스터 올림피아로 만든 트레이너의 방식. 부위마다 무거운 종목 2–3개 뒤, 마지막 종목을 7세트·짧은 휴식으로 마무리해요.',
    note: '마지막 "7×"가 FST-7: 세트 사이 30–45초만 쉬고 8–15회. 램보드는 처음엔 1–2부위에만 쓰고, 초보는 레그 익스텐션 같은 고립 운동으로 하라고 했어요. 근육통이 4–5일 가면 줄이세요. 부위별 종목은 공개된 예시 기준이에요.' },
  { id: 'y3t', name: 'Y3T (Yoda 3 Training)', who: '닐 힐 · 트레이너 루틴', lv: '상급', tier: 3, why: '3주 주기 + 드롭·자이언트 세트', per: '3주 사이클 · 주 3–5일', days: [
      { l: '1주', t: '1주차 · 상체 (무겁게)', ex: [['fw-incline-db', '3×6–10'], ['fw-bench', '3×6–10'], ['fw-bbrow', '3×6–10'], ['lf-pulldown', '3×6–10'], ['fw-ohp', '3×6–10'], ['fw-bbcurl', '2×6–10'], ['fw-dips', '2×6–10']] },
      { l: '1주', t: '1주차 · 하체 (무겁게)', ex: [['fw-squat', '4×6–10'], ['hs-hack', '3×6–10'], ['fw-rdl', '3×6–10'], ['lf-lyingcurl', '3×6–10'], ['mx-calf', '3×8–10']] },
      { l: '2주', t: '2주차 · 상체 (중간)', ex: [['fw-incline-db', '3×8–12'], ['cb-cross', '3×12–15'], ['hs-row', '3×8–12'], ['fw-dbrow', '3×8–12'], ['fw-db-ohp', '3×8–12'], ['fw-lateral', '3×12–15'], ['fw-dbcurl', '3×10–12'], ['cb-pushdown', '3×10–12']] },
      { l: '2주', t: '2주차 · 하체 (중간)', ex: [['hs-legext', '3×12–15'], ['lf-legpress', '3×8–12'], ['fw-lunge', '3×10–12'], ['tg-legcurl', '3×10–12'], ['fw-rdl', '3×8–12'], ['mx-calf', '4×12–15']] },
      { l: '3주', t: '3주차 · 상체 (고반복·드롭)', ex: [['fw-incline-db', '4×15–20'], ['fw-smith-bench', '4×15–20'], ['cb-cross', '2×15–20'], ['hs-row', '4×15–20'], ['lf-pulldown', '2×15–20'], ['fw-lateral', '3×20–25'], ['fw-reardelt', '4×20–25'], ['cb-pushdown', '3×20–25'], ['cb-curl', '3×20–25']] },
      { l: '3주', t: '3주차 · 하체 (고반복·드롭)', ex: [['hs-legext', '4×20–25'], ['lf-legpress', '3×25–30'], ['fw-lunge', '2×20–30'], ['fw-squat', '2×20–25'], ['fw-rdl', '3×20–25'], ['mx-calf', '3×20–30']] }],
    desc: '플렉스 루이스(212 올림피아 5연패)의 코치 닐 힐의 방식. 3주를 한 사이클로 1주차 무겁게 → 2주차 중간 → 3주차 가볍게 실패·드롭세트까지 바꿔가며 해요.',
    note: '3주 × 3 = 9주 후 5–7일 휴식. 3주차는 드롭세트·레스트포즈로 20회를 훌쩍 넘기는 게 특징이에요. 원래는 부위별 분할이라 여기선 상·하체로 묶어 옮겼고, 3주차 종목은 공개된 예시, 1·2주차 반복 범위는 흔히 소개되는 값이에요.' },
  { id: 'arnold', name: '아놀드 스플릿', who: '아놀드 슈워제네거 · 선수 루틴', lv: '상급', tier: 3, why: '주 6일 고볼륨 · 하루 2부위', per: '주 6일', days: [
      { l: '가등', t: '가슴 · 등', ex: [['fw-bench', '4×8–12'], ['fw-incline-bb', '4×8–12'], ['fw-db-fly', '4×10–12'], ['fw-pullup', '4×최대'], ['fw-bbrow', '4×8–12'], ['fw-landmine', '4×8–12']] },
      { l: '어팔', t: '어깨 · 팔', ex: [['fw-ohp', '4×8–12'], ['fw-lateral', '4×10–12'], ['fw-reardelt', '4×10–12'], ['fw-bbcurl', '4×8–12'], ['fw-dbcurl', '4×8–12'], ['fw-skull', '4×8–12'], ['cb-pushdown', '4×10–12']] },
      { l: '하체', t: '하체 · 복근', ex: [['fw-squat', '4×8–12'], ['fw-lunge', '4×10'], ['lf-lyingcurl', '4×10–12'], ['fw-rdl', '4×8–12'], ['mx-calf', '4×15'], ['cy-abcrunch', '4×15']] }],
    desc: '아놀드가 현역 때 쓴 분할 방식(가슴·등 / 어깨·팔 / 하체를 주 2바퀴). 길항근(가슴↔등)을 같은 날 묶는 게 특징.',
    note: '분할 방식은 아놀드의 것이지만, 종목 구성은 그 방식을 요즘 헬스장 기구로 옮긴 대표 예시예요. 볼륨이 커서 초보에겐 무리일 수 있어요.' },
  { id: 'yates', name: '도리안 예이츠 HIT', who: '도리안 예이츠 · 선수 루틴', lv: '상급', tier: 3, why: '실패 이후 강제 반복까지 — 경험자용', per: '주 4일', days: [
      { l: '가이', t: '가슴 · 이두', ex: [['hs-incline', '1×6–10'], ['fw-incline-db', '1×6–10'], ['tg-pecdeck', '1×8–10'], ['nt-preacher', '1×6–8'], ['fw-dbcurl', '1×6–8']] },
      { l: '하체', t: '하체', ex: [['hs-legext', '1×10–12'], ['lf-legpress', '1×8–10'], ['hs-hack', '1×8–10'], ['lf-lyingcurl', '1×8–10'], ['fw-rdl', '1×8–10'], ['mx-calf', '1×10–12']] },
      { l: '어삼', t: '어깨 · 삼두', ex: [['hs-shoulder', '1×6–8'], ['fw-lateral', '1×8–10'], ['fw-reardelt', '1×8–10'], ['cb-pushdown', '1×8–10'], ['fw-ohext', '1×8–10']] },
      { l: '등', t: '등 · 후면 어깨', ex: [['nt-pullover', '1×8–10'], ['lf-pulldown', '1×6–8'], ['hs-row', '1×6–8'], ['fw-bbrow', '1×6–8'], ['fw-deadlift', '1×6–8']] }],
    desc: '미스터 올림피아 6연패 도리안 예이츠의 "Blood & Guts" 방식. 종목당 워밍업 후 실패 지점까지 1세트만.',
    note: '"1×"는 워밍업을 뺀 본세트 1개를 한계까지 한다는 뜻이에요. 강도가 매우 높아 회복 관리가 중요하고, 종목 구성은 그의 방식을 따른 대표 예시예요.' },
];
