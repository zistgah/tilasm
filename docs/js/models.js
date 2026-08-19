/* models.js — the three new cyclers, as thin models over the shared engine.
 *
 * The engine (cycler.js) and the artefact inbox (inbox.js) are identical everywhere. A cycler is
 * only ever: a list of steps, a context builder, a doctor, and a payload shape. Everything below is
 * that and nothing more.
 *
 * The five cyclers are classified by OUTPUT:
 *
 *   matba   print      books, papers
 *   awaz    audio      songs, podcasts
 *   khwab   visual     images, skits, features, series
 *   tilasm  immersive  AR, XR, VR
 *   pench   embodied   robotics, cyberphysical, sim2real, real2sim
 *   yadein  record     multimodal diary, staggered, toward TransEg
 */
import { fill, queue, apply, progress } from './cycler.js';

export const slugify = s => String(s).toLowerCase().replace(/\.[a-z0-9]+$/, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-') || 'item';

const common = (state, subject, extra) => {
  const i = state.subjects.indexOf(subject), s = subject || {};
  return Object.assign({
    book: state.book.title || 'this work',
    subtitle: state.book.subtitle ? ' — ' + state.book.subtitle : '',
    count: state.subjects.length,
    n: i + 1,
    title: s.title || 'untitled',
    lead: s.lead || '',
    toc: state.subjects.map((x, k) => `${k + 1}. ${x.title || 'untitled'}`).join('\n')
  }, extra || {});
};

const ABSTRACT = (unit, units) => ({
  id: 'abstract', title: 'The abstract', target: '@description', once: true, expect: 'text',
  prompt:
`Write the deposit abstract for "{book}"{subtitle}, ${units} in {count} ${unit}s, as 2–3 HTML
paragraphs in <p> tags. State what the work contains, not why it matters. No first person, no
marketing language. Preserve any hedging the work itself uses.

${unit[0].toUpperCase() + unit.slice(1)}s:
{toc}

Reply with the HTML only.` });

const INDEX = unit => ({
  id: 'index', title: 'Title and index terms', target: 'topics', expect: 'text', jsonKeys: ['topics'],
  prompt:
`Same ${unit}. Reply with ONLY this JSON:

{"title":"…","subtitle":"…","topics":["…","…","…"]}

topics: 3–5 lowercase index terms taken from the work's own vocabulary.` });

/* ══════════════════════════════════════════════════════════════════════════
 * TILASM (طلسم) — the immersive cycler. AR, XR, VR.
 *
 * The unit is a STATION: somewhere a person stands, looks and acts. A station is not a shot; it has
 * no duration of its own, because the visitor decides how long to stay. What it has instead is a
 * place, a thing to do, and a way out.
 * ════════════════════════════════════════════════════════════════════════ */
export const TILASM = {
  id: 'tilasm', unit: 'station', units: 'stations', output: 'immersive',
  mediaKind: 'scene', blockType: 'scene',
  STEPS: [
    { id: 'stations', title: 'Lay out the stations', target: 'stations', array: true,
      expect: 'text', jsonKeys: ['anchor', 'title'],
      prompt:
`You are laying out an immersive piece, "{book}"{subtitle}, for {mode}.

Break it into stations: places a visitor stands, looks and acts. Reply with ONLY a JSON array, in
the order a visitor meets them:

[{"anchor":"…","title":"…","beat":"…","exits":["…"]}]

anchor: where it is — a room, a surface, a marker, a world coordinate, "wherever the visitor is".
title: how a contents list would name it, under 60 characters.
beat: one clause naming what changes there.
exits: the stations a visitor can reach from it. A visitor is not on rails.
If it is a single unbroken space, return an array of length 1.` },

    { id: 'describe', title: 'Describe the place', target: 'lead', expect: 'text',
      prompt:
`Station {n} of "{book}", anchored at {anchor}, titled "{title}".

Write ONE paragraph of 50–90 words describing what a visitor sees and hears standing there, in the
vocabulary the piece itself uses. Say what is there; do not say it is immersive or breathtaking.

Reply with the paragraph only.` },

    { id: 'act', title: 'What the visitor does', target: 'interaction', expect: 'text',
      prompt:
`Same station: "{title}" at {anchor}.

Write ONE paragraph of 50–90 words naming what the visitor can DO here and what answers them. Name
the input plainly — gaze, a hand, a controller, a step, a spoken word — and say what happens if they
do nothing at all, because most visitors will.

Already written:
{lead}

Reply with the paragraph only.` },

    { id: 'comfort', title: 'Comfort and reach', target: 'comfort', expect: 'text',
      prompt:
`Same station. In 40–80 words, state plainly:

— whether the visitor moves, and how (teleport, smooth locomotion, stationary);
— anything that could make someone unwell, and what mitigates it;
— what a visitor who cannot stand, cannot use both hands, or cannot hear does instead;
— the floor space this station needs.

If a hazard has no mitigation, say so rather than inventing one.

Reply with the paragraph only.` },

    INDEX('station'), ABSTRACT('station', 'an immersive piece'),

    { id: 'asset', title: 'A model or a panorama for the station', target: 'asset',
      expect: 'model', optional: true, binary: true,
      prompt:
`Make the visual for station {n} of "{book}", "{title}" at {anchor}.

{lead}

One asset: a glTF/GLB model, or a 360 panorama if the station is a place rather than an object. When
it is made, save it to your device and come back — the studio will show what is newly visible in
your folder and you pick it.` }
  ],
  context: (st, s) => common(st, s, {
    anchor: (s && s.anchor) || 'wherever the visitor is',
    mode: st.book.mode || 'headset and handheld alike'
  }),
  doctor(st) {
    const f = [];
    if (!st.subjects.length) f.push('No stations yet. Run the first step.');
    const ids = st.subjects.map(x => x.id);
    new Set(ids.filter(x => ids.filter(y => y === x).length > 1)).forEach(x => f.push('Duplicate station id: ' + x));
    st.subjects.forEach((s, i) => {
      if (!s.title) f.push('Station ' + (i + 1) + ' has no title.');
      if (!s.lead) f.push('Station ' + (i + 1) + ' has no description.');
      if (!s.interaction) f.push('Station ' + (i + 1) + ' says nothing about what the visitor does.');
      if (!s.comfort) f.push('Station ' + (i + 1) + ' has no comfort note — say what it needs, even if the answer is nothing.');
      for (const e of (s.exits || []))
        if (!ids.includes(e) && !st.subjects.some(x => slugify(x.title) === slugify(e)))
          f.push('Station ' + (i + 1) + ' exits to "' + e + '", which is not a station here.');
    });
    if (st.subjects.length && !st.subjects.some(s => (s.exits || []).length))
      f.push('No station leads anywhere. An immersive piece a visitor cannot move through is a picture.');
    return f;
  },
  block: (s, b) => ({ type: 'scene', id: s.id, anchor: s.anchor || '',
    src: s.asset ? 'assets/scenes/' + s.id + '.glb' : null,
    poster: 'assets/figures/' + s.id + '.png',
    exits: s.exits || [], interaction: s.interaction || '', comfort: s.comfort || '',
    alt: s.title, caption: s.subtitle ? s.title + ' — ' + s.subtitle : s.title })
};

/* ══════════════════════════════════════════════════════════════════════════
 * PENCH (پیچ) — the embodied cycler. Robotics, cyberphysical, sim2real, real2sim.
 *
 * The unit is a MANOEUVRE. What separates this from every other cycler is that the artefact can
 * move and can hurt somebody. So the envelope is not an optional field: a manoeuvre without a stated
 * envelope fails the doctor, and a manoeuvre claimed on hardware without an observation fails too.
 * ════════════════════════════════════════════════════════════════════════ */
export const PENCH = {
  id: 'pench', unit: 'manoeuvre', units: 'manoeuvres', output: 'embodied',
  mediaKind: 'run', blockType: 'run',
  STEPS: [
    { id: 'manoeuvres', title: 'Break it into manoeuvres', target: 'manoeuvres', array: true,
      expect: 'text', jsonKeys: ['title', 'precondition'],
      prompt:
`You are documenting embodied work, "{book}"{subtitle}, on {platform}.

Break it into manoeuvres. Reply with ONLY a JSON array, in the order they are performed:

[{"title":"…","precondition":"…","beat":"…"}]

title: how a runbook would name it, under 60 characters.
precondition: what must already be true before it may start.
beat: one clause naming what changes.
If it is one continuous manoeuvre, return an array of length 1.` },

    { id: 'describe', title: 'Describe the manoeuvre', target: 'lead', expect: 'text',
      prompt:
`Manoeuvre {n} of "{book}" on {platform}: "{title}".
Precondition: {precondition}

Write ONE paragraph of 50–90 words describing what the system does, in the vocabulary the work uses.
Name the actuators and the sensors that matter. Say what happens, not that it is impressive.

Reply with the paragraph only.` },

    { id: 'envelope', title: 'The envelope', target: 'envelope', expect: 'text',
      prompt:
`Same manoeuvre: "{title}".

State the operating envelope in 60–110 words. Be specific and refuse to guess:

— the limits it must stay inside (reach, force, speed, torque, temperature, current, altitude);
— what is in range of it, including people, and how they are kept out;
— how it is stopped, by whom, and how quickly;
— what happens if power, network or a sensor is lost mid-manoeuvre;
— what it must NOT be run near.

Where a limit is not known, write "not established" rather than a plausible number. An invented
limit is worse than an absent one.

Reply with the paragraph only.` },

    { id: 'gap', title: 'Simulation against reality', target: 'gap', expect: 'text',
      prompt:
`Same manoeuvre.

In 50–90 words: what was run in simulation, what was run on hardware, and where they disagreed.
Name the disagreement rather than smoothing it — friction, latency, compliance, sensor noise,
backlash, thermal drift. If it has only ever been simulated, say exactly that. If it has only run on
hardware, say that. Do not describe a sim2real transfer that has not happened.

Reply with the paragraph only.` },

    INDEX('manoeuvre'), ABSTRACT('manoeuvre', 'embodied work'),

    { id: 'evidence', title: 'A recording or log of a run', target: 'evidence',
      expect: 'any', optional: true, binary: true,
      prompt:
`Bring back evidence of manoeuvre {n}, "{title}": a recording of a run, a log, a bag file, a plot.

This is not generated — it is captured. Run it, record it, save it, and come back: the studio will
show what is newly visible in your folder and you pick it.` }
  ],
  context: (st, s) => common(st, s, {
    platform: st.book.platform || 'the platform',
    precondition: (s && s.precondition) || 'not stated'
  }),
  doctor(st) {
    const f = [];
    if (!st.book.platform) f.push('No platform named. Say what this runs on.');
    if (!st.subjects.length) f.push('No manoeuvres yet. Run the first step.');
    st.subjects.forEach((s, i) => {
      const at = 'Manoeuvre ' + (i + 1);
      if (!s.title) f.push(at + ' has no title.');
      if (!s.lead) f.push(at + ' has no description.');
      if (!s.precondition) f.push(at + ' has no precondition.');
      // The one check that is not about tidiness.
      if (!s.envelope) f.push(at + ' has NO ENVELOPE. This moves in the world; state its limits, how it stops, and what is in range.');
      if (!s.gap) f.push(at + ' does not say what was simulated and what was run.');
      if (s.gap && /sim2real|transferred/i.test(s.gap) && !/hardware|on the robot|on the rig|physical/i.test(s.gap))
        f.push(at + ' claims a transfer without naming any hardware run.');
      if (s.envelope && /\bnot established\b/i.test(s.envelope) && !s.evidence)
        f.push(at + ' has an unestablished limit and no recorded run. Publish the gap, or close it.');
    });
    return f;
  },
  block: (s, b) => ({ type: 'run', id: s.id,
    src: s.evidence ? 'assets/runs/' + s.id : null,
    poster: 'assets/figures/' + s.id + '.png',
    precondition: s.precondition || '', envelope: s.envelope || '', gap: s.gap || '',
    platform: b.platform || '', alt: s.title,
    caption: s.subtitle ? s.title + ' — ' + s.subtitle : s.title })
};

/* ══════════════════════════════════════════════════════════════════════════
 * YADEIN (یادیں) — the record. A multimodal diary that becomes a staggered upload.
 *
 * Unlike every other cycler, this one is ABOUT A PERSON, and it is theirs. So it inverts the
 * default: nothing is published unless the entry is marked for it, one entry at a time, and the
 * doctor refuses to build a deposit that contains an unmarked entry. A record that leaks is not a
 * record; it is an incident.
 *
 * It is also the only cycler where entries arrive out of order and late. The unit carries a WHEN
 * separate from when it was written, because a memory recorded in 2026 may be of 1994.
 * ════════════════════════════════════════════════════════════════════════ */
export const YADEIN = {
  id: 'yadein', unit: 'entry', units: 'entries', output: 'record',
  mediaKind: 'entry', blockType: 'entry', privateByDefault: true,
  STEPS: [
    { id: 'entries', title: 'Separate the entries', target: 'entries', array: true,
      expect: 'text', jsonKeys: ['when', 'title'],
      prompt:
`Here is material for a record, "{book}"{subtitle}.

Separate it into entries. Reply with ONLY a JSON array, in the order things happened — which may not
be the order they were written:

[{"when":"1994-08","title":"…","beat":"…"}]

when: as precise as the material actually supports. "1994", "1994-08", "1994-08-13", "some summer in
the nineties". Do NOT sharpen a vague date into a precise one.
title: how an index would name it, under 60 characters.
beat: one clause naming what happened.
If it is one entry, return an array of length 1.` },

    { id: 'describe', title: 'What happened', target: 'lead', expect: 'text',
      prompt:
`Entry {n} of "{book}": "{title}", {when}.

Write ONE paragraph of 50–110 words recording what happened, in the words the material uses. Record
it; do not interpret it, do not draw a lesson from it, and do not add a detail the material does not
contain. Where the material is uncertain, keep the uncertainty.

Reply with the paragraph only.` },

    { id: 'hold', title: 'What is worth holding', target: 'hold', expect: 'text',
      prompt:
`Same entry: "{title}", {when}.

In 40–90 words, name what is worth holding on to here and why — a fact, a face, a decision, a
turning. This is the part a later reader, or a later you, would want kept.

Already written:
{lead}

Reply with the paragraph only.` },

    { id: 'people', title: 'Who is in it', target: 'people', expect: 'text',
      jsonKeys: ['people'],
      prompt:
`Same entry. Reply with ONLY this JSON:

{"people":["…"],"places":["…"],"topics":["…"]}

people: named only as the material names them. Do not add surnames, roles or relationships it does
not state. If someone is unnamed there, leave them unnamed here.` },

    ABSTRACT('entry', 'a record'),

    { id: 'attach', title: 'Attach a photograph, a voice note, a scan', target: 'attachment',
      expect: 'any', optional: true, binary: true,
      prompt:
`Find what belongs with entry {n}, "{title}" ({when}) — a photograph, a voice note, a scan, a
document, a video.

This is not generated. It already exists. Bring it to the studio and pick it out of your folder.` }
  ],
  context: (st, s) => common(st, s, { when: (s && s.when) || 'undated' }),
  doctor(st) {
    const f = [];
    if (!st.subjects.length) f.push('No entries yet.');
    st.subjects.forEach((s, i) => {
      const at = 'Entry ' + (i + 1);
      if (!s.title) f.push(at + ' has no title.');
      if (!s.when) f.push(at + ' has no date, however vague. "Undated" is a date; guessing is not.');
      if (!s.lead) f.push(at + ' has nothing recorded.');
    });
    // The inversion: this is a life, not a poster set.
    const unmarked = st.subjects.filter(s => s.share !== 'public' && s.share !== 'private');
    if (st.book.publish && unmarked.length)
      f.push(unmarked.length + ' ' + (unmarked.length === 1 ? 'entry has' : 'entries have') +
             ' not been marked private or public. Nothing is published until every entry is marked.');
    const pub = st.subjects.filter(s => s.share === 'public');
    if (st.book.publish && !pub.length)
      f.push('Every entry is marked private, so there is nothing to publish. That is a valid answer — turn publishing off.');
    return f;
  },
  /** Only what the person marked public ever leaves the machine. */
  publishable(st) { return st.subjects.filter(s => s.share === 'public'); },
  block: (s, b) => ({ type: 'entry', id: s.id, when: s.when || '',
    src: s.attachment ? 'assets/entries/' + s.id : null,
    people: s.people || [], places: s.places || [],
    hold: s.hold || '', alt: s.title,
    caption: s.subtitle ? s.title + ' — ' + s.subtitle : s.title })
};

export const MODELS = { tilasm: TILASM, pench: PENCH, yadein: YADEIN };

/* ── one driver for all three, over the shared engine ── */
export function nextTask(model, st) {
  const q = queue(st.subjects, model.STEPS, st.book);
  return q.length ? q[0] : null;
}
export function promptFor(model, st, task) {
  return fill(task.step.prompt, model.context(st, task.subject));
}
export function doctor(model, st) {
  const f = [];
  if (!st.book.title) f.push('No title.');
  if (!st.book.description) f.push('No abstract. A deposit with a blank abstract is permanent too.');
  if (!/^[^/\s]+\/[^/\s]+$/.test(st.book.repo || '')) f.push('Repository must be owner/name.');
  return f.concat(model.doctor(st));
}
export { apply, progress };

/** Kitab-shaped, like every other cycler: only the block type differs. */
export function buildPayload(model, st) {
  const b = st.book;
  const subs = model.publishable ? model.publishable(st) : st.subjects;
  const chapters = [], content = {}, parts = [];
  const partOf = s => s.part || (model.units[0].toUpperCase() + model.units.slice(1));
  let n = 0;
  for (const title of [...new Set(subs.map(partOf))]) {
    const ids = [];
    for (const s of subs.filter(x => partOf(x) === title)) {
      n++; const cid = 'ch-' + String(n).padStart(2, '0');
      const blocks = [{ type: 'paragraph', text: s.lead },
        Object.assign(model.block(s, b), { explanation: s.interaction || s.envelope || s.hold || s.lead,
          tts: true, seed: { enabled: true, prompt: fill(b.seedPrompt || '', model.context(st, s)) } })];
      if (b.plateNote) blocks.push({ type: 'callout', variant: 'note', text: b.plateNote });
      content[cid] = { id: cid, title: s.title, subtitle: s.subtitle || '', blocks };
      chapters.push({ id: cid, number: n, title: s.title, subtitle: s.subtitle || '',
                      source: 'content/' + cid + '.json', topics: s.topics || [] });
      ids.push(s.id);
    }
    parts.push({ id: slugify(title), title, chapters: ids });
  }
  return {
    'book.config.json': {
      meta: { title: b.title, subtitle: b.subtitle || '', author: b.author, affiliation: b.affiliation,
              orcid: b.orcid, copyright: `Copyright (c) ${b.copyrightYears || '1993-2026'} ${b.author}. All rights reserved.`,
              license: b.license || 'CC-BY-SA-4.0', doi: null, repo: b.repo,
              cover: 'assets/figures/cover.png', language: 'en',
              media: { kind: model.mediaKind, output: model.output } },
      theme: { tokens: b.tokens || { '--ink': '#0a0e27', '--acc': '#d4a843', '--light': '#fbf6e9' } },
      structure: { parts, chapters }
    },
    'index.json': { generator: model.id, book: b.title, kind: model.output,
                    withheld: model.publishable ? st.subjects.length - subs.length : 0,
                    items: subs.map((s, i) => ({ chapter: 'ch-' + String(i + 1).padStart(2, '0'),
                                                 id: s.id, title: s.title })) },
    content, chapterCount: chapters.length
  };
}
