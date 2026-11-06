import { questionTemplates } from '../data/questionTemplates.js';
export const normalizeAnswer = value => String(value).replace(/\r\n/g, '\n');
export const isCorrect = (question, answer) => normalizeAnswer(answer) === question.correctAnswer;
export function shuffle(values, rng = Math.random) {
  const result = [...values];
  for (let i=result.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function makeOptions(answer, rng = Math.random) {
  const correct=normalizeAnswer(answer), candidates=[correct];
  if (/^-?\d+$/.test(correct)) { const n=Number(correct); candidates.push(String(n+1),String(n-1),String(n+2)); }
  else candidates.push('Yes','No','Even','Odd','High','Same','Low','Maybe','Error');
  const options=shuffle([...new Set(candidates)].slice(0,4),rng);
  if(options.length!==4 || options.filter(x=>x===correct).length!==1) throw new Error('선택지 생성 실패');
  return options;
}
let sequence=0;
export function generateQuestion(template, rng = Math.random) {
  const data=template.generate(rng);
  return {...data, instanceId:globalThis.crypto?.randomUUID?.() ?? `q-${Date.now()}-${++sequence}`, templateId:template.id,category:template.category,difficulty:template.difficulty,options:makeOptions(data.correctAnswer,rng)};
}
export function nextQuestion(history=[],rng=Math.random) {
  // Never the same pattern as the question just answered (so it cannot look repeated), nor recent identical code.
  const previous=history.at(-1)?.templateId;
  const pool=questionTemplates.filter(t=>t.id!==previous);
  let question;
  for(let attempt=0;attempt<=10;attempt++) {
    question=generateQuestion(pool[Math.floor(rng()*pool.length)],rng);
    if(!history.slice(-10).some(q=>q.templateId===question.templateId&&q.code===question.code)) break;
  }
  return question;
}
