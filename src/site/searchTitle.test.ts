import { suggestTitle } from './searchTitle';

describe('suggestTitle', () => {
  it('prefers unique name and base type', () => {
    expect(suggestTitle({ name: 'Headhunter', type: 'Heavy Belt' })).toBe('Headhunter Heavy Belt');
    expect(suggestTitle({ type: { option: 'Gold Amulet' } })).toBe('Gold Amulet');
    expect(suggestTitle({ term: 'life ring' })).toBe('life ring');
  });

  it('falls back to category and rarity labels', () => {
    const options = new Map([
      ['type_filters.category', [{ id: 'accessory.amulet', text: 'Amulet' }]],
      ['type_filters.rarity', [{ id: 'rare', text: 'Rare' }]],
    ]);
    const filters = { type_filters: { filters: { category: { option: 'accessory.amulet' }, rarity: { option: 'rare' } } } };
    expect(suggestTitle({ filters }, options)).toBe('Amulet (Rare)');
    expect(suggestTitle({ filters: { type_filters: { filters: { category: { option: 'weapon.bow' } } } } })).toBe('Bow');
    expect(suggestTitle({})).toBe('');
  });
});
