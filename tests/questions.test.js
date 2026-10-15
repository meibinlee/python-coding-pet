import {describe,it,expect} from 'vitest';
import {questionTemplates} from '../src/data/questionTemplates.js';
import {generateQuestion,nextQuestion,makeOptions,normalizeAnswer,shuffle} from '../src/game/questions.js';
function seeded(seed=12345){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
// Independent expected answers derived from the displayed literals. No code execution.
function expected(q){
 const nums=q.code.match(/\d+/g)?.map(Number)||[],[a,b]=nums;
 switch(q.templateId){
 case 'V01':case 'V03':case 'V04':return a;
 case 'V02':return b;
 case 'V05':case 'I04':case 'O01':return a+b;
 case 'I01':return q.code.match(/"(.*?)"/)[1];
 case 'I02':return `${a} ${b}`;
 case 'I03':return `Pet ${a}`;
 case 'I05':return q.question.match(/입력값이 (\w+)/)[1];
 case 'O02':return a-b;case 'O03':return a*b;
 case 'O04':return Math.trunc(a/b);case 'O05':return a-b*Math.trunc(a/b);
 case 'C01':return a>=b?'Yes':'No';case 'C02':return a%2===0?'Even':'Odd';
 case 'C03':return a>b?'High':a===b?'Same':'Low';
 case 'C04':return a>=b&&a<nums[2]?'Yes':'No';case 'C05':return a<b||a>nums[2]?'Yes':'No';
 case 'W01':return b;case 'W02':return b;
 case 'W03':{let sum=0;for(let i=0;i<nums[2];i++)sum+=i;return sum;}
 case 'W04':return a;
 case 'W05':{let i=0;while(i<b)i+=2;return i;}
 case 'F01':return a;case 'F02':return b-a;
 case 'F03':{let sum=0;for(let i=1;i<nums[2];i++)sum+=i;return sum;}
 case 'F04':return a*b;
 case 'F05':return Array.from({length:a},(_,i)=>i).filter(i=>i%2===0).length;
 }
}
describe('30 question templates',()=>{
 it('has the exact unique pattern IDs',()=>{expect(questionTemplates.map(t=>t.id)).toEqual(['V','I','O','C','W','F'].flatMap(p=>[1,2,3,4,5].map(i=>`${p}0${i}`)));});
 for(const template of questionTemplates)it(`${template.id}: 100 randomized cases, varied answers and correct displayed semantics`,()=>{const rng=seeded();const answers=new Set();for(let i=0;i<100;i++){const q=generateQuestion(template,rng);expect(q.options).toHaveLength(4);expect(new Set(q.options).size).toBe(4);expect(q.options.filter(x=>x===q.correctAnswer)).toHaveLength(1);expect(q.correctAnswer).toBe(String(expected(q)));expect(q.code).not.toContain(';');expect(q.code).not.toContain('\t');for(const line of q.code.split('\n'))expect(line.match(/^ */)[0].length%4).toBe(0);answers.add(q.correctAnswer);}expect(answers.size).toBeGreaterThan(1);});
 it('keeps loop final output outside the loop and nested print inside',()=>{for(const id of ['W02','W03','W05','F03'])expect(questionTemplates.find(t=>t.id===id).generate(()=>.5).code).toMatch(/\nprint\(/);expect(questionTemplates.find(t=>t.id==='F04').generate(()=>.5).code).toContain('\n        print("Hi")');});
 it('avoids three identical templates and retries recent code',()=>{const q=generateQuestion(questionTemplates[0],()=>0);expect(nextQuestion([q,q],()=>0).templateId).not.toBe(q.templateId);let calls=0;nextQuestion([q],()=>{calls++;return 0;});expect(calls).toBeLessThan(100);const rng=seeded();const history=[];for(let i=0;i<100;i++){const next=nextQuestion(history,rng);expect(history.slice(-5).some(q=>q.templateId===next.templateId&&q.code===next.code)).toBe(false);history.push(next);}});
 it('preserves meaningful whitespace and shuffles a copy',()=>{expect(normalizeAnswer(' a ')).toBe(' a ');expect(normalizeAnswer(8)).toBe('8');const values=[1,2,3,4];expect(shuffle(values,()=>0)).toEqual([2,3,4,1]);expect(values).toEqual([1,2,3,4]);for(const value of ['Yes','No','Even','Odd','Pet 1','a b',0,-1])expect(new Set(makeOptions(value)).size).toBe(4);});
});
