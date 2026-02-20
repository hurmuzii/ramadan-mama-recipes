import './style.css';
import { supabase } from './supabase';
import { auth } from './auth';
import { recipesApi } from './recipes';
import { ui } from './ui';
import { magicParser } from './magicParser';
import { showToast } from './toast';

// ---- State ----
let allRecipes = [];
let isEditMode = false;
let editingId = null;
window.activeSession = null;

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  ui.showLoading();

  // Fetch recipes once upfront
  allRecipes = await recipesApi.getAll();

  // Auth state listener (fires on login/logout)
  auth.onAuthStateChange((session) => {
    updateAuthUI(session);
  });

  // Check initial session, then render
  const session = await auth.getSession();
  updateAuthUI(session);

  // Wire up all events
  setupEventListeners();
});

// ---- Helpers ----
async function loadRecipes() {
  allRecipes = await recipesApi.getAll();
  ui.renderRecipes(allRecipes, !!window.activeSession);
}

function updateAuthUI(session) {
  window.activeSession = session;
  const authBtn = document.getElementById('auth-btn');
  const adminPanel = document.getElementById('admin-panel');
  const isAdmin = !!session;

  // Re-render with current recipes — NO refetch needed
  ui.renderRecipes(allRecipes, isAdmin);

  if (isAdmin) {
    authBtn.textContent = 'تسجيل خروج';
    authBtn.onclick = async () => {
      await auth.signOut();
      showToast('تم تسجيل الخروج بنجاح', 'info');
    };
    adminPanel.style.display = 'block';
  } else {
    authBtn.textContent = 'تسجيل دخول';
    authBtn.onclick = () => {
      document.getElementById('login-modal').style.display = 'flex';
    };
    adminPanel.style.display = 'none';
  }
}

