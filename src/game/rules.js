import { isCorrect } from './questions.js';
export const actions={hunger:'먹이 주기',cleanliness:'청소하기',affection:'놀아주기'};
export const clamp=value=>Math.max(0,Math.min(100,value));
export const WRONG_ANSWER_PENALTY = 5;
export function growth(xp, savedLevel = 1) { const level=Math.max(savedLevel,xp<50?1:xp<150?2:3); return level===1?{level:1,name:'알',image:'egg',start:0,next:50}:level===2?{level:2,name:'아기',image:'baby',start:50,next:150}:{level:3,name:'성체',image:'adult',start:150,next:null}; }
export function answerQuiz(state, answer) {
  if(!state.quiz || state.quiz.answered || !state.quiz.question.options.includes(answer)) return state;
  const correct=isCorrect(state.quiz.question,answer);
  const level=growth(state.pet.totalXp,state.pet.level).level;
  const totalXp=correct?Math.min(Number.MAX_SAFE_INTEGER,state.pet.totalXp+10):Math.max(0,state.pet.totalXp-WRONG_ANSWER_PENALTY);
  const pet=correct?{...state.pet,[state.quiz.action]:clamp(state.pet[state.quiz.action]+15),totalXp,level:growth(totalXp,level).level}:{...state.pet,totalXp,level};
  return {...state,pet,quiz:{...state.quiz,answered:true,selected:answer,correct,xpChange:totalXp-state.pet.totalXp}};
}
