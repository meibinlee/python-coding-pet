# 코딩 펫 키우기

중학교 정보 수업 복습을 위한 정적 React + Vite 앱입니다. 6개 영역의 30개 템플릿에서 값을 무작위 생성하며, JavaScript 순수 함수로 정답을 계산합니다. 예시 코드를 실행하지 않습니다.

## 실행

Node.js 22 권장.

```sh
npm ci
npm run dev
npm run test
npm run build
npm run preview
```

처음에는 펫 이름(기본 코코)을 정합니다. 먹이·청소·놀기를 누르면 문제를 풀 수 있습니다. 정답은 해당 상태 +15(최대 100), XP +10이며, 오답 및 같은 문제의 추가 클릭에는 보상이 없습니다. 다음 문제에서만 새 문제를 생성합니다. 알은 0~49XP, 아기는 50~149XP, 성체는 150XP 이상입니다. 상태 감소 타이머는 생략했으며 방치로 죽거나 초기화되지 않습니다.

## 파일 구성

- `src/data/questionTemplates.js`: 정확히 30개 생성 템플릿. W04는 반복 횟수를 질문합니다.
- `src/game/questions.js`: 문자열 비교(의미 있는 공백 보존), Fisher–Yates 셔플, 최근 5개 중복 재생성(최대 10회), 동일 템플릿 3연속 방지.
- `src/game/rules.js`, `storage.js`: 보상 잠금, 성장 및 저장 검증.
- `src/components/`: 펫·상태·키보드 포커스를 가두는 네이티브 문제 dialog.
- `tests/`: 템플릿당 100회 생성, 표시된 코드 리터럴에 기반한 독립 정답 계산, 보상 및 저장 테스트.

## 테스트 캐릭터 교체

직접 만든 임시 SVG인 `public/pets/egg.svg`, `baby.svg`, `adult.svg`를 원하는 이미지로 교체하세요. SVG 기준 viewBox는 `0 0 100 110`입니다. 다른 확장자를 사용하면 `src/components/Pet.jsx`와 시작 화면 이미지 경로도 수정하세요. 외부 이미지는 사용 권한을 확인하세요.

## GitHub Pages 배포

실제 저장소 생성과 배포는 수행하지 않았습니다. 워크플로는 수동 실행만 허용합니다.

1. 승인 후 원하는 GitHub 저장소를 만들고 코드를 push합니다.
2. Settings → Pages → Build and deployment에서 **GitHub Actions**를 선택합니다.
3. 기본 `base`는 `./`라서 프로젝트 하위 경로의 스크립트·SVG를 상대 경로로 로드합니다. 명시적인 경로를 원하면 Settings → Secrets and variables → Actions → Variables에 `VITE_BASE_PATH`를 `/저장소이름/`으로 설정합니다. 사용자 최상위 `<username>.github.io` 저장소는 `/`입니다.
4. Actions → Deploy to GitHub Pages → Run workflow를 수동 실행합니다. `npm ci`, 테스트, 빌드를 거쳐 `dist`가 배포됩니다.
5. 배포 주소에서 이미지, 새로고침 저장 복원, 모바일 및 키보드 조작을 확인합니다.

로컬에서 프로젝트 경로 빌드 확인:

```sh
VITE_BASE_PATH=/coding-pet/ npm run build
npm run preview
# http://127.0.0.1:4173/coding-pet/ 접속
```

## 데이터 저장 한계

`coding-pet-save-v1` 키로 현재 브라우저의 localStorage에만 저장합니다. 계정·DB·백엔드·외부 API·분석 스크립트는 없습니다. 펫 이름만 입력하며 실명이나 학번을 요구하지 않습니다. 다른 브라우저나 기기와 동기화되지 않으며 사이트 데이터 삭제나 시크릿 모드 종료로 기록이 사라질 수 있습니다. 저장 실패 시 안내와 함께 메모리에서 게임을 계속합니다. 손상되거나 범위가 잘못된 기록은 기본값으로 복구합니다. 초기화는 확인창을 통과해야 합니다.

클라이언트 데이터는 개발자 도구로 변경할 수 있으므로 교육용 개인 플레이에 적합합니다.

## 현재 환경의 검증 기록

의존성 설치 시 `registry.npmjs.org` DNS 조회가 `ENOTFOUND`로 실패했습니다. `npm run test`와 `npm run build`는 실행을 시도했으나 각각 Vitest/Vite 미설치로 완료하지 못했습니다. Node 기본 assertion으로 별도 수행한 3,000개 문제 생성, 1,000회 출제 선택, 보상 잠금·레벨 경계·저장 복구 검사는 통과했습니다. Vitest 테스트 파일도 Node assertion 어댑터로 실행해 검증했지만, 이는 실제 Vitest 실행이나 Vite 빌드 및 브라우저 검증을 대신하지 않습니다.

네트워크가 가능한 환경에서 `npm install`로 `package-lock.json`을 생성하고 커밋한 뒤 `npm run test`, `npm run build`를 실행해야 합니다. GitHub Actions의 `npm ci`도 이 잠금 파일이 있어야 동작합니다. 실제 브라우저와 배포 주소에서의 최종 검증은 아직 수행하지 못했습니다.
