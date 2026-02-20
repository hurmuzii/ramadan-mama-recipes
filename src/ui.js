export const ui = {
    showLoading: () => {
        const container = document.getElementById('recipe-list');
        container.innerHTML = '<div class="loading-spinner"></div>';
    },

    renderRecipes: (recipes, isAdmin = false) => {
        const container = document.getElementById('recipe-list');
        container.innerHTML = '';

        if (!recipes || recipes.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%; color:#888; margin-top:3rem;">لا توجد وصفات حالياً...</p>';
            return;
        }

        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';

            card.onclick = () => {
                const ids = ui.openRecipeModal(recipe, isAdmin);
                if (ids && isAdmin) {
                    const event = new CustomEvent('recipe-modal-opened', { detail: { ...ids, recipe } });
                    document.dispatchEvent(event);
                }
            };

            const categoryName = getCategoryName(recipe.category);

            // Image: use img tag with onerror fallback to CSS placeholder
            const imgHtml = recipe.image_url
                ? `<img src="${recipe.image_url}" alt="${recipe.name}" class="recipe-image" loading="lazy"
                     onerror="this.outerHTML='<div class=\\'recipe-image-placeholder\\'>🍽️</div>'">`
                : `<div class="recipe-image-placeholder">🍽️</div>`;

            card.innerHTML = `
        ${imgHtml}
        <div class="recipe-content">
          <span class="recipe-category">${categoryName}</span>
          <h3 class="recipe-title">${recipe.name}</h3>
          <div class="recipe-footer">
             منذ ${new Date(recipe.created_at).toLocaleDateString('ar-EG')}
          </div>
        </div>
      `;
            container.appendChild(card);
        });
    },

    openRecipeModal: (recipe, isAdmin = false) => {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        const categoryName = getCategoryName(recipe.category);

        const ingredientsHtml = formatText(recipe.ingredients);
        const methodHtml = formatText(recipe.method);

        const imgHtml = recipe.image_url
            ? `<img src="${recipe.image_url}" alt="${recipe.name}" style="width:100%; max-height:300px; object-fit:cover; border-radius:12px; margin-bottom:1rem;"
                 onerror="this.style.display='none'">`
            : '';

        const videoBtn = recipe.video_url
            ? `<a href="${recipe.video_url}" target="_blank" class="video-link-btn" style="display:block; margin: 1rem auto; text-align:center; max-width:200px;">📺 مشاهدة الفيديو</a>`
            : '';

        const adminControls = isAdmin ? `
            <div style="border-top:1px solid #eee; margin-top:2rem; padding-top:1rem; display:flex; gap:1rem; justify-content:center;">
                <button id="edit-btn-${recipe.id}" style="background:#f39c12; color:white; border:none; padding:0.5rem 1rem; border-radius:8px; cursor:pointer;">✏️ تعديل</button>
                <button id="delete-btn-${recipe.id}" style="background:#e74c3c; color:white; border:none; padding:0.5rem 1rem; border-radius:8px; cursor:pointer;">🗑️ حذف</button>
            </div>
        ` : '';

        modalBody.innerHTML = `
          ${imgHtml}
          <h2>${recipe.name}</h2>
          <span class="recipe-category">${categoryName}</span>

          <h3>المكونات</h3>
          <div style="line-height:1.8;">${ingredientsHtml}</div>

          <h3>طريقة التحضير</h3>
          <div style="line-height:1.8;">${methodHtml}</div>

          ${videoBtn}
          ${adminControls}
        `;

        modal.style.display = 'flex';

        // Push history state so phone back button closes the modal
        history.pushState({ modal: true }, '');

        return {
            editId: `edit-btn-${recipe.id}`,
            deleteId: `delete-btn-${recipe.id}`
        };
    },

    closeModal: () => {
        document.getElementById('modal').style.display = 'none';
    },

    toggleAddModal: (show) => {
        document.getElementById('add-modal').style.display = show ? 'flex' : 'none';
    }
};

// Helper: Convert newlines, boldify headings, and linkify URLs
function formatText(text) {
    if (!text) return '';
    let clean = text.replace(/<br\s*\/?>/gi, '\n');
    let safe = clean.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    safe = safe.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#007bff; text-decoration:underline;">$1</a>');
    let withBreaks = safe.replace(/\n/g, '<br>');
    let bolded = withBreaks.replace(/(^|<br>)([^<]+:)/g, '$1<strong>$2</strong>');
    return bolded;
}

function getCategoryName(val) {
    if (!val) return 'غير مصنف';
    const map = {
        'main': 'أطباق رئيسية',
        'sweets': 'حلويات',
        'snacks': 'مقبلات',
        'drinks': 'مشروبات',
        'soups': 'شوربات',
    };
    return map[val.toLowerCase().trim()] || val;
}
