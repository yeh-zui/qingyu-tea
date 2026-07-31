(() => {
  const imageFor = item => {
    const name = item.name || '';
    const category = item.category || '';
    if (category === '找拿鐵' || name.includes('拿鐵')) return 'assets/latte.png';
    if (category === '找新鮮' || /檸檬|柚|旺來|桔|梅|多多/.test(name)) return 'assets/fruit-tea.png';
    if (category === '找冰淇淋' || category === '季節限定' || name.includes('冰淇淋')) return 'assets/seasonal.png';
    if (category === '找奶茶' || name.includes('奶')) return 'assets/milk-tea.png';
    return 'assets/tea.png';
  };

  const decorateMenu = () => {
    document.querySelectorAll('.drink-card').forEach(card => {
      if (card.querySelector('.drink-photo')) return;
      const item = {
        name: card.dataset.name || '',
        category: card.querySelector('small')?.textContent?.trim() || ''
      };
      const image = document.createElement('img');
      image.className = 'drink-photo';
      image.src = imageFor(item);
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      card.append(image);
    });
  };

  const addStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      .drink-card { position: relative; overflow: hidden; padding-right: 105px !important; min-height: 112px !important; }
      .drink-photo { position: absolute; right: 5px; bottom: 4px; width: 92px; height: 92px; object-fit: cover; border-radius: 14px; pointer-events: none; box-shadow: 0 5px 13px rgba(20, 92, 140, .13); transition: transform .18s ease; }
      .drink-card:hover .drink-photo { transform: scale(1.04); }
      @media (max-width: 520px) { .drink-photo { width: 82px; height: 82px; } .drink-card { padding-right: 94px !important; } }
    `;
    document.head.append(style);
  };

  const originalRenderMenu = window.renderMenu;
  if (typeof originalRenderMenu === 'function') {
    window.renderMenu = function () {
      originalRenderMenu();
      decorateMenu();
    };
  }
  addStyles();
  decorateMenu();
})();
