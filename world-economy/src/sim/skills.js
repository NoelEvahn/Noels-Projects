// Skills (Annex C 1.1, Annex D 5.4).
import { SKILLS } from '../data/jobs.js';
import { BALANCE } from '../data/balance.js';

export function createSkills(ctx) {
  const S = () => ctx.state.skills;
  const defaults = () => Object.fromEntries(SKILLS.map((id) => [id, { xp: 0, level: 1 }]));
  const xpToNext = (level) => Math.round(BALANCE.xpBase * Math.pow(level, BALANCE.xpExp));
  const level = (id) => (S()[id] ? S()[id].level : 1);
  function addXp(id, amount) {
    const s = S()[id]; if (!s || amount <= 0) return 0;
    s.xp += amount;
    ctx.emit('skill:xp', { skillId: id, xp: s.xp, level: s.level, gained: amount });
    while (s.level < BALANCE.maxSkill && s.xp >= xpToNext(s.level)) { s.xp -= xpToNext(s.level); s.level++; ctx.emit('skill:levelUp', { skillId: id, level: s.level }); ctx.note('skill', 'Skill up', id + ' reached level ' + s.level); }
    if (s.level >= BALANCE.maxSkill) s.xp = 0;
    return amount;
  }
  const selects = { 'skills.all': () => Object.entries(S()).map(([id, s]) => ({ id, level: s.level, xp: s.xp, next: s.level >= BALANCE.maxSkill ? 0 : xpToNext(s.level) })) };
  return { defaults, level, addXp, xpToNext, selects, cmds: {} };
}
