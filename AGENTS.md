# OpenMausBot agent notes

Before claiming a server or conversation change works, follow
[`docs/verification/README.md`](docs/verification/README.md). Always launch an
isolated fixture; never verify mutations against the user's live app or data.

## Comments

Write a comment only for what the code cannot say:

- a license or attribution notice;
- a fact forced by something outside this code (a vendor, CLI, OS, browser,
  Electron or protocol behaviour), with its version when it has one;
- the doc comment of a public contract: the wire types in `shared/`, the
  driver interface, the preload bridge, `config.json` fields people edit;
- a link to an upstream issue;
- a security invariant or a known open risk.

Do not narrate what the next line does, restate a name, record history ("used
to", "no longer", PR or issue numbers, plan or slice names: git has it), point
at other files, draw banners or leave commented-out code. When our own code
needs a paragraph to explain a surprise, change the code instead: a better
name, a type, an extracted function, one shared helper. A rule ("never X",
"must match Y") belongs in a type, a test or a lint rule. Never suppress a lint
rule that guards correctness; fix the code.

More specific `AGENTS.md` files override this note within their directories.

This fork: code entry points are in `JUSTIN-MAP.md`; project background, branch rules and open questions are in `JUSTIN-MEMORY.md`.

Which branch a change goes on. Ask: with none of our requirements, would the
fork still need this change?

- Yes: `main-fmt`. Formatting, tests fixed to match the formatted source, build
  and packaging, switching auto-update off, the `justin/` tooling, fork docs.
  Upstream's own tests must keep passing on `main-fmt`.
- No, upstream works as it is: `justin-main`. Anything that changes what the app
  does or shows because 明昊 wants it, such as hiding the third-party
  subscription entries or giving each task its own worktree.

`git diff main-fmt justin-main` is then the full list of our requirements.
Never commit on `main`; it only fast-forwards to upstream.
