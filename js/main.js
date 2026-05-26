// ===================== ОТРИСОВКА ИНТЕРФЕЙСА =====================
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
        btn.addEventListener('click', () => { 
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
        html += `<div class="recipe-card ${hasCrafted ? 'crafted-positive' : ''}">
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
            craftBtn.addEventListener('click', () => { 
                const inp = document.getElementById(`amount_input_${category}_${i}`); 
                let amt = parseInt(inp.value); 
                if (isNaN(amt) || amt < 1) amt = 1; 
                if (amt > 99) amt = 99;
                const oldVal = craftCounts[`${category}_${i}`] || 0;
                updateItemAmount(category, i, oldVal + amt);
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => { 
                updateItemAmount(category, i, 0);
            });
        }
    }
}

function init() {
    loadCounts();
    renderCategoryButtons(null);
    // Показываем первую категорию по умолчанию
    if (categoryNames.length > 0) {
        renderCraftPage(categoryNames[0]);
        renderCategoryButtons(categoryNames[0]);
    }
    document.getElementById('resetAllBtn')?.addEventListener('click', resetAllCrafted);
}

// Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', init);