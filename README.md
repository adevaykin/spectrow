# spectrow
Real-time spectrogram based on WebGL.

## How to use

1. Load `spectrow.js` to the page and call `var spc = new Spectrow('glCanvas')` where `glCanvas` is the _id_ of the canvas element that should contain the spectrogram.
2. Call `spc.addLines(lines);` to add spectrogram data.
3. Call `spc.updateRender();` to render new frame with the most recent data.

Have a look at demo page for details.
