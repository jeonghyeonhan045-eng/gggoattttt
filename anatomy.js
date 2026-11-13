/* 오운완 — body map: which muscles each exercise trains, and a front/back anatomy drawing coloured by weekly work.
   Regions are finer than the six analysis groups. Weights: 1 = main mover, 0.5 = strong helper, 0.25 = minor helper. */
'use strict';

const REGIONS = {
  chestU: '윗가슴', chestL: '가슴 중·하부', deltF: '앞어깨', deltS: '옆어깨', deltR: '뒤어깨',
  traps: '승모근(위)', midback: '등 중앙', lats: '광배 위·바깥', latsL: '광배 아래', lowback: '허리(기립근)', serratus: '옆갈비(전거근)',
  biceps: '이두', triceps: '삼두', forearm: '전완',
  abs: '복근', oblique: '옆구리(복사근)',
  glutes: '엉덩이', gluteMed: '엉덩이 옆(중둔근)', quads: '허벅지 앞', hams: '허벅지 뒤', adduct: '허벅지 안쪽', calves: '종아리',
};

// movement pattern → regions
const TYPE_REG = {
  '벤치프레스': { chestL: 1, chestU: 0.5, deltF: 0.5, triceps: 0.5 },
  '인클라인 프레스': { chestU: 1, chestL: 0.25, deltF: 0.5, triceps: 0.5 },
  '체스트 프레스': { chestL: 1, chestU: 0.5, deltF: 0.5, triceps: 0.5 },
  '펙 플라이': { chestL: 1, chestU: 0.5, deltF: 0.25 },
  '딥스': { chestL: 1, triceps: 0.5, deltF: 0.5 },
  '푸시업': { chestL: 1, chestU: 0.25, triceps: 0.5, deltF: 0.5, abs: 0.25 },
  '랫 풀다운': { lats: 1, midback: 0.5, biceps: 0.5, deltR: 0.25, forearm: 0.25 },
  '풀업': { lats: 1, midback: 0.5, biceps: 0.5, forearm: 0.25 },
  '로우': { midback: 1, lats: 0.5, deltR: 0.5, biceps: 0.5, traps: 0.25, forearm: 0.25 },
  '풀오버': { lats: 1, chestL: 0.5, triceps: 0.25 },
  '숄더 프레스': { deltF: 1, deltS: 0.75, deltR: 0.25, triceps: 0.5, traps: 0.25 }, // Campos 2020: press ≈ lateral raise for the side delt
  '레터럴 레이즈': { deltS: 1, traps: 0.25 },
  '리어 델트': { deltR: 1, midback: 0.5, traps: 0.25 },
  '슈러그': { traps: 1, forearm: 0.25 },
  '바이셉 컬': { biceps: 1, forearm: 0.5 },
  '트라이셉 익스텐션': { triceps: 1 },
  '트라이셉 딥': { triceps: 1, chestL: 0.5, deltF: 0.25 },
  '스쿼트': { quads: 1, glutes: 0.5, adduct: 0.5, lowback: 0.25, abs: 0.25, calves: 0.25 },
  '레그 프레스': { quads: 1, glutes: 0.5, adduct: 0.25, calves: 0.25 },
  '런지': { quads: 1, glutes: 1, adduct: 0.25, hams: 0.25, calves: 0.25 },
  '레그 익스텐션': { quads: 1 },
  '레그 컬': { hams: 1, calves: 0.25 },
  '데드리프트': { hams: 1, glutes: 1, lowback: 1, traps: 0.5, quads: 0.5, forearm: 0.5, lats: 0.25 },
  '루마니안 데드리프트': { hams: 1, glutes: 1, lowback: 0.5, forearm: 0.25 },
  '힙 쓰러스트': { glutes: 1, hams: 0.5, quads: 0.25 },
  '힙 익스텐션': { glutes: 1, hams: 0.5 },
  '힙 어브덕션': { glutes: 1 },
  '힙 어덕션': { adduct: 1 },
  '카프 레이즈': { calves: 1 },
  '복근 크런치': { abs: 1, oblique: 0.25 },
  '레그 레이즈': { abs: 1, oblique: 0.25 },
  '코어 로테이션': { oblique: 1, abs: 0.5 },
  '백 익스텐션': { lowback: 1, glutes: 0.5, hams: 0.5 },
  '케틀벨 스윙': { glutes: 1, hams: 1, lowback: 0.5, forearm: 0.25 },
  '기능성 전신': { quads: 0.5, glutes: 0.5, abs: 0.5, deltF: 0.25 },
  '캐리': { forearm: 1, traps: 1, abs: 0.5, oblique: 0.5 },
  '클린': { quads: 1, glutes: 1, hams: 0.5, traps: 1, lowback: 0.5, deltF: 0.25 },
  '스내치': { quads: 1, glutes: 1, hams: 0.5, traps: 1, deltS: 0.5, lowback: 0.5 },
  '클린 앤 저크': { quads: 1, glutes: 1, traps: 0.5, deltF: 0.5, triceps: 0.5, lowback: 0.5 },
  '쓰러스터': { quads: 1, glutes: 0.5, deltF: 1, triceps: 0.5 },
  '월볼': { quads: 1, glutes: 0.5, deltF: 0.5 },
  '박스 점프': { quads: 1, glutes: 0.5, calves: 0.5 },
  '버피': { chestL: 0.5, quads: 0.5, deltF: 0.25, abs: 0.25 },
  '줄넘기': { calves: 1, quads: 0.25 },
  '토투바': { abs: 1, oblique: 0.5, lats: 0.5, forearm: 0.5 },
  '머슬업': { lats: 1, chestL: 0.5, triceps: 0.5, biceps: 0.5 },
  '핸드스탠드 푸시업': { deltF: 1, triceps: 0.5, traps: 0.25 },
  '로프 클라임': { lats: 1, biceps: 1, forearm: 1 },
};

