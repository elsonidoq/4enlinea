import { HomeScreen } from '../screens/HomeScreen.jsx';
import { StatsScreen } from '../screens/StatsScreen.jsx';
import { SetPickerScreen } from '../screens/SetPickerScreen.jsx';
import { ChallengeScreen } from '../screens/ChallengeScreen.jsx';
import { PlaceholderScreen } from '../screens/PlaceholderScreen.jsx';

export const SCREENS = {
  home: HomeScreen,
  stats: StatsScreen,
  saga: (props) => <PlaceholderScreen {...props} screenKey="saga" />,
  concept: (props) => <PlaceholderScreen {...props} screenKey="concept" />,
  socratic: (props) => <PlaceholderScreen {...props} screenKey="socratic" />,
  clchallenge: (props) => <PlaceholderScreen {...props} screenKey="clchallenge" />,
  setpicker: SetPickerScreen,
  challenge: ChallengeScreen,
  summary: (props) => <PlaceholderScreen {...props} screenKey="summary" />,
  difficulty: (props) => <PlaceholderScreen {...props} screenKey="difficulty" />,
  game: (props) => <PlaceholderScreen {...props} screenKey="game" />,
  review: (props) => <PlaceholderScreen {...props} screenKey="review" />,
  explorer: (props) => <PlaceholderScreen {...props} screenKey="explorer" />,
  mistakes: (props) => <PlaceholderScreen {...props} screenKey="mistakes" />,
  mistakeDetail: (props) => <PlaceholderScreen {...props} screenKey="mistakeDetail" />,
};
