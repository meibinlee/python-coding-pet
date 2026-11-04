// 31 harder daily-challenge patterns (D01–D31), one per day of a 31-day round.
// Answers are computed with plain JS that mirrors the shown Python code. No code is executed.
const int = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const output = '마지막에 출력되는 값은 무엇일까요?';
const count = '반복문 안의 print는 몇 번 실행될까요?';
const result = (code, answer, explanation, question = output, distractors = []) =>
  ({ code, correctAnswer: String(answer), explanation, question, distractors: distractors.map(String) });
const repeat = (text, n) => text.repeat(Math.max(0, n));

// [id, daily quest title, category, generate]
const definitions = [
  ['D01', '변수와 주석에 도전!', '변수/주석', r => { const a = int(r, 1, 9), b = a + int(r, 1, 9);
    return result(`a = ${a}\nb = ${b}\n# swap a and b\nt = a\na = b\nb = t\nprint(a, b)`, `${b} ${a}`, '# 줄은 주석이라 실행되지 않아요. t에 a를 잠시 보관해서 두 값을 맞바꿔요.', output, [`${a} ${b}`, `${a} ${a}`, `${b} ${b}`]); }],
  ['D02', '복합 대입 연산에 도전!', '연산자', r => { const a = int(r, 2, 9), b = int(r, 1, 9), c = int(r, 2, 4), d = int(r, 1, 9);
    return result(`x = ${a}\nx += ${b}\nx *= ${c}\nx -= ${d}\nprint(x)`, (a + b) * c - d, '복합 대입은 한 줄씩 차례대로 x를 바꿔요.'); }],
  ['D03', '연산 순서에 도전!', '연산자', r => { const a = int(r, 1, 9), b = int(r, 2, 9), c = int(r, 2, 9);
    return result(`print(${a} + ${b} * ${c})`, a + b * c, '곱셈을 덧셈보다 먼저 계산해요.', output, [(a + b) * c, a * b + c, a + b + c]); }],
  ['D04', '괄호와 몫 계산에 도전!', '연산자', r => { const a = int(r, 5, 20), b = int(r, 5, 20), c = int(r, 3, 7);
    return result(`print((${a} + ${b}) // ${c})`, Math.floor((a + b) / c), '괄호 안을 먼저 더한 뒤 몫을 구해요.', output, [a + Math.floor(b / c), (a + b) % c, Math.floor((a + b) / c) + 2]); }],
  ['D05', '몫과 나머지로 자릿수 나누기에 도전!', '연산자', r => { const n = int(r, 12, 98);
    return result(`n = ${n}\nprint(n // 10 + n % 10)`, Math.floor(n / 10) + n % 10, '// 10은 십의 자리, % 10은 일의 자리예요. 두 자리를 더해요.'); }],
  ['D06', '문자열 곱하기에 도전!', '입출력', r => { const word = pick(r, ['Hi', 'Go', 'Yo', 'Ha']), n = int(r, 2, 5);
    return result(`print("${word}" * ${n})`, repeat(word, n), '문자열에 정수를 곱하면 그 횟수만큼 이어 붙여요.', output, [repeat(word, n - 1), repeat(word, n + 1), `${word} ${n}`]); }],
  ['D07', 'len으로 글자 수 세기에 도전!', '입출력', r => { const word = pick(r, ['python', 'pixel', 'coding', 'sprout', 'cat', 'robot']), a = int(r, 1, 9);
    return result(`word = "${word}"\nprint(len(word) + ${a})`, word.length + a, `len은 글자 수를 세요. "${word}"는 ${word.length}글자예요.`); }],
  ['D08', '문자열 이어 붙이기에 도전!', '입출력', r => { const a = int(r, 1, 9), c = (a + int(r, 0, 7)) % 9 + 1;
    return result(`x = str(${a}) + str(${c})\nprint(x)`, `${a}${c}`, 'str로 바꾼 문자열끼리 더하면 이어 붙여요.', output, [a + c, `${c}${a}`, `${a} ${c}`]); }],
  ['D09', '입력과 int 변환에 도전!', '입출력', r => { const v = int(r, 2, 15), a = int(r, 1, 9);
    return result(`n = int(input("Enter a number: "))\nprint(n * 2 + ${a})`, v * 2 + a, '입력한 문자열을 int로 정수로 바꾼 뒤 계산해요.',
      `입력값이 ${v}일 때, 입력 안내 문구를 제외하고 print가 출력하는 값은 무엇일까요?`); }],
  ['D10', 'elif 여러 갈래 조건문에 도전!', '조건문', r => { const s = int(r, 55, 100);
    const grade = s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : 'D';
    return result(`score = ${s}\nif score >= 90:\n    print("A")\nelif score >= 80:\n    print("B")\nelif score >= 70:\n    print("C")\nelse:\n    print("D")`, grade,
      '위에서부터 확인해서 처음 참인 조건 하나만 실행해요.', output, ['A', 'B', 'C', 'D']); }],
  ['D11', '중첩 조건문에 도전!', '조건문', r => { const a = int(r, 3, 8), b = int(r, 3, 8), x = int(r, 1, 12), y = int(r, 1, 12);
    const answer = x > a ? (y > b ? 'Both' : 'One') : 'None';
    return result(`x = ${x}\ny = ${y}\nif x > ${a}:\n    if y > ${b}:\n        print("Both")\n    else:\n        print("One")\nelse:\n    print("None")`, answer,
      '바깥 조건이 참일 때만 안쪽 조건을 확인해요.', output, ['Both', 'One', 'None', 'Error']); }],
  ['D12', 'not 조건에 도전!', '조건문', r => { const a = int(r, 3, 15), x = int(r, 1, 20);
    return result(`x = ${x}\nif not x > ${a}:\n    print("Yes")\nelse:\n    print("No")`, !(x > a) ? 'Yes' : 'No', 'not은 참과 거짓을 뒤집어요.', output, ['Yes', 'No', 'True', 'False']); }],
  ['D13', 'and로 배수 판별하기에 도전!', '조건문', r => { const x = int(r, 1, 30);
    const answer = x % 2 === 0 && x % 3 === 0 ? 'Both' : x % 2 === 0 ? 'Two' : x % 3 === 0 ? 'Three' : 'None';
    return result(`x = ${x}\nif x % 2 == 0 and x % 3 == 0:\n    print("Both")\nelif x % 2 == 0:\n    print("Two")\nelif x % 3 == 0:\n    print("Three")\nelse:\n    print("None")`, answer,
      '2와 3으로 나눈 나머지를 확인해요. 가장 먼저 참인 가지가 실행돼요.', output, ['Both', 'Two', 'Three', 'None']); }],
  ['D14', '두 배로 커지는 while문에 도전!', 'while', r => { const limit = int(r, 5, 100); let n = 1, c = 0; while (n < limit) { n *= 2; c += 1; }
    return result(`n = 1\nc = 0\nwhile n < ${limit}:\n    n *= 2\n    c += 1\nprint(c)`, c, `n이 1, 2, 4, 8…처럼 두 배가 되다가 ${limit} 이상이 되면 멈춰요.`); }],
  ['D15', '합이 쌓이는 while문에 도전!', 'while', r => { const limit = int(r, 8, 40); let s = 0, i = 0; while (s < limit) { i += 1; s += i; }
    return result(`s = 0\ni = 0\nwhile s < ${limit}:\n    i += 1\n    s += i\nprint(i)`, i, `1, 2, 3…을 차례로 더해 합이 ${limit} 이상이 되는 순간의 i예요.`); }],
  ['D16', '거꾸로 줄어드는 while문에 도전!', 'while', r => { const a = int(r, 10, 30), b = int(r, 3, 7); let i = a; while (i > 0) i -= b;
    return result(`i = ${a}\nwhile i > 0:\n    i -= ${b}\nprint(i)`, i, `${b}씩 줄이다가 0 이하가 되면 멈춰요. 음수가 될 수도 있어요.`); }],
  ['D17', 'while True와 break에 도전!', 'while', r => { const a = int(r, 2, 6), limit = int(r, 10, 30); let i = 0; while (true) { i += a; if (i > limit) break; }
    return result(`i = 0\nwhile True:\n    i += ${a}\n    if i > ${limit}:\n        break\nprint(i)`, i, `break는 반복을 바로 끝내요. ${limit}보다 커진 첫 값이에요.`); }],
  ['D18', '간격을 두는 range에 도전!', 'for/중첩', r => { const a = int(r, 1, 5), s = int(r, 2, 4), b = a + s * int(r, 2, 5) + int(r, 0, s - 1); let total = 0; for (let i = a; i < b; i += s) total += i;
    return result(`total = 0\nfor i in range(${a}, ${b}, ${s}):\n    total += i\nprint(total)`, total, `range의 세 번째 값 ${s}만큼 건너뛰며 ${b} 전까지 더해요.`); }],
  ['D19', '거꾸로 세는 for문에 도전!', 'for/중첩', r => { const a = int(r, 8, 20), s = int(r, 2, 4);
    return result(`for i in range(${a}, 0, -${s}):\n    print(i)`, Math.ceil(a / s), `${a}부터 ${s}씩 줄어들고 0은 포함하지 않아요.`, count); }],
  ['D20', 'for문으로 배수 세기에 도전!', 'for/중첩', r => { const n = int(r, 10, 30), k = int(r, 3, 7); let c = 0; for (let i = 1; i <= n; i++) if (i % k === 0) c += 1;
    return result(`c = 0\nfor i in range(1, ${n + 1}):\n    if i % ${k} == 0:\n        c += 1\nprint(c)`, c, `1부터 ${n}까지 ${k}의 배수 개수를 세요.`); }],
  ['D21', 'continue에 도전!', 'for/중첩', r => { const n = int(r, 6, 12), k = int(r, 2, 4); let total = 0; for (let i = 0; i < n; i++) { if (i % k === 0) continue; total += i; }
    return result(`total = 0\nfor i in range(${n}):\n    if i % ${k} == 0:\n        continue\n    total += i\nprint(total)`, total, `continue는 아래 줄을 건너뛰고 다음 반복으로 가요. ${k}의 배수는 더하지 않아요.`); }],
  ['D22', 'for문과 break에 도전!', 'for/중첩', r => { const limit = int(r, 10, 150); let last = 1; for (let i = 1; i < 20; i++) { last = i; if (i * i > limit) break; }
    return result(`for i in range(1, 20):\n    if i * i > ${limit}:\n        break\nprint(i)`, last, `i * i가 처음으로 ${limit}보다 커질 때 멈춘 i가 출력돼요.`); }],
  ['D23', '중첩 반복문에 도전!', 'for/중첩', r => { const a = int(r, 2, 4), b = int(r, 2, 4); let total = 0; for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) total += i + j;
    return result(`total = 0\nfor i in range(${a}):\n    for j in range(${b}):\n        total += i + j\nprint(total)`, total, '바깥 i마다 안쪽 j를 모두 돌며 i + j를 더해요.'); }],
  ['D24', '삼각형 중첩 반복문에 도전!', 'for/중첩', r => { const n = int(r, 3, 8);
    return result(`for i in range(${n}):\n    for j in range(i):\n        print("*")`, n * (n - 1) / 2, `안쪽 반복은 0번, 1번, … ${n - 1}번 실행돼요. 모두 더해요.`, count); }],
  ['D25', '곱셈이 쌓이는 for문에 도전!', 'for/중첩', r => { const s = int(r, 1, 3), n = int(r, 2, 5); let p = s; for (let i = 1; i <= n; i++) p *= i;
    return result(`p = ${s}\nfor i in range(1, ${n + 1}):\n    p *= i\nprint(p)`, p, `처음 값 ${s}에 1부터 ${n}까지 차례로 곱해요.`, output, [p + 1, p - 1, p * (n + 1)]); }],
  ['D26', '문자열과 for문에 도전!', 'for/중첩', r => { const [word, letter] = pick(r, [['banana', 'a'], ['coconut', 'o'], ['bubble', 'b'], ['letter', 't'], ['pepper', 'p'], ['moonroom', 'o'], ['cocoa', 'c']]);
    return result(`count = 0\nfor ch in "${word}":\n    if ch == "${letter}":\n        count += 1\nprint(count)`, [...word].filter(ch => ch === letter).length, `"${word}"의 글자를 하나씩 보며 "${letter}"의 개수를 세요.`); }],
  ['D27', '최댓값 찾기에 도전!', '조건문', r => { const a = int(r, 1, 30), b = int(r, 1, 30), c = int(r, 1, 30);
    return result(`a = ${a}\nb = ${b}\nc = ${c}\nm = a\nif b > m:\n    m = b\nif c > m:\n    m = c\nprint(m)`, Math.max(a, b, c), '더 큰 값을 만날 때마다 m을 바꿔서 가장 큰 값을 찾아요.', output, [Math.min(a, b, c), a, c, b, Math.max(a, b, c) + 1]); }],
  ['D28', 'while문 속 조건문에 도전!', 'while', r => { const start = int(r, 3, 12); let n = start, steps = 0; while (n !== 1) { n = n % 2 === 0 ? Math.floor(n / 2) : n * 3 + 1; steps += 1; }
    return result(`n = ${start}\nsteps = 0\nwhile n != 1:\n    if n % 2 == 0:\n        n = n // 2\n    else:\n        n = n * 3 + 1\n    steps += 1\nprint(steps)`, steps, '짝수면 반으로, 홀수면 3배 더하기 1을 해요. 1이 될 때까지 센 횟수예요.'); }],
  ['D29', 'print의 sep에 도전!', '입출력', r => { const a = int(r, 1, 9), b = int(r, 1, 9), sep = pick(r, ['-', '/', ':']);
    return result(`print(${a}, ${b}, sep="${sep}")`, `${a}${sep}${b}`, 'sep은 값 사이에 넣을 문자를 정해요. 공백 대신 들어가요.', output, [`${a} ${b}`, `${a}${b}`, `${a} ${sep} ${b}`]); }],
  ['D30', 'print의 end에 도전!', '입출력', r => { const a = int(r, 1, 4), n = int(r, 3, 5), digits = k => Array.from({ length: k }, (_, i) => a + i).join('');
    return result(`for i in range(${a}, ${a + n}):\n    print(i, end="")`, digits(n), 'end=""는 줄을 바꾸지 않아서 숫자가 한 줄에 붙어 나와요. 끝값은 포함하지 않아요.', '출력되는 전체 결과는 무엇일까요?',
      [digits(n - 1), digits(n + 1), digits(n).split('').join(' ')]); }],
  ['D31', 'for문 속 조건문에 도전!', 'for/중첩', r => { const start = int(r, 5, 20), n = int(r, 3, 5); let x = start; for (let i = 0; i < n; i++) x = x % 2 === 0 ? Math.floor(x / 2) : x + 1;
    return result(`x = ${start}\nfor i in range(${n}):\n    if x % 2 == 0:\n        x = x // 2\n    else:\n        x = x + 1\nprint(x)`, x, `${n}번 반복하며 짝수면 반으로, 홀수면 1을 더해요.`); }],
];
export const challengeTemplates = definitions.map(([id, title, category, generate]) => ({ id, title, category, difficulty: 3, generate }));