/* Fine-tune from the exercise's own name (works for exercises people add themselves).
   Each rule: [name pattern, regions to add or override]. */
const NAME_REG = [
  [/(인클라인|incline)(?!.*(컬|curl|리어|rear|로우|row))|상부\s*가슴|윗\s*가슴/i, { chestU: 1, chestL: 0.25 }],
  [/디클라인|decline/i, { chestL: 1, chestU: 0 }],
  [/클로즈\s*그립|close\s*grip|내로우\s*그립/i, { triceps: 1 }],
  [/해머\s*컬|hammer\s*curl|리버스\s*컬|reverse\s*curl/i, { forearm: 1, biceps: 0.5 }],
  [/리스트|wrist|전완|forearm|그립\s*(트레이너|강화)|grip\s*trainer/i, { forearm: 1, biceps: 0 }],
  [/하이\s*로우|high\s*row/i, { lats: 1, midback: 0.5, deltR: 0.5 }],
  [/로우\s*로우|low\s*row/i, { lats: 1, midback: 1 }],
  [/페이스\s*풀|face\s*pull/i, { deltR: 1, midback: 0.5, traps: 0.5 }],
  [/업라이트|upright/i, { deltS: 1, traps: 1 }],
  [/프론트\s*레이즈|front\s*raise/i, { deltF: 1, deltS: 0, traps: 0 }],
  [/아놀드\s*프레스|arnold/i, { deltF: 1, deltS: 0.5 }],
  [/오버헤드.*익스텐션|overhead.*ext|프렌치/i, { triceps: 1 }],
  [/불가리안|bulgarian|스플릿\s*스쿼트|스텝\s*업|step.?up/i, { quads: 1, glutes: 1, adduct: 0.25 }],
  [/스모|sumo|와이드\s*스쿼트/i, { adduct: 1, glutes: 1 }],
  [/핵\s*스쿼트|hack|펜듈럼|pendulum|브이\s*스쿼트|v.?squat/i, { quads: 1, glutes: 0.5 }],
  [/시티드.*컬|seated.*curl/i, { hams: 1 }],
  [/노르딕|nordic|글루트\s*햄|ghr/i, { hams: 1, glutes: 0.5 }],
  [/킥\s*백.*(엉덩|글루트|힙|cable|케이블)|글루트\s*킥|glute\s*kick/i, { glutes: 1, hams: 0.25 }],
  [/트위스트|twist|우드\s*찹|wood\s*chop|사이드\s*벤드|side\s*bend|사이드\s*플랭크/i, { oblique: 1, abs: 0.25 }],
  [/플랭크|plank|롤\s*아웃|rollout|ab\s*wheel/i, { abs: 1, oblique: 0.5 }],
  [/굿\s*모닝|good\s*morning/i, { hams: 1, lowback: 1, glutes: 0.5 }],
  [/랙\s*풀|rack\s*pull/i, { lowback: 1, traps: 1, glutes: 0.5, hams: 0.5 }],
  [/티\s*바|t.?bar|랜드마인\s*로우/i, { midback: 1, lats: 1 }],
  [/풀\s*다운|pull.?down/i, { lats: 1 }],
  [/스트레이트\s*암|straight.?arm/i, { lats: 1, triceps: 0.25, biceps: 0 }],
];

