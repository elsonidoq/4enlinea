import { useRef, useEffect, useCallback } from 'react';
import { useAudio } from './useAudio.js';

/**
 * Module-level queue so only one speech plays at a time across all callers.
 * Items are either slug strings (pre-recorded coach MP3s) or HTMLAudioElement
 * instances (dynamic TTS, e.g. deep-reveal). The head plays; the rest wait.
 */
let speechQueue = /** @type {Array<string | HTMLAudioElement>} */ ([]);
let currentSpeechAudio = null;

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
  audio.play().catch(() => {});
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
 * Coach speech hook — plays pre-recorded coach audio when speech is enabled.
 * Messages are queued and played sequentially; no overlapping audio.
 */
export function useCoachSpeech() {
  const { speechEnabled } = useAudio();
  const manifestRef = useRef(/** @type {Set<string>|null} */ null);
  const fetchAttemptedRef = useRef(false);
  const pendingKeyRef = useRef(null);
  const speechEnabledRef = useRef(speechEnabled);
  speechEnabledRef.current = speechEnabled;

  // Fetch manifest once on mount; flush any pending key when it arrives
  useEffect(() => {
    if (fetchAttemptedRef.current) return;
    fetchAttemptedRef.current = true;

    fetch('/audio/coach/coach-audio-manifest.json')
      .then(r => {
        if (!r.ok) return [];
        return r.json();
      })
      .then(slugs => {
        manifestRef.current = new Set(Array.isArray(slugs) ? slugs : []);
        if (pendingKeyRef.current && speechEnabledRef.current) {
          const slug = keyToSlug(pendingKeyRef.current);
          pendingKeyRef.current = null;
          if (manifestRef.current.has(slug)) {
            speechQueue.push(slug);
            playNext();
          }
        }
      })
      .catch(() => {
        manifestRef.current = new Set();
        pendingKeyRef.current = null;
      });
  }, []);

  /**
   * Enqueue a coach message by its i18n key.
   * No-op if speech is disabled or the key is not in the approved manifest.
   * If the manifest hasn't loaded yet, stores the key and plays it once ready.
   *
   * @param {string} key - i18n key (e.g. "coach.immediate_threat.optimal.0")
   */
  const speakCoachMessage = useCallback(
    (key) => {
      if (!speechEnabled) return;
      if (!manifestRef.current) {
        pendingKeyRef.current = key; // manifest still loading — queue it
        return;
      }
      const slug = keyToSlug(key);
      if (!manifestRef.current.has(slug)) return; // key not approved

      speechQueue.push(slug);
      playNext();
    },
    [speechEnabled],
  );

  return { speakCoachMessage, speechEnabled };
}
