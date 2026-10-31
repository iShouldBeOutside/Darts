# No Score audio

Drop your clip here as `0.wav` — exactly that name, in this folder.
Do not rename it to `.mp3`: the file is a .wav, and changing the
extension would not change its format.

The app plays `assets/0.wav` whenever a player submits a 0 in x01 or
cricket (with the bell sound toggle on).

Safe backup if you remove it later: if `0.wav` is missing, the app
speaks "No score" with the device's en-GB voice instead. No code
change is needed either way, and removing the file never breaks the
app — it just goes back to speaking.

The file is listed in the service worker precache, but a missing file
there is tolerated (see service-worker.js), so removing it will not
break installing or updating the app either.