// the six analysis groups each region belongs to (to fall back on when a type is unknown)
const GROUP_REG = { 가슴: { chestL: 1, chestU: 0.5 }, 등: { lats: 1, midback: 1 }, 어깨: { deltF: 0.5, deltS: 1, deltR: 0.5 }, 팔: { biceps: 1, triceps: 1 }, 다리: { quads: 1, hams: 0.5, glutes: 0.5 }, 코어: { abs: 1, oblique: 0.5 }, 전신: { quads: 0.5, glutes: 0.5, abs: 0.5 } };

/* grips: same machine, different emphasis. Values replace the pattern's default map.
   Back: Lusk 2010 (pronated > supinated for lats on pulldowns; width made little difference),
   Padovan 2025 (seated row: narrow → more lats, wide → more trapezius and side delts). Press/curl: common mechanics. */
const GRIP_ICON = {
  wide: '<path d="M2 12h32"/><rect x="3" y="6" width="5" height="6" rx="2"/><rect x="28" y="6" width="5" height="6" rx="2"/>',
  mid: '<path d="M2 12h32"/><rect x="9" y="6" width="5" height="6" rx="2"/><rect x="22" y="6" width="5" height="6" rx="2"/>',
  close: '<path d="M2 12h32"/><rect x="12" y="6" width="5" height="6" rx="2"/><rect x="19" y="6" width="5" height="6" rx="2"/>',
  under: '<path d="M2 9h32"/><rect x="9" y="9" width="5" height="6" rx="2"/><rect x="22" y="9" width="5" height="6" rx="2"/>',
  neutral: '<path d="M18 3v4M18 7l-5 9M18 7l5 9"/><rect x="10" y="12" width="5" height="6" rx="2" transform="rotate(90 12.5 15)"/><rect x="21" y="12" width="5" height="6" rx="2" transform="rotate(90 23.5 15)"/>',
  hammer: '<rect x="8" y="4" width="4" height="14" rx="1.5"/><rect x="24" y="4" width="4" height="14" rx="1.5"/><path d="M5 11h10M21 11h10"/>',
  reverse: '<path d="M2 12h32"/><rect x="9" y="6" width="5" height="6" rx="2"/><rect x="22" y="6" width="5" height="6" rx="2"/><path d="M11 4l2-2M24 4l2-2"/>',
};
const GRIPS = {
  lat: [
    ['wide', '와이드 오버', { lats: 1, midback: 0.5, traps: 0.25, deltR: 0.25, biceps: 0.25, forearm: 0.25 }, '어깨보다 넓게, 손등이 위. 광배근 위주(위·바깥쪽 등 넓이).'],
    ['mid', '어깨너비 오버', null, '기본 그립. 광배근 + 이두.'],
    ['neutral', 'V바 · 뉴트럴', { lats: 1, midback: 0.5, biceps: 0.5, deltR: 0.25, forearm: 0.25 }, '손바닥이 마주 보게. 팔꿈치가 몸 옆으로 내려와 광배 아래쪽·등 중앙.'],
    ['under', '언더핸드', { lats: 1, midback: 0.5, biceps: 0.5, deltR: 0.25, forearm: 0.25 }, '손바닥이 나를 향하게. 연구에선 오버핸드보다 광배 활성이 조금 낮았고, 이두는 생각보다 차이가 없었어요.'],
  ],
  row: [
    ['wide', '와이드 (팔꿈치 벌림)', { midback: 1, traps: 0.75, deltR: 0.75, deltS: 0.25, lats: 0.25, biceps: 0.5, forearm: 0.25 }, '팔꿈치를 옆으로 벌려 당기기. 승모·등 중앙·뒤어깨 위주(등 두께).'],
    ['mid', '어깨너비', null, '기본 그립. 등 중앙 + 광배.'],
    ['neutral', '클로즈 · V바', { lats: 1, midback: 0.75, biceps: 0.5, deltR: 0.25, traps: 0.25, forearm: 0.25 }, '좁게, 팔꿈치를 옆구리에 붙여 당기기. 광배근 활성이 더 컸어요.'],
    ['under', '언더핸드', { lats: 1, midback: 0.5, biceps: 0.75, deltR: 0.25, forearm: 0.25 }, '손바닥이 위. 팔꿈치가 몸에 붙어 광배 아래쪽·이두가 더 쓰여요.'],
  ],
  press: [
    ['wide', '와이드', { chestL: 1, chestU: 0.25, deltF: 0.5, triceps: 0.25 }, '넓게 잡으면 가슴 비중이 커지고 팔(삼두) 비중이 줄어요. 어깨가 불편하면 피하세요.'],
    ['mid', '기본', null, '팔꿈치 각도 45–60°의 기본 그립.'],
    ['close', '클로즈', { triceps: 1, chestL: 0.75, chestU: 0.25, deltF: 0.5 }, '어깨너비보다 좁게. 삼두 비중이 커져요.'],
  ],
  curl: [
    ['under', '언더 (기본)', null, '손바닥이 위. 이두 위주.'],
    ['hammer', '해머 · 뉴트럴', { biceps: 1, forearm: 1 }, '손바닥이 마주 보게. 상완요골근(팔뚝 바깥)과 상완근을 더 써요.'],
    ['reverse', '리버스 (오버)', { forearm: 1, biceps: 0.5 }, '손등이 위. 팔뚝(전완) 위주, 이두 비중은 줄어요.'],
  ],
};
function gripGroup(type, name) {
  if (/해머|hammer|리버스\s*컬|reverse\s*curl|친업|chin/i.test(name || '')) return null; // grip is in the exercise itself
  if (type === '랫 풀다운' || type === '풀업') return 'lat';
  if (type === '로우') return 'row';
  if (type === '벤치프레스' || type === '체스트 프레스' || type === '인클라인 프레스') return 'press';
  if (type === '바이셉 컬') return 'curl';
  return null;
}
/* finer split on top of the maps above: lats upper/outer vs lower, glute side (medius), serratus */
function refineRegions(out, name, type, grip) {
  const n = name || '';
  if (out.lats) {
    const v = out.lats;
    // elbows down by the sides (narrow / neutral / underhand, rows, pullovers, straight-arm) → lower lats;
    // wide overhand pulling from overhead → upper/outer lats
    const low = grip === 'neutral' || grip === 'under' || type === '로우' || type === '풀오버' || /스트레이트\s*암|straight.?arm|로우\s*로우|low\s*row|원암|one.?arm|친업|chin/i.test(n);
    const wide = grip === 'wide' || /와이드|wide/i.test(n);
    out.lats = low ? v * 0.5 : v; out.latsL = low ? v : wide ? v * 0.5 : v * 0.75;
  }
  if (out.glutes) {
    const single = /런지|lunge|불가리안|bulgarian|스플릿|split|스텝\s*업|step.?up|싱글|single|한\s*다리|피스톨|pistol/i.test(n) || type === '런지';
    out.gluteMed = Math.max(out.gluteMed || 0, single ? 0.5 : type === '스쿼트' || type === '힙 쓰러스트' ? 0.25 : 0);
  }
  if (type === '힙 어브덕션') { out.gluteMed = 1; out.glutes = 0.5; }
  if (type === '푸시업' || type === '풀오버' || /인클라인|incline|오버헤드|overhead|펀치|punch/i.test(n) && (type === '인클라인 프레스' || type === '숄더 프레스')) out.serratus = Math.max(out.serratus || 0, type === '풀오버' ? 0.5 : 0.25);
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}
function regionsOf(name, type, m, grip) {
  // a machine added from its muscle sticker keeps exactly what the sticker said
  const cu = typeof DB !== 'undefined' && DB.customEq && DB.customEq.find(c => c.reg && name && (c.name === name || `${c.brand} ${c.name}` === name));
  if (cu) return Object.assign({}, cu.reg);
  const G = grip && GRIPS[gripGroup(type, name)], g = G && G.find(x => x[0] === grip);
  if (g && g[2]) {
    const out = Object.assign({}, g[2]);
    if (type === '인클라인 프레스' || /인클라인|incline/i.test(name || '')) { out.chestU = 1; out.chestL = Math.min(out.chestL || 0, 0.5); }
    return refineRegions(out, name, type, grip);
  }
  const out = Object.assign({}, TYPE_REG[type] || GROUP_REG[m] || {});
  for (const [re, add] of NAME_REG) if (re.test(name || '')) for (const [k, v] of Object.entries(add)) out[k] = v === 0 ? 0 : Math.max(out[k] || 0, v);
  // a curl named for arms (not legs) is a biceps curl
  if (/컬|curl/i.test(name || '') && m === '팔' && !/트라이|tricep|익스텐션|리스트|wrist|리버스|reverse/i.test(name)) { out.biceps = Math.max(out.biceps || 0, 1); }
  return refineRegions(out, name, type, grip);
}

