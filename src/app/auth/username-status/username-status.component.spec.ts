import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { USERNAME_CHECK_DEBOUNCE_MS, UsernameStatusComponent } from './username-status.component';

describe('UsernameStatusComponent', () => {
  let checkUsername: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    checkUsername = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { checkUsername } }],
    });
  });

  afterEach(() => vi.useRealTimers());

  function create(current: string | null = null) {
    const fixture = TestBed.createComponent(UsernameStatusComponent);
    fixture.componentRef.setInput('current', current);
    const valid: boolean[] = [];
    fixture.componentInstance.validChange.subscribe((v) => valid.push(v));
    const type = (value: string) => {
      fixture.componentRef.setInput('username', value);
      fixture.detectChanges();
    };
    return { fixture, status: fixture.componentInstance, valid, type };
  }

  it('livre: confere na API depois da pausa e libera', () => {
    checkUsername.mockReturnValue(
      of({ username: 'gorak', available: true, error: null, suggestions: [] }),
    );
    const { status, valid, type } = create();
    type('gorak');
    expect(status.state()).toBe('checking');
    expect(checkUsername).not.toHaveBeenCalled();
    vi.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS);
    expect(checkUsername).toHaveBeenCalledWith('gorak');
    expect(status.state()).toBe('available');
    expect(valid.at(-1)).toBe(true);
  });

  it('digitando rápido pergunta uma vez só, pelo último valor', () => {
    checkUsername.mockReturnValue(
      of({ username: 'gorak', available: true, error: null, suggestions: [] }),
    );
    const { type } = create();
    type('gor');
    vi.advanceTimersByTime(100);
    type('gorak');
    vi.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS);
    expect(checkUsername).toHaveBeenCalledTimes(1);
    expect(checkUsername).toHaveBeenCalledWith('gorak');
  });

  it('em uso: mostra as sugestões e trava; clicar numa avisa a tela', () => {
    checkUsername.mockReturnValue(
      of({ username: 'gorak', available: false, error: null, suggestions: ['gorak1', 'gorak_42'] }),
    );
    const { fixture, status, valid, type } = create();
    const picked: string[] = [];
    status.pick.subscribe((s) => picked.push(s));
    type('gorak');
    vi.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS);
    fixture.detectChanges();
    expect(status.state()).toBe('taken');
    expect(valid.at(-1)).toBe(false);
    const chips = fixture.nativeElement.querySelectorAll('.username-status__chip');
    expect(Array.from(chips).map((c) => (c as HTMLElement).textContent?.trim())).toEqual([
      'gorak1',
      'gorak_42',
    ]);
    (chips[0] as HTMLButtonElement).click();
    expect(picked).toEqual(['gorak1']);
  });

  it('formato inválido: erro na hora, trava, e a API só sugere', () => {
    checkUsername.mockReturnValue(
      of({ username: 'gorak dente', available: false, error: 'x', suggestions: ['gorak_dente'] }),
    );
    const { status, valid, type } = create();
    type('gorak dente');
    expect(status.state()).toBe('invalid');
    expect(status.formatError()).toContain('letras sem acento');
    expect(valid.at(-1)).toBe(false);
    vi.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS);
    expect(status.state()).toBe('invalid');
    expect(status.suggestions()).toEqual(['gorak_dente']);
  });

  it('o próprio nome atual (sem diferenciar maiúsculas) vale sem perguntar à API', () => {
    const { status, valid, type } = create('Gorak');
    type('gorak');
    vi.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS);
    expect(status.state()).toBe('current');
    expect(valid.at(-1)).toBe(true);
    expect(checkUsername).not.toHaveBeenCalled();
  });

  it('sem resposta da API (rede, limite): não trava — a API confere ao gravar', () => {
    checkUsername.mockReturnValue(throwError(() => ({ status: 429 })));
    const { status, valid, type } = create();
    type('gorak');
    vi.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS);
    expect(status.state()).toBe('unknown');
    expect(valid.at(-1)).toBe(true);
  });

  it('vazio não pergunta nem libera', () => {
    const { status, valid, type } = create();
    type('gorak');
    type('   ');
    vi.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS);
    expect(status.state()).toBe('empty');
    expect(valid.at(-1)).toBe(false);
    expect(checkUsername).not.toHaveBeenCalled();
  });

  it('409 ao gravar: a tela mostra as sugestões que vieram junto', () => {
    const { status, valid } = create();
    status.showTaken(['gorak7']);
    expect(status.state()).toBe('taken');
    expect(status.suggestions()).toEqual(['gorak7']);
    expect(valid.at(-1)).toBe(false);
  });
});
