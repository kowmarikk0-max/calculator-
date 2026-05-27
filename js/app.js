// ===================== ОСНОВНАЯ ЛОГИКА =====================
let craftCounts = {};

function loadCounts() {
    const saved = localStorage.getItem("stalker_global_total_fixed");
    if (saved) { try { const p = JSON.parse(saved); if (typeof p === "object") craftCounts = p; } catch(e) {} }
    for (let cat of categoryNames) {
        const items = categoriesData[cat]?.items;
        if (items) for (let i = 0; i < items.length; i++) {
            const key = `${cat}_${i}`;
            if (craftCounts[key] === undefined) craftCounts[key] = 0;
        }
    }
    saveCounts();
}

function saveCounts() { 
    localStorage.setItem("stalker_global_total_fixed", JSON.stringify(craftCounts)); 
}

function getCategoryTotal(category) {
    const items = categoriesData[category]?.items;
    if (!items) return 0;
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += (craftCounts[`${category}_${i}`] || 0);
    }
    return total;
}

function getGlobalResourceTotals() {
    const map = new Map();
    let totalItems = 0;
    for (let cat of categoryNames) {
        const items = categoriesData[cat]?.items;
        if (!items) continue;
        for (let i = 0; i < items.length; i++) {
            const amt = craftCounts[`${cat}_${i}`] || 0;
            if (amt === 0) continue;
            totalItems += amt;
            for (let [res, per] of items[i].resources) {
                const prev = map.get(res) || 0;
                map.set(res, prev + per * amt);
            }
        }
    }
    return { resourceMap: map, totalItems };
}

function renderGlobalSummary() {
    const container = document.getElementById("globalSummaryContainer");
    if (!container) return;
    const { resourceMap, totalItems } = getGlobalResourceTotals();
    if (resourceMap.size === 0) {
        container.innerHTML = `<div class="global-summary-title">📊 ГЛОБАЛЬНЫЙ ИТОГ (все категории)</div><div class="summary-empty">Пока нет созданных предметов. Начните крафт в любой вкладке.</div>`;
        return;
    }
    let html = `<div class="global-summary-title">📊 ГЛОБАЛЬНЫЙ ИТОГ (все категории)</div><div class="global-total-items">🧾 Всего создано предметов: <strong style="color:#ffcf7a;">${totalItems}</strong> шт.</div><div class="global-resources-grid">`;
    for (let [name, qty] of Array.from(resourceMap.entries()).sort()) {
        html += `<div class="global-res-item">🔹 ${name}: ${qty} шт.</div>`;
    }
    html += `</div><div style="font-size:0.7rem; color:#b9b07a;">* Суммарные затраты по всем категориям</div>`;
    container.innerHTML = html;
}

function resetAllCrafted() {
    for (let cat of categoryNames) {
        const items = categoriesData[cat]?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const key = `${cat}_${i}`;
                craftCounts[key] = 0;
            }
        }
    }
    saveCounts();
    
    const activeCategory = document.querySelector('.cat-btn.active')?.innerText?.split(' ').pop();
    if (activeCategory && categoriesData[activeCategory]) {
        renderCraftPage(activeCategory);
    }
    renderCategoryButtons(activeCategory || null);
    renderGlobalSummary();
}

function updateItemAmount(category, idx, newValue) {
    const key = `${category}_${idx}`;
    craftCounts[key] = newValue;
    saveCounts();
    const span = document.getElementById(`count_display_${category}_${idx}`);
    if (span) span.innerText = newValue;
    const totalSpan = document.getElementById('categoryTotalSpan');
    if (totalSpan) totalSpan.innerText = getCategoryTotal(category);
    renderCategoryButtons(null);
    renderGlobalSummary();
    renderCraftPage(category);
}
