import React, { useEffect, Suspense, lazy } from 'react';
import { useStore } from './lib/store';
import { Loader, Toasts } from './ui/common';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { WorldMapScreen } from './screens/WorldMapScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WardrobeScreen } from './screens/WardrobeScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { AdminDashboard } from './screens/AdminDashboard';

// The 3D world pulls in three.js, so it loads only when a student presses Play.
const GameScreen = lazy(() =>
  import('./screens/GameScreen').then((m) => ({ default: m.GameScreen }))
);

export function App() {
  const booted = useStore((s) => s.booted);
  const screen = useStore((s) => s.screen);
  const state = useStore((s) => s.state);
  const boot = useStore((s) => s.boot);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (!booted) return <Loader label="Loading Numeria..." />;

  let body: React.ReactNode;
  if (!state) {
    body = <AuthScreen />;
  } else {
    switch (screen) {
      case 'onboarding': body = <OnboardingScreen />; break;
      case 'map': body = <WorldMapScreen />; break;
      case 'game':
        body = (
          <Suspense fallback={<Loader label="Building the world..." />}>
            <GameScreen />
          </Suspense>
        );
        break;
      case 'profile': body = <ProfileScreen />; break;
      case 'settings': body = <SettingsScreen />; break;
      case 'wardrobe': body = <WardrobeScreen />; break;
      case 'achievements': body = <AchievementsScreen />; break;
      case 'dashboard': body = <TeacherDashboard />; break;
      case 'admin': body = <AdminDashboard />; break;
      default: body = <HomeScreen />;
    }
  }

  return (
    <>
      {body}
      <Toasts />
    </>
  );
}