/* muscle names printed on machine stickers (Latin/English, Korean) → regions */
const STICKER_WORDS = [
  [/clavicular|upper\s*chest|upper\s*pec|상부\s*(대흉|가슴)|윗\s*가슴|쇄골/i, ['chestU']],
  [/pectoralis|pecs?\b|chest|대흉근|가슴/i, ['chestL']],
  [/latissimus|lats?\b|teres\s*major|광배|대원근/i, ['lats', 'latsL']],
  [/rhomboid|middle\s*trap|mid(dle)?\s*back|능형|중부\s*승모/i, ['midback']],
  [/trapezius|traps?\b|승모/i, ['traps']],
  [/(anterior|front)\s*delt|전면\s*(삼각|어깨)|앞\s*어깨|전삼각/i, ['deltF']],
  [/(posterior|rear)\s*delt|후면\s*(삼각|어깨)|뒤\s*어깨|후삼각/i, ['deltR']],
  [/(lateral|medial|middle|side)\s*delt|측면\s*(삼각|어깨)|옆\s*어깨|측삼각/i, ['deltS']],
  [/deltoid|delts?\b|shoulder|삼각근|어깨/i, ['deltS']],
  [/biceps(?!\s*femoris)|(?<!대퇴)이두/i, ['biceps']],
  [/triceps|삼두/i, ['triceps']],
  [/brachioradialis|forearm|wrist\s*flexor|전완|팔뚝/i, ['forearm']],
  [/serratus|전거근/i, ['serratus']],
  [/rectus\s*abdominis|abdominals?|abs\b|복직근|(?<!비)복근/i, ['abs']],
  [/obliques?|복사근|옆구리/i, ['oblique']],
  [/erector|spinae|lower\s*back|기립근|척추|허리/i, ['lowback']],
  [/gluteus\s*medius|glute\s*med|abductor|중둔근|외전근/i, ['gluteMed']],
  [/gluteus|glutes?\b|대둔근|둔근|엉덩이/i, ['glutes']],
  [/quadriceps|quads?\b|rectus\s*femoris|vastus|대퇴사두|허벅지\s*앞/i, ['quads']],
  [/hamstrings?|biceps\s*femoris|semitend|햄스트링|대퇴이두|허벅지\s*뒤/i, ['hams']],
  [/adductors?|내전근|허벅지\s*안/i, ['adduct']],
  [/gastrocnemius|soleus|calf|calves|비복근|가자미근|종아리/i, ['calves']],
];
/* read a sticker's text: muscles after "secondary / 보조" count as helpers (0.5), the rest as main (1) */
function regionsFromSticker(text) {
  const t = (text || '').replace(/\n+/g, ' ');
  const cut = t.search(/secondary|synergist|assist|보조\s*(근|근육)?|협력/i);
  const main = cut >= 0 ? t.slice(0, cut) : t, sec = cut >= 0 ? t.slice(cut) : '';
  const out = {};
  const scan = (s, v) => { let rest = s; for (const [re, keys] of STICKER_WORDS) { const g = new RegExp(re.source, 'gi'); if (g.test(rest)) { for (const k of keys) out[k] = Math.max(out[k] || 0, k === 'latsL' && keys.length > 1 ? v * 0.75 : v); rest = rest.replace(g, ' '); } } };
  scan(main, 1); scan(sec, 0.5);
  return out;
}

