import { RouterProvider } from 'react-router';
import { AuthProvider } from './lib/auth';
import { UIPrefsProvider } from './lib/ui-prefs';
import { router } from './routes';

export default function App() {
  return (
    <UIPrefsProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </UIPrefsProvider>
  );
}
