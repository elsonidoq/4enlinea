/**
 * Static lookup table mapping kbId slugs to lesson and practice info.
 *
 * Used by KbTermPopup and AnnotatedExplanation to show CTAs
 * (Go to lesson / Go to practice) when a KB term is tapped.
 *
 * Each entry:
 *   lessonId         — lesson JSON id field, or null if no lesson exists
 *   practiceCategory — puzzle category slug for practice mode, or null
 *   displayName      — user-facing name for the popup header
 */
export const KB_TERM_LESSON = {
  'community-z-threat': {
    lessonId: 'z-threats',
    practiceCategory: 'z_threat',
    displayName: 'Z-Threat',
  },
  'community-figure-7': {
    lessonId: 'figure-7',
    practiceCategory: 'figure_7',
    displayName: 'Figure 7',
  },
  'community-overcut': {
    lessonId: 'overcut',
    practiceCategory: 'overcut',
    displayName: 'Overcut',
  },
  'allen-j-configuration': {
    lessonId: 'j-shape',
    practiceCategory: 'j_shape',
    displayName: 'J Configuration',
  },
  'allen-t2': {
    lessonId: 'undercut',
    practiceCategory: 'undercut',
    displayName: 'Undercut (T2)',
  },
  'allis-claimeven': {
    lessonId: 'claimeven',
    practiceCategory: 'claimeven',
    displayName: 'Claimeven',
  },
  'allis-baseclaim': {
    lessonId: null,
    practiceCategory: null,
    displayName: 'Baseclaim',
  },
  'allis-before': {
    lessonId: null,
    practiceCategory: null,
    displayName: 'Before',
  },
  'allis-specialbefore': {
    lessonId: null,
    practiceCategory: null,
    displayName: 'Special Before',
  },
};
