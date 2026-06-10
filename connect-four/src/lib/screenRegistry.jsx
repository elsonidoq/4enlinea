import { HomeScreen } from '../screens/HomeScreen.jsx';
import { StatsScreen } from '../screens/StatsScreen.jsx';
import { SetPickerScreen } from '../screens/SetPickerScreen.jsx';
import { ChallengeScreen } from '../screens/ChallengeScreen.jsx';
import { PostSetSummaryScreen } from '../screens/PostSetSummaryScreen.jsx';
import { DifficultyPickerScreen } from '../screens/DifficultyPickerScreen.jsx';
import { GameScreen } from '../screens/GameScreen.jsx';
import { ReviewScreen } from '../screens/ReviewScreen.jsx';
import { SagaScreen } from '../screens/SagaScreen.jsx';
import { ConceptScreen } from '../screens/ConceptScreen.jsx';
import { SocraticScreen } from '../screens/SocraticScreen.jsx';
import { CLChallengeScreen } from '../screens/CLChallengeScreen.jsx';
import { ExplorerScreen } from '../screens/ExplorerScreen.jsx';
import { MistakesListScreen } from '../screens/MistakesListScreen.jsx';
import { MistakeDetailScreen } from '../screens/MistakeDetailScreen.jsx';
import { PastGamesListScreen } from '../screens/PastGamesListScreen.jsx';

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
  explorer: ExplorerScreen,
  mistakes: MistakesListScreen,
  mistakeDetail: MistakeDetailScreen,
  pastGames: PastGamesListScreen,
};
