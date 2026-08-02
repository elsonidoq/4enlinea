import { HomeScreen } from '../screens/HomeScreen.jsx';
import { StatsScreen } from '../screens/StatsScreen.jsx';
import { SetPickerScreen } from '../screens/SetPickerScreen.jsx';
import { CategoryListScreen } from '../screens/CategoryListScreen.jsx';
import { ChallengeScreen } from '../screens/ChallengeScreen.jsx';
import { PostSetSummaryScreen } from '../screens/PostSetSummaryScreen.jsx';
import { DifficultyPickerScreen } from '../screens/DifficultyPickerScreen.jsx';
import { GameScreen } from '../screens/GameScreen.jsx';
import { ReviewScreen } from '../screens/ReviewScreen.jsx';
import { SagaScreen } from '../screens/SagaScreen.jsx';
import { ConceptScreen } from '../screens/ConceptScreen.jsx';
import { SocraticScreen } from '../screens/SocraticScreen.jsx';
import { CLChallengeScreen } from '../screens/CLChallengeScreen.jsx';
import { MistakesListScreen } from '../screens/MistakesListScreen.jsx';
import { MistakeDetailScreen } from '../screens/MistakeDetailScreen.jsx';
import { PastGamesListScreen } from '../screens/PastGamesListScreen.jsx';
import { PlayOnlineScreen } from '../screens/PlayOnlineScreen.jsx';
import { SettingsScreen } from '../screens/SettingsScreen.jsx';
import { PricingScreen } from '../screens/PricingScreen.jsx';
import { OnboardingImportOfferScreen } from '../screens/OnboardingImportOfferScreen.jsx';
import { OnboardingMissionScreen } from '../screens/OnboardingMissionScreen.jsx';

export const SCREENS = {
  home: HomeScreen,
  stats: StatsScreen,
  saga: SagaScreen,
  concept: ConceptScreen,
  socratic: SocraticScreen,
  clchallenge: CLChallengeScreen,
  setpicker: SetPickerScreen,
  challenge: ChallengeScreen,
  summary: PostSetSummaryScreen,
  difficulty: DifficultyPickerScreen,
  game: GameScreen,
  review: ReviewScreen,
  mistakes: CategoryListScreen,
  mistakeDetail: (p) => <MistakesListScreen {...p} />,
  blunderDetail: MistakeDetailScreen,
  pastGames: PastGamesListScreen,
  playOnline: PlayOnlineScreen,
  settings: SettingsScreen,
  // Spec 053 US4: /pricing takeover of the address that used to serve the
  // static pricing.html (now retained, byte-stable, at /pricing-legal).
  pricing: PricingScreen,
  // Epic 8 — Onboarding Experience, US3 (T033, research.md R4). Session-only: reached only via
  // go()/goReplace() from GameScreen (game-end) or HomeScreen (early-exit fallback) — NOT in
  // urlMapping.js/SESSION_ONLY_SCREENS, matching the existing game/summary pattern.
  onboardingImportOffer: OnboardingImportOfferScreen,
  // Onboarding mission screen — session-only: reached only via App.jsx's anonymous first-run
  // auto-route (go('onboardingMission')). NOT in urlMapping.js/SESSION_ONLY_SCREENS, matching
  // the onboardingImportOffer / game / summary session-only pattern.
  onboardingMission: OnboardingMissionScreen,
};
