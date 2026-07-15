import { useRef, useEffect, useCallback } from 'react';
import { useAudio } from './useAudio.js';
import i18n from '../i18n/index.js';

/**
 * Module-level queue so only one speech plays at a time across all callers.
 * Items are either slug strings (pre-recorded coach MP3s) or HTMLAudioElement
 * instances (dynamic TTS, e.g. deep-reveal). The head plays; the rest wait.
 */
let speechQueue = /** @type {Array<string | HTMLAudioElement>} */ ([]);
let currentSpeechAudio = null;

/**
 * Browser autoplay policy blocks `audio.play()` until the page has received a
 * user gesture. The coach's first line (e.g. the onboarding greeting, or any
 * coach line on a freshly-loaded/refreshed screen) fires on mount with no prior
 * gesture, so `play()` rejects with `NotAllowedError` and the clip would be lost.
 *
 * We handle this in two parts:
 *   1. `audioUnlocked` tracks whether a user gesture has happened yet. A one-time
 *      global gesture listener (registered below) flips it and flushes the queue.
 *   2. `playNext()` does NOT drop a clip that `play()` rejected for autoplay while
 *      still locked — it re-queues it at the head, so the first gesture replays it.
 * The replay runs synchronously inside the gesture handler, so the browser counts
 * it as gesture-initiated and allows it.
 */
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (typeof window !== 'undefined') {
    for (const evt of ['pointerdown', 'keydown', 'touchend']) {
      window.removeEventListener(evt, unlockAudio);
    }
  }
  playNext(); // flush anything that was blocked before the gesture
}

if (typeof window !== 'undefined') {
  for (const evt of ['pointerdown', 'keydown', 'touchend']) {
    window.addEventListener(evt, unlockAudio);
  }
}

/**
 * Set up a speech audio element with standard ended/error cleanup.
 * @param {HTMLAudioElement} audio
 */
function attachSpeechListeners(audio) {
  audio.addEventListener('ended', () => {
    if (currentSpeechAudio === audio) currentSpeechAudio = null;
    playNext();
  });
  audio.addEventListener('error', () => {
    if (currentSpeechAudio === audio) currentSpeechAudio = null;
    playNext();
  });
}

function playNext() {
  if (currentSpeechAudio || speechQueue.length === 0) return;
  const item = speechQueue.shift();

  let audio;
  if (typeof item === 'string') {
    // Pre-recorded coach slug
    audio = new Audio(`/audio/coach/${item}.mp3`);
  } else {
    // Dynamic Audio element (e.g. deep-reveal TTS)
    audio = item;
  }

  currentSpeechAudio = audio;
  attachSpeechListeners(audio);
  audio.play().catch((err) => {
    if (currentSpeechAudio === audio) currentSpeechAudio = null;
    if (err && err.name === 'NotAllowedError' && !audioUnlocked) {
      // Autoplay blocked and we haven't had a gesture yet — keep the clip and
      // let unlockAudio() replay it on the first interaction. Do NOT loop.
      speechQueue.unshift(item);
    } else {
      // Any other failure (or a block that persists after unlock): skip it.
      playNext();
    }
  });
}

/**
 * Push a pre-constructed Audio element for dynamic TTS into the unified speech queue.
 * Use this for deep-reveal TTS and other on-demand speech that doesn't go through
 * the pre-recorded coach manifest.
 *
 * @param {HTMLAudioElement} audio - Audio element ready to play (src already set)
 */
export function speakDeepReveal(audio) {
  speechQueue.push(audio);
  playNext();
}

/**
 * Play a lesson-slide coach-message narration clip (spec 046 US3).
 *
 * Thin wrapper over `speakDeepReveal` — reuses the same singleton speech
 * queue, giving "one at a time" playback for free. Does NOT check
 * `speechEnabled` and does NOT stop on navigation: the caller (ConceptScreen)
 * is responsible for checking the global speech toggle before calling this,
 * and for calling `stopSpeech()` on unmount/navigation (FR-019/FR-021).
 *
 * @param {string} path - audio URL, e.g. "/audio/lessons/<hash>.mp3"
 */
export function speakLessonAudio(path) {
  speakDeepReveal(new Audio(path));
}

/**
 * Stop all speech immediately and clear the queue.
 * Call this when the user dismisses the panel that triggered the speech.
 */
export function stopSpeech() {
  if (currentSpeechAudio) {
    currentSpeechAudio.pause();
    // Setting src to '' releases resources and prevents ended/error events from firing
    currentSpeechAudio.src = '';
    currentSpeechAudio = null;
  }
  speechQueue = [];
}

/**
 * Derive a safe filename slug from an i18n key.
 * Replaces '.' and '_' with '--' (must match generate-tts.js and server).
 * @param {string} key
 * @returns {string}
 */
