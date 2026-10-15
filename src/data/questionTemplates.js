const int = (rng, min = 1, max = 20) => min + Math.floor(rng() * (max - min + 1));
const output = '마지막에 출력되는 값은 무엇일까요?';
const count = '반복문 안의 print는 몇 번 실행될까요?';
const result = (code, answer, explanation, question = output) => ({ code, correctAnswer: String(answer), explanation, question });
const branch = (condition, yes = 'Yes', no = 'No') => `if ${condition}:\n    print("${yes}")\nelse:\n    print("${no}")`;
const definitions = [
 ['V01', r => { const a=int(r); return result(`x = ${a}\nprint(x)`,a,'변수 x에 저장된 값을 출력해요.'); }],
 ['V02', r => { const a=int(r),b=int(r); return result(`x = ${a}\nx = ${b}\nprint(x)`,b,'다시 대입하면 마지막 값이 저장돼요.'); }],
 ['V03', r => { const a=int(r),b=int(r); return result(`x = ${a}\n# x = ${b}\nprint(x)`,a,'# 뒤의 주석은 실행되지 않아요.'); }],
 ['V04', r => { const a=int(r); return result(`x = ${a}\ny = x\nprint(y)`,a,'x의 값을 y에 복사해요.'); }],
 ['V05', r => { const a=int(r),b=int(r); return result(`x = ${a}\nx = x + ${b}\nprint(x)`,a+b,'원래 x 값에 수를 더한 뒤 다시 저장해요.'); }],
 ['I01', r => { const a=['Cat','Dog','Bird','Pet'][int(r,0,3)]; return result(`name = "${a}"\nprint(name)`,a,'문자열은 따옴표 없이 출력돼요.'); }],
 ['I02', r => { const a=int(r),b=int(r); return result(`print(${a}, ${b})`,`${a} ${b}`,'쉼표로 나눈 값 사이에는 공백 한 칸이 들어가요.'); }],
 ['I03', r => { const a=int(r); return result(`print("Pet", ${a})`,`Pet ${a}`,'Pet과 숫자 사이에 공백 한 칸이 들어가요.'); }],
 ['I04', r => { const a=int(r),b=int(r); return result(`x = int("${a}")\nprint(x + ${b})`,a+b,'int는 숫자 문자열을 정수로 바꿔요.'); }],
 ['I05', r => { const a=['sun','moon','star','sky'][int(r,0,3)]; return result('x = input("Enter code: ")\nprint(x)',a,'input으로 입력한 문자열을 그대로 출력해요.',`입력값이 ${a}일 때, 입력 안내 문구를 제외하고 print가 출력하는 값은 무엇일까요?`); }],
 ...['+','-','*','//','%'].map((op,i)=>[`O0${i+1}`,r=>{const a=int(r),b=int(r,2,6); const answers=[a+b,a-b,a*b,Math.floor(a/b),a%b]; return result(`print(${a} ${op} ${b})`,answers[i],['두 수를 더해요.','앞의 수에서 뒤의 수를 빼요.','두 수를 곱해요.','양수 정수 나눗셈의 몫을 구해요.','나눈 뒤 남은 나머지를 구해요.'][i]);}]),
 ['C01',r=>{const x=int(r),a=int(r);return result(`x = ${x}\n${branch(`x >= ${a}`)}`,x>=a?'Yes':'No','크거나 같은지 비교하고 해당 가지를 실행해요.');}],
 ['C02',r=>{const x=int(r);return result(`x = ${x}\n${branch('x % 2 == 0','Even','Odd')}`,x%2===0?'Even':'Odd','2로 나눈 나머지가 0이면 짝수예요.');}],
 ['C03',r=>{const a=int(r),x=a+int(r,-1,1);return result(`x = ${x}\nif x > ${a}:\n    print("High")\nelif x == ${a}:\n    print("Same")\nelse:\n    print("Low")`,x>a?'High':x===a?'Same':'Low','위에서부터 확인해 처음 참인 가지 하나만 실행해요.');}],
 ['C04',r=>{const a=int(r,2,8),b=a+int(r,2,8),x=int(r,1,20);return result(`x = ${x}\n${branch(`x >= ${a} and x < ${b}`)}`,x>=a&&x<b?'Yes':'No','and는 두 조건이 모두 참이어야 참이에요.');}],
 ['C05',r=>{const a=int(r,2,8),b=a+int(r,2,8),x=int(r,1,20);return result(`x = ${x}\n${branch(`x < ${a} or x > ${b}`)}`,x<a||x>b?'Yes':'No','or는 둘 중 하나라도 참이면 참이에요.');}],
 ['W01',r=>{const n=int(r,1,9);return result(`i = 0\nwhile i < ${n}:\n    print(i)\n    i += 1`,n,`0부터 ${n-1}까지 총 ${n}번 출력해요.`,count);}],
 ['W02',r=>{const a=int(r,1,5),b=a+int(r,1,8);return result(`i = ${a}\nwhile i < ${b}:\n    i += 1\nprint(i)`,b,'i가 경계값에 도달하면 반복을 끝내고 출력해요.');}],
 ['W03',r=>{const n=int(r,2,9);return result(`i = 0\ns = 0\nwhile i < ${n}:\n    s += i\n    i += 1\nprint(s)`,n*(n-1)/2,`0부터 ${n-1}까지 더한 합이에요.`);}],
 ['W04',r=>{const a=int(r,1,9);return result(`i = ${a}\nwhile i > 0:\n    i -= 1`,a,'한 번에 1씩 줄어들어 시작값만큼 반복해요.','while 반복문은 몇 번 실행될까요?');}],
 ['W05',r=>{const n=int(r,1,9);return result(`i = 0\nwhile i < ${n}:\n    i += 2\nprint(i)`,Math.ceil(n/2)*2,'2씩 증가하다가 경계값 이상인 첫 짝수에서 멈춰요.');}],
 ['F01',r=>{const n=int(r,1,9);return result(`for i in range(${n}):\n    print(i)`,n,'range(n)은 0부터 n-1까지 n개의 값을 만들어요.',count);}],
 ['F02',r=>{const a=int(r,1,5),b=a+int(r,1,8);return result(`for i in range(${a}, ${b}):\n    print(i)`,b-a,'시작값은 포함하고 끝값은 포함하지 않아요.',count);}],
 ['F03',r=>{const n=int(r,1,9);return result(`total = 0\nfor i in range(1, ${n+1}):\n    total += i\nprint(total)`,n*(n+1)/2,`1부터 ${n}까지 모두 더해요.`);}],
 ['F04',r=>{const a=int(r,1,5),b=int(r,1,5);return result(`for i in range(${a}):\n    for j in range(${b}):\n        print("Hi")`,a*b,'바깥 반복 횟수와 안쪽 반복 횟수를 곱해요.',count);}],
 ['F05',r=>{const n=int(r,1,9);return result(`for i in range(${n}):\n    if i % 2 == 0:\n        print(i)`,Math.ceil(n/2),'0도 짝수예요. 범위 안의 짝수 개수를 세어요.',count);}],
];
const categories={V:'변수/주석',I:'입출력',O:'연산자',C:'조건문',W:'while',F:'for/중첩'};
export const questionTemplates=definitions.map(([id,generate])=>({id,category:categories[id[0]],difficulty:['W','F','C'].includes(id[0])?2:1,generate}));
