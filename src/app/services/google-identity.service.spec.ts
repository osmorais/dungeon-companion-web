import { TestBed } from '@angular/core/testing';
import { GOOGLE_IDENTITY_SCRIPT_URL, GoogleIdentityService } from './google-identity.service';

function scripts(): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll<HTMLScriptElement>('script')).filter(
    (s) => s.src === GOOGLE_IDENTITY_SCRIPT_URL,
  );
}

describe('GoogleIdentityService', () => {
  let service: GoogleIdentityService;

  beforeEach(() => {
    scripts().forEach((s) => s.remove());
    service = TestBed.inject(GoogleIdentityService);
  });

  afterEach(() => scripts().forEach((s) => s.remove()));

  it('não carrega nada até alguém pedir', () => {
    expect(scripts()).toHaveLength(0);
  });

  it('injeta o script uma vez só, mesmo com chamadas repetidas', async () => {
    const first = service.load();
    const second = service.load();
    expect(scripts()).toHaveLength(1);
    expect(second).toBe(first);
    scripts()[0].dispatchEvent(new Event('load'));
    await expect(first).resolves.toBeUndefined();
  });

  it('se falhar, rejeita, remove o script e deixa tentar de novo', async () => {
    const attempt = service.load();
    scripts()[0].dispatchEvent(new Event('error'));
    await expect(attempt).rejects.toThrow(/login do Google/);
    expect(scripts()).toHaveLength(0);
    void service.load();
    expect(scripts()).toHaveLength(1);
  });
});
