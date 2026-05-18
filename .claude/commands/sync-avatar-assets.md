# Skill: sync-avatar-assets

Escaneia os assets em `src/assets/avatar/` e sincroniza automaticamente o arquivo `avatar-preset.interface.ts` com quaisquer estilos de cabelo ou barba novos encontrados nos arquivos.

## Contexto do projeto

Os assets do avatar seguem um padrão de nomenclatura fixo:

| Diretório | Padrão do arquivo | Exemplo |
|-----------|------------------|---------|
| `hair/` | `{estilo}_{cor}.png` | `hair_short_03_blond.png` |
| `beard/` | `{estilo}_{cor}.png` | `beard_03_red.png` |

- **Estilo de cabelo**: tudo antes do último segmento de cor → `hair_short_03`, `hair_long_02`
- **Estilo de barba**: tudo antes do último segmento de cor → `beard_01`, `beard_02`
- **Cores válidas**: `blond`, `grey`, `lbrown`, `red` (definidas em `HairColor`)

O arquivo de referência é `src/app/models/avatar-preset.interface.ts`.

## Passos de execução

Quando o usuário invoca `/sync-avatar-assets`:

### 1. Leia o estado atual da interface

Leia `src/app/models/avatar-preset.interface.ts` completo. Extraia:
- Os valores do tipo `HairStyle` (entre as aspas simples na linha `export type HairStyle = ...`)
- Os valores do tipo `BeardStyle` (idem)
- As entradas de `AVATAR_HAIR_STYLES` (array de objetos `{ key, label }`)
- As entradas de `AVATAR_BEARD_STYLES` (idem)

### 2. Escaneie os assets em disco

Execute os dois comandos abaixo para listar os arquivos presentes:

```bash
ls src/assets/avatar/hair/
ls src/assets/avatar/beard/
```

Para cada arquivo `.png` listado:
- Remova a extensão `.png`
- Remova o sufixo de cor (último segmento separado por `_`): `blond`, `grey`, `lbrown`, `red`
- O que sobra é o **estilo** (ex: `hair_short_03`, `beard_02`)

Colete os estilos únicos para cada diretório.

### 3. Identifique as diferenças

Compare os estilos encontrados em disco com os definidos na interface:
- **Novos estilos de cabelo**: estão em disco mas não no tipo `HairStyle`
- **Novos estilos de barba**: estão em disco mas não no tipo `BeardStyle`

Se não houver diferenças, informe o usuário que tudo já está sincronizado e encerre.

### 4. Gere os labels automaticamente

Para cada novo estilo, gere um label legível seguindo as regras:

| Padrão do key | Label gerado |
|--------------|-------------|
| `hair_short_01` | `Curto 1` |
| `hair_short_02` | `Curto 2` |
| `hair_short_NN` | `Curto N` |
| `hair_long_01` | `Longo 1` |
| `hair_long_NN` | `Longo N` |
| `beard_01` | `Barba 1` |
| `beard_NN` | `Barba N` |

O número no label é o numeral extraído do nome do arquivo (ex: `03` → `3`).

**Atenção com label de estilos únicos existentes:** se já existe apenas um estilo `hair_long_01` com label `Longo` (sem número), renomeie-o para `Longo 1` ao adicionar um segundo longo. Mesmo critério para `Curto` e `Barba`.

### 5. Atualize `avatar-preset.interface.ts`

Faça as edições necessárias com a ferramenta Edit (nunca reescreva o arquivo inteiro):

#### 5a. Tipo `HairStyle`
Adicione os novos keys ao union type, mantendo a ordem: primeiro os curtos em ordem numérica, depois os longos em ordem numérica.

```typescript
// antes
export type HairStyle = 'hair_long_01' | 'hair_short_01' | 'hair_short_02';

// depois (exemplo com hair_long_02 e hair_short_03 novos)
export type HairStyle = 'hair_long_01' | 'hair_long_02' | 'hair_short_01' | 'hair_short_02' | 'hair_short_03';
```

#### 5b. Tipo `BeardStyle`
Mesmo critério para novos estilos de barba.

#### 5c. Array `AVATAR_HAIR_STYLES`
Adicione as novas entradas mantendo a ordem: curtos primeiro (numérico), longos depois (numérico).

```typescript
export const AVATAR_HAIR_STYLES: { key: HairStyle; label: string }[] = [
  { key: 'hair_short_01', label: 'Curto 1' },
  { key: 'hair_short_02', label: 'Curto 2' },
  { key: 'hair_short_03', label: 'Curto 3' },  // novo
  { key: 'hair_long_01', label: 'Longo 1' },
  { key: 'hair_long_02', label: 'Longo 2' },   // novo
];
```

#### 5d. Array `AVATAR_BEARD_STYLES`
Mesmo critério para novos estilos de barba.

### 6. Confirme o resultado

Após as edições, exiba um resumo do que foi adicionado:

```
✓ Sincronização concluída!

Cabelos adicionados:
  - hair_short_03 → "Curto 3"
  - hair_long_02  → "Longo 2"

Barbas adicionadas:
  (nenhuma)
```

## Regras críticas

- **Nunca** remova entradas existentes da interface, mesmo que o asset não esteja mais em disco
- **Nunca** altere `HairColor`, `SkinColor`, `AvatarRace`, `AvatarClass` — esses tipos não são derivados de assets de hair/beard
- **Nunca** reescreva o arquivo inteiro — use edições cirúrgicas com Edit para minimizar diff
- Mantenha a ordenação: curtos antes de longos, e dentro de cada grupo, ordem numérica crescente
- Se um estilo já tem label sem número (ex: `'Longo'`) e um segundo é adicionado, renomeie o existente para `'Longo 1'`

## Exemplo de uso

```
/sync-avatar-assets
```
