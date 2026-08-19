import assert from 'node:assert/strict';
const M = await import('../docs/js/models.js');
const C = await import('../docs/js/cycler.js');
let n=0; const t=(m,f)=>{f();n++;console.log('  ok   '+m);};
/* Prompts are wrapped for reading, so every prompt assertion normalises whitespace first.
   Three tests broke on a line break before this existed. */
const flat = s => String(s).replace(/\s+/g, ' ');
const says = (text, phrase) => assert.ok(flat(text).includes(phrase),
  'prompt does not say: ' + phrase);

const book = o => Object.assign({ title:'A Work', subtitle:'', repo:'you/w', author:'A',
  description:'<p>a</p>' }, o||{});

t('three models, each a thin layer over ONE engine', () => {
  assert.deepEqual(Object.keys(M.MODELS).sort(), ['pench','tilasm','yadein']);
  for (const m of Object.values(M.MODELS)) {
    assert.ok(m.STEPS.length && m.context && m.doctor && m.block, m.id);
    assert.ok(m.STEPS.some(s => s.array), m.id + ' has no expanding step');
    assert.ok(m.STEPS.some(s => s.once), m.id + ' has no abstract');
    assert.ok(m.STEPS.some(s => s.binary && s.optional), m.id + ' has no optional binary step');
    for (const s of m.STEPS) assert.ok(s.expect, m.id + '/' + s.id + ' declares no expect');
  } });
t('the engine drives all three identically', () => {
  for (const m of Object.values(M.MODELS)) {
    const st = { book: book(), subjects: [{ id:'x1' }] };
    const k = M.nextTask(m, st);
    assert.equal(k.step, m.STEPS[0], m.id);
    const p = M.promptFor(m, st, k);
    assert.ok(!/\{\w+\}/.test(p), m.id + ' left a placeholder: ' + p.match(/\{\w+\}/)); } });

/* ── TILASM: a visitor is not on rails ── */
t('tilasm expands into stations with anchors and exits', () => {
  const st = { book: book({ mode:'headset' }), subjects:[{id:'s1'}] };
  const r = C.apply('[{"anchor":"the doorway","title":"Arrival","beat":"b","exits":["Hall"]},' +
    '{"anchor":"the hall","title":"Hall","beat":"b","exits":[]}]',
    { step: M.TILASM.STEPS[0], subject: st.subjects[0] }, st, M.TILASM.STEPS);
  assert.ok(r.ok); assert.equal(st.subjects.length, 2);
  assert.equal(st.subjects[0].anchor, 'the doorway'); });
t('tilasm REFUSES a piece nobody can move through', () => {
  const st = { book: book(), subjects:[
    {id:'a',title:'A',lead:'L',interaction:'I',comfort:'C',exits:[]}] };
  assert.ok(M.doctor(M.TILASM, st).some(x => /cannot move through/.test(x))); });
t('tilasm catches an exit to a station that is not there', () => {
  const st = { book: book(), subjects:[
    {id:'a',title:'A',lead:'L',interaction:'I',comfort:'C',exits:['Nowhere']}] };
  assert.ok(M.doctor(M.TILASM, st).some(x => /not a station here/.test(x))); });
t('tilasm demands a comfort note — motion sickness and reach are not optional', () => {
  const st = { book: book(), subjects:[{id:'a',title:'A',lead:'L',interaction:'I',exits:['a']}] };
  assert.ok(M.doctor(M.TILASM, st).some(x => /comfort note/.test(x)));
  assert.ok(M.TILASM.STEPS.find(s=>s.id==='comfort').prompt.match(/unwell|cannot stand|cannot hear/g).length >= 2); });
t('tilasm asks what happens if the visitor does nothing', () => {
  says(M.TILASM.STEPS.find(s=>s.id==='act').prompt, 'do nothing at all'); });

/* ── PENCH: this one can hurt somebody ── */
t('pench REFUSES a manoeuvre with no envelope, and says why', () => {
  const st = { book: book({platform:'a 6-axis arm'}),
    subjects:[{id:'m1',title:'Reach',lead:'L',precondition:'P',gap:'simulated only'}] };
  const f = M.doctor(M.PENCH, st);
  const e = f.find(x => /NO ENVELOPE/.test(x));
  assert.ok(e, f.join(' | '));
  assert.match(e, /moves in the world/); });
t('pench refuses to let an invented limit through — "not established" is required wording', () => {
  const p = M.PENCH.STEPS.find(s=>s.id==='envelope').prompt;
  says(p, 'not established');
  says(p, 'An invented limit is worse than an absent one'); });
t('pench catches a sim2real claim with no hardware run named', () => {
  const st = { book: book({platform:'arm'}), subjects:[{id:'m1',title:'T',lead:'L',
    precondition:'P',envelope:'limits stated',gap:'we transferred it sim2real successfully'}] };
  assert.ok(M.doctor(M.PENCH, st).some(x => /transfer without naming any hardware run/.test(x))); });
