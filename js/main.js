// ===================== КОНФИГУРАЦИЯ =====================
const CONFIG = {
    MAX_CRAFT_AMOUNT: 99,
    MIN_CRAFT_AMOUNT: 1,
    SCROLL_OFFSET: 100,
    ANIMATION_DURATION: 500,
    MESSAGE_DURATION: 2500,
    SEARCH_DEBOUNCE_DELAY: 300,
    STORAGE_KEY: 'craftCounts'
};

// ===================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====================
let craftCounts = {};
let selectedSearchItem = null;

// ===================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====================

// Debounce для оптимизации поиска
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Валидация данных категорий
function validateCategoriesData() {
    if (!categoriesData || typeof categoriesData !== 'object') {
        console.error('categoriesData не определён или не является объектом');
        return false;
    }
    
    for (let cat of categoryNames) {
        const catData = categoriesData[cat];
        if (!catData || !Array.isArray(catData.items)) {
            console.error(`Некорректные данные для категории ${cat}`);
            return false;
        }
        
        catData.items.forEach((item, idx) => {
            if (!item.name || !Array.isArray(item.resources)) {
                console.error(`Некорректный предмет в категории ${cat}, индекс ${idx}`);
            }
        });
    }
    return true;
}

// Сохранение данных в localStorage
function saveCounts() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(craftCounts));
    } catch (e) {
        console.error('Ошибка сохранения:', e);
        showTempMessage('⚠️ Ошибка сохранения данных', 'error');
    }
}

// Загрузка данных из localStorage
function loadCounts() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (saved) {
            craftCounts = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        craftCounts = {};
        showTempMessage('⚠️ Ошибка загрузки данных', 'error');
    }
}

// Получение общего количества созданных предметов в категории
function getCategoryTotal(category) {
    let total = 0;
    const items = categoriesData[category]?.items;
    if (!items) return 0;
    
    for (let i = 0; i < items.length; i++) {
        total += craftCounts[`${category}_${i}`] || 0;
    }
    return total;
}

// Сброс всех созданных предметов
function resetAllCrafted() {
    if (confirm('⚠️ Вы уверены, что хотите сбросить ВСЕ созданные предметы? Это действие нельзя отменить!')) {
        craftCounts = {};
        saveCounts();
        
        // Обновляем интерфейс
        const activeCategory = document.querySelector('.cat-btn.active')?.innerText.split(' ')[1] || categoryNames[0];
        renderCraftPage(activeCategory);
        renderCategoryButtons(activeCategory);
        renderGlobalSummary();
        showTempMessage('✅ Все данные успешно сброшены', 'success');
    }
}

// Глобальная сводка (если есть соответствующий элемент)
function renderGlobalSummary() {
    const summaryEl = document.getElementById('globalSummary');
    if (!summaryEl) return;
    
    let total = 0;
    for (let key in craftCounts) {
        total += craftCounts[key];
    }
    
    summaryEl.innerHTML = `📊 Всего создано: ${total} предметов`;
}

