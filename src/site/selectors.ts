/**
 * Every selector for the trade site lives here, so a site update means fixing one file.
 * Verified against the live trade2 page on 2026-10-05 (snapshots in docs/dom/).
 * The search form is Vue 2 (`#trade`), the result list is a Vue 3 app in `#vue3-portal`.
 */
export const sel = {
  tradeRoot: '#trade',
  navigation: '#trade > .navigation',
  searchPanel: '#trade .search-panel',
  itemSearchInput: '#trade .search-bar .search-left .multiselect__input',
  searchButton: '#trade .controls .search-btn',
  clearButton: '#trade .controls .clear-btn',
  liveSearchButton: '#trade .controls .livesearch-btn',
  controls: '#trade .controls',
  advancedPane: '#trade .search-advanced-pane',
  propertyPane: '#trade .search-advanced-pane.blue',
  statPane: '#trade .search-advanced-pane.brown',
  filterGroup: '.filter-group',
  results: '#vue3-portal .results',
  resultTotal: '#vue3-portal .results .row-total',
  resultRow: '#vue3-portal .resultset > .row[data-id]',
  loadMoreButton: '#vue3-portal .results .load-more-btn',
  topButton: '#trade .top-btn',

  /** Inside a result row. */
  row: {
    itemPopup: '.middle .item-popup',
    itemHeaderLines: '.item-popup__header-line',
    mod: '.item-mod',
    explicitMod: '.item-mod--explicit',
    implicitMod: '.item-mod--implicit',
    /** Stat text span carrying `data-field="stat.<type>.stat_<n>"`. */
    modStat: '.item-mod > [data-field^="stat."]',
    price: '.right .details .price',
    priceField: '[data-field="price"]',
    priceCurrencyImage: '[data-field="price"] .currency-image img',
    sellerLink: '.right .details .profile-link a',
    characterName: '.right .details .character-name a',
    status: '.right .details .status',
    buttons: '.right .details .btns',
    listedAgo: '.right .details [data-field="indexed"] small',
  },
} as const;
