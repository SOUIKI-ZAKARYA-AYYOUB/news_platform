import { reduceBias } from './src/lib/story-processor.js';

const testCases = [
  {
    input: "زلزال في ريال مدريد.. أسماء صادمة قد تغادر هذا الصيف!",
    label: "Arabic clickbait (صادمة + !)"
  },
  {
    input: "عاجل: فضيحة كبيرة في البرلمان!",
    label: "Arabic breaking + scandal"
  },
  {
    input: "خطيرة.. تفاصيل مرعبة عن الحادث",
    label: "Arabic dangerous + terrifying"
  },
  {
    input: "BREAKING: Shocking scandal rocks government!",
    label: "English clickbait"
  }
];

for (const { input, label } of testCases) {
  const output = reduceBias(input);
  console.log(`\n[${label}]`);
  console.log(`  Original: ${input}`);
  console.log(`  Neutral:  ${output}`);
}
