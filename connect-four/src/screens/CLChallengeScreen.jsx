import { ChallengeScreen } from './ChallengeScreen.jsx';

export function CLChallengeScreen({ go, goBack, lessonId, lessonTitle, confirmationCategory, confirmationCount, confirmationChallenges }) {
  return (
    <ChallengeScreen
      go={go}
      goBack={goBack}
      lessonMode={true}
      lessonId={lessonId}
      lessonTitle={lessonTitle}
      confirmationCategory={confirmationCategory}
      confirmationCount={confirmationCount}
      confirmationChallenges={confirmationChallenges}
    />
  );
}
