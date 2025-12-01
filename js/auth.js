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
      
      // Update user avatar di header dan sidebar
      this.updateUserAvatar(user);
      
      // Update sidebar user info
      this.updateSidebarUserInfo(user);
      
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
      
      // Reset sidebar user info
      this.resetSidebarUserInfo();
      
      // Clear user data
      this.clearUserData();
      
    } catch (error) {
      console.error('Error handling user logout:', error);
    }
  }

  updateUserAvatar(user) {
    // Update avatar di header (form)
    const userAvatarForm = document.getElementById('user-avatar-form');
    if (userAvatarForm && user.displayName) {
      userAvatarForm.textContent = user.displayName.charAt(0).toUpperCase();
      userAvatarForm.title = user.displayName;
    }
    
    // Update avatar di sidebar
    const userAvatarSidebar = document.getElementById('user-avatar');
    if (userAvatarSidebar && user.displayName) {
      userAvatarSidebar.textContent = user.displayName.charAt(0).toUpperCase();
      userAvatarSidebar.title = user.displayName;
    }
  }

  updateSidebarUserInfo(user) {
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const userInfoSidebar = document.getElementById('user-info-sidebar');
    const loginSidebar = document.getElementById('login-sidebar');
    const postFormSidebar = document.getElementById('post-form-sidebar');
    
    if (userName && user.displayName) {
      userName.textContent = user.displayName;
    }
    if (userEmail && user.email) {
      userEmail.textContent = `@${user.email.split('@')[0]}`;
    }
    if (userInfoSidebar) {
      userInfoSidebar.classList.remove('hidden');
    }
    if (loginSidebar) {
      loginSidebar.classList.add('hidden');
    }
    if (postFormSidebar) {
      postFormSidebar.classList.remove('hidden');
    }
  }

  resetSidebarUserInfo() {
    const userInfoSidebar = document.getElementById('user-info-sidebar');
    const loginSidebar = document.getElementById('login-sidebar');
    const postFormSidebar = document.getElementById('post-form-sidebar');
    
    if (userInfoSidebar) {
      userInfoSidebar.classList.add('hidden');
    }
    if (loginSidebar) {
      loginSidebar.classList.remove('hidden');
    }
    if (postFormSidebar) {
      postFormSidebar.classList.add('hidden');
    }
    
    // Reset avatar di form
    const userAvatarForm = document.getElementById('user-avatar-form');
    if (userAvatarForm) {
      userAvatarForm.innerHTML = '<i class="fas fa-user"></i>';
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
      postsContainer.innerHTML = '<div class="text-center py-12"><p class="text-gray-500">Please login to see posts</p></div>';
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