function keyToSlug(key) {
  return key.replace(/[._]/g, '--');
}

/**
 * Manifest URL for a language. English keeps the existing root path
 * (public/audio/coach/coach-audio-manifest.json) unchanged; every other
 * language's manifest lives under its own subdirectory.
 * @param {string} lang
 * @returns {string}
 */
function manifestUrlForLang(lang) {
  return `/audio/coach/${lang === 'en' ? '' : `${lang}/`}coach-audio-manifest.json`;
}

/**
 * Speech-queue item for a coach slug in a given language. English resolves
 * to the bare slug (root path, unchanged); every other language is prefixed
 * with `<lang>/` so `playNext`'s `/audio/coach/${item}.mp3` template resolves
 * to the per-language subdirectory without any change to `playNext` itself.
 * @param {string} slug
 * @param {string} lang
 * @returns {string}
 */
export function coachQueueItem(slug, lang) {
  return lang === 'en' ? slug : `${lang}/${slug}`;
}

/**
 * Fetch a language's approved-slug manifest. Resolves to an empty Set on
 * any failure (missing file, network error, non-array payload) so callers
 * can always fall back safely.
 * @param {string} lang
 * @returns {Promise<Set<string>>}
 */
function fetchManifest(lang) {
  return fetch(manifestUrlForLang(lang))
    .then(r => (r.ok ? r.json() : []))
    .then(slugs => new Set(Array.isArray(slugs) ? slugs : []))
    .catch(() => new Set());
}

/**
 * Coach speech hook — plays pre-recorded coach audio when speech is enabled.
 * Messages are queued and played sequentially; no overlapping audio.
 *
 * Manifests are fetched per-language and cached by language code. English
 * audio lives at the historical root path; Spanish (and any future
 * non-default language) lives under `/audio/coach/<lang>/`. If the current
 * language lacks an approved clip for a key but English has one, we fall
 * back to the English clip rather than staying silent.
 */
export function useCoachSpeech() {
  const { speechEnabled } = useAudio();
  // manifestsRef.current: { [lang]: Set<string> | null } — null = not yet fetched.
  const manifestsRef = useRef(/** @type {Record<string, Set<string>|null>} */ ({}));
  const fetchingRef = useRef(/** @type {Record<string, boolean>} */ ({}));
  const pendingKeyRef = useRef(null);
  const speechEnabledRef = useRef(speechEnabled);
  speechEnabledRef.current = speechEnabled;

  const ensureManifest = useCallback((lang) => {
    if (manifestsRef.current[lang] || fetchingRef.current[lang]) return;
    fetchingRef.current[lang] = true;
    fetchManifest(lang).then((set) => {
      manifestsRef.current[lang] = set;
      fetchingRef.current[lang] = false;
      if (pendingKeyRef.current && speechEnabledRef.current && lang === i18n.language) {
        const key = pendingKeyRef.current;
        pendingKeyRef.current = null;
        enqueueIfApproved(key, lang);
      }
    });
  }, []);

  function enqueueIfApproved(key, lang) {
    const slug = keyToSlug(key);
    const manifest = manifestsRef.current[lang];
    if (manifest && manifest.has(slug)) {
      speechQueue.push(coachQueueItem(slug, lang));
      playNext();
      return;
    }
    // Fallback: current language has no approved clip — try English.
    if (lang !== 'en') {
      const enManifest = manifestsRef.current.en;
      if (enManifest && enManifest.has(slug)) {
        speechQueue.push(coachQueueItem(slug, 'en'));
        playNext();
      }
    }
  }

  // Fetch the current language's manifest on mount (and English too, for
  // fallback), and refresh whenever the language changes.
  useEffect(() => {
    ensureManifest(i18n.language || 'en');
    ensureManifest('en');

    const onLanguageChanged = (lang) => {
      ensureManifest(lang);
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => i18n.off('languageChanged', onLanguageChanged);
  }, [ensureManifest]);

  /**
   * Enqueue a coach message by its i18n key, in the current UI language.
   * No-op if speech is disabled or the key is not approved in either the
   * current language's manifest or (as fallback) the English manifest.
   * If the current language's manifest hasn't loaded yet, stores the key
   * and plays it once ready.
   *
   * @param {string} key - i18n key (e.g. "coach.immediate_threat.optimal.0")
   */
  const speakCoachMessage = useCallback(
    (key) => {
      if (!speechEnabled) return;
      const lang = i18n.language || 'en';
      const manifest = manifestsRef.current[lang];
      if (!manifest) {
        pendingKeyRef.current = key; // manifest still loading — queue it
        ensureManifest(lang);
        return;
      }
      enqueueIfApproved(key, lang);
    },
    [speechEnabled, ensureManifest],
  );

  return { speakCoachMessage, speechEnabled };
}