/* ---------- drawing: original low-poly figure, front and back. Left half drawn, right half mirrored. ---------- */
const BODY_FRONT = {
  traps: [[90, 56, 76, 66, 92, 64]],
  deltF: [[76, 66, 64, 71, 62, 88, 70, 94, 79, 79]],
  deltS: [[64, 71, 56, 79, 55, 97, 62, 88]],
  chestU: [[92, 65, 79, 70, 73, 84, 99, 84, 99, 67]],
  chestL: [[73, 84, 71, 99, 81, 107, 99, 105, 99, 84]],
  biceps: [[56, 99, 53, 106, 52, 127, 60, 134, 67, 126, 69, 103]],
  forearm: [[52, 131, 46, 150, 42, 176, 50, 178, 59, 156, 61, 136]],
  oblique: [[80, 108, 88, 109, 87, 168, 79, 159, 74, 131]],
  serratus: [[71, 100, 80, 107, 77, 121, 72, 117]],
  adduct: [[88, 180, 98, 186, 96, 236, 90, 240, 86, 210]],
  quads: [[76, 168, 88, 180, 86, 210, 90, 240, 85, 263, 72, 263, 66, 231, 66, 196]],
  calves: [[70, 277, 84, 277, 82, 331, 74, 335, 68, 310]],
};
const BODY_FRONT_CENTER = { abs: [[89, 109, 111, 109, 113, 168, 100, 178, 87, 168]] };
const BODY_BACK = {
  traps: [[100, 50, 100, 78, 80, 68, 90, 58]],
  deltR: [[80, 68, 64, 72, 58, 88, 68, 92, 78, 80]],
  deltS: [[64, 72, 56, 80, 56, 96, 58, 88]],
  midback: [[100, 78, 100, 110, 88, 100, 84, 81]],
  lats: [[84, 81, 88, 100, 100, 110, 100, 118, 75, 118, 70, 105, 70, 92]],
  latsL: [[75, 118, 100, 118, 100, 130, 90, 150, 80, 131]],
  triceps: [[58, 94, 54, 104, 54, 128, 62, 134, 68, 118, 68, 98]],
  forearm: [[54, 132, 47, 150, 43, 176, 51, 178, 60, 156, 62, 136]],
  lowback: [[92, 131, 100, 133, 100, 168, 90, 166, 88, 149]],
  glutes: [[100, 170, 100, 207, 84, 211, 76, 197, 80, 186, 92, 176]],
  gluteMed: [[90, 167, 100, 170, 92, 176, 80, 186, 76, 197, 78, 177]],
  hams: [[76, 207, 98, 213, 96, 255, 84, 263, 72, 255, 70, 227]],
  calves: [[72, 273, 86, 273, 88, 301, 82, 327, 74, 327, 68, 301]],
};
const SIL = 'M100 8c-11 0-18 9-18 21 0 9 4 16 9 19l-1 8-14 9-14 7-8 18-2 20-4 22-6 26-4 22 7 2 9-22 7-20 5-22 2-14 4 24 1 28-6 30-3 34 3 34 3 22-2 32 2 26 9 2 4-28 2-34 4-36 3-30 4-26 4 26 3 30 4 36 2 34 4 28 9-2 2-26-2-32 3-22 3-34-3-34-6-30 1-28 4-24 2 14 5 22 7 20 9 22 7-2-4-22-6-26-4-22-2-20-8-18-14-7-14-9-1-8c5-3 9-10 9-19 0-12-7-21-18-21z';

