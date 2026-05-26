const STREAM_URL   = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
const METADATA_URL = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';

const audio          = document.getElementById('audio');
const btnPlayPause   = document.getElementById('btn-play-pause');
const iconPlay       = document.getElementById('icon-play');
const iconPause      = document.getElementById('icon-pause');
const volumeSlider   = document.getElementById('volume');
const trackTitle     = document.getElementById('track-title');
const trackArtist    = document.getElementById('track-artist');
const trackAlbum     = document.getElementById('track-album');
const albumArt       = document.getElementById('album-art');
const statusEl       = document.getElementById('status');
const elapsedEl      = document.getElementById('elapsed-time');
const ratingArea     = document.getElementById('rating-area');
const btnThumbsUp    = document.getElementById('btn-thumbs-up');
const btnThumbsDown  = document.getElementById('btn-thumbs-down');
const thumbsUpCount  = document.getElementById('thumbs-up-count');
const thumbsDownCount = document.getElementById('thumbs-down-count');

let hls               = null;
let isPlaying         = false;
let currentTrackId    = null;
let userVote          = 0; // 0=none, 1=up, -1=down
let lastDisplayedTime = 0;
let metadataInterval  = null;
let lastTrackKey      = '';

// ── HLS player ───────────────────────────────────────────────────────────────

function startStream() {
  setStatus('Connecting…', '');

  if (Hls.isSupported()) {
    hls = new Hls({ enableWorker: true });
    hls.loadSource(STREAM_URL);
    hls.attachMedia(audio);
    hls.on(Hls.Events.MANIFEST_PARSED, () => audio.play());
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) {
        setStatus('Stream error — retrying…', 'error');
        hls.destroy();
        hls = null;
        setTimeout(startStream, 3000);
      }
    });
  } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    audio.src = STREAM_URL;
    audio.play();
  } else {
    setStatus('HLS playback is not supported in this browser.', 'error');
    return;
  }
}

function stopStream() {
  isPlaying = false;
  audio.pause();
  if (hls) { hls.destroy(); hls = null; }
  audio.src = '';
  setPlayingUI(false);
  setStatus('Stopped', '');
}

btnPlayPause.addEventListener('click', () => {
  isPlaying ? stopStream() : startStream();
});

audio.addEventListener('playing', () => {
  isPlaying = true;
  setPlayingUI(true);
  setStatus('Streaming live · 24-bit / 48 kHz lossless', 'playing');
});

audio.addEventListener('timeupdate', () => {
  if (!isPlaying) return;
  const t = audio.currentTime;
  if (t < lastDisplayedTime) return;
  lastDisplayedTime = t;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  elapsedEl.textContent = h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${m}:${String(s).padStart(2,'0')}`;
});

audio.addEventListener('waiting', () => setStatus('Buffering…', ''));

volumeSlider.addEventListener('input', () => {
  audio.volume = volumeSlider.value;
});

function setPlayingUI(playing) {
  iconPlay.classList.toggle('hidden', playing);
  iconPause.classList.toggle('hidden', !playing);
  btnPlayPause.setAttribute('aria-label', playing ? 'Stop' : 'Play');
}

function setStatus(msg, cls) {
  statusEl.textContent = msg;
  statusEl.className   = 'status' + (cls ? ' ' + cls : '');
}

// ── Ratings ──────────────────────────────────────────────────────────────────

function renderVotes(thumbsUp, thumbsDown, voted) {
  thumbsUpCount.textContent   = thumbsUp;
  thumbsDownCount.textContent = thumbsDown;
  userVote = voted;

  btnThumbsUp.classList.toggle('voted', voted === 1);
  btnThumbsDown.classList.toggle('voted', voted === -1);
}

async function fetchVotes() {
  if (!currentTrackId) return;
  try {
    const res  = await fetch(`/api/ratings/${currentTrackId}`);
    const data = await res.json();
    renderVotes(data.thumbsUp, data.thumbsDown, data.userVote);
  } catch (err) {
    console.error('Failed to fetch votes', err);
  }
}

async function submitVote(vote) {
  if (!currentTrackId) return;
  try {
    const res  = await fetch(`/api/ratings/${currentTrackId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ vote }),
    });
    const data = await res.json();
    if (data.ok) renderVotes(data.thumbsUp, data.thumbsDown, data.userVote);
  } catch (err) {
    console.error('Failed to submit vote', err);
  }
}

btnThumbsUp.addEventListener('click',   () => submitVote(1));
btnThumbsDown.addEventListener('click', () => submitVote(-1));

// ── Metadata ─────────────────────────────────────────────────────────────────

async function fetchMetadata() {
  try {
    const res  = await fetch(METADATA_URL);
    const data = await res.json();

    const trackKey = `${data.artist}|${data.title}`;
    if (trackKey !== lastTrackKey) {
      lastTrackKey = trackKey;
      albumArt.src = `https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg?t=${Date.now()}`;
      await logSong(data.title, data.artist, data.album);
    }

    trackTitle.textContent  = data.title  || '—';
    trackArtist.textContent = data.artist || '';
    trackAlbum.textContent  = [data.album, data.date].filter(Boolean).join(' · ');

    const recent = [];
    for (let i = 1; i <= 5; i++) {
      const artist = data[`prev_artist_${i}`];
      const title  = data[`prev_title_${i}`];
      if (artist && title) recent.push({ artist, title });
    }
    renderRecentTracks(recent);
  } catch (err) {
    console.error('Failed to fetch metadata', err);
  }
}

async function logSong(title, artist, album) {
  try {
    const res  = await fetch('/api/tracks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, artist, album, stream_url: STREAM_URL }),
    });
    const data = await res.json();
    currentTrackId = data.id;
    userVote = 0;
    ratingArea.classList.remove('hidden');
    await fetchVotes();
  } catch (err) {
    console.error('Failed to log song', err);
  }
}

// Poll continuously from page load so rating is always current
metadataInterval = setInterval(fetchMetadata, 15000);
fetchMetadata();

// ── Recently Played ───────────────────────────────────────────────────────────

function renderRecentTracks(tracks) {
  const list = document.getElementById('recent-tracks');
  if (!tracks.length) return;
  list.innerHTML = tracks.map(t => `
    <li>
      <span class="rp-artist">${esc(t.artist)}</span><span class="rp-sep">—</span><span class="rp-title">${esc(t.title)}</span>
    </li>
  `).join('');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
