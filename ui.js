export const ui = {
    renderRecipes: (recipes, isAdmin = false) => {
        const container = document.getElementById('recipe-list');
        container.innerHTML = '';

        if (!recipes || recipes.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%;">لا توجد وصفات حالياً...</p>';
            return;
        }

        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';

            // We need to attach listeners *after* modal opens?
            // The modal opening clears html and adds new buttons.
            // So we can return buttons IDs from openRecipeModal.
            // We need to pass a callback to `onclick` that handles the logic.

            card.onclick = () => {
                const ids = ui.openRecipeModal(recipe, isAdmin);
                if (ids && isAdmin) {
                    // Dispatch a custom event or call a global function?
                    // Simplest for this setup: Custom Event on document
                    const event = new CustomEvent('recipe-modal-opened', { detail: { ...ids, recipe } });
                    document.dispatchEvent(event);
                }
            };

            // Default Image if none
            const imgUrl = recipe.image_url || 'https://via.placeholder.com/300?text=Delicious+Food';

            const categoryName = getCategoryName(recipe.category);

            card.innerHTML = `
        <img src="${imgUrl}" alt="${recipe.name}" class="recipe-image" loading="lazy">
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

        // Format text
        const ingredientsHtml = formatText(recipe.ingredients);
        const methodHtml = formatText(recipe.method);

        const videoBtn = recipe.video_url ?
            `<a href="${recipe.video_url}" target="_blank" class="video-link-btn" style="display:block; margin: 1rem auto; text-align:center; max-width:200px;">📺 مشاهدة الفيديو</a>` : '';

        const adminControls = isAdmin ? `
            <div style="border-top:1px solid #eee; margin-top:2rem; padding-top:1rem; display:flex; gap:1rem; justify-content:center;">
                <button id="edit-btn-${recipe.id}" style="background:#f39c12; color:white; border:none; padding:0.5rem 1rem; border-radius:8px; cursor:pointer;">✏️ تعديل</button>
                <button id="delete-btn-${recipe.id}" style="background:#e74c3c; color:white; border:none; padding:0.5rem 1rem; border-radius:8px; cursor:pointer;">🗑️ حذف</button>
            </div>
        ` : '';

        modalBody.innerHTML = `
          <h2>${recipe.name}</h2>
          <span class="recipe-category">${categoryName}</span>
          
          <h3>المكونات</h3>
          <div style="line-height:1.6;">${ingredientsHtml}</div>
          
          <h3>طريقة التحضير</h3>
          <div style="line-height:1.6;">${methodHtml}</div>
          
          ${videoBtn}
          ${adminControls}
        `;

        modal.style.display = 'flex';

        // Return IDs so main.js can attach listeners
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
    // 0. Pre-clean literal <br> if user pasted them
    let clean = text.replace(/<br\s*\/?>/gi, '\n');

    // 1. Escape HTML (but preserve potential standard chars if needed, though usually safe)
    let safe = clean.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 2. Linkify (Http/s links to <a>) BEFORE converting newlines so we don't break tags later? 
    // Actually safe already escaped < >, so we are adding new tags now.
    // Regex for URLs
    safe = safe.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#007bff; text-decoration:underline;">$1</a>');

    // 3. Newlines to <br>
    let withBreaks = safe.replace(/\n/g, '<br>');

    // 4. Boldify "Something:" at start of line (or after <br>)
    // Regex matches start of string ^ or <br> prefix
    let bolded = withBreaks.replace(/(^|<br>)([^<]+:)/g, '$1<strong>$2</strong>');

    return bolded;
}

function getCategoryName(val) {
    if (!val) return 'غير مصنف';
    const key = val.toLowerCase().trim();
    const map = {
        'main': 'أطباق رئيسية',
        'sweets': 'حلويات',
        'snacks': 'مقبلات',
        'drinks': 'مشروبات'
    };
    return map[val] || val;
}