// ---- Event Setup ----
function setupEventListeners() {
  // --- Login Modal ---
  document.getElementById('close-login-modal').onclick = () => {
    document.getElementById('login-modal').style.display = 'none';
  };

  window.addEventListener('click', (e) => {
    if (e.target.id === 'login-modal') {
      document.getElementById('login-modal').style.display = 'none';
    }
  });

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    btn.textContent = 'جاري الدخول...';
    btn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    btn.textContent = 'دخول';
    btn.disabled = false;

    if (error) {
      showToast('خطأ في الدخول: تأكدي من البريد وكلمة المرور', 'error');
    } else {
      document.getElementById('login-modal').style.display = 'none';
      document.getElementById('login-form').reset();
      showToast('مرحباً! تم تسجيل الدخول ✨', 'success');
    }
  };

  // --- Search & Filter ---
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const catFilter = document.getElementById('category-filter');

  const filterAndSort = () => {
    let list = [...allRecipes];

    const q = searchInput.value.toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.ingredients && r.ingredients.toLowerCase().includes(q))
      );
    }

    const cat = catFilter.value;
    if (cat !== 'all') {
      const aliases = {
        'main': ['main', 'أطباق رئيسية', 'اطباق رئيسية', 'رئيسي'],
        'sweets': ['sweets', 'حلويات', 'حلى'],
        'snacks': ['snacks', 'مقبلات', 'سناك'],
        'drinks': ['drinks', 'مشروبات', 'عصير'],
        'soups': ['soups', 'شوربات', 'شوربة', 'حساء'],
      };
      const targets = aliases[cat] || [cat];
      list = list.filter(r => {
        if (!r.category) return false;
        return targets.some(t => r.category.toLowerCase().trim() === t);
      });
    }

    const sort = sortSelect.value;
    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sort === 'a-z') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    ui.renderRecipes(list, !!window.activeSession);
  };

  searchInput.addEventListener('input', filterAndSort);
  sortSelect.addEventListener('change', filterAndSort);
  catFilter.addEventListener('change', filterAndSort);

  // --- Recipe View Modal ---
  document.getElementById('close-modal').onclick = () => {
    if (history.state?.modal) history.back();
    else ui.closeModal();
  };

  window.addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
      if (history.state?.modal) history.back();
      else ui.closeModal();
    }
    if (e.target.id === 'add-modal') ui.toggleAddModal(false);
  });

  // Phone back button closes modal instead of leaving site
  window.addEventListener('popstate', () => {
    if (document.getElementById('modal').style.display === 'flex') {
      ui.closeModal();
    }
  });

  // --- Add Recipe Modal ---
  document.getElementById('add-recipe-btn').onclick = () => ui.toggleAddModal(true);
  document.getElementById('close-add-modal').onclick = () => ui.toggleAddModal(false);

  // --- Magic Parser ---
  const magicArea = document.getElementById('magic-paste');

  async function runMagicParser() {
    const text = magicArea.value.trim();
    if (!text) {
      showToast('الرجاء لصق النص أولاً!', 'info');
      return;
    }
    const btn = document.getElementById('magic-parse-btn');
    btn.textContent = '⏳ جاري التحليل...';
    btn.disabled = true;

    try {
      const parsed = await magicParser(text);
      if (parsed) {
        if (parsed.name) document.getElementById('recipe-name').value = parsed.name;
        if (parsed.category) document.getElementById('recipe-category').value = parsed.category;
        if (parsed.ingredients) document.getElementById('recipe-ingredients').value = parsed.ingredients;
        if (parsed.method) document.getElementById('recipe-method').value = parsed.method;
        if (parsed.video_url) document.getElementById('recipe-video').value = parsed.video_url;
        if (parsed.image_url) document.getElementById('recipe-image').value = parsed.image_url;
        showToast('تم التحليل بنجاح! ⚡ راجعي البيانات ثم اضغطي حفظ.', 'success');
      } else {
        showToast('لم يتم التعرف على النص، تأكدي من صيغة الوصفة.', 'error');
      }
    } finally {
      btn.textContent = '✨ تحليل النص تلقائياً';
      btn.disabled = false;
    }
  }

  document.getElementById('magic-parse-btn').addEventListener('click', runMagicParser);
  magicArea.addEventListener('paste', () => setTimeout(runMagicParser, 300));

  // --- Recipe Form Submit ---
  document.getElementById('recipe-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const savedIsEdit = isEditMode;
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
      if (savedIsEdit && editingId) {
        await recipesApi.update(editingId, recipeData);
        showToast('تم التحديث بنجاح! ✨', 'success');
      } else {
        await recipesApi.add(recipeData);
        showToast('تمت الإضافة بنجاح! 😋', 'success');
      }

      ui.toggleAddModal(false);
      e.target.reset();
      document.getElementById('magic-paste').value = '';
      isEditMode = false;
      editingId = null;

      await loadRecipes();
    } catch (err) {
      showToast('حدث خطأ: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = isEditMode ? 'تحديث الوصفة' : 'حفظ الوصفة';
    }
  };

  // --- Edit / Delete (dispatched from ui.js) ---
  document.addEventListener('recipe-modal-opened', (e) => {
    const { editId, deleteId, recipe } = e.detail;

    const editBtn = document.getElementById(editId);
    if (editBtn) {
      editBtn.onclick = () => {
        ui.closeModal();
        prepareEdit(recipe);
      };
    }

    const deleteBtn = document.getElementById(deleteId);
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (confirm(`هل أنت متأكد من حذف "${recipe.name}"؟`)) {
          try {
            await recipesApi.delete(recipe.id);
            showToast('تم الحذف بنجاح 🗑️', 'info');
            ui.closeModal();
            await loadRecipes();
          } catch (err) {
            showToast('خطأ في الحذف: ' + err.message, 'error');
          }
        }
      };
    }
  });
}

function prepareEdit(recipe) {
  isEditMode = true;
  editingId = recipe.id;

  document.getElementById('recipe-name').value = recipe.name;
  document.getElementById('recipe-category').value = recipe.category;
  document.getElementById('recipe-ingredients').value = recipe.ingredients;
  document.getElementById('recipe-method').value = recipe.method;
  document.getElementById('recipe-image').value = recipe.image_url || '';
  document.getElementById('recipe-video').value = recipe.video_url || '';

  const btn = document.querySelector('#recipe-form button[type="submit"]');
  btn.textContent = 'تحديث الوصفة';

  ui.toggleAddModal(true);
}