// Временное сообщение
function showTempMessage(message, type = 'info') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `temp-message temp-message-${type}`;
    msgDiv.textContent = message;
    msgDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4a6b2f' : type === 'error' ? '#8b2c1c' : '#2c3a1a'};
        color: #ffe8a0;
        padding: 12px 24px;
        border-radius: 2rem;
        font-weight: bold;
        z-index: 1001;
        animation: fadeInOut ${CONFIG.MESSAGE_DURATION}ms ease forwards;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 1px solid #f5bc4e;
        font-size: 0.9rem;
    `;
    
    // Добавляем стили анимации, если их ещё нет
    if (!document.getElementById('tempMessageStyle')) {
        const style = document.createElement('style');
        style.id = 'tempMessageStyle';
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(20px); }
                15% { opacity: 1; transform: translateY(0); }
                85% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); visibility: hidden; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(msgDiv);
    setTimeout(() => {
        if (msgDiv.parentNode) msgDiv.remove();
    }, CONFIG.MESSAGE_DURATION);
}

// ===================== ФУНКЦИИ РАСЧЁТА РЕСУРСОВ =====================

// Рекурсивный расчёт ресурсов с защитой от циклических зависимостей
function calculateTotalResources(category, targetIdx, amount = 1, visited = new Set()) {
    const info = categoriesData[category];
    if (!info) return new Map();
    
    const targetItem = info.items[targetIdx];
    const totalResources = new Map();
    const itemKey = `${category}_${targetIdx}`;
    
    // Защита от циклических зависимостей
    if (visited.has(itemKey)) {
        console.warn(`⚠️ Циклическая зависимость обнаружена: ${targetItem.name}`);
        showTempMessage(`⚠️ Обнаружена циклическая зависимость в рецепте "${targetItem.name}"`, 'error');
        return totalResources;
    }
    visited.add(itemKey);
    
    function collectResources(item, multiplier, currentVisited) {
        for (let [resName, resAmount] of item.resources) {
            let isCraftable = false;
            let craftableIdx = -1;
            
            // Проверяем, можно ли скрафтить этот ресурс
            for (let i = 0; i < info.items.length; i++) {
                if (info.items[i].name === resName) {
                    isCraftable = true;
                    craftableIdx = i;
                    break;
                }
            }
            
            if (isCraftable && craftableIdx !== -1) {
                // Рекурсивно собираем ресурсы для крафтового предмета
                collectResources(info.items[craftableIdx], multiplier * resAmount, currentVisited);
            } else {
                // Базовый ресурс
                const current = totalResources.get(resName) || 0;
                totalResources.set(resName, current + (resAmount * multiplier));
            }
        }
    }
    
    collectResources(targetItem, amount, new Set(visited));
    return totalResources;
}

// Отображение модального окна с расчётом ресурсов
function showResourceCalculation(category, targetIdx, targetName, amount) {
    const totalResources = calculateTotalResources(category, targetIdx, amount);
    
    if (totalResources.size === 0) {
        showTempMessage(`⚠️ Для "${targetName}" нет базовых ресурсов для расчёта`, 'error');
        return;
    }
    
    const sortedResources = Array.from(totalResources.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    let resourcesHtml = '<div style="max-height: 300px; overflow-y: auto;">';
    for (let [resName, resQty] of sortedResources) {
        resourcesHtml += `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #5a7842;">
                            <span style="color: #ffe8a0;">${resName}</span>
                            <span style="color: #f5bc4e; font-weight: bold;">${resQty} шт.</span>
                          </div>`;
    }
    resourcesHtml += '</div>';
    
    // Создаём или получаем существующий модальный диалог
    let modal = document.getElementById('resourceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'resourceModal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', 'Расчёт ресурсов');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
        `;
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="background: #1a2413e6; border-radius: 2rem; padding: 1.5rem; max-width: 500px; width: 90%; border: 2px solid #f5bc4e; box-shadow: 0 0 20px rgba(245,188,78,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 2px solid #5a7842; padding-bottom: 0.5rem;">
                <h3 style="color: #f5e8b0; margin: 0;">📊 Расчёт ресурсов</h3>
                <button id="closeModalBtn" style="background: #582c1c; border: none; color: #ffe0b0; font-size: 1.2rem; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#7a3c2c'" onmouseout="this.style.background='#582c1c'">✖</button>
            </div>
            <div style="margin-bottom: 1rem;">
                <p style="color: #d0e0b0;">🎯 <strong style="color: #f5bc4e;">${escapeHtml(targetName)}</strong> × ${amount} шт.</p>
                <p style="color: #d0e0b0; font-size: 0.8rem; margin-top: 5px;">📦 Полный расчёт всех ресурсов (с учётом промежуточных крафтов)</p>
            </div>
            <div style="background: #0f170c; border-radius: 1rem; padding: 0.8rem;">
                ${resourcesHtml}
            </div>
            <div style="margin-top: 1rem; text-align: center; font-size: 0.7rem; color: #8aaa6a;">
                * Расчёт учитывает все промежуточные предметы крафта
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Закрытие модального окна
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    
    // Закрытие по Escape
    const keyHandler = (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
            document.removeEventListener('keydown', keyHandler);
        }
    };
    document.addEventListener('keydown', keyHandler);
}

// ===================== ФУНКЦИИ ПОДСВЕТКИ =====================

// Снятие подсветки с выбранного предмета
function clearSelectedItemHighlight() {
    if (selectedSearchItem) {
        const prevCard = document.querySelector(`.recipe-card[data-item-idx="${selectedSearchItem.itemIdx}"]`);
        if (prevCard) {
            prevCard.classList.remove('search-selected');
        }
        selectedSearchItem = null;
    }
}

