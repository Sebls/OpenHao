import type { Entry } from "../../../contracts/content.ts";

export type Tone = 1 | 2 | 3 | 4 | 0;
export interface ToneSyllable {
  pinyin: string;
  tone: Tone;
  character: string;
  segmentStart: boolean;
}

// Standard pinyin syllables. A finite inventory keeps arbitrary Latin text out
// and allows joined words to be split without using a character dictionary.
const syllables = new Set(
  `
a ai an ang ao e ei en eng er o ou
ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu
pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu
ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu
fa fan fang fei fen feng fo fou fu
da dai dan dang dao de dei den deng di dia dian diao die ding diu dong dou du duan dui dun duo
ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo
na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nuo nü nüe
la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu long lou lu luan lun luo lü lüe
 ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo
ka kai kan kang kao ke kei ken keng kong kou ku kua kuai kuan kuang kui kun kuo
ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo
ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun
qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun
xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun
zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo
cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo
sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo
ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo
za zai zan zang zao ze zei zen zeng zi zong zou zu zuan zui zun zuo
ca cai can cang cao ce cen ceng ci cong cou cu cuan cui cun cuo
sa sai san sang sao se sen seng si song sou su suan sui sun suo
ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun
wa wai wan wang wei wen weng wo wu
`
    .trim()
    .split(/\s+/),
);
const marks = ["\u0304", "\u0301", "\u030c", "\u0300"];

function readSyllable(value: string): Tone | null {
  const decomposed = value.normalize("NFD");
  const tones = [...decomposed].filter((c) => marks.includes(c));
  const base = decomposed
    .replace(/[\u0304\u0301\u030c\u0300]/g, "")
    .normalize("NFC");
  if (!syllables.has(base) || tones.length > 1) return null;
  return tones.length ? ((marks.indexOf(tones[0]) + 1) as Tone) : 0;
}

// Keep all possible splits (up to two per syllable count) so ambiguous joined
// spellings are omitted rather than assigned to the wrong Han character.
function splitWord(word: string): Map<number, string[][]> {
  const memo = new Map<number, Map<number, string[][]>>();
  function visit(start: number): Map<number, string[][]> {
    if (start === word.length) return new Map([[0, [[]]]]);
    if (memo.has(start)) return memo.get(start)!;
    const result = new Map<number, string[][]>();
    for (let end = start + 1; end <= Math.min(word.length, start + 6); end++) {
      const part = word.slice(start, end);
      if (readSyllable(part) === null) continue;
      for (const [count, tails] of visit(end)) {
        const options = result.get(count + 1) || [];
        result.set(
          count + 1,
          [...options, ...tails.map((tail) => [part, ...tail])].slice(0, 2),
        );
      }
    }
    memo.set(start, result);
    return result;
  }
  return visit(0);
}

export function toneSyllables(entry: Entry): ToneSyllable[] {
  let reading = entry.pronunciations
    .find((p) => p.system === "pinyin" && p.reviewStatus === "reviewed")
    ?.value.normalize("NFC")
    .toLowerCase();
  // Speech targets exclude dialogue speaker labels. For older entries without
  // one, recognize only the explicit single-letter dialogue prefix.
  let form = entry.speechTarget || entry.form.replace(/^[A-Z]\s*[:：]\s*/u, "");
  if (!reading) return [];
  // A Latin name has no Mandarin tone: skip it only when the same literal
  // token occurs in the reviewed reading, never transliterate or infer tones.
  for (const latin of form.match(/[A-Za-z]+/g) || []) {
    const token = new RegExp(`(^|[\\s\\p{P}])${latin}(?=$|[\\s\\p{P}])`, "iu");
    if (!token.test(reading)) return [];
    reading = reading.replace(token, "$1");
  }
  form = form.replace(/[A-Za-z]+/g, "");
  if (!/^[\p{Script=Han}\p{P}\s]+$/u.test(form)) return [];
  const characters = [...form].filter((c) => /\p{Script=Han}/u.test(c));
  const chunks =
    reading.match(
      /[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+|[^a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+/gu,
    ) || [];
  let candidates: ToneSyllable[][] = [[]];
  let segmentStart = false;
  for (const chunk of chunks) {
    if (/^[\s\p{P}]+$/u.test(chunk)) {
      if (/[^\s'’\-]/u.test(chunk)) segmentStart = true;
      continue;
    }
    const options = [...splitWord(chunk).values()].flat();
    const next = new Map<number, ToneSyllable[][]>();
    for (const prior of candidates)
      for (const parts of options) {
        const count = prior.length + parts.length;
        if (count > characters.length) continue;
        const group = next.get(count) || [];
        if (group.length < 2)
          group.push([
            ...prior,
            ...parts.map((pinyin, i) => ({
              pinyin,
              tone: readSyllable(pinyin)!,
              character: "",
              segmentStart: segmentStart && i === 0,
            })),
          ]);
        next.set(count, group);
      }
    candidates = [...next.values()].flat();
    segmentStart = false;
  }
  const matches = candidates.filter(
    (c) => c.length === characters.length && c.length > 0,
  );
  if (matches.length !== 1) return [];
  const sourceStarts = new Set<number>();
  let position = 0;
  let boundary = false;
  for (const c of form) {
    if (/\p{Script=Han}/u.test(c)) {
      if (boundary) sourceStarts.add(position);
      position++;
      boundary = false;
    } else if (/[，。！？；：、,.!?;:]/u.test(c)) boundary = true;
  }
  return matches[0].map((s, i) => ({
    ...s,
    character: characters[i],
    segmentStart: i > 0 && (s.segmentStart || sourceStarts.has(i)),
  }));
}

export const toneGuides = {
  1: { label: "High & steady", path: "M 12 12 L 88 12" },
  2: { label: "Rising", path: "M 12 40 Q 52 36 88 12" },
  3: { label: "Low / dipping", path: "M 12 54 Q 30 68 48 68" },
  4: { label: "Falling", path: "M 12 12 Q 48 38 88 68" },
  0: { label: "Short & light", path: "" },
} as const;
