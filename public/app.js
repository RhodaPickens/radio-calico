const STREAM_URL = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';

const audio        = document.getElementById('audio');
const btnPlayPause = document.getElementById('btn-play-pause');
const iconPlay     = document.getElementById('icon-play');
const iconPause    = document.getElementById('icon-pause');
const volumeSlider = document.getElementById('volume');
const trackTitle   = document.getElementById('track-title');
const trackArtist  = document.getElementById('track-artist');
const trackAlbum   = document.getElementById('track-album');
const albumArt     = document.getElementById('album-art');
const statusEl     = document.getElementById('status');
const elapsedEl    = document.getElementById('elapsed-time');
const ratingArea   = document.getElementById('rating-area');
const stars        = document.querySelectorAll('.star');

let hls              = null;
let isPlaying        = false;
let currentTrackId   = null;
let currentRating    = 0;
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
    // Native HLS (Safari)
    audio.src = STREAM_URL;
    audio.play();
  } else {
    setStatus('HLS playback is not supported in this browser.', 'error');
    return;
  }

  logSession();
}

function stopStream() {
  isPlaying = false;
  audio.pause();
  if (hls) { hls.destroy(); hls = null; }
  audio.src = '';
  setPlayingUI(false);
  setStatus('Stopped', '');
  stopMetadataPolling();
  currentTrackId = null;
  currentRating  = 0;
  renderStars(0);
  ratingArea.classList.add('hidden');
}

btnPlayPause.addEventListener('click', () => {
  isPlaying ? stopStream() : startStream();
});

audio.addEventListener('playing', () => {
  isPlaying = true;
  setPlayingUI(true);
  setStatus('Streaming live · 24-bit / 48 kHz lossless', 'playing');
  startMetadataPolling();
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

// ── Session logging ──────────────────────────────────────────────────────────

async function logSession() {
  try {
    const res  = await fetch('/api/tracks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ stream_url: STREAM_URL }),
    });
    const data = await res.json();
    currentTrackId = data.id;
    currentRating  = 0;
    renderStars(0);
    ratingArea.classList.remove('hidden');
  } catch (err) {
    console.error('Failed to log session', err);
  }
}

// ── Ratings ──────────────────────────────────────────────────────────────────

stars.forEach(star => {
  star.addEventListener('mouseenter', () => hoverStars(parseInt(star.dataset.value)));
  star.addEventListener('mouseleave', () => renderStars(currentRating));
  star.addEventListener('click',      () => submitRating(parseInt(star.dataset.value)));
});

function hoverStars(value) {
  stars.forEach(s => {
    s.classList.toggle('hover', parseInt(s.dataset.value) <= value);
    s.classList.remove('active');
  });
}

function renderStars(value) {
  stars.forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.value) <= value);
    s.classList.remove('hover');
  });
}

async function submitRating(rating) {
  if (!currentTrackId) return;
  try {
    await fetch(`/api/ratings/${currentTrackId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rating }),
    });
    currentRating = rating;
    renderStars(rating);
  } catch (err) {
    console.error('Failed to submit rating', err);
  }
}

// ── Metadata ─────────────────────────────────────────────────────────────────

const METADATA_URL = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';

async function fetchMetadata() {
  try {
    const res  = await fetch(METADATA_URL);
    const data = await res.json();

    const trackKey = `${data.artist}|${data.title}`;
    if (trackKey !== lastTrackKey) {
      lastTrackKey = trackKey;
      albumArt.src = `https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg?t=${Date.now()}`;
      albumArt.classList.remove('hidden');
    }

    trackTitle.textContent  = data.title  || '—';
    trackArtist.textContent = data.artist || '';
    const albumStr = [data.album, data.date].filter(Boolean).join(' · ');
    trackAlbum.textContent  = albumStr;

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

function startMetadataPolling() {
  clearInterval(metadataInterval);
  fetchMetadata();
  metadataInterval = setInterval(fetchMetadata, 15000);
}

function stopMetadataPolling() {
  clearInterval(metadataInterval);
  metadataInterval = null;
}

function renderRecentTracks(tracks) {
  const list = document.getElementById('recent-tracks');
  list.innerHTML = tracks.map(t => `
    <li>
      <span class="rp-title">${esc(t.title)}</span>
      <span class="rp-artist">${esc(t.artist)}</span>
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

function formatTime(iso) {
  return new Date(iso + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
