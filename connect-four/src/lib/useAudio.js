import { useState, useCallback } from 'react';

/**
 * Module-level singleton <audio> element for background music.
 * Shared across all useAudio() callers — only one music track plays at a time.
 */
let musicAudio = null;

function getMusicAudio() {
  if (!musicAudio) {
    musicAudio = new Audio('/audio/sfx/bg_music.mp3');
    musicAudio.loop = true;
    musicAudio.volume = 0.25;
  }
  return musicAudio;
}

const STORAGE_KEY_SFX = 'audio_sfx_enabled';
const STORAGE_KEY_MUSIC = 'audio_music_enabled';
const STORAGE_KEY_SPEECH = 'audio_speech_enabled';

function readBool(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val === null ? fallback : val === 'true';
  } catch {
    return fallback;
  }
}

function writeBool(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — silently ignore
  }
}

/**
 * Audio hook — provides sound-effect playback, background music control,
 * and independent mute toggles persisted to localStorage.
 *
 * Defaults: sfxEnabled=true, musicEnabled=true, speechEnabled=false.
 *
 * Components MUST NOT read localStorage directly for audio prefs — use this hook.
 */
export function useAudio() {
  const [sfxEnabled, setSfxEnabled] = useState(() => readBool(STORAGE_KEY_SFX, true));
  const [musicEnabled, setMusicEnabled] = useState(() => readBool(STORAGE_KEY_MUSIC, false));
  const [speechEnabled, setSpeechEnabled] = useState(() => readBool(STORAGE_KEY_SPEECH, true));

  /**
   * Play a one-shot sound effect from public/audio/sfx/<name>.mp3.
   * No-op when sfxEnabled is false. Creates a new Audio element each call
   * so overlapping effects play correctly.
   * @param {string} name - filename stem without .mp3 extension
   */
  const playSfx = useCallback(
    (name) => {
      if (!sfxEnabled) return;
      const audio = new Audio(`/audio/sfx/${name}.mp3`);
      audio.volume = 0.7;
      audio.play().catch(() => {
        // Autoplay policy may block — silently ignore.
      });
    },
    [sfxEnabled],
  );

  /**
   * Start or resume background music loop.
   * No-op when musicEnabled is false. Resumes from current position
   * (or from beginning if never started) — avoids a gap when toggling music.
   */
  const playMusic = useCallback(() => {
    if (!musicEnabled) return;
    const a = getMusicAudio();
    // play() is a no-op if already playing; resumes from paused position.
    a.play().catch(() => {
      // Autoplay policy may block — silently ignore.
    });
  }, [musicEnabled]);

  /**
   * Pause background music. Safe to call even if music is not playing.
   */
  const pauseMusic = useCallback(() => {
    getMusicAudio().pause();
  }, []);

  /**
   * Toggle SFX on/off and persist preference.
   */
  const toggleSfx = useCallback(() => {
    setSfxEnabled((prev) => {
      const next = !prev;
      writeBool(STORAGE_KEY_SFX, next);
      return next;
    });
  }, []);

  /**
   * Toggle music on/off, persist preference, and immediately apply to the audio element.
   */
  const toggleMusic = useCallback(() => {
    setMusicEnabled((prev) => {
      const next = !prev;
      writeBool(STORAGE_KEY_MUSIC, next);
      if (next) {
        getMusicAudio().play().catch(() => {});
      } else {
        getMusicAudio().pause();
      }
      return next;
    });
  }, []);

  /**
   * Toggle speech on/off and persist preference (placeholder for future TTS feature).
   */
  const toggleSpeech = useCallback(() => {
    setSpeechEnabled((prev) => {
      const next = !prev;
      writeBool(STORAGE_KEY_SPEECH, next);
      return next;
    });
  }, []);

  return {
    playSfx,
    playMusic,
    pauseMusic,
    sfxEnabled,
    musicEnabled,
    speechEnabled,
    toggleSfx,
    toggleMusic,
    toggleSpeech,
  };
}