// Подсветка выбранного предмета
function highlightSelectedItem(category, itemIdx) {
    clearSelectedItemHighlight();
    
    selectedSearchItem = { category, itemIdx };
    
    const card = document.querySelector(`.recipe-card[data-item-idx="${itemIdx}"]`);
    if (card) {
        card.classList.add('search-selected');
        
        // Плавная прокрутка с учётом фиксированной шапки
        const headerOffset = CONFIG.SCROLL_OFFSET;
        const elementPosition = card.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        
        // Эффект пульсации
        card.style.transform = 'scale(1.02)';
        card.style.transition = 'transform 0.3s ease';
        setTimeout(() => {
            if (card) {
                card.style.transform = '';
                setTimeout(() => {
                    if (card) card.style.transition = '';
                }, 300);
            }
        }, CONFIG.ANIMATION_DURATION);
    }
}

// ===================== ФУНКЦИИ ПОИСКА =====================

// Экранирование HTML для безопасности
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Поиск предметов
function searchItems(query) {
    if (!query || query.trim() === '') {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) resultsContainer.style.display = 'none';
        return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const results = [];
    
    for (let cat of categoryNames) {
        const items = categoriesData[cat]?.items;
        if (!items) continue;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemName = item.name.toLowerCase();
            if (itemName.includes(searchTerm)) {
                results.push({
                    category: cat,
                    categoryIcon: categoriesData[cat]?.icon || '📦',
                    itemIndex: i,
                    itemName: item.name,
                    resources: item.resources,
                    craftedCount: craftCounts[`${cat}_${i}`] || 0
                });
            }
        }
    }
    
    displaySearchResults(results, searchTerm);
}

// Отображение результатов поиска
function displaySearchResults(results, searchTerm) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = `<div class="search-results"><div class="no-results" style="padding: 1rem; text-align: center; color: #d0e0b0;">🔍 Ничего не найдено по запросу "${escapeHtml(searchTerm)}"</div></div>`;
        return;
    }
    
    let html = `<div class="search-results" style="background: #1a2413; border-radius: 1rem; padding: 0.5rem; margin-top: 0.5rem; max-height: 400px; overflow-y: auto;">
                    <div class="search-stats" style="padding: 0.5rem; color: #f5bc4e; font-weight: bold; border-bottom: 1px solid #5a7842;">📋 Найдено предметов: ${results.length}</div>`;
    
    for (let res of results) {
        const resourcePreview = res.resources.slice(0, 3).map(r => `${r[0]} x${r[1]}`).join(', ');
        const moreResources = res.resources.length > 3 ? '...' : '';
        
        html += `<div class="search-result-item" data-category="${escapeHtml(res.category)}" data-itemidx="${res.itemIndex}" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; border-bottom: 1px solid #2c3a1a; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#2c3a1a'" onmouseout="this.style.background='transparent'">
                    <span class="result-category" style="font-size: 0.8rem; background: #0f170c; padding: 0.2rem 0.5rem; border-radius: 1rem;">${res.categoryIcon} ${escapeHtml(res.category)}</span>
                    <span class="result-name" style="font-weight: bold; color: #f5e8b0;">${escapeHtml(res.itemName)}</span>
                    <span class="result-resources" style="font-size: 0.8rem; color: #a0c080;">📦 ${escapeHtml(resourcePreview)}${moreResources}</span>
                    <span class="crafted-count" style="margin-left: auto; font-size: 0.8rem; color: #f5bc4e;">📊 Создано: ${res.craftedCount} шт.</span>
                </div>`;
    }
    html += `</div>`;
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = html;
    
    // Добавляем обработчики клика с очисткой старых
    document.querySelectorAll('.search-result-item').forEach(el => {
        // Удаляем старые обработчики, чтобы избежать дублирования
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);
        
        newEl.addEventListener('click', () => {
            const category = newEl.dataset.category;
            const itemIdx = parseInt(newEl.dataset.itemidx);
            
            // Переключаемся на нужную категорию
            renderCraftPage(category);
            renderCategoryButtons(category);
            
            // Подсвечиваем выбранный предмет
            setTimeout(() => {
                highlightSelectedItem(category, itemIdx);
            }, 100);
            
            // Скрываем результаты поиска
            const searchResults = document.getElementById('searchResults');
            if (searchResults) searchResults.style.display = 'none';
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
        });
        
        // Добавляем поддержку клавиатуры
        newEl.setAttribute('role', 'option');
        newEl.setAttribute('tabindex', '0');
        newEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                newEl.click();
            }
        });
    });
}

// ===================== ФУНКЦИИ ОТРИСОВКИ ИНТЕРФЕЙСА =====================