function heatColor(f) {
  // 0 → untouched, then pale orange → red (most worked)
  if (!(f > 0)) return null;
  const stops = [[0, [254, 226, 205]], [0.35, [252, 160, 110]], [0.7, [235, 85, 55]], [1, [200, 25, 35]]];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 1; i < stops.length; i++) if (f <= stops[i][0]) { a = stops[i - 1]; b = stops[i]; break; }
  const t = (f - a[0]) / Math.max(1e-9, b[0] - a[0]);
  const c = a[1].map((v, i) => Math.round(v + (b[1][i] - v) * t));
  return `rgb(${c.join(',')})`;
}
function bodySvg(view, vals, max, label, tipFn) {
  const parts = view === 'front' ? BODY_FRONT : BODY_BACK;
  const poly = (pts, key) => {
    const v = vals[key] || 0, fill = heatColor(max ? v / max : 0);
    const p = []; for (let i = 0; i < pts.length; i += 2) p.push(pts[i] + ',' + pts[i + 1]);
    return `<polygon points="${p.join(' ')}" class="mz ${fill ? 'on' : ''}" style="${fill ? `fill:${fill}` : ''}" data-tip="${tipFn ? tipFn(key, v) : `${REGIONS[key]} · ${Math.round(v * 10) / 10}세트`}"></polygon>`;
  };
  let half = '', center = '';
  for (const [k, list] of Object.entries(parts)) for (const pts of list) half += poly(pts, k);
  if (view === 'front') for (const [k, list] of Object.entries(BODY_FRONT_CENTER)) for (const pts of list) center += poly(pts, k);
  const absLines = view === 'front' ? '<path d="M100 112v62M90 128h20M89 144h22M88 158h24" class="mzline"/>' : '<path d="M100 52v116" class="mzline"/>';
  return `<svg viewBox="30 0 140 345" class="bodymap" role="img" aria-label="${label}">
    <path d="${SIL}" class="mzsil"/>
    <g>${half}</g><g transform="translate(200,0) scale(-1,1)">${half}</g>${center}${absLines}
    <ellipse cx="100" cy="29" rx="14" ry="18" class="mzhead"/>
    <text x="100" y="343" text-anchor="middle" class="mzlbl">${label}</text></svg>`;
}

