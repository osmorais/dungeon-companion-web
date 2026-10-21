import { SkeletonRowsComponent } from './skeleton-rows.component';

describe('SkeletonRowsComponent', () => {
  it('gera uma linha por row, com larguras variadas que se repetem', () => {
    const rows = new SkeletonRowsComponent();
    rows.rows = 7;
    expect(rows.widths).toEqual(['92%', '70%', '84%', '60%', '76%', '92%', '70%']);
  });

  it('zero rows não gera linha', () => {
    const rows = new SkeletonRowsComponent();
    rows.rows = 0;
    expect(rows.widths).toEqual([]);
  });
});
