import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { GameSessionService } from '../services/game-session.service';
import { GameSessionPagedList, GameSessionSummary } from '../models/game-session.interface';
import { SessionListComponent } from './session-list.component';

function summary(i: number): GameSessionSummary {
  return {
    id_game_session: `gs-${i}`,
    session_name: `Mesa ${i}`,
    session_code: `C${i}`,
    max_player_quantity: 5,
    dm_name: 'Mestre',
    created_at: new Date('2026-11-12T12:00:00Z'),
    total_count: 0,
  };
}

function pageOf(count: number, total: number): GameSessionPagedList {
  return {
    GameSessionPagedList: Array.from({ length: count }, (_, i) => summary(i + 1)),
    total_count: total,
  } as GameSessionPagedList;
}

describe('SessionListComponent (Sessões criadas)', () => {
  let getMySessions: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  function create(response: () => unknown) {
    getMySessions = vi.fn(response);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: GameSessionService, useValue: { getMySessions } }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const cmp = TestBed.runInInjectionContext(() => new SessionListComponent());
    cmp.ngOnInit();
    return cmp;
  }

  it('busca só as sessões em que é mestre, 10 por página', () => {
    create(() => of(pageOf(3, 3)));
    expect(getMySessions).toHaveBeenCalledWith(1, 10, 'dm');
  });

  it('mostra skeleton até a página chegar', () => {
    const res = new Subject<GameSessionPagedList>();
    const cmp = create(() => res);
    expect(cmp.loading()).toBe(true);
    res.next(pageOf(2, 2));
    res.complete();
    expect(cmp.loading()).toBe(false);
    expect(cmp.sessions().length).toBe(2);
    expect(cmp.totalCount()).toBe(2);
  });

  it('erro: sai do skeleton e TENTAR DE NOVO busca de novo', () => {
    let fail = true;
    const cmp = create(() => (fail ? throwError(() => new Error('500')) : of(pageOf(1, 1))));
    expect(cmp.error()).toBe(true);
    expect(cmp.loading()).toBe(false);
    fail = false;
    cmp.loadPage();
    expect(cmp.error()).toBe(false);
    expect(cmp.sessions().length).toBe(1);
  });

  it('faixa do rodapé acompanha a página', () => {
    let next = pageOf(10, 17);
    const cmp = create(() => of(next));
    expect([cmp.rangeStart(), cmp.rangeEnd(), cmp.totalPages()]).toEqual([1, 10, 2]);
    expect(cmp.hasPrev()).toBe(false);
    expect(cmp.hasNext()).toBe(true);

    next = pageOf(7, 17);
    cmp.nextPage();
    expect(getMySessions).toHaveBeenLastCalledWith(2, 10, 'dm');
    expect([cmp.rangeStart(), cmp.rangeEnd()]).toEqual([11, 17]);
    expect(cmp.hasNext()).toBe(false);

    cmp.nextPage(); // já na última: não busca
    expect(getMySessions).toHaveBeenCalledTimes(2);
  });

  it('sem sessões: faixa zerada e uma página só', () => {
    const cmp = create(() => of(pageOf(0, 0)));
    expect([cmp.rangeStart(), cmp.rangeEnd(), cmp.totalPages()]).toEqual([0, 0, 1]);
    expect(cmp.hasPrev() || cmp.hasNext()).toBe(false);
  });

  it('navega para a sessão, para NOVA SESSÃO e de volta para a Home', () => {
    const cmp = create(() => of(pageOf(1, 1)));
    cmp.openSession('gs-1');
    expect(navigate).toHaveBeenLastCalledWith(['/session', 'gs-1']);
    cmp.createSession();
    expect(navigate).toHaveBeenLastCalledWith(['/session-create']);
    cmp.goBack();
    expect(navigate).toHaveBeenLastCalledWith(['/']);
  });
});
