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
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            renderCraftPage(cat); 
            renderCategoryButtons(cat); 
        });
        grid.appendChild(btn);
    }
}

// Функция рекурсивного расчёта ресурсов для целевого предмета
function calculateTotalResources(category, targetIdx, amount = 1) {
    const info = categoriesData[category];
    if (!info) return new Map();
    
    const targetItem = info.items[targetIdx];
    const totalResources = new Map();
    
    // Рекурсивная функция для сбора ресурсов
    function collectResources(item, multiplier) {
        for (let [resName, resAmount] of item.resources) {
            // Проверяем, является ли ресурс предметом из этой же категории
            let isCraftable = false;
            let craftableIdx = -1;
            
            for (let i = 0; i < info.items.length; i++) {
                if (info.items[i].name === resName) {
                    isCraftable = true;
                    craftableIdx = i;
                    break;
                }
            }
            
            if (isCraftable && craftableIdx !== -1) {
                // Рекурсивно собираем ресурсы для крафтового предмета
                collectResources(info.items[craftableIdx], multiplier * resAmount);
            } else {
                // Обычный ресурс
                const current = totalResources.get(resName) || 0;
                totalResources.set(resName, current + (resAmount * multiplier));
            }
        }
    }
    
    collectResources(targetItem, amount);
    return totalResources;
}

// Функция отображения расчёта ресурсов
function showResourceCalculation(category, targetIdx, targetName, amount) {
    const totalResources = calculateTotalResources(category, targetIdx, amount);
    
    if (totalResources.size === 0) {
        showTempMessage(`⚠️ Для ${targetName} нет базовых ресурсов для расчёта`, 'warning');
        return;
    }
    
    // Сортируем ресурсы по имени
    const sortedResources = Array.from(totalResources.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    // Формируем HTML для отображения
    let resourcesHtml = '<div style="max-height: 300px; overflow-y: auto;">';
    for (let [resName, resQty] of sortedResources) {
        resourcesHtml += `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #5a7842;">
                            <span style="color: #ffe8a0;">🔩 ${resName}</span>
                            <span style="color: #f5bc4e; font-weight: bold;">${resQty} шт.</span>
                          </div>`;
    }
    resourcesHtml += '</div>';
    
    // Создаём или обновляем модальное окно
    let modal = document.getElementById('resourceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'resourceModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
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
                <h3 style="color: #f5e8b0;">📊 Расчёт ресурсов</h3>
                <button id="closeModalBtn" style="background: #582c1c; border: none; color: #ffe0b0; font-size: 1.2rem; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;">✖</button>
            </div>
            <div style="margin-bottom: 1rem;">
                <p style="color: #d0e0b0;">🎯 <strong style="color: #f5bc4e;">${targetName}</strong> × ${amount} шт.</p>
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
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// Временное сообщение
function showTempMessage(message, type = 'info') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `temp-message`;
    msgDiv.textContent = message;
    msgDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4a6b2f' : '#8b2c1c'};
        color: #ffe8a0;
        padding: 10px 20px;
        border-radius: 2rem;
        font-weight: bold;
        z-index: 1001;
        animation: fadeInOut 2s ease forwards;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 1px solid #f5bc4e;
    `;
    
    const style = document.getElementById('tempMessageStyle');
    if (!style) {
        const s = document.createElement('style');
        s.id = 'tempMessageStyle';
        s.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(20px); }
                15% { opacity: 1; transform: translateY(0); }
                85% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); visibility: hidden; }
            }
        `;
        document.head.appendChild(s);
    }
    
    document.body.appendChild(msgDiv);
    setTimeout(() => {
        if (msgDiv.parentNode) msgDiv.remove();
    }, 2500);
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
                        <input type="number" id="amount_input_${category}_${i}" class="craft-input" value="1" min="1" max="99" style="width: 55px;">
                        <button class="craft-btn" data-cat="${category}" data-idx="${i}" data-action="craft">🔧 Создать</button>
                        <button class="craft-btn reset-craft" data-cat="${category}" data-idx="${i}" data-action="reset">🗑 Сбросить</button>
                        <button class="craft-btn calculate-btn" data-cat="${category}" data-idx="${i}" data-action="calculate">📊 Расчёт</button>
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
        const calcBtn = document.querySelector(`.craft-btn[data-cat="${category}"][data-idx="${i}"][data-action="calculate"]`);
        
        if (craftBtn) {
            craftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const inp = document.getElementById(`amount_input_${category}_${i}`); 
                let amt = parseInt(inp.value); 
                if (isNaN(amt) || amt < 1) amt = 1; 
                if (amt > 99) amt = 99;
                const oldVal = craftCounts[`${category}_${i}`] || 0;
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
        if (calcBtn) {
            calcBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const inp = document.getElementById(`amount_input_${category}_${i}`); 
                let amt = parseInt(inp.value); 
                if (isNaN(amt) || amt < 1) amt = 1; 
                if (amt > 99) amt = 99;
                const itemName = info.items[i].name;
                showResourceCalculation(category, i, itemName, amt);
                return false;
            });
        }
    }
}

// Функция обновления без перерисовки всей страницы
function updateItemAmountWithoutRender(category, idx, newValue) {
    const key = `${category}_${idx}`;
    const oldValue = craftCounts[key] || 0;
    if (oldValue === newValue) return;
    
    craftCounts[key] = newValue;
    saveCounts();
    
    // Обновляем счётчик
    const countSpan = document.getElementById(`count_display_${category}_${idx}`);
    if (countSpan) {
        countSpan.innerText = newValue;
        countSpan.style.transform = 'scale(1.1)';
        setTimeout(() => {
            if (countSpan) countSpan.style.transform = '';
        }, 150);
    }
    
    // Обновляем класс карточки
    const card = document.querySelector(`.recipe-card[data-item-idx="${idx}"]`);
    if (card) {
        if (newValue > 0) {
            card.classList.add('crafted-positive');
        } else {
            card.classList.remove('crafted-positive');
        }
    }
    
    // Обновляем общее количество в категории
    const totalSpan = document.getElementById('categoryTotalSpan');
    if (totalSpan) {
        totalSpan.innerText = getCategoryTotal(category);
    }
    
    // Обновляем бейджи и глобальный итог
    renderCategoryButtons(category);
    renderGlobalSummary();
}

function init() {
    loadCounts();
    renderCategoryButtons(null);
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

document.addEventListener('DOMContentLoaded', init);
