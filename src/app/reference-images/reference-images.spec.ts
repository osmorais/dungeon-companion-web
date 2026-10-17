import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GameSessionService } from '../services/game-session.service';
import {
  REFERENCE_IMAGE_MAX_BYTES,
  ReferenceImagesModalComponent,
  referenceImageFileError,
} from './reference-images-modal.component';
import { ReferenceImageViewerComponent } from './reference-image-viewer.component';
import { ReferenceImage } from '../models/game-session.interface';

const file = (type: string, size = 10) => ({ type, size, name: 'a' }) as unknown as File;

function refImage(id: string, title: string | null = null): ReferenceImage {
  return {
    id_reference_image: id,
    id_game_session: 'gs',
    image_url: `https://cdn/${id}.png`,
    title,
    created_at: '2026-10-17T00:00:00Z',
  };
}

describe('referenceImageFileError', () => {
  it('exige imagem de até 10 MB', () => {
    expect(referenceImageFileError(null)).toMatch(/Escolha/);
    expect(referenceImageFileError(file('application/pdf'))).toMatch(/imagem/);
    expect(referenceImageFileError(file('image/png', REFERENCE_IMAGE_MAX_BYTES + 1))).toMatch(
      /10 MB/,
    );
    expect(referenceImageFileError(file('image/jpeg', REFERENCE_IMAGE_MAX_BYTES))).toBeNull();
  });
});

describe('ReferenceImagesModalComponent', () => {
  let service: Record<string, ReturnType<typeof vi.fn>>;

  function create() {
    TestBed.configureTestingModule({
      providers: [{ provide: GameSessionService, useValue: service }],
    });
    const modal = TestBed.runInInjectionContext(() => new ReferenceImagesModalComponent());
    modal.sessionId = 'gs';
    const closed = vi.fn();
    modal.closed.subscribe(closed);
    modal.ngOnInit();
    return { modal, closed };
  }

  beforeEach(() => {
    service = {
      listReferenceImages: vi.fn(() => of([refImage('a', 'Mapa')])),
      uploadReferenceImage: vi.fn(() => of(refImage('b', 'Taverna'))),
      showReferenceImage: vi.fn(() => of({})),
      hideReferenceImage: vi.fn(() => of(undefined)),
      deleteReferenceImage: vi.fn(() => of(undefined)),
    };
  });

  afterEach(() => vi.restoreAllMocks());

  it('carrega a biblioteca da sessão', () => {
    const { modal } = create();
    expect(service['listReferenceImages']).toHaveBeenCalledWith('gs');
    expect(modal.images().map((i) => i.id_reference_image)).toEqual(['a']);
    expect(modal.loading()).toBe(false);
  });

  it('enviar: valida o arquivo, manda a legenda e põe a nova no topo', () => {
    const { modal } = create();
    const input = { value: 'x' } as HTMLInputElement;
    modal.upload(input);
    expect(modal.error()).toMatch(/Escolha/);
    expect(service['uploadReferenceImage']).not.toHaveBeenCalled();

    const chosen = file('image/png');
    modal.onFile({ target: { files: [chosen] } } as unknown as Event);
    modal.onTitle({ target: { value: 'Taverna' } } as unknown as Event);
    modal.upload(input);
    expect(service['uploadReferenceImage']).toHaveBeenCalledWith('gs', chosen, 'Taverna');
    expect(modal.images().map((i) => i.id_reference_image)).toEqual(['b', 'a']);
    expect(modal.file()).toBeNull();
    expect(input.value).toBe('');
  });

  it('erro da API aparece na tela', () => {
    service['uploadReferenceImage'] = vi.fn(() =>
      throwError(() => ({ error: { error: { message: 'Limite de 30 imagens' } } })),
    );
    const { modal } = create();
    modal.onFile({ target: { files: [file('image/png')] } } as unknown as Event);
    modal.upload({ value: '' } as HTMLInputElement);
    expect(modal.error()).toBe('Limite de 30 imagens');
    expect(modal.uploading()).toBe(false);
  });

  it('mostrar fecha a biblioteca; fechar pra todos chama a API', () => {
    const { modal, closed } = create();
    modal.show(modal.images()[0]);
    expect(service['showReferenceImage']).toHaveBeenCalledWith('a');
    expect(closed).toHaveBeenCalled();
    modal.hide();
    expect(service['hideReferenceImage']).toHaveBeenCalledWith('gs');
  });

  it('apagar pede confirmação e tira da lista', () => {
    const { modal } = create();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    modal.remove(modal.images()[0]);
    expect(service['deleteReferenceImage']).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    modal.remove(modal.images()[0]);
    expect(service['deleteReferenceImage']).toHaveBeenCalledWith('a');
    expect(modal.images()).toEqual([]);
  });
});

describe('ReferenceImageViewerComponent', () => {
  it('Esc fecha só nesta tela', () => {
    const viewer = new ReferenceImageViewerComponent();
    const dismissed = vi.fn();
    viewer.dismissed.subscribe(dismissed);
    viewer.onEscape();
    expect(dismissed).toHaveBeenCalled();
  });
});
