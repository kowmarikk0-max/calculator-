// ===================== ОТРИСОВКА ИТЕРФЕЙСА =====================
function renderCategoryButtons(active = null) {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let cat of categoryNames) {
        const total = getCategoryTotal(cat);
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        if (active === cat) btn.classList.add('active');
        btn.innerHTML = `${categoriesData[cat]?.icon || '📦'} ${cat}`;
        if (total > 0) { 
            const b = document.createElement('span'); 
            b.className = 'category-badge'; 
            b.innerText = total; 
            btn.appendChild(b); 
        }
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            renderCraftPage(cat); 
            renderCategoryButtons(cat); 
        });
        grid.appendChild(btn);
    }
}

function renderCraftPage(category) {
    const container = document.getElementById('craftContent');
    const titleEl = document.getElementById('currentCategoryTitle');
    if (!titleEl) return;
    const info = categoriesData[category];
    if (!info) return;
    
    titleEl.innerHTML = `${info.icon || '🔧'} ${category} | Создано: <span id="categoryTotalSpan" style="background:#2c3a1a; padding:0 8px; border-radius:30px;">${getCategoryTotal(category)}</span> шт.`;
    let html = `<div class="recipe-list">`;
    for (let i = 0; i < info.items.length; i++) {
        const item = info.items[i];
        const cur = craftCounts[`${category}_${i}`] || 0;
        const hasCrafted = cur > 0;
        let resHtml = `<div class="resources-req">`;
        for (let [r, a] of item.resources) {
            resHtml += `<span class="resource-item">🔩 ${r} x${a}</span>`;
        }
        resHtml += `</div>`;
        html += `<div class="recipe-card ${hasCrafted ? 'crafted-positive' : ''}" data-item-idx="${i}">
                    <div class="recipe-name">🔨 ${item.name}</div>
                    ${resHtml}
                    <div class="craft-actions">
                        <input type="number" id="amount_input_${category}_${i}" class="craft-input" value="1" min="1" max="99">
                        <button class="craft-btn" data-cat="${category}" data-idx="${i}" data-action="craft">🔧 Создать</button>
                        <button class="craft-btn reset-craft" data-cat="${category}" data-idx="${i}" data-action="reset">🗑 Сбросить</button>
                    </div>
                    <div class="crafted-count">📦 Создано: <span id="count_display_${category}_${i}">${cur}</span> шт.
                    </div>
                </div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
    
    for (let i = 0; i < info.items.length; i++) {
        const craftBtn = document.querySelector(`.craft-btn[data-cat="${category}"][data-idx="${i}"][data-action="craft"]`);
        const resetBtn = document.querySelector(`.craft-btn[data-cat="${category}"][data-idx="${i}"][data-action="reset"]`);
        
        if (craftBtn) {
            craftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const inp = document.getElementById(`amount_input_${category}_${i}`); 
                let amt = parseInt(inp.value); 
                if (isNaN(amt) || amt < 1) amt = 1; 
                if (amt > 99) amt = 99;
                const oldVal = craftCounts[`${category}_${i}`] || 0;
                // Используем обновление без перерисовки всей страницы
                updateItemAmountWithoutRender(category, i, oldVal + amt);
                return false;
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                updateItemAmountWithoutRender(category, i, 0);
                return false;
            });
        }
    }
}

// Новая функция: обновление без перерисовки всей страницы
function updateItemAmountWithoutRender(category, idx, newValue) {
    const key = `${category}_${idx}`;
    const oldValue = craftCounts[key] || 0;
    if (oldValue === newValue) return;
    
    craftCounts[key] = newValue;
    saveCounts();
    
    // Обновляем только конкретный счётчик на странице
    const countSpan = document.getElementById(`count_display_${category}_${idx}`);
    if (countSpan) {
        countSpan.innerText = newValue;
        // Добавляем визуальный эффект
        countSpan.style.transform = 'scale(1.1)';
        setTimeout(() => {
            if (countSpan) countSpan.style.transform = '';
        }, 150);
    }
    
    // Обновляем класс crafted-positive у карточки
    const card = document.querySelector(`.recipe-card[data-item-idx="${idx}"]`);
    if (card) {
        if (newValue > 0) {
            card.classList.add('crafted-positive');
        } else {
            card.classList.remove('crafted-positive');
        }
    }
    
    // Обновляем общее количество в заголовке категории
    const totalSpan = document.getElementById('categoryTotalSpan');
    if (totalSpan) {
        totalSpan.innerText = getCategoryTotal(category);
    }
    
    // Обновляем бейджи на кнопках категорий
    renderCategoryButtons(category);
    
    // Обновляем глобальный итог
    renderGlobalSummary();
}

function init() {
    loadCounts();
    renderCategoryButtons(null);
    // Показываем первую категорию по умолчанию
    if (categoryNames.length > 0) {
        renderCraftPage(categoryNames[0]);
        renderCategoryButtons(categoryNames[0]);
    }
    const resetBtn = document.getElementById('resetAllBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetAllCrafted();
        });
    }
}

// Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', init);
