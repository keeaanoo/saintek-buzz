class AuthManager {
  constructor() {
    this.init();
  }

  init() {
    // Check auth state
    auth.onAuthStateChanged((user) => {
      this.handleAuthStateChange(user);
    });

    this.setupEventListeners();
  }

  handleAuthStateChange(user) {
    if (user) {
      this.handleUserLoggedIn(user);
    } else {
      this.handleUserLoggedOut();
    }
  }

  handleUserLoggedIn(user) {
    try {
      // Update UI for logged in state
      this.showElement('logout-btn');
      this.hideElement('login-btn');
      this.showElement('post-form-container');
      this.showElement('profile-link');
      
      // Update user avatar
      this.updateUserAvatar(user);
      
      // Load user-specific data
      this.loadUserData();
      
    } catch (error) {
      console.error('Error handling user login:', error);
    }
  }

  handleUserLoggedOut() {
    try {
      // Update UI for logged out state
      this.hideElement('logout-btn');
      this.showElement('login-btn');
      this.hideElement('post-form-container');
      this.hideElement('profile-link');
      
      // Clear user data
      this.clearUserData();
      
    } catch (error) {
      console.error('Error handling user logout:', error);
    }
  }

  updateUserAvatar(user) {
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar && user.displayName) {
      userAvatar.textContent = user.displayName.charAt(0).toUpperCase();
      userAvatar.title = user.displayName;
    }
  }

  async loadUserData() {
    try {
      // Load posts if the function exists
      if (typeof loadPosts === 'function') {
        loadPosts();
      }
      
      // Load additional user data if needed
      const user = auth.currentUser;
      if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          console.log('User data loaded:', userDoc.data());
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  clearUserData() {
    const postsContainer = document.getElementById('posts-container');
    if (postsContainer) {
      postsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Silakan login untuk melihat posts</p>';
    }
  }

  setupEventListeners() {
    // Login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }

    // Profile link
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
      profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'profile.html';
      });
    }
  }

  async handleLogout() {
    try {
      await auth.signOut();
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout error:', error);
      alert('Terjadi kesalahan saat logout: ' + error.message);
    }
  }

  showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove('hidden');
    }
  }

  hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('hidden');
    }
  }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AuthManager();
});