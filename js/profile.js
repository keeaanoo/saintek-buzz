class ProfileManager {
  constructor() {
    this.user = null;
    this.init();
  }

  init() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.user = user;
        this.handleUserAuthenticated(user);
      } else {
        window.location.href = 'login.html';
      }
    });

    this.setupEventListeners();
  }

  async handleUserAuthenticated(user) {
    try {
      await this.loadProfileData(user);
      await this.loadUserPosts(user.uid);
      
      // Update sidebar info
      this.updateSidebarInfo(user);
      
    } catch (error) {
      console.error('Error handling authenticated user:', error);
      this.showError('Terjadi kesalahan saat memuat data profil');
    }
  }

  async loadProfileData(user) {
    try {
      // Update basic profile info
      this.updateProfileBasicInfo(user);

      // Load additional profile data from Firestore
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        this.updateProfileDetails(userData);
      } else {
        console.warn('User document not found in Firestore');
      }

    } catch (error) {
      console.error('Error loading profile data:', error);
      throw error;
    }
  }

  updateProfileBasicInfo(user) {
    const initialElement = document.getElementById('profile-initial');
    const nameElement = document.getElementById('profile-name');
    const headerNameElement = document.getElementById('profile-header-name');
    const emailElement = document.getElementById('profile-email');
    const sidebarNameElement = document.getElementById('profile-sidebar-name');
    const sidebarEmailElement = document.getElementById('profile-sidebar-email');

    if (initialElement) {
      initialElement.textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';
    }

    if (nameElement) {
      nameElement.textContent = user.displayName || 'User';
    }

    if (headerNameElement) {
      headerNameElement.textContent = user.displayName || 'User';
    }

    if (emailElement && user.email) {
      emailElement.textContent = `@${user.email.split('@')[0]}`;
    }

    if (sidebarNameElement && user.displayName) {
      sidebarNameElement.textContent = user.displayName;
    }

    if (sidebarEmailElement && user.email) {
      sidebarEmailElement.textContent = `@${user.email.split('@')[0]}`;
    }

    // Update avatar in sidebar
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar && user.displayName) {
      userAvatar.textContent = user.displayName.charAt(0).toUpperCase();
    }
  }

  updateSidebarInfo(user) {
    const sidebarName = document.getElementById('profile-sidebar-name');
    const sidebarEmail = document.getElementById('profile-sidebar-email');
    const userAvatar = document.getElementById('user-avatar');

    if (sidebarName && user.displayName) {
      sidebarName.textContent = user.displayName;
    }

    if (sidebarEmail && user.email) {
      sidebarEmail.textContent = `@${user.email.split('@')[0]}`;
    }

    if (userAvatar && user.displayName) {
      userAvatar.textContent = user.displayName.charAt(0).toUpperCase();
    }
  }

  updateProfileDetails(userData) {
    const detailsElement = document.getElementById('profile-details');
    if (detailsElement && userData.jurusan && userData.angkatan) {
      detailsElement.textContent = `${userData.jurusan} • Angkatan ${userData.angkatan}`;
    }
  }

  async loadUserPosts(userId) {
    const postsContainer = document.getElementById('user-posts-container');
    if (!postsContainer) return;

    try {
      this.showLoading(postsContainer);

      const querySnapshot = await db.collection('posts')
        .where('authorId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      postsContainer.innerHTML = '';

      if (querySnapshot.empty) {
        this.showNoPosts(postsContainer);
        this.updateStats(0, 0);
        return;
      }

      let totalLikes = 0;
      let postCount = 0;

      querySnapshot.forEach((doc) => {
        const post = doc.data();
        const postElement = this.createUserPostElement(post, doc.id);
        postsContainer.appendChild(postElement);
        
        totalLikes += post.likes ? post.likes.length : 0;
        postCount++;
      });

      this.updateStats(postCount, totalLikes);

      // Update post count in header
      const postCountHeader = document.getElementById('post-count-header');
      if (postCountHeader) {
        postCountHeader.textContent = `${postCount} posts`;
      }

    } catch (error) {
      console.error('Error loading user posts:', error);
      this.showError(postsContainer, 'Terjadi kesalahan saat memuat posts');
    }
  }

  createUserPostElement(post, postId) {
    const postElement = document.createElement('div');
    postElement.className = 'post-item px-6 py-4 hover:bg-gray-50';
    
    const timeAgo = this.formatTimeAgo(post.createdAt);
    const jurusanHtml = post.authorJurusan 
      ? `<div class="text-gray-500 text-xs mb-2">${post.authorJurusan}</div>` 
      : '';
    
    const hashtagsHtml = post.hashtags.map(tag => 
      `<span class="text-green-700 border rounded-full px-2 bg-green-100 border-green-200 hover:underline cursor-pointer">#${tag}</span>`
    ).join(' ');
    
    const likeCount = post.likes ? post.likes.length : 0;
    const commentCount = post.comments ? post.comments.length : 0;

    postElement.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div>
          <span class="text-gray-500 text-sm">${timeAgo}</span>
          ${jurusanHtml}
        </div>
        <button class="text-red-500 hover:text-red-700 delete-post" data-postid="${postId}" title="Hapus post">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <p class="text-gray-800 whitespace-pre-wrap mb-3">${this.formatPostContent(post.content)}</p>
      
      ${post.hashtags.length > 0 ? `
        <div class="mb-3 flex flex-wrap gap-1">${hashtagsHtml}</div>
      ` : ''}
      
      <div class="flex space-x-6 text-gray-500 text-sm">
        <div class="flex items-center space-x-1">
          <i class="far fa-heart"></i>
          <span>${likeCount}</span>
        </div>
        <div class="flex items-center space-x-1">
          <i class="far fa-comment"></i>
          <span>${commentCount}</span>
        </div>
      </div>
    `;

    // Add delete event listener
    const deleteBtn = postElement.querySelector('.delete-post');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deletePost(postId));
    }

    return postElement;
  }

  async deletePost(postId) {
    if (!confirm('Apakah Anda yakin ingin menghapus post ini?')) {
      return;
    }

    try {
      await db.collection('posts').doc(postId).delete();
      
      // Reload user posts
      if (this.user) {
        await this.loadUserPosts(this.user.uid);
      }

      this.showTempMessage('Post berhasil dihapus', 'success');

    } catch (error) {
      console.error('Error deleting post:', error);
      this.showTempMessage('Terjadi kesalahan saat menghapus post', 'error');
    }
  }

  updateStats(postCount, likeCount) {
    const postCountElement = document.getElementById('post-count');
    const likeCountElement = document.getElementById('like-count');

    if (postCountElement) {
      postCountElement.textContent = postCount;
    }

    if (likeCountElement) {
      likeCountElement.textContent = likeCount;
    }
  }

  formatPostContent(content) {
    return content.replace(/#(\w+)/g, '<span class="text-green-700">#$1</span>');
  }

  formatTimeAgo(timestamp) {
    if (!timestamp) return 'Baru saja';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return 'Baru saja';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} detik yang lalu`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
    }
  }

  setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout();
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

  showLoading(container) {
    if (container) {
      container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-green-500 text-2xl"></i></div>';
    }
  }

  showNoPosts(container) {
    if (container) {
      container.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-feather text-gray-300 text-4xl mb-3"></i>
          <p class="text-gray-500">Belum ada posts</p>
          <p class="text-gray-400 text-sm mt-2">Buat post pertama Anda!</p>
        </div>
      `;
    }
  }

  showError(container, message) {
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-3"></i>
          <p class="text-red-500">${message}</p>
        </div>
      `;
    }
  }

  showTempMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-green-700 text-white'
    }`;
    messageElement.innerHTML = `
      <div class="flex items-center space-x-2">
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(messageElement);

    setTimeout(() => {
      messageElement.remove();
    }, 3000);
  }
}

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ProfileManager();
});