// Отрисовка кнопок категорий
function renderCategoryButtons(active = null) {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    
    const fragment = document.createDocumentFragment();
    grid.innerHTML = '';
    
    for (let cat of categoryNames) {
        const total = getCategoryTotal(cat);
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        if (active === cat) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        } else {
            btn.setAttribute('aria-selected', 'false');
        }
        
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-label', `Категория ${cat}`);
        btn.innerHTML = `${categoriesData[cat]?.icon || '📦'} ${cat}`;
        
        if (total > 0) { 
            const badge = document.createElement('span'); 
            badge.className = 'category-badge'; 
            badge.innerText = total; 
            btn.appendChild(badge); 
        }
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Скрываем результаты поиска при выборе категории
            const searchResults = document.getElementById('searchResults');
            if (searchResults) searchResults.style.display = 'none';
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
            // Снимаем подсветку с выбранного предмета
            clearSelectedItemHighlight();
            renderCraftPage(cat); 
            renderCategoryButtons(cat); 
        });
        
        fragment.appendChild(btn);
    }
    
    grid.appendChild(fragment);
}

// Отрисовка страницы крафта
function renderCraftPage(category) {
    const container = document.getElementById('craftContent');
    const titleEl = document.getElementById('currentCategoryTitle');
    if (!titleEl) return;
    
    const info = categoriesData[category];
    if (!info) return;
    
    titleEl.innerHTML = `${info.icon || '🔧'} ${category} | Создано: <span id="categoryTotalSpan" style="background:#2c3a1a; padding:0 8px; border-radius:30px;">${getCategoryTotal(category)}</span> шт.`;
    
    let html = `<div class="recipe-list" style="display: grid; gap: 1rem;">`;
    
    for (let i = 0; i < info.items.length; i++) {
        const item = info.items[i];
        const cur = craftCounts[`${category}_${i}`] || 0;
        const hasCrafted = cur > 0;
        const isSearchSelected = (selectedSearchItem && selectedSearchItem.category === category && selectedSearchItem.itemIdx === i);
        
        let resHtml = `<div class="resources-req" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.5rem 0;">`;
        for (let [r, a] of item.resources) {
            resHtml += `<span class="resource-item" style="background: #0f170c; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.85rem;">${escapeHtml(r)} x${a}</span>`;
        }
        resHtml += `</div>`;
        
        html += `<div class="recipe-card ${hasCrafted ? 'crafted-positive' : ''} ${isSearchSelected ? 'search-selected' : ''}" data-item-idx="${i}" style="background: #1a2413; border-radius: 1rem; padding: 1rem; border: 1px solid #5a7842; transition: all 0.3s ease;">
                    <div class="recipe-name" style="font-size: 1.1rem; font-weight: bold; color: #f5e8b0;">🔨 ${escapeHtml(item.name)}</div>
                    ${resHtml}
                    <div class="craft-actions" style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin: 0.5rem 0;">
                        <input type="number" id="amount_input_${category}_${i}" class="craft-input" value="1" min="${CONFIG.MIN_CRAFT_AMOUNT}" max="${CONFIG.MAX_CRAFT_AMOUNT}" style="width: 65px; padding: 0.4rem; border-radius: 0.5rem; border: 1px solid #5a7842; background: #0f170c; color: #ffe8a0; text-align: center;">
                        <button class="craft-btn" data-cat="${category}" data-idx="${i}" data-action="craft" style="background: #4a6b2f; color: #ffe8a0; border: none; padding: 0.4rem 1rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;">🔧 Создать</button>
                        <button class="craft-btn reset-craft" data-cat="${category}" data-idx="${i}" data-action="reset" style="background: #582c1c; color: #ffe0b0; border: none; padding: 0.4rem 1rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;">🗑 Сбросить</button>
                        <button class="craft-btn calculate-btn" data-cat="${category}" data-idx="${i}" data-action="calculate" style="background: #2c3a1a; color: #f5bc4e; border: 1px solid #f5bc4e; padding: 0.4rem 1rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;">📊 Расчёт</button>
                    </div>
                    <div class="crafted-count" style="font-size: 0.85rem; color: #a0c080;">📦 Создано: <span id="count_display_${category}_${i}">${cur}</span> шт.
                    </div>
                </div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
    
    // Добавляем обработчики событий
    for (let i = 0; i < info.items.length; i++) {
        const craftBtn = document.querySelector(`.craft-btn[data-cat="${category}"][data-idx="${i}"][data-action="craft"]`);
        const resetBtn = document.querySelector(`.craft-btn[data-cat="${category}"][data-idx="${i}"][data-action="reset"]`);
        const calcBtn = document.querySelector(`.craft-btn[data-cat="${category}"][data-idx="${i}"][data-action="calculate"]`);
        
        if (craftBtn) {
            craftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // При взаимодействии с предметом снимаем подсветку
                if (selectedSearchItem) {
                    clearSelectedItemHighlight();
                }
                const inp = document.getElementById(`amount_input_${category}_${i}`); 
                let amt = parseInt(inp.value); 
                if (isNaN(amt) || amt < CONFIG.MIN_CRAFT_AMOUNT) amt = CONFIG.MIN_CRAFT_AMOUNT; 
                if (amt > CONFIG.MAX_CRAFT_AMOUNT) amt = CONFIG.MAX_CRAFT_AMOUNT;
                const oldVal = craftCounts[`${category}_${i}`] || 0;
                updateItemAmountWithoutRender(category, i, oldVal + amt);
                showTempMessage(`✅ Создано ${amt} шт. "${info.items[i].name}"`, 'success');
                return false;
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // При взаимодействии с предметом снимаем подсветку
                if (selectedSearchItem) {
                    clearSelectedItemHighlight();
                }
                const itemName = info.items[i].name;
                const oldValue = craftCounts[`${category}_${i}`] || 0;
                if (oldValue > 0) {
                    updateItemAmountWithoutRender(category, i, 0);
                    showTempMessage(`🗑 Сброшено создание "${itemName}"`, 'info');
                }
                return false;
            });
        }
        
        if (calcBtn) {
            calcBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const inp = document.getElementById(`amount_input_${category}_${i}`); 
                let amt = parseInt(inp.value); 
                if (isNaN(amt) || amt < CONFIG.MIN_CRAFT_AMOUNT) amt = CONFIG.MIN_CRAFT_AMOUNT; 
                if (amt > CONFIG.MAX_CRAFT_AMOUNT) amt = CONFIG.MAX_CRAFT_AMOUNT;
                const itemName = info.items[i].name;
                showResourceCalculation(category, i, itemName, amt);
                return false;
            });
        }
    }
}

// Обновление количества предмета без полного перерендера
function updateItemAmountWithoutRender(category, idx, newValue) {
    const key = `${category}_${idx}`;
    const oldValue = craftCounts[key] || 0;
    if (oldValue === newValue) return;
    
    craftCounts[key] = newValue;
    saveCounts();
    
    const countSpan = document.getElementById(`count_display_${category}_${idx}`);
    if (countSpan) {
        countSpan.innerText = newValue;
        countSpan.style.transform = 'scale(1.1)';
        setTimeout(() => {
            if (countSpan) countSpan.style.transform = '';
        }, 150);
    }
    
    const card = document.querySelector(`.recipe-card[data-item-idx="${idx}"]`);
    if (card) {
        if (newValue > 0) {
            card.classList.add('crafted-positive');
        } else {
            card.classList.remove('crafted-positive');
        }
    }
    
    const totalSpan = document.getElementById('categoryTotalSpan');
    if (totalSpan) {
        totalSpan.innerText = getCategoryTotal(category);
    }
    
    renderCategoryButtons(category);
    renderGlobalSummary();
}

// ===================== ИНИЦИАЛИЗАЦИЯ =====================

function init() {
    // Валидация данных
    if (!validateCategoriesData()) {
        console.error('❌ Ошибка валидации данных categoriesData');
        showTempMessage('❌ Ошибка загрузки данных игры', 'error');
        return;
    }
    
    // Загрузка сохранённых данных
    loadCounts();
    
    // Отрисовка интерфейса
    renderCategoryButtons(null);
    if (categoryNames.length > 0) {
        renderCraftPage(categoryNames[0]);
        renderCategoryButtons(categoryNames[0]);
    }
    
    // Кнопка сброса всех данных
    const resetBtn = document.getElementById('resetAllBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetAllCrafted();
        });
    }
    
    // ===== ИНИЦИАЛИЗАЦИЯ ПОИСКА =====
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        // Используем debounce для оптимизации
        const debouncedSearch = debounce((e) => searchItems(e.target.value), CONFIG.SEARCH_DEBOUNCE_DELAY);
        searchInput.addEventListener('input', debouncedSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchItems(e.target.value);
            }
        });
        
        // Добавляем aria-метки для доступности
        searchInput.setAttribute('aria-label', 'Поиск предметов');
        searchInput.setAttribute('placeholder', '🔍 Поиск предметов...');
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchItems('');
            }
            const searchResults = document.getElementById('searchResults');
            if (searchResults) searchResults.style.display = 'none';
            // Снимаем подсветку при очистке поиска
            clearSelectedItemHighlight();
        });
    }
    
    // Отрисовка глобальной сводки
    renderGlobalSummary();
    
    console.log('✅ Приложение успешно инициализировано');
}

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', init);
