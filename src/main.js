import './style.css';
import { supabase } from './supabase';
import { auth } from './auth';
import { recipesApi } from './recipes';
import { ui } from './ui';
import { magicParser } from './magicParser';

// State
let allRecipes = [];
let isEditMode = false;
let editingId = null;
window.activeSession = null;

// Init
document.addEventListener('DOMContentLoaded', async () => {
  // Load Recipes
  await loadRecipes();

  // Setup Auth Listener
  auth.onAuthStateChange((session) => {
    updateAuthUI(session);
  });

  // Initial Auth Check
  const session = await auth.getSession();
  updateAuthUI(session);

  // Event Listeners
  setupEventListeners(session);
});

async function loadRecipes() {
  allRecipes = await recipesApi.getAll();
  const isAdmin = !!window.activeSession;
  ui.renderRecipes(allRecipes, isAdmin);
}

function updateAuthUI(session) {
  window.activeSession = session;
  const authBtn = document.getElementById('auth-btn');
  const adminPanel = document.getElementById('admin-panel');

  // Reload recipes to update Admin Buttons (Edit/Delete) based on new session
  loadRecipes(); // Check if this causes infinite loop? No, loadRecipes fetches and renders. It's fine.

  if (session) {
    authBtn.textContent = 'تسجيل خروج';
    authBtn.onclick = async () => {
      await auth.signOut();
    };
    adminPanel.style.display = 'block';
  } else {
    authBtn.textContent = 'تسجيل دخول';
    authBtn.onclick = () => {
      const email = prompt('البريد الإلكتروني:');
      if (!email) return;
      const password = prompt('كلمة المرور:');
      if (!password) return;

      supabase.auth.signInWithPassword({ email, password }).then(({ error }) => {
        if (error) alert('خطأ في الدخول: ' + error.message);
      });
    };
    adminPanel.style.display = 'none';
  }
}

function setupEventListeners(session) {
  // Search & Filter
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const catFilter = document.getElementById('category-filter');

  const filterAndSort = () => {
    let list = [...allRecipes];

    // Search
    const q = searchInput.value.toLowerCase();
    if (q) {
      list = list.filter(r => r.name.toLowerCase().includes(q) || (r.ingredients && r.ingredients.toLowerCase().includes(q)));
    }

    // Category
    const cat = catFilter.value; // 'sweets', 'main', etc.
    if (cat !== 'all') {
      const aliases = {
        'main': ['main', 'أطباق رئيسية', 'اطباق رئيسية', 'رئيسي', 'اكلة رئيسية', 'أكلة رئيسية'],
        'sweets': ['sweets', 'حلويات', 'حلى'],
        'snacks': ['snacks', 'مقبلات', 'سناك'],
        'drinks': ['drinks', 'مشروبات', 'عصير']
      };

      const targets = aliases[cat] || [cat];

      list = list.filter(r => {
        if (!r.category) return false;
        const rc = r.category.toLowerCase().trim();
        return targets.some(t => rc === t);
      });
    }

    // Sort
    const sort = sortSelect.value;
    if (sort === 'newest') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === 'oldest') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === 'a-z') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }

    const isAdmin = !!window.activeSession;
    ui.renderRecipes(list, isAdmin);
  };

  searchInput.addEventListener('input', filterAndSort);
  sortSelect.addEventListener('change', filterAndSort);
  catFilter.addEventListener('change', filterAndSort);

  // Modal Events
  document.getElementById('close-modal').onclick = ui.closeModal;
  window.onclick = (e) => {
    if (e.target.id === 'modal') ui.closeModal();
    if (e.target.id === 'add-modal') ui.toggleAddModal(false);
  };

  // Add Recipe Events
  document.getElementById('add-recipe-btn').onclick = () => ui.toggleAddModal(true);
  document.getElementById('close-add-modal').onclick = () => ui.toggleAddModal(false);

  // Magic Parser
  const magicArea = document.getElementById('magic-paste');
  magicArea.addEventListener('paste', (e) => {
    setTimeout(async () => {
      const text = magicArea.value;
      const parsed = await magicParser(text);

      if (parsed) {
        if (parsed.name) document.getElementById('recipe-name').value = parsed.name;
        if (parsed.category) document.getElementById('recipe-category').value = parsed.category;
        if (parsed.ingredients) document.getElementById('recipe-ingredients').value = parsed.ingredients;
        if (parsed.method) document.getElementById('recipe-method').value = parsed.method;
        if (parsed.video_url) document.getElementById('recipe-video').value = parsed.video_url;
        if (parsed.image_url) document.getElementById('recipe-image').value = parsed.image_url;

        alert('تم التحليل بنجاح! ⚡ راجعي البيانات ثم اضغطي حفظ.');
      }
    }, 200);
  });

  // Form Submit
  document.getElementById('recipe-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = isEditMode ? 'تحديث الوصفة' : 'حفظ الوصفة';
    btn.textContent = 'جاري الحفظ...';
    btn.disabled = true;

    const recipeData = {
      name: document.getElementById('recipe-name').value,
      category: document.getElementById('recipe-category').value,
      ingredients: document.getElementById('recipe-ingredients').value,
      method: document.getElementById('recipe-method').value,
      image_url: document.getElementById('recipe-image').value,
      video_url: document.getElementById('recipe-video').value,
    };

    try {
      if (isEditMode && editingId) {
        await recipesApi.update(editingId, recipeData);
        alert('تم التحديث بنجاح! ✨');
      } else {
        await recipesApi.add(recipeData);
        alert('تمت الإضافة بنجاح! 😋');
      }

      // Cleanup
      ui.toggleAddModal(false);
      e.target.reset();
      document.getElementById('magic-paste').value = '';

      // Reset Mode
      isEditMode = false;
      editingId = null;
      btn.textContent = 'حفظ الوصفة';

      loadRecipes();
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
      btn.textContent = originalText;
    } finally {
      btn.disabled = false;
      if (!isEditMode) btn.textContent = 'حفظ الوصفة'; // Ensure text is reset
    }
  };

  // Global Admin Event Listener
  document.addEventListener('recipe-modal-opened', (e) => {
    const { editId, deleteId, recipe } = e.detail;

    // Edit Handler
    const editBtn = document.getElementById(editId);
    if (editBtn) {
      editBtn.onclick = () => {
        ui.closeModal();
        prepareEdit(recipe);
      };
    }

    // Delete Handler
    const deleteBtn = document.getElementById(deleteId);
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (confirm(`هل أنت متأكد من حذف "${recipe.name}"؟`)) {
          try {
            await recipesApi.delete(recipe.id);
            alert('تم الحذف بنجاح');
            ui.closeModal();
            loadRecipes();
          } catch (err) {
            alert('خطأ في الحذف: ' + err.message);
          }
        }
      };
    }
  });
}

function prepareEdit(recipe) {
  isEditMode = true;
  editingId = recipe.id;

  // Fill Form
  document.getElementById('recipe-name').value = recipe.name;
  document.getElementById('recipe-category').value = recipe.category;
  document.getElementById('recipe-ingredients').value = recipe.ingredients;
  document.getElementById('recipe-method').value = recipe.method;
  document.getElementById('recipe-image').value = recipe.image_url;
  document.getElementById('recipe-video').value = recipe.video_url;

  // Change Button Text
  const btn = document.querySelector('#recipe-form button[type="submit"]');
  btn.textContent = 'تحديث الوصفة';

  ui.toggleAddModal(true);
}
