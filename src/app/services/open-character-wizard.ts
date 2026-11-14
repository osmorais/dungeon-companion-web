import { WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { CharacterService } from './character.service';

/**
 * + CRIAR PERSONAGEM fora da Home (Meus personagens, Entrar em uma aventura — 1.25.3): busca as
 * opções do wizard antes de abrir (como a Home faz), com o botão travado em `busy` até lá. Erro
 * na busca abre o wizard mesmo assim (ele tenta de novo lá dentro).
 */
export function openCharacterWizard(
  charService: CharacterService,
  router: Router,
  busy: WritableSignal<boolean>,
): void {
  if (busy()) return;
  busy.set(true);
  charService.getCharacterOptions().subscribe({
    next: (options) => {
      charService.cachedOptions.set(options);
      router.navigate(['/create']);
    },
    error: () => router.navigate(['/create']),
  });
}
