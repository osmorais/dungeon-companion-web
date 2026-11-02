/**
 * Formatos de imagem aceitos no upload (1.17.6), os mesmos da api (`image-type.ts`): lá o tipo
 * vale pelo conteúdo do arquivo; aqui só evita escolher e mandar um arquivo que vai ser recusado.
 * O `accept` dos `<input type="file">` usa a mesma lista (no iPhone, faz a foto HEIC virar JPEG).
 */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const IMAGE_TYPE_ERROR = 'Formato de imagem não aceito: use PNG, JPEG, WebP ou GIF.';

export function isAcceptedImageFile(file: Pick<File, 'type'>): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase());
}