t('a sim2real claim WITH a hardware run passes', () => {
  const st = { book: book({platform:'arm'}), subjects:[{id:'m1',title:'T',lead:'L',
    precondition:'P',envelope:'limits stated',gap:'transferred, then run on the physical rig 40 times'}] };
  assert.ok(!M.doctor(M.PENCH, st).some(x => /transfer without/.test(x))); });
t('an unestablished limit with no recorded run is flagged — publish the gap or close it', () => {
  const st = { book: book({platform:'arm'}), subjects:[{id:'m1',title:'T',lead:'L',
    precondition:'P',envelope:'peak torque not established',gap:'simulated only'}] };
  assert.ok(M.doctor(M.PENCH, st).some(x => /Publish the gap, or close it/.test(x))); });
t('pench evidence is CAPTURED, never generated', () => {
  const e = M.PENCH.STEPS.find(s=>s.id==='evidence');
  says(e.prompt, 'not generated — it is captured');
  assert.equal(e.optional, true); });

/* ── YADEIN: it is somebody's life ── */
t('yadein publishes NOTHING that has not been marked', () => {
  const st = { book: book({publish:true}), subjects:[
    {id:'e1',title:'A',when:'1994',lead:'L',share:'public'},
    {id:'e2',title:'B',when:'1995',lead:'L'}] };
  const f = M.doctor(M.YADEIN, st);
  assert.ok(f.some(x => /not been marked private or public/.test(x)), f.join(' | ')); });
t('an unmarked entry NEVER reaches the payload', () => {
  const st = { book: book(), subjects:[
    {id:'e1',title:'Kept',when:'1994',lead:'L',share:'public'},
    {id:'e2',title:'Held back',when:'1995',lead:'L',share:'private'},
    {id:'e3',title:'Unmarked',when:'1996',lead:'L'}] };
  const p = M.buildPayload(M.YADEIN, st);
  const titles = Object.values(p.content).map(c => c.title);
  assert.deepEqual(titles, ['Kept']);
  assert.equal(p['index.json'].withheld, 2, 'the count of what was held back is recorded'); });
t('all-private is a valid answer, not an error to be argued out of', () => {
  const st = { book: book({publish:true}), subjects:[{id:'e1',title:'A',when:'1994',lead:'L',share:'private'}] };
  assert.ok(M.doctor(M.YADEIN, st).some(x => /valid answer — turn publishing off/.test(x))); });
t('yadein keeps WHEN it happened apart from when it was written', () => {
  const s = M.YADEIN.STEPS[0];
  says(s.prompt, 'may not be the order they were written');
  says(s.prompt, 'Do NOT sharpen a vague date');
  const st = { book: book(), subjects:[{id:'e1',title:'A',lead:'L'}] };
  assert.ok(M.doctor(M.YADEIN, st).some(x => /"Undated" is a date; guessing is not/.test(x))); });
t('yadein records, and is told not to interpret', () => {
  const d = M.YADEIN.STEPS.find(s=>s.id==='describe');
  says(d.prompt, 'do not interpret it, do not draw a lesson');
  says(d.prompt, 'keep the uncertainty'); });
t('yadein will not add a surname the material never gave', () => {
  says(M.YADEIN.STEPS.find(s=>s.id==='people').prompt,
    'Do not add surnames, roles or relationships it does not state'); });
t('yadein attachments already exist — they are found, not made', () => {
  says(M.YADEIN.STEPS.find(s=>s.id==='attach').prompt, 'This is not generated. It already exists'); });

/* ── payloads are kitab-shaped for all three ── */
t('every model builds a kitab-shaped payload with doi null', () => {
  for (const [id, m] of Object.entries(M.MODELS)) {
    const st = { book: book(), subjects:[{id:'a',title:'A',lead:'L',share:'public',
      interaction:'I',envelope:'E',hold:'H',exits:[],topics:['x']}] };
    const p = M.buildPayload(m, st), cfg = p['book.config.json'];
    assert.equal(cfg.meta.doi, null, id);
    assert.equal(cfg.meta.media.output, m.output, id);
    assert.equal(cfg.structure.chapters.length, 1, id);
    const blk = p.content['ch-01'].blocks.find(b => b.type === m.blockType);
    assert.ok(blk, id + ' has no ' + m.blockType + ' block');
    assert.ok(blk.tts === true && blk.seed.enabled === true, id + ' is not a talking artifact'); } });
t('no service is named in any model', () => {
  const blob = JSON.stringify(M.MODELS).toLowerCase();
  for (const v of ['openai','anthropic','claude','chatgpt','gemini','ollama','unity','unreal','ros2 ']) 
    assert.ok(!blob.includes(v), 'names ' + v); });

console.log(`\n  ===== ${n} pass, 0 fail =====`);
