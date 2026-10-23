import { routes } from './app.routes';
import { loggedInMatch } from './guards/auth.guard';
import { HomeComponent } from './home/home.component';
import { LandingComponent } from './landing/landing.component';

describe('rotas — tela de /', () => {
  const root = routes.filter((r) => r.path === '');

  it('logado cai na Home; visitante, na tela inicial (nessa ordem)', async () => {
    expect(root.length).toBe(2);
    const [home, landing] = root;
    expect(home.canMatch).toEqual([loggedInMatch]);
    expect(landing.canMatch ?? []).toEqual([]);
    expect(landing.canActivate ?? []).toEqual([]);
    expect(await home.loadComponent!()).toBe(HomeComponent);
    expect(await landing.loadComponent!()).toBe(LandingComponent);
  });
});
