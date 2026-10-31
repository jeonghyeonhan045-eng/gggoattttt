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
  const n = String(name || '');
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
  ['press', '벤치·가슴 프레스'], ['squat', '스쿼트·하체'], ['hinge', '데드리프트·힌지'],
  ['ohp', '어깨 프레스·레이즈'], ['pull', '로우·풀업'], ['arm', '팔'], ['kb', '케틀벨·기능성'], ['core', '코어'],
];

const EQ_RAW = [
  // ── 가슴 (machine)
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
  ['cy-curl', 'Cybex', '바이셉 컬', '팔', '바이셉 컬'],
  ['lf-tri', 'Life Fitness', '트라이셉 익스텐션', '팔', '트라이셉 익스텐션'],
  ['mx-curl', 'Matrix', '암 컬', '팔', '바이셉 컬'],
  ['nt-preacher', 'Nautilus', '프리처 컬', '팔', '바이셉 컬'],
  ['g80-dip', 'Gym80', '시티드 트라이셉 딥', '팔', '트라이셉 딥'],
  ['at-armcombo', 'Atlantis', '바이셉/트라이셉 콤보', '팔', '바이셉 컬'],
  ['cb-pushdown', '케이블', '트라이셉 푸시다운', '팔', '트라이셉 익스텐션'],
  ['cb-curl', '케이블', '케이블 컬', '팔', '바이셉 컬'],
  // ── 다리
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

const BUILTIN_EQ = [
  ...EQ_RAW.map(([id, brand, name, m, type]) => ({ id, brand, name, m, type, kind: 'machine' })),
  ...FREE_RAW.map(([id, name, m, type, sector]) => ({ id, brand: '프리웨이트', name, m, type, kind: 'free', sector })),
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
  { id: 'schoenfeld17', short: 'Schoenfeld 외 2017', text: 'Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci 35(11), 2017.', url: 'https://doi.org/10.1080/02640414.2016.1210197', use: '부위별 주 10세트 이상에서 근비대 효과가 더 큼.' },
  { id: 'schoenfeld16', short: 'Schoenfeld 외 2016', text: 'Schoenfeld BJ, Ogborn D, Krieger JW. Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy. Sports Med 46(11), 2016.', url: 'https://doi.org/10.1007/s40279-016-0543-8', use: '부위당 주 2회가 1회보다 유리 (단, 이후 연구에서 볼륨을 맞추면 차이는 작음).' },
  { id: 'morton', short: 'Morton 외 2018', text: 'Morton RW 외. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength. Br J Sports Med 52(6), 2018.', url: 'https://bjsm.bmj.com/content/52/6/376', use: '하루 체중 1kg당 약 1.6g 이상에서 추가 이득이 거의 없음 (상한 추정 ~2.2g).' },
  { id: 'bell22', short: 'Bell 외 2022', text: 'Bell L 외. "You can\'t shoot another bullet until you\'ve reloaded the gun": Coaches\' perceptions, practices and experiences of deloading. Front Sports Act Living 4, 2022.', url: 'https://doi.org/10.3389/fspor.2022.1073223', use: '코치 실무: 4–8주마다, 5–7일, 볼륨 30–50% 감소, RIR 1–3 추가 또는 무게 약 10% 감소. 계획 + 데이터 기반 병행.' },
  { id: 'bell23', short: 'Bell 외 2023', text: 'Bell L 외. Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach. Sports Med Open 9, 2023.', url: 'https://doi.org/10.1186/s40798-023-00633-0', use: '디로딩 = 피로 해소를 위한 계획된 훈련 스트레스 감소 기간 (전문가 합의 정의).' },
  { id: 'helms14', short: 'Helms 외 2014', text: 'Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr 11:20, 2014.', url: 'https://doi.org/10.1186/1550-2783-11-20', use: '감량 시 주당 체중의 0.5–1% 감소, 단백질 제지방 1kg당 2.3–3.1g, 지방 칼로리의 15–30%, 나머지 탄수화물.' },
  { id: 'barakat20', short: 'Barakat 외 2020', text: 'Barakat C, Pearson J, Escalante G, Campbell B, De Souza EO. Body Recomposition: Can Trained Individuals Build Muscle and Lose Fat at the Same Time? Strength Cond J 42(5):7–21, 2020.', url: 'https://doi.org/10.1519/SSC.0000000000000584', use: '리컴프: 유지 칼로리 근처 + 고단백(약 2g/kg 이상) + 꾸준한 근력운동이면 훈련 경험자도 근육 증가와 지방 감소가 동시에 가능.' },
  { id: 'iraki19', short: 'Iraki 외 2019', text: 'Iraki J 외. Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review. Sports 7(7):154, 2019.', url: 'https://doi.org/10.3390/sports7070154', use: '증량 시 주당 체중의 0.25–0.5% 증가, 칼로리 약 10–20% 잉여, 단백질 1.6–2.2g/kg.' },
  { id: 'coleman24', short: 'Coleman 외 2024', text: 'Coleman M 외. Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. PeerJ 12:e16777, 2024.', url: 'https://doi.org/10.7717/peerj.16777', use: '9주 중 1주 완전 휴식: 근비대 차이 없음, 하체 근력은 다소 불리 → 완전 휴식보다 가볍게 계속하는 디로딩 권장 근거.' },
];

/* ---------- 루틴 라이브러리 ----------
   ex: [equipment id, target]. Targets are "sets×reps"; programs that use percentages explain them in note. */
const PROGRAM_INFO = {
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
  { id: 'fb3', name: '초보 전신 3일', who: '입문 추천', lv: '입문', per: '주 3일', days: [
      { l: 'A', t: '전신 A', ex: [['fw-squat', '3×8'], ['fw-bench', '3×8'], ['cb-row', '3×10'], ['fw-lateral', '2×12'], ['cy-abcrunch', '2×12']] },
      { l: 'B', t: '전신 B', ex: [['fw-rdl', '3×8'], ['fw-ohp', '3×8'], ['lf-pulldown', '3×10'], ['lf-legpress', '2×12'], ['cb-pushdown', '2×12']] }],
    desc: 'A와 B를 번갈아 주 3회(예: 월 A · 수 B · 금 A). 운동을 막 시작했거나 쉬다가 돌아왔을 때.',
    note: '모든 세트를 목표 횟수로 성공하면 다음번에 무게를 한 단계 올리세요.' },
  { id: 'sl5', name: '스트롱리프트 5×5', who: 'Mehdi · StrongLifts', lv: '입문', per: '주 3일', days: [
      { l: 'A', t: '워크아웃 A', ex: [['fw-squat', '5×5'], ['fw-bench', '5×5'], ['fw-bbrow', '5×5']] },
      { l: 'B', t: '워크아웃 B', ex: [['fw-squat', '5×5'], ['fw-ohp', '5×5'], ['fw-deadlift', '1×5']] }],
    desc: '바벨 5종목만으로 근력을 빠르게 올리는 대표적인 초보 프로그램. A/B를 번갈아 주 3회.',
    note: '5세트 모두 5회 성공하면 다음번 +2.5kg(데드리프트 +5kg). 같은 무게에서 3번 연속 실패하면 10% 낮춰 다시 올라가요.' },
  { id: 'ul4', name: '상하체 분할 4일', who: '일반적인 구성', lv: '초중급', per: '주 4일', days: [
      { l: '상1', t: '상체 · 무겁게', ex: [['fw-bench', '4×6'], ['fw-bbrow', '4×6'], ['fw-ohp', '3×8'], ['lf-pulldown', '3×10'], ['fw-bbcurl', '2×10'], ['cb-pushdown', '2×10']] },
      { l: '하1', t: '하체 · 무겁게', ex: [['fw-squat', '4×6'], ['fw-rdl', '3×8'], ['lf-legpress', '3×10'], ['tg-legcurl', '3×10'], ['mx-calf', '3×12']] },
      { l: '상2', t: '상체 · 볼륨', ex: [['fw-incline-db', '3×10'], ['cb-row', '3×10'], ['fw-db-ohp', '3×10'], ['cb-cross', '3×12'], ['fw-lateral', '3×15'], ['fw-hammer', '3×12'], ['fw-ohext', '3×12']] },
      { l: '하2', t: '하체 · 볼륨', ex: [['fw-deadlift', '3×5'], ['fw-bss', '3×10'], ['hs-legext', '3×12'], ['lf-lyingcurl', '3×12'], ['mx-calf', '3×15'], ['fw-hangleg', '3×12']] }],
    desc: '상체·하체를 주 2번씩. 부위당 주 2회 빈도로 근력과 근비대를 같이 챙기는 무난한 분할.',
    note: '무거운 날은 2–3회 여유(RIR 2–3)를 남기고, 볼륨 날은 1–2회 여유까지.' },
  { id: 'ppl', name: '레딧 PPL 6일', who: 'Metallicadpa · r/Fitness', lv: '초중급', per: '주 6일', days: [
      { l: '당A', t: '당기기 A', ex: [['fw-deadlift', '1×5+'], ['lf-pulldown', '3×8–12'], ['cb-row', '3×8–12'], ['cb-facepull', '5×15–20'], ['fw-hammer', '4×8–12'], ['fw-dbcurl', '4×8–12']] },
      { l: '밀A', t: '밀기 A', ex: [['fw-bench', '5×5+'], ['fw-ohp', '3×8–12'], ['fw-incline-db', '3×8–12'], ['cb-pushdown', '3×8–12'], ['fw-ohext', '3×8–12'], ['fw-lateral', '3×15–20']] },
      { l: '하A', t: '하체', ex: [['fw-squat', '3×5+'], ['fw-rdl', '3×8–12'], ['lf-legpress', '3×8–12'], ['tg-legcurl', '3×8–12'], ['mx-calf', '5×8–12']] },
      { l: '당B', t: '당기기 B', ex: [['fw-bbrow', '5×5+'], ['lf-pulldown', '3×8–12'], ['cb-row', '3×8–12'], ['cb-facepull', '5×15–20'], ['fw-hammer', '4×8–12'], ['fw-dbcurl', '4×8–12']] },
      { l: '밀B', t: '밀기 B', ex: [['fw-ohp', '5×5+'], ['fw-bench', '3×8–12'], ['fw-incline-db', '3×8–12'], ['cb-pushdown', '3×8–12'], ['fw-ohext', '3×8–12'], ['fw-lateral', '3×15–20']] },
      { l: '하B', t: '하체', ex: [['fw-squat', '3×5+'], ['fw-rdl', '3×8–12'], ['lf-legpress', '3×8–12'], ['tg-legcurl', '3×8–12'], ['mx-calf', '5×8–12']] }],
    desc: '당기기·밀기·하체를 두 바퀴, 주 6일. 레딧 r/Fitness에서 유명해진 초중급 PPL.',
    note: '"5+"는 마지막 세트를 할 수 있는 만큼(AMRAP). 메인 종목은 매번 +2.5kg(데드 +5kg), 보조 종목은 범위 위쪽 횟수를 채우면 증량.' },
  { id: 'phul', name: 'PHUL 4일', who: 'Brandon Campbell', lv: '중급', per: '주 4일', days: [
      { l: '파상', t: '파워 상체', ex: [['fw-bench', '3×3–5'], ['fw-incline-db', '3×6–10'], ['fw-bbrow', '3×3–5'], ['lf-pulldown', '3×6–10'], ['fw-ohp', '2×5–8'], ['fw-bbcurl', '2×6–10'], ['fw-skull', '2×6–10']] },
      { l: '파하', t: '파워 하체', ex: [['fw-squat', '3×3–5'], ['fw-deadlift', '3×3–5'], ['lf-legpress', '3×10–15'], ['tg-legcurl', '3×6–10'], ['mx-calf', '4×6–10']] },
      { l: '근상', t: '근비대 상체', ex: [['fw-incline-bb', '3×8–12'], ['fw-db-fly', '3×8–12'], ['cb-row', '3×8–12'], ['fw-dbrow', '3×8–12'], ['fw-lateral', '3×8–12'], ['fw-dbcurl', '3×8–12'], ['cb-pushdown', '3×8–12']] },
      { l: '근하', t: '근비대 하체', ex: [['fw-front', '3×8–12'], ['fw-lunge', '3×8–12'], ['hs-legext', '3×10–15'], ['lf-lyingcurl', '3×10–15'], ['mx-calf', '4×8–12']] }],
    desc: 'Power Hypertrophy Upper Lower. 주 2일은 무겁게(근력), 2일은 가볍고 많이(근비대).',
    note: '파워 날은 3–5회로 무겁게, 근비대 날은 8–12회. 범위 위쪽 횟수를 모든 세트에서 채우면 증량.' },
  { id: 'bbb', name: '5/3/1 BBB', who: 'Jim Wendler', lv: '중급', per: '주 4일', days: [
      { l: '1', t: '오버헤드 프레스', ex: [['fw-ohp', '5/3/1'], ['fw-ohp', '5×10'], ['fw-chinup', '5×10']] },
      { l: '2', t: '데드리프트', ex: [['fw-deadlift', '5/3/1'], ['fw-deadlift', '5×10'], ['fw-hangleg', '5×10']] },
      { l: '3', t: '벤치프레스', ex: [['fw-bench', '5/3/1'], ['fw-bench', '5×10'], ['fw-dbrow', '5×10']] },
      { l: '4', t: '스쿼트', ex: [['fw-squat', '5/3/1'], ['fw-squat', '5×10'], ['tg-legcurl', '5×10']] }],
    desc: 'Boring But Big. 하루 메인 1종목을 퍼센트로 올리고, 같은 종목 5×10으로 볼륨을 채워요. 4주 사이클.',
    note: '기준 무게(TM) = 1RM의 90%. 메인 세트: 1주 65·75·85%×5, 2주 70·80·90%×3, 3주 75·85·95%×5·3·1, 4주 디로딩. 5×10은 TM의 50–60%. 사이클마다 TM 상체 +2.5kg, 하체 +5kg.' },
  { id: 'phat', name: 'PHAT 5일', who: 'Layne Norton', lv: '중상급', per: '주 5일', days: [
      { l: '파상', t: '파워 상체', ex: [['fw-bbrow', '3×3–5'], ['fw-pullup', '2×6–10'], ['lf-pulldown', '2×6–10'], ['fw-db-bench', '3×3–5'], ['fw-dips', '2×6–10'], ['fw-db-ohp', '3×6–10'], ['fw-bbcurl', '3×6–10'], ['fw-skull', '3×6–10']] },
      { l: '파하', t: '파워 하체', ex: [['fw-squat', '3×3–5'], ['hs-hack', '2×6–10'], ['hs-legext', '2×6–10'], ['fw-rdl', '3×5–8'], ['lf-lyingcurl', '2×6–10'], ['mx-calf', '3×6–10']] },
      { l: '등어', t: '등 · 어깨 근비대', ex: [['fw-bbrow', '4×8–10'], ['lf-pulldown', '3×8–12'], ['cb-row', '3×8–12'], ['fw-dbrow', '2×12–15'], ['fw-db-ohp', '3×8–12'], ['fw-lateral', '3×12–20']] },
      { l: '하체', t: '하체 근비대', ex: [['fw-squat', '4×8–10'], ['hs-hack', '3×8–12'], ['lf-legpress', '2×12–15'], ['hs-legext', '3×15–20'], ['fw-rdl', '3×8–12'], ['lf-lyingcurl', '2×12–15'], ['tg-legcurl', '2×15–20'], ['mx-calf', '4×10–15']] },
      { l: '가팔', t: '가슴 · 팔 근비대', ex: [['fw-db-bench', '4×8–10'], ['fw-incline-db', '3×8–12'], ['lf-chest-press', '3×12–15'], ['cb-cross', '2×15–20'], ['nt-preacher', '3×8–12'], ['fw-dbcurl', '2×12–15'], ['fw-skull', '3×8–12'], ['cb-pushdown', '2×12–15']] }],
    desc: 'Power Hypertrophy Adaptive Training. 앞 2일은 상·하체를 무겁게(3–5회), 뒤 3일은 부위별로 볼륨을 크게. PHUL보다 볼륨이 많아요.',
    note: '근비대 날 첫 종목은 파워 날 무게의 약 85%로. 주 5일, 3일째와 7일째 휴식. 종목은 같은 동작의 다른 기구로 바꿔도 돼요.' },
  { id: 'gvt', name: '독일식 볼륨 트레이닝', who: 'Charles Poliquin · GVT', lv: '중급', per: '주 3일', days: [
      { l: '가등', t: '가슴 · 등', ex: [['fw-bench', '10×10'], ['fw-bbrow', '10×10'], ['cb-cross', '3×10'], ['lf-pulldown', '3×10']] },
      { l: '하체', t: '하체 · 복근', ex: [['fw-squat', '10×10'], ['lf-lyingcurl', '10×10'], ['mx-calf', '3×10'], ['fw-hangleg', '3×10']] },
      { l: '팔어', t: '팔 · 어깨', ex: [['fw-bench', '10×6'], ['fw-bbcurl', '10×6'], ['fw-lateral', '3×6'], ['fw-reardelt', '3×6']] }],
    desc: '메인 종목을 10세트×10회로. 두 종목을 번갈아(슈퍼세트) 하고 사이 휴식은 60–90초. 4–6주 하고 디로딩.',
    note: '10×10은 1RM의 약 60%로 시작해 매주 약 2%씩 올려요. 10회를 다 못 채우는 세트가 나와도 무게는 유지. 팔 날 벤치는 좁게 잡는 클로즈그립으로.' },
  { id: 'regpark', name: '레그 파크 5×5', who: '레그 파크 · 선수 루틴', lv: '입문', per: '주 3일', days: [
      { l: 'A', t: '전신 A', ex: [['fw-squat', '5×5'], ['fw-chinup', '5×5'], ['fw-bench', '5×5'], ['fw-bbcurl', '2×10'], ['mx-calf', '2×15–20']] },
      { l: 'B', t: '전신 B', ex: [['fw-front', '5×5'], ['fw-bbrow', '5×5'], ['fw-ohp', '5×5'], ['fw-deadlift', '3×5'], ['mx-calf', '2×15–20']] }],
    desc: '아놀드가 롤모델로 꼽은 미스터 유니버스 레그 파크의 초보 전신 루틴. A·B를 번갈아 주 3회(1주 A-B-A, 2주 B-A-B).',
    note: '5×5에서 앞 2세트는 워밍업, 뒤 3세트가 5회 최대 무게예요. 손목·전완 운동(2×10)도 원래 구성에 있어요.' },
  { id: 'coleman', name: '로니 콜먼 6일', who: '로니 콜먼 · 선수 루틴', lv: '상급', per: '주 6일', days: [
      { l: '등이어', t: '등 · 이두 · 어깨', ex: [['fw-deadlift', '4×6–12'], ['fw-bbrow', '4×10–12'], ['fw-landmine', '3×10–12'], ['fw-dbrow', '3×10–12'], ['fw-bbcurl', '4×12'], ['nt-preacher', '3×12'], ['fw-ohp', '4×10–12'], ['fw-lateral', '3×12']] },
      { l: '하체', t: '하체', ex: [['fw-squat', '6×2–12'], ['lf-legpress', '4×10–12'], ['fw-lunge', '2×길게'], ['fw-rdl', '3×10–12'], ['lf-lyingcurl', '3×10–12']] },
      { l: '가삼', t: '가슴 · 삼두 · 종아리', ex: [['fw-bench', '5×5–12'], ['fw-incline-bb', '3×10–12'], ['hs-decline', '3×10–12'], ['fw-db-fly', '3×12'], ['fw-skull', '4×12'], ['fw-ohext', '3×12'], ['mx-calf', '4×12–15']] }],
    desc: '미스터 올림피아 8연패. 등·이두·어깨 / 하체 / 가슴·삼두를 주 2바퀴.',
    note: '분할(주 6일, 2바퀴)은 잘 알려진 구성이고, 하체 날 종목은 공개된 프로그램 기준이에요. 나머지 날 종목은 그가 자주 한 운동으로 만든 대표 예시예요. 볼륨이 매우 커서 상급자용.' },
  { id: 'haney', name: '리 헤이니 3분할', who: '리 헤이니 · 선수 루틴', lv: '중상급', per: '3일 운동 · 1일 휴식', days: [
      { l: '가팔', t: '가슴 · 팔', ex: [['fw-bench', '4×6–8'], ['fw-db-bench', '3×8–10'], ['fw-incline-bb', '4×6–8'], ['fw-incline-db', '3×8–10'], ['fw-bbcurl', '4×8–10'], ['nt-preacher', '4×8–10'], ['cb-pushdown', '4×10–12'], ['fw-skull', '4×6–8']] },
      { l: '하체', t: '하체', ex: [['hs-legext', '4×12–15'], ['lf-legpress', '4×10–12'], ['fw-squat', '4×8–10'], ['fw-rdl', '3×8–10'], ['mx-calf', '6×15–20']] },
      { l: '등어', t: '등 · 어깨', ex: [['lf-pulldown', '4×8–10'], ['fw-bbrow', '4×6–8'], ['cb-row', '4×8–10'], ['fw-ohp', '4×6–8'], ['fw-lateral', '4×8–10'], ['cy-abcrunch', '4×15–20']] }],
    desc: '미스터 올림피아 8연패. "자극하되 망가뜨리지 마라(Stimulate, don\'t annihilate)" — 3일 운동, 1일 휴식을 반복.',
    note: '원래는 종아리·복근을 매일 했어요. 요일 대신 3일 하고 하루 쉬는 순환이라 앱의 "다음 차례"를 따라가면 돼요.' },
  { id: 'mentzer', name: '마이크 멘처 헤비듀티', who: '마이크 멘처 · Heavy Duty II', lv: '중급', per: '7–10일에 1회', days: [
      { l: 'A', t: '하체 · 등', ex: [['fw-squat', '1×8–15'], ['lf-pulldown', '1×6–10']] },
      { l: 'B', t: '후면 · 가슴 · 삼두', ex: [['fw-deadlift', '1×5–8'], ['fw-dips', '1×6–10']] }],
    desc: '극단적으로 적은 볼륨: 워밍업 후 실패 지점까지 단 1세트, 운동 사이 7–10일 휴식. 멘처의 말기 "통합(Consolidated)" 루틴.',
    note: '워밍업 1–3세트는 실패 근처까지 가지 않게. 매번 강해지지 않으면 휴식을 10–14일로 늘리라고 했어요. 연구 근거(주 10세트 이상)와는 정반대 철학이라 비교용으로 넣었어요.' },
  { id: 'fst7', name: 'FST-7 5분할', who: '하니 램보드 · 트레이너 루틴', lv: '중상급', per: '주 5일', days: [
      { l: '가슴', t: '가슴', ex: [['fw-bench', '3×6–8'], ['fw-incline-db', '3×8–12'], ['lf-chest-press', '3×8–12'], ['tg-pecdeck', '7×12–15']] },
      { l: '등', t: '등', ex: [['fw-pullup', '3×6–8'], ['fw-bbrow', '3×8–12'], ['fw-dbrow', '3×8–12'], ['lf-pulldown', '7×12–15']] },
      { l: '하체', t: '하체', ex: [['fw-squat', '3×6–8'], ['fw-rdl', '3×6–8'], ['lf-legpress', '3×8–12'], ['hs-legext', '7×12–15'], ['tg-legcurl', '7×12–15']] },
      { l: '어깨', t: '어깨', ex: [['fw-ohp', '3×6–8'], ['fw-db-ohp', '3×8–12'], ['cb-facepull', '3×8–12'], ['fw-lateral', '7×12–15']] },
      { l: '팔', t: '팔', ex: [['fw-dips', '3×6–8'], ['fw-bbcurl', '3×6–8'], ['nt-preacher', '3×8–12'], ['fw-skull', '3×8–12'], ['cb-curl', '7×12–15'], ['cb-pushdown', '7×12–15']] }],
    desc: '제이 커틀러·필 히스를 미스터 올림피아로 만든 트레이너의 방식. 부위마다 무거운 종목 2–3개 뒤, 마지막 종목을 7세트·짧은 휴식으로 마무리해요.',
    note: '마지막 "7×"가 FST-7: 세트 사이 30–45초만 쉬고 8–15회. 램보드는 처음엔 1–2부위에만 쓰고, 초보는 레그 익스텐션 같은 고립 운동으로 하라고 했어요. 근육통이 4–5일 가면 줄이세요. 부위별 종목은 공개된 예시 기준이에요.' },
  { id: 'y3t', name: 'Y3T (Yoda 3 Training)', who: '닐 힐 · 트레이너 루틴', lv: '상급', per: '3주 사이클 · 주 3–5일', days: [
      { l: '1주', t: '1주차 · 상체 (무겁게)', ex: [['fw-incline-db', '3×6–10'], ['fw-bench', '3×6–10'], ['fw-bbrow', '3×6–10'], ['lf-pulldown', '3×6–10'], ['fw-ohp', '3×6–10'], ['fw-bbcurl', '2×6–10'], ['fw-dips', '2×6–10']] },
      { l: '1주', t: '1주차 · 하체 (무겁게)', ex: [['fw-squat', '4×6–10'], ['hs-hack', '3×6–10'], ['fw-rdl', '3×6–10'], ['lf-lyingcurl', '3×6–10'], ['mx-calf', '3×8–10']] },
      { l: '2주', t: '2주차 · 상체 (중간)', ex: [['fw-incline-db', '3×8–12'], ['cb-cross', '3×12–15'], ['hs-row', '3×8–12'], ['fw-dbrow', '3×8–12'], ['fw-db-ohp', '3×8–12'], ['fw-lateral', '3×12–15'], ['fw-dbcurl', '3×10–12'], ['cb-pushdown', '3×10–12']] },
      { l: '2주', t: '2주차 · 하체 (중간)', ex: [['hs-legext', '3×12–15'], ['lf-legpress', '3×8–12'], ['fw-lunge', '3×10–12'], ['tg-legcurl', '3×10–12'], ['fw-rdl', '3×8–12'], ['mx-calf', '4×12–15']] },
      { l: '3주', t: '3주차 · 상체 (고반복·드롭)', ex: [['fw-incline-db', '4×15–20'], ['fw-smith-bench', '4×15–20'], ['cb-cross', '2×15–20'], ['hs-row', '4×15–20'], ['lf-pulldown', '2×15–20'], ['fw-lateral', '3×20–25'], ['fw-reardelt', '4×20–25'], ['cb-pushdown', '3×20–25'], ['cb-curl', '3×20–25']] },
      { l: '3주', t: '3주차 · 하체 (고반복·드롭)', ex: [['hs-legext', '4×20–25'], ['lf-legpress', '3×25–30'], ['fw-lunge', '2×20–30'], ['fw-squat', '2×20–25'], ['fw-rdl', '3×20–25'], ['mx-calf', '3×20–30']] }],
    desc: '플렉스 루이스(212 올림피아 5연패)의 코치 닐 힐의 방식. 3주를 한 사이클로 1주차 무겁게 → 2주차 중간 → 3주차 가볍게 실패·드롭세트까지 바꿔가며 해요.',
    note: '3주 × 3 = 9주 후 5–7일 휴식. 3주차는 드롭세트·레스트포즈로 20회를 훌쩍 넘기는 게 특징이에요. 원래는 부위별 분할이라 여기선 상·하체로 묶어 옮겼고, 3주차 종목은 공개된 예시, 1·2주차 반복 범위는 흔히 소개되는 값이에요.' },
  { id: 'arnold', name: '아놀드 스플릿', who: '아놀드 슈워제네거 · 선수 루틴', lv: '중상급', per: '주 6일', days: [
      { l: '가등', t: '가슴 · 등', ex: [['fw-bench', '4×8–12'], ['fw-incline-bb', '4×8–12'], ['fw-db-fly', '4×10–12'], ['fw-pullup', '4×최대'], ['fw-bbrow', '4×8–12'], ['fw-landmine', '4×8–12']] },
      { l: '어팔', t: '어깨 · 팔', ex: [['fw-ohp', '4×8–12'], ['fw-lateral', '4×10–12'], ['fw-reardelt', '4×10–12'], ['fw-bbcurl', '4×8–12'], ['fw-dbcurl', '4×8–12'], ['fw-skull', '4×8–12'], ['cb-pushdown', '4×10–12']] },
      { l: '하체', t: '하체 · 복근', ex: [['fw-squat', '4×8–12'], ['fw-lunge', '4×10'], ['lf-lyingcurl', '4×10–12'], ['fw-rdl', '4×8–12'], ['mx-calf', '4×15'], ['cy-abcrunch', '4×15']] }],
    desc: '아놀드가 현역 때 쓴 분할 방식(가슴·등 / 어깨·팔 / 하체를 주 2바퀴). 길항근(가슴↔등)을 같은 날 묶는 게 특징.',
    note: '분할 방식은 아놀드의 것이지만, 종목 구성은 그 방식을 요즘 헬스장 기구로 옮긴 대표 예시예요. 볼륨이 커서 초보에겐 무리일 수 있어요.' },
  { id: 'yates', name: '도리안 예이츠 HIT', who: '도리안 예이츠 · 선수 루틴', lv: '중상급', per: '주 4일', days: [
      { l: '가이', t: '가슴 · 이두', ex: [['hs-incline', '1×6–10'], ['fw-incline-db', '1×6–10'], ['tg-pecdeck', '1×8–10'], ['nt-preacher', '1×6–8'], ['fw-dbcurl', '1×6–8']] },
      { l: '하체', t: '하체', ex: [['hs-legext', '1×10–12'], ['lf-legpress', '1×8–10'], ['hs-hack', '1×8–10'], ['lf-lyingcurl', '1×8–10'], ['fw-rdl', '1×8–10'], ['mx-calf', '1×10–12']] },
      { l: '어삼', t: '어깨 · 삼두', ex: [['hs-shoulder', '1×6–8'], ['fw-lateral', '1×8–10'], ['fw-reardelt', '1×8–10'], ['cb-pushdown', '1×8–10'], ['fw-ohext', '1×8–10']] },
      { l: '등', t: '등 · 후면 어깨', ex: [['nt-pullover', '1×8–10'], ['lf-pulldown', '1×6–8'], ['hs-row', '1×6–8'], ['fw-bbrow', '1×6–8'], ['fw-deadlift', '1×6–8']] }],
    desc: '미스터 올림피아 6연패 도리안 예이츠의 "Blood & Guts" 방식. 종목당 워밍업 후 실패 지점까지 1세트만.',
    note: '"1×"는 워밍업을 뺀 본세트 1개를 한계까지 한다는 뜻이에요. 강도가 매우 높아 회복 관리가 중요하고, 종목 구성은 그의 방식을 따른 대표 예시예요.' },
];