/* weekly set ranges per region (app guide: research gives ~10–20 fractional sets per *muscle*;
   regions that share a muscle — upper/lower chest, the three delt heads — get a share of that) */
const REG_GROUP = {
  가슴: ['chestU', 'chestL', 'serratus'], 등: ['lats', 'latsL', 'midback', 'traps', 'lowback'], 어깨: ['deltF', 'deltS', 'deltR'],
  팔: ['biceps', 'triceps', 'forearm'], 다리: ['quads', 'hams', 'glutes', 'gluteMed', 'adduct', 'calves'], 코어: ['abs', 'oblique'],
};
const REG_RANGE = {
  chestU: [3, 12], chestL: [6, 20], serratus: [0, 10], lats: [6, 18], latsL: [4, 16], gluteMed: [2, 12], midback: [6, 18], traps: [3, 14], lowback: [2, 12],
  deltF: [3, 14], deltS: [6, 20], deltR: [4, 16], biceps: [6, 20], triceps: [6, 20], forearm: [2, 14],
  quads: [8, 20], hams: [6, 18], glutes: [6, 20], adduct: [3, 14], calves: [6, 18], abs: [4, 16], oblique: [2, 12],
};
function regionTotals(from, to) {
  const vals = {};
  for (const s of setsBetween(from, to)) {
    if (isCardioSet(s)) continue;
    const e = eqById(s.eq) || s;
    for (const [k, v] of Object.entries(regionsOf(e.name || s.name, s.type || e.type, s.m || e.m, s.grip))) vals[k] = (vals[k] || 0) + v;
  }
  return vals;
}

/* which regions one exercise works, drawn like the muscle sticker on a gym machine */
const FRONT_REG = new Set(Object.keys(BODY_FRONT).concat(Object.keys(BODY_FRONT_CENTER)));
const BACK_REG = new Set(Object.keys(BODY_BACK));
function musclePeekHtml(name, type, m, big, grip, reg) {
  const R = reg || regionsOf(name, type, m, grip), keys = Object.keys(R);
  if (!keys.length) return '';
  const prim = keys.filter(k => R[k] >= 1), sec = keys.filter(k => R[k] < 1).sort((a, b) => R[b] - R[a]);
  const tip = (k, v) => `${REGIONS[k]} · ${v >= 1 ? '주로 씀' : v ? '같이 씀' : ''}`;
  const hasF = keys.some(k => FRONT_REG.has(k)), hasB = keys.some(k => BACK_REG.has(k));
  const views = [hasF && ['front', '앞'], hasB && ['back', '뒤']].filter(Boolean);
  return `<div class="mpeek ${big ? 'big' : ''}"><div class="mp-maps">${views.map(([v, l]) => bodySvg(v, R, 1, l, tip)).join('')}</div>
    <div class="mp-txt"><div class="k">주로 쓰는 부위</div><b>${prim.map(k => REGIONS[k]).join(' · ') || '–'}</b>
      ${sec.length ? `<div class="k" style="margin-top:6px">같이 쓰는 부위</div><span>${sec.map(k => REGIONS[k]).join(' · ')}</span>` : ''}</div></div>`;
}
