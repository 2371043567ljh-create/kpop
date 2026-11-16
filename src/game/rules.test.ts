import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStatDeltas,
  buildPlayerProfile,
  buildRoleLabel,
  calculateEffectiveDeltas,
  computeInitialStats,
  createSaveData,
  parseSaveData,
  validateCharacterSetup,
} from './rules';
import {
  applyResolutionToState,
  getActScene,
  resolvePresetChoice,
} from './prologueScript';

test('Character validation enforces realName and rejects duplicate dual roles', () => {
  const emptyName = validateCharacterSetup({
    realName: '   ',
    stageName: '',
    track: 'boy',
    agency: 'sm',
    roleMode: 'dual',
    primaryRole: 'vocal',
    secondaryRole: 'dance',
  });
  assert.equal(emptyName.valid, false);

  const duplicateRoles = validateCharacterSetup({
    realName: '林星',
    stageName: 'XIN',
    track: 'girl',
    agency: 'jyp',
    roleMode: 'dual',
    primaryRole: 'dance',
    secondaryRole: 'dance',
  });
  assert.equal(duplicateRoles.valid, false);

  const validDual = validateCharacterSetup({
    realName: '林星',
    stageName: 'XIN',
    track: 'girl',
    agency: 'jyp',
    roleMode: 'dual',
    primaryRole: 'dance',
    secondaryRole: 'vocal',
  });
  assert.equal(validDual.valid, true);
});

test('Role label formats dual and ACE routes accurately', () => {
  assert.equal(buildRoleLabel('dual', 'dance', 'vocal'), '主舞 + 领唱');
  assert.equal(buildRoleLabel('dual', 'stage', 'rap'), '舞台核心/中心位 + 副 Rap');
  assert.equal(buildRoleLabel('ace', null, null), '全能 ACE（高危路线）');
});

test('Initial stats apply agency bonuses and dual vs ACE rules accurately', () => {
  // SM + Main Vocal (+22) + Lead Dancer (+12)
  const smDual = computeInitialStats('sm', 'dual', 'vocal', 'dance');
  assert.equal(smDual.vocal, 40 + 18 + 22); // 80
  assert.equal(smDual.dance, 40 + 12); // 52
  assert.equal(smDual.stage, 40 + 10); // 50
  assert.equal(smDual.controversy, 5 + 5); // 10

  // HYBE + ACE (+10 all 4, stamina max -10)
  const hybeAce = computeInitialStats('hybe', 'ace', null, null);
  assert.equal(hybeAce.vocal, 50);
  assert.equal(hybeAce.dance, 40 + 18 + 10); // 68
  assert.equal(hybeAce.rap, 50);
  assert.equal(hybeAce.stage, 40 + 10 + 10); // 60
  assert.equal(hybeAce.maxStamina, 90);

  // JYP + Dual
  const jypDual = computeInitialStats('jyp', 'dual', 'stage', 'vocal');
  assert.equal(jypDual.publicFavor, 20 + 20); // 40
  assert.equal(jypDual.vocal, 40 + 7 + 12); // 59
  assert.equal(jypDual.stage, 40 + 7 + 22); // 69

  // YG + Dual
  const ygDual = computeInitialStats('yg', 'dual', 'rap', 'stage');
  assert.equal(ygDual.rap, 40 + 18 + 22); // 80
  assert.equal(ygDual.stage, 40 + 12 + 12); // 64
});

test('ACE route applies extra stamina drain on high intensity actions and harsher flaw penalties', () => {
  const normalDrain = calculateEffectiveDeltas({ stamina: -20 }, 'sm', false, true);
  const aceDrain = calculateEffectiveDeltas({ stamina: -20 }, 'sm', true, true);
  assert.equal(normalDrain.stamina, -20);
  assert.equal(aceDrain.stamina, -26); // 20 * 1.28 = 25.6 -> 26

  const aceProfile = buildPlayerProfile({
    realName: '韩叙',
    stageName: '',
    track: 'boy',
    agency: 'yg',
    roleMode: 'ace',
    primaryRole: null,
    secondaryRole: null,
  });
  const aceStats = computeInitialStats('yg', 'ace', null, null);
  const res = resolvePresetChoice(1, 'act1_stop', aceProfile, aceStats);
  assert.equal(res.outcomeTier, 'flawed');
  assert.ok((res.appliedDeltas.controversy ?? 0) >= 15);
  assert.ok((res.appliedDeltas.publicFavor ?? 0) <= -10);
});

test('Full 5-act prologue playthrough awards keepsake in Act 3, Theqoo post in Act 4, and serializes cleanly', () => {
  const profile = buildPlayerProfile({
    realName: '沈昭',
    stageName: 'ZHAO',
    track: 'girl',
    agency: 'sm',
    roleMode: 'dual',
    primaryRole: 'vocal',
    secondaryRole: 'stage',
  });
  let stats = computeInitialStats('sm', 'dual', 'vocal', 'stage');
  let tags: string[] = [];
  const history = [];

  for (let act = 1; act <= 5; act++) {
    const scene = getActScene(act, profile);
    assert.ok(scene.paragraphs.length >= 3, `Act ${act} must have rich paragraphs`);
    assert.ok(scene.choices.length >= 3, `Act ${act} must have >= 3 choices`);
    const resolution = resolvePresetChoice(act, scene.choices[0].id, profile, stats);
    const updated = applyResolutionToState(stats, tags, resolution);
    stats = updated.nextStats;
    tags = updated.nextTags;
    history.push(resolution);
  }

  assert.ok(history[2].keepsakeAwarded, 'Act 3 must award a keepsake');
  assert.ok(history[3].theqooPost, 'Act 4 must generate a Theqoo post');
  assert.equal(history[3].theqooPost?.comments.length, 5);

  const save = createSaveData({
    player: profile,
    stats,
    keepsake: history[2].keepsakeAwarded ?? null,
    behaviorTags: tags,
    theqooPost: history[3].theqooPost ?? null,
    currentAct: 5,
    completed: true,
    history,
  });

  const jsonStr = JSON.stringify(save);
  const parsed = parseSaveData(jsonStr);
  assert.ok(parsed);
  assert.equal(parsed?.player.displayName, 'ZHAO');
  assert.equal(parsed?.futureChapters.unlocked, false);
  assert.equal(parsed?.futureChapters.plannedTotalChapters, 5);
  assert.equal(parsed?.prologueProgress.completed, true);
});
