# Impulse Responses

The guitar effects rack uses real convolution when `.wav` files are present in this folder. The app falls back gracefully (3-biquad cab sim, synthetic-noise reverb) if any are missing — nothing breaks.

## What's currently bundled

| File | Source | License | Notes |
|---|---|---|---|
| `cab/1x12.wav` | "Revalver Tweed-1x12 Deluxe" from the [650 Assorted Cabinet Impulses](https://musical-artifacts.com/artifacts/252) pack | **Public Domain** | Bright open-back tweed combo |
| `cab/2x12.wav` | "Revalver Brit-2x12 Brit" from the same pack | **Public Domain** | British 2×12, mid-forward |
| `cab/4x12.wav` | "Revalver Brit-4x12 Brit" from the same pack | **Public Domain** | Closed-back 4×12, classic British rock |
| `reverb.wav` | "Conner Plate I — Drum Stick Kit Medium" from [itsmusician/IR-Library](https://github.com/itsmusician/IR-Library) | **MIT** | Real plate reverb, ~4 sec tail |

Both sources are safely redistributable. The cab pack is in the public domain. The plate reverb IR is MIT-licensed (credit `itsmusician/IR-Library` in your project's NOTICES if you ship to end users).

## Replacing them

Drop your own files in with the same names (`cab/{1x12,2x12,4x12}.wav`, `reverb.wav`) — the loader picks them up at next effect-rack start.

For all three cab IRs to take effect together, the loader requires *all three* files present. If one is missing, the rack falls back to its 3-biquad approximation for all cabs and logs a console hint. (Reverb is independent.)

## What to look for in a replacement cab IR

- **Length:** 100–500 ms is typical. Longer files often include room ambience that can muddy a guitar tone.
- **Sample rate:** Anything works — `decodeAudioData` resamples to the AudioContext rate.
- **Format:** PCM `.wav`, 16 or 24 bit, mono or stereo. Mono is fine and saves CPU.

## Other free / permissively-licensed sources

For when you want to upgrade beyond the bundled ones:

**Cab IRs:**
- [Origin Effects free IR Cab Library](https://www.origineffects.com/) — pro-quality, free with email signup
- [Mesa Boogie OwnHammer](https://www.mesaboogie.com/) — free amp/cab pack
- [3 Sigma Audio free IRs](https://www.3sigmaaudio.com/free-impulse-responses/)
- [GuitarHack Catharsis](https://www.guitarhack.com/)

**Reverb IRs:**
- [EchoThief](http://www.echothief.com/) — CC-licensed real-space IRs
- [OpenAir](https://www.openair.hosted.york.ac.uk/) — university-hosted, mostly CC-BY
- [Voxengo IM Reverbs](https://www.voxengo.com/impulses/) — free, redistribution permitted with notice

## License notes

Most free IR packs are licensed for personal/commercial use in *processed audio output* but **not** redistribution of the IR files themselves. The two bundled here (Public Domain + MIT) are explicit exceptions and safe to ship. If you swap them out for files from a restricted pack, check that pack's terms before committing them to a public repo.
