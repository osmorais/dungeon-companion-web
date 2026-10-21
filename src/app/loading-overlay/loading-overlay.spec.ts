import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoadingOverlayService } from './loading-overlay.service';
import { SKIP_LOADING_OVERLAY, loadingInterceptor } from './loading.interceptor';

describe('overlay de carregamento: desligado em tela com skeleton (sessão)', () => {
  let overlay: LoadingOverlayService;
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    overlay = TestBed.inject(LoadingOverlayService);
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('requisição normal mostra o overlay', () => {
    http.get('/api/x').subscribe();
    expect(overlay.visible()).toBe(true);
    backend.expectOne('/api/x').flush({});
  });

  it('com a sessão aberta (suppressHttp) a requisição não mostra o overlay', () => {
    const release = overlay.suppressHttp();
    http.get('/api/x').subscribe();
    expect(overlay.visible()).toBe(false);
    backend.expectOne('/api/x').flush({});
    release();
  });

  it('liberar volta ao normal; liberar duas vezes não desconta de outra tela', () => {
    const releaseA = overlay.suppressHttp();
    const releaseB = overlay.suppressHttp();
    releaseA();
    releaseA();
    expect(overlay.httpSuppressed).toBe(true);
    releaseB();
    expect(overlay.httpSuppressed).toBe(false);
    http.get('/api/x').subscribe();
    expect(overlay.visible()).toBe(true);
    backend.expectOne('/api/x').flush({});
  });

  it('SKIP_LOADING_OVERLAY continua valendo sem sessão aberta', () => {
    http.get('/api/x', { context: new HttpContext().set(SKIP_LOADING_OVERLAY, true) }).subscribe();
    expect(overlay.visible()).toBe(false);
    backend.expectOne('/api/x').flush({});
  });

  it('show() explícito (salvar personagem) não é afetado', () => {
    const release = overlay.suppressHttp();
    overlay.show('SALVANDO SEU PERSONAGEM...');
    expect(overlay.visible()).toBe(true);
    release();
  });
});
