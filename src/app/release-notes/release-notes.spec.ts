import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import packageJson from '../../../package.json';
import {
  CURRENT_VERSION,
  RELEASES,
  RELEASE_CHANGE_LABELS,
  formatReleaseDate,
  parseVersion,
  versionBump,
} from './release-notes';
import { ReleaseNotesPageComponent } from './release-notes-page.component';

/** A regra de versionamento (`.claude/rules/versionamento.md`) conferida a cada execução. */
describe('release notes — regra de versão A.B.C', () => {
  it('versão atual = primeira entrada = package.json', () => {
    expect(CURRENT_VERSION).toBe(RELEASES[0].version);
    expect(packageJson.version).toBe(CURRENT_VERSION);
  });

  it('toda versão no formato A.B.C, sem repetir', () => {
    for (const r of RELEASES) expect(parseVersion(r.version), r.version).not.toBeNull();
    expect(new Set(RELEASES.map((r) => r.version)).size).toBe(RELEASES.length);
  });

  it('cada versão está a exatamente um passo da anterior (A, B ou C)', () => {
    for (let i = 0; i < RELEASES.length - 1; i++) {
      const next = RELEASES[i].version;
      const previous = RELEASES[i + 1].version;
      expect(versionBump(previous, next), `${previous} → ${next}`).not.toBeNull();
    }
  });

  it('datas válidas (AAAA-MM-DD), da mais nova pra mais antiga', () => {
    for (const r of RELEASES) {
      expect(r.date, r.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(`${r.date}T00:00:00Z`)), r.version).toBe(false);
    }
    for (let i = 0; i < RELEASES.length - 1; i++) {
      expect(RELEASES[i].date >= RELEASES[i + 1].date, RELEASES[i].version).toBe(true);
    }
  });

  it('toda versão tem título e pelo menos uma mudança com tipo conhecido e texto', () => {
    for (const r of RELEASES) {
      expect(r.title.trim(), r.version).not.toBe('');
      expect(r.changes.length, r.version).toBeGreaterThan(0);
      for (const c of r.changes) {
        expect(Object.keys(RELEASE_CHANGE_LABELS)).toContain(c.kind);
        expect(c.text.trim()).not.toBe('');
      }
    }
  });

  it('parseVersion e versionBump seguem a regra', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
    for (const bad of ['1.2', '1.2.3.4', 'v1.2.3', '01.2.3', '1.2.x', '']) {
      expect(parseVersion(bad), bad).toBeNull();
    }
    expect(versionBump('1.2.3', '2.0.0')).toBe('A');
    expect(versionBump('1.2.3', '1.3.0')).toBe('B');
    expect(versionBump('1.2.3', '1.2.4')).toBe('C');
    expect(versionBump('1.2.3', '1.3.3')).toBeNull(); // B sobe e C não zera
    expect(versionBump('1.2.3', '2.1.0')).toBeNull(); // A sobe e B não zera
    expect(versionBump('1.2.3', '1.2.5')).toBeNull(); // pulou um número
    expect(versionBump('1.2.3', '1.2.3')).toBeNull();
  });

  it('data formatada em português, sem depender do fuso', () => {
    expect(formatReleaseDate('2026-10-16')).toBe('16 de outubro de 2026');
    expect(formatReleaseDate('2027-01-01')).toBe('1 de janeiro de 2027');
  });

  it('a página mostra a versão atual e todas as versões', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ReleaseNotesPageComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(`Versão atual: ${CURRENT_VERSION}`);
    for (const r of RELEASES) expect(text).toContain(`Versão ${r.version}`);
  });
});
