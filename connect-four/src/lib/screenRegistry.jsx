import { HomeScreen } from '../screens/HomeScreen.jsx';
import { StatsScreen } from '../screens/StatsScreen.jsx';
import { SetPickerScreen } from '../screens/SetPickerScreen.jsx';
import { ChallengeScreen } from '../screens/ChallengeScreen.jsx';
import { PostSetSummaryScreen } from '../screens/PostSetSummaryScreen.jsx';
import { DifficultyPickerScreen } from '../screens/DifficultyPickerScreen.jsx';
import { GameScreen } from '../screens/GameScreen.jsx';
import { PlaceholderScreen } from '../screens/PlaceholderScreen.jsx';
import { ReviewScreen } from '../screens/ReviewScreen.jsx';
import { ExplorerScreen } from '../screens/ExplorerScreen.jsx';

export const SCREENS = {
  home: HomeScreen,
  stats: StatsScreen,
  saga: (props) => <PlaceholderScreen {...props} screenKey="saga" />,
  concept: (props) => <PlaceholderScreen {...props} screenKey="concept" />,
  socratic: (props) => <PlaceholderScreen {...props} screenKey="socratic" />,
  clchallenge: (props) => <PlaceholderScreen {...props} screenKey="clchallenge" />,
  setpicker: SetPickerScreen,
  challenge: ChallengeScreen,
  summary: PostSetSummaryScreen,
  difficulty: DifficultyPickerScreen,
  game: GameScreen,
  review: ReviewScreen,
  explorer: ExplorerScreen,
  mistakes: (props) => <PlaceholderScreen {...props} screenKey="mistakes" />,
  mistakeDetail: (props) => <PlaceholderScreen {...props} screenKey="mistakeDetail" />,
};
