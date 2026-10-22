import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RankingComponent } from './ranking.component';
import { RankingService } from '../services/ranking.service';
import { RankingCategory, RankingEntry } from '../models/ranking.interface';

const entry = (position: number, value = 100 - position): RankingEntry => ({
  position,
  id_character: position,
  character_name: `Herói ${position}`,
  avatar_preset: null,
  player_name: `jogador${position}`,
  session_name: 'Mesa de Sábado',
  value,
});

const category = (key: string, count: number): RankingCategory => ({
  key,
  title: key.toUpperCase(),
  description: '',
  unit: 'de dano',
  entries: Array.from({ length: count }, (_, i) => entry(i + 1)),
});

describe('RankingComponent', () => {
  let getRanking: ReturnType<typeof vi.fn>;

  const create = () => {
    const c = TestBed.runInInjectionContext(() => new RankingComponent());
    c.ngOnInit();
    return c;
  };

  beforeEach(() => {
    getRanking = vi
      .fn()
      .mockReturnValue(of({ categories: [category('damage_dealt', 5), category('nat20', 2)] }));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RankingService, useValue: { getRanking } }],
    });
  });

  it('abre na primeira categoria, com o 1º no meio do pódio e o resto na lista', () => {
    const c = create();
    expect(c.loading()).toBe(false);
    expect(c.active()?.key).toBe('damage_dealt');
    expect(c.podium().map((e) => e.position)).toEqual([2, 1, 3]);
    expect(c.rest().map((e) => e.position)).toEqual([4, 5]);
  });

  it('trocar de categoria; pódio incompleto não deixa buraco', () => {
    const c = create();
    c.selectCategory('nat20');
    expect(c.active()?.key).toBe('nat20');
    expect(c.podium().map((e) => e.position)).toEqual([2, 1]);
    expect(c.rest()).toEqual([]);
  });

  it('formata números no padrão brasileiro (média com uma casa)', () => {
    const c = create();
    expect(c.formatValue(1234)).toBe('1.234');
    expect(c.formatValue(14.25)).toMatch(/^14,[23]$/);
  });

  it('erro ao carregar mostra o estado de erro e tentar de novo recarrega', () => {
    getRanking.mockReturnValueOnce(throwError(() => new Error('x')));
    const c = create();
    expect(c.error()).toBe(true);
    c.load();
    expect(c.error()).toBe(false);
    expect(c.categories().length).toBe(2);
  });

  it('VOLTAR leva para a tela inicial', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    create().goBack();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
