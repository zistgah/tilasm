# CONTEXT — zistgah/tilasm

**What this is.** tilasm — the immersive cycler. AR, XR, VR. One of six cyclers classified by OUTPUT:

| | output |
|---|---|
| matba | print — books, papers |
| khwab | visual — images, skits, features, series |
| awaz | audio — songs, podcasts |
| tilasm | immersive — AR, XR, VR |
| pench | embodied — robotics, cyberphysical, sim2real, real2sim |
| yadein | record — multimodal diary, staggered, toward TransEg |

**How it runs.** `python3 zcycler.py serve` → studio at `http://127.0.0.1:8713/studio`. The
composing half is a static page and needs no server at all; the local server exists for the parts
that touch git, the DOI registrar and the filesystem.

**The loop.** Press 1 to copy the prompt into whichever AI you use; press 2 and it reads your
clipboard, routes the answer to the step it belongs to by its shape, files it, and copies the next
prompt. A binary artefact — a model, a recording, a photograph — returns through the artefact inbox
instead: you save it out of your AI, come back, and pick it out of what is newly visible.

**What this model refuses, and why.** See `CONTRACT.md` clause 8. Each refusal is in the code and
tested; none is advisory.

**Disclaimer.** Where a plate, a poster or a recording in this repository names a repository, a DOI
or a figure that does not exist, **the canon in `zistgah/governance` governs, not the artwork.** The
plates record intent; the contract records fact.
