class ProfileManager {
    constructor() {
        this.user = null;
        this.selectedAvatarFile = null;
        this.selectedAvatarUrl = null;
        this.init();
    }

    init() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            this.user = user;
            this.handleUserAuthenticated(user);
            
            // Handle notification redirect
            this.handleNotificationRedirect();
        } else {
            window.location.href = 'login.html';
        }
    });

    this.setupEventListeners();
    this.setupAvatarUpload();
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
                
                // Load avatar if exists
                if (userData.avatarUrl) {
                    this.updateAvatarInUI(userData.avatarUrl);
                }
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
        if (userAvatar && user.displayName && !userAvatar.querySelector('img')) {
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

        if (userAvatar && user.displayName && !userAvatar.querySelector('img')) {
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
        postElement.className = 'post-item px-6 py-4 hover:bg-gray-50 border-b border-gray-100';
        
        const timeAgo = this.formatTimeAgo(post.createdAt);
        const jurusanHtml = post.authorJurusan 
            ? `<div class="text-gray-500 text-xs mb-2">${post.authorJurusan}</div>` 
            : '';
        
        const hashtagsHtml = post.hashtags.map(tag => 
            `<span class="text-green-700 border rounded-full px-2 bg-green-100 border-green-200 hover:underline cursor-pointer">#${tag}</span>`
        ).join(' ');
        
        const likeCount = post.likes ? post.likes.length : 0;
        const commentCount = post.comments ? post.comments.length : 0;

        // Tampilkan gambar jika ada
        let imageHtml = '';
        if (post.imageUrl) {
            imageHtml = `
                <div class="mt-3 mb-3">
                    <img src="${post.imageUrl}" 
                         alt="Post image" 
                         class="rounded-xl max-w-full h-auto max-h-64 object-contain cursor-pointer post-image"
                         onclick="window.showImageModal('${post.imageUrl}')">
                </div>
            `;
        }

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
            
            ${imageHtml}
            
            ${post.hashtags.length > 0 ? `
                <div class="mb-3 flex flex-wrap gap-1">${hashtagsHtml}</div>
            ` : ''}
            
            <div class="flex space-x-6 text-gray-500 text-sm">
                <div class="flex items-center space-x-1">
                    <i class="far fa-heart"></i>
                    <span>${likeCount}</span>
                </div>
                <div class="flex items-center space-x-1">
                    <button class="flex items-center space-x-1 view-comments-btn text-green-600 hover:text-green-800" 
                            data-postid="${postId}"
                            data-content="${this.escapeHtml(post.content)}"
                            data-author="${this.escapeHtml(post.authorName || 'User')}"
                            data-createdat="${post.createdAt ? post.createdAt.toDate ? post.createdAt.toDate().toISOString() : post.createdAt : ''}"
                            data-jurusan="${this.escapeHtml(post.authorJurusan || '')}">
                        <i class="far fa-comment"></i>
                        <span>${commentCount}</span>
                        <span class="ml-1 text-xs">lihat</span>
                    </button>
                </div>
            </div>
        `;

        // Add delete event listener
        const deleteBtn = postElement.querySelector('.delete-post');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deletePost(postId));
        }
        
        // Add view comments event listener
        const viewCommentsBtn = postElement.querySelector('.view-comments-btn');
        if (viewCommentsBtn) {
            viewCommentsBtn.addEventListener('click', (e) => {
                const postId = e.currentTarget.dataset.postid;
                const postContent = e.currentTarget.dataset.content;
                const authorName = e.currentTarget.dataset.author;
                const createdAt = e.currentTarget.dataset.createdat;
                const authorJurusan = e.currentTarget.dataset.jurusan;
                
                this.showPostComments(
                    postId, 
                    postContent, 
                    authorName, 
                    createdAt, 
                    authorJurusan
                );
            });
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    setupAvatarUpload() {
        // Event listener untuk tombol ganti avatar
        const changeAvatarBtn = document.getElementById('change-avatar-btn');
        const avatarFileInput = document.getElementById('avatar-file-input');
        const avatarModal = document.getElementById('avatar-upload-modal');
        const closeAvatarModal = document.getElementById('close-avatar-modal');
        const cancelAvatarBtn = document.getElementById('cancel-avatar-btn');
        const saveAvatarBtn = document.getElementById('save-avatar-btn');
        const avatarPreview = document.getElementById('avatar-preview');

        // Open avatar upload modal when avatar is clicked
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar) {
            profileAvatar.addEventListener('click', () => {
                this.openAvatarUploadModal();
            });
        }

        // Open modal via change button
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openAvatarUploadModal();
            });
        }

        // File input change handler
        if (avatarFileInput) {
            avatarFileInput.addEventListener('change', (e) => {
                this.handleAvatarSelect(e);
            });
        }

        // Modal controls
        if (closeAvatarModal) {
            closeAvatarModal.addEventListener('click', () => {
                this.closeAvatarUploadModal();
            });
        }

        if (cancelAvatarBtn) {
            cancelAvatarBtn.addEventListener('click', () => {
                this.closeAvatarUploadModal();
            });
        }

        if (saveAvatarBtn) {
            saveAvatarBtn.addEventListener('click', () => {
                this.saveAvatar();
            });
        }

        // Close modal when clicking outside
        if (avatarModal) {
            avatarModal.addEventListener('click', (e) => {
                if (e.target === avatarModal) {
                    this.closeAvatarUploadModal();
                }
            });
        }

        // Close modal with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && avatarModal && !avatarModal.classList.contains('hidden')) {
                this.closeAvatarUploadModal();
            }
        });
    }

    openAvatarUploadModal() {
        const avatarModal = document.getElementById('avatar-upload-modal');
        const saveAvatarBtn = document.getElementById('save-avatar-btn');
        const avatarPreview = document.getElementById('avatar-preview');
        const avatarFileInput = document.getElementById('avatar-file-input');
        
        if (avatarModal) {
            // Reset state
            this.selectedAvatarFile = null;
            this.selectedAvatarUrl = null;
            
            // Reset preview
            if (avatarPreview) {
                avatarPreview.src = '';
                avatarPreview.style.display = 'none';
            }
            
            // Reset file input
            if (avatarFileInput) {
                avatarFileInput.value = '';
            }
            
            // Disable save button
            if (saveAvatarBtn) {
                saveAvatarBtn.disabled = true;
                saveAvatarBtn.textContent = 'Simpan';
            }
            
            // Hide upload status
            this.updateAvatarUploadStatus('', false);
            
            // Show modal
            avatarModal.classList.remove('hidden');
        }
    }

    closeAvatarUploadModal() {
        const avatarModal = document.getElementById('avatar-upload-modal');
        if (avatarModal) {
            avatarModal.classList.add('hidden');
        }
    }

    handleAvatarSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validasi file
        if (!this.validateAvatarFile(file)) {
            return;
        }

        // Simpan file
        this.selectedAvatarFile = file;

        // Tampilkan preview
        this.showAvatarPreview(file);

        // Enable save button
        const saveAvatarBtn = document.getElementById('save-avatar-btn');
        if (saveAvatarBtn) {
            saveAvatarBtn.disabled = false;
        }
    }

    validateAvatarFile(file) {
        // Validasi ukuran file (max 2MB untuk avatar)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            alert('Ukuran file maksimal 2MB untuk foto profil');
            return false;
        }

        // Validasi tipe file
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP');
            return false;
        }

        return true;
    }

    showAvatarPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarPreview = document.getElementById('avatar-preview');
            if (avatarPreview) {
                avatarPreview.src = e.target.result;
                avatarPreview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    async saveAvatar() {
        if (!this.selectedAvatarFile) {
            alert('Pilih foto terlebih dahulu');
            return;
        }

        if (!this.user) {
            alert('User tidak ditemukan');
            return;
        }

        const saveAvatarBtn = document.getElementById('save-avatar-btn');
        const avatarModal = document.getElementById('avatar-upload-modal');

        try {
            // Update UI
            if (saveAvatarBtn) {
                saveAvatarBtn.disabled = true;
                saveAvatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
            }
            
            this.updateAvatarUploadStatus('Mengupload foto...', true);

            // Upload ke Cloudinary
            const imageUrl = await this.uploadAvatarToCloudinary(this.selectedAvatarFile);
            
            if (imageUrl) {
                // Simpan URL avatar ke Firestore
                await db.collection('users').doc(this.user.uid).update({
                    avatarUrl: imageUrl,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Update UI
                this.updateAvatarInUI(imageUrl);
                
                // Tampilkan pesan sukses
                this.showTempMessage('Foto profil berhasil diperbarui!', 'success');
                
                // Tutup modal setelah 1 detik
                setTimeout(() => {
                    this.closeAvatarUploadModal();
                }, 1000);
            }

        } catch (error) {
            console.error('Error saving avatar:', error);
            this.showTempMessage('Gagal memperbarui foto profil: ' + error.message, 'error');
            
            if (saveAvatarBtn) {
                saveAvatarBtn.disabled = false;
                saveAvatarBtn.innerHTML = 'Simpan';
            }
        } finally {
            this.updateAvatarUploadStatus('', false);
        }
    }

    async uploadAvatarToCloudinary(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'saintek-buzz-upload');
            formData.append('cloud_name', 'dplvjwmvk');
            formData.append('timestamp', (Date.now() / 1000).toString());

            fetch(`https://api.cloudinary.com/v1_1/dplvjwmvk/image/upload`, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.secure_url) {
                    resolve(data.secure_url);
                } else {
                    reject(new Error('Upload gagal: URL tidak ditemukan'));
                }
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    updateAvatarInUI(avatarUrl) {
        // Update profile page avatar
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar) {
            // Clear existing content
            profileAvatar.innerHTML = '';
            
            // Create image element
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = 'Profile Avatar';
            img.className = 'w-full h-full object-cover rounded-full';
            
            // Add image
            profileAvatar.appendChild(img);
            
            // Remove initial text
            const initialElement = document.getElementById('profile-initial');
            if (initialElement) {
                initialElement.style.display = 'none';
            }
        }

        // Update sidebar avatar
        const sidebarAvatar = document.getElementById('user-avatar');
        if (sidebarAvatar) {
            sidebarAvatar.innerHTML = '';
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = 'Profile Avatar';
            img.className = 'w-full h-full object-cover rounded-full';
            sidebarAvatar.appendChild(img);
        }

        // Update avatar in posts (if needed in future)
        this.updateAllPostAvatars(avatarUrl);
    }

    updateAvatarUploadStatus(message, show = true) {
        const statusElement = document.getElementById('avatar-upload-status');
        const statusText = document.getElementById('avatar-status-text');
        
        if (statusElement && statusText) {
            if (show) {
                statusElement.classList.remove('hidden');
                statusText.textContent = message;
            } else {
                statusElement.classList.add('hidden');
            }
        }
    }

    updateAllPostAvatars(avatarUrl) {
        // This function can be used to update avatars in existing posts
        // Currently not implemented as posts use initials or display names
        console.log('Avatar updated:', avatarUrl);
        // You can add logic here to update avatars in posts if needed
    }

    // ===== FUNGSI UNTUK MELIHAT KOMENTAR =====

    async showPostComments(postId, postContent, authorName, createdAt, authorJurusan = '') {
        try {
            const postDoc = await db.collection('posts').doc(postId).get();
            
            if (!postDoc.exists) {
                throw new Error('Post tidak ditemukan');
            }

            const post = postDoc.data();
            const comments = Array.isArray(post.comments) ? post.comments : [];
            
            // Urutkan komentar terbaru dulu
            comments.sort((a, b) => {
                const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
                const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
                return timeB - timeA;
            });

            // Buat modal komentar
            this.createCommentModal(postId, postContent, authorName, createdAt, authorJurusan, comments);
            
        } catch (error) {
            console.error('Error loading comments:', error);
            this.showTempMessage('Terjadi kesalahan saat memuat komentar', 'error');
        }
    }

    // Tambahkan fungsi ini di class ProfileManager di profile.js

    async createCommentModal(postId, postContent, authorName, createdAt, authorJurusan) {
    try {
        const postDoc = await db.collection('posts').doc(postId).get();
        
        if (!postDoc.exists) {
            throw new Error('Post tidak ditemukan');
        }

        const post = postDoc.data();
        const comments = Array.isArray(post.comments) ? post.comments : [];
        
        // Urutkan komentar terbaru dulu
        comments.sort((a, b) => {
            const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
            const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
            return timeB - timeA;
        });

        // Load avatar untuk setiap komentar
        const commentsWithAvatars = await Promise.all(
            comments.map(async (comment) => {
                let avatarUrl = null;
                if (comment.authorId) {
                    try {
                        const userDoc = await db.collection('users').doc(comment.authorId).get();
                        if (userDoc.exists && userDoc.data().avatarUrl) {
                            avatarUrl = userDoc.data().avatarUrl;
                        }
                    } catch (error) {
                        console.error('Error loading avatar for comment:', error);
                    }
                }
                return {
                    ...comment,
                    avatarUrl: avatarUrl
                };
            })
        );

        // Load avatar untuk post author
        let postAvatarUrl = null;
        if (post.authorId && !post.isAnonymous) {
            try {
                const userDoc = await db.collection('users').doc(post.authorId).get();
                if (userDoc.exists && userDoc.data().avatarUrl) {
                    postAvatarUrl = userDoc.data().avatarUrl;
                }
            } catch (error) {
                console.error('Error loading avatar for post:', error);
            }
        }

        // Hapus modal yang sudah ada sebelumnya
        const existingModal = document.getElementById(`comment-modal-${postId}`);
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.id = `comment-modal-${postId}`;
        
        const timeAgo = this.formatTimeAgo(createdAt);
        
        // Avatar untuk post author
        let postAvatarHtml = '';
        if (post.isAnonymous) {
            postAvatarHtml = '<div class="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">A</div>';
        } else if (postAvatarUrl) {
            const fallbackInitial = authorName ? authorName.charAt(0).toUpperCase() : 'U';
            postAvatarHtml = `
                <img src="${postAvatarUrl}" 
                     alt="${authorName || 'User'}" 
                     class="w-10 h-10 rounded-full object-cover"
                     onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold\\'>${fallbackInitial}</div>'">
            `;
        } else {
            const fallbackInitial = authorName ? authorName.charAt(0).toUpperCase() : 'U';
            postAvatarHtml = `<div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">${fallbackInitial}</div>`;
        }

        modal.innerHTML = `
            <div class="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
                <!-- Header -->
                <div class="flex justify-between items-center p-4 border-b">
                    <h3 class="text-lg font-bold text-gray-800">
                        <i class="far fa-comments mr-2 text-green-600"></i>
                        Komentar (${comments.length})
                    </h3>
                    <button class="text-gray-500 hover:text-gray-700 close-comment-modal" data-postid="${postId}">
                        <i class="fas fa-times text-lg"></i>
                    </button>
                </div>
                
                <!-- Content -->
                <div class="overflow-y-auto max-h-[calc(90vh-120px)] p-4">
                    <!-- Original Post -->
                    <div class="mb-6 pb-4 border-b">
                        <div class="flex space-x-3">
                            <div class="flex-shrink-0">
                                ${postAvatarHtml}
                            </div>
                            <div class="flex-grow">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <span class="font-bold text-gray-800">${authorName}</span>
                                        <span class="text-gray-500 text-sm ml-2">${timeAgo}</span>
                                        ${authorJurusan ? `<div class="text-gray-500 text-xs mt-1">${authorJurusan}</div>` : ''}
                                    </div>
                                </div>
                                <p class="mt-2 text-gray-800 whitespace-pre-wrap">${postContent}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Comments List -->
                    <div class="space-y-4">
                        ${commentsWithAvatars.length > 0 ? 
                            commentsWithAvatars.map(comment => {
                                const commentTime = this.formatTimeAgo(comment.createdAt);
                                const fallbackInitial = comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U';
                                
                                let commentAvatarHtml = '';
                                if (comment.avatarUrl) {
                                    commentAvatarHtml = `
                                        <img src="${comment.avatarUrl}" 
                                             alt="${comment.authorName || 'User'}" 
                                             class="w-8 h-8 rounded-full object-cover"
                                             onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold\\'>${fallbackInitial}</div>'">
                                    `;
                                } else {
                                    commentAvatarHtml = `
                                        <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            ${fallbackInitial}
                                        </div>
                                    `;
                                }
                                
                                return `
                                    <div class="flex space-x-3">
                                        <div class="flex-shrink-0">
                                            ${commentAvatarHtml}
                                        </div>
                                        <div class="flex-grow">
                                            <div class="flex justify-between items-start">
                                                <span class="font-semibold text-gray-800">${comment.authorName || 'User'}</span>
                                                <span class="text-gray-500 text-xs">${commentTime}</span>
                                            </div>
                                            <p class="text-gray-700 mt-1 text-sm">${comment.content || ''}</p>
                                        </div>
                                    </div>
                                `;
                            }).join('') : 
                            '<div class="text-center py-8 text-gray-500">Belum ada komentar.</div>'
                        }
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="p-4 border-t text-center bg-gray-50">
                    <p class="text-gray-500 text-sm">
                        <i class="fas fa-info-circle mr-2"></i>
                        Anda dapat melihat komentar di sini. Untuk menambahkan komentar, buka halaman utama.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup close button
        const closeBtn = modal.querySelector('.close-comment-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close with ESC key
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);
        
        // Tambahkan style untuk scrollbar
        this.addCommentModalStyles();
        
    } catch (error) {
        console.error('Error creating comment modal:', error);
        this.showTempMessage('Terjadi kesalahan saat memuat komentar', 'error');
    }
}

    addCommentModalStyles() {
        // Cek apakah style sudah ditambahkan
        if (!document.getElementById('comment-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'comment-modal-styles';
            style.textContent = `
                #comment-modal-*::-webkit-scrollbar {
                    width: 6px;
                }
                
                #comment-modal-*::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }
                
                #comment-modal-*::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                
                #comment-modal-*::-webkit-scrollbar-thumb:hover {
                    background: #a1a1a1;
                }
                
                .view-comments-btn {
                    transition: all 0.2s ease;
                    padding: 2px 4px;
                    border-radius: 4px;
                }
                
                .view-comments-btn:hover {
                    transform: translateY(-1px);
                    background-color: rgba(0, 255, 0, 0.05);
                }
            `;
            document.head.appendChild(style);
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

    // Tambahkan fungsi baru di class ProfileManager di profile.js

async handleNotificationRedirect() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post');
        const highlight = urlParams.get('highlight');
        
        if (postId && highlight) {
            // Tunggu sampai posts selesai di-load
            await this.waitForPostsLoaded();
            
            // Scroll dan highlight post
            setTimeout(() => {
                this.highlightAndScrollToPost(postId);
            }, 500);
            
            // Clear URL parameters
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    } catch (error) {
        console.error('Error handling notification redirect:', error);
    }
}

waitForPostsLoaded() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            const postsContainer = document.getElementById('user-posts-container');
            if (postsContainer && postsContainer.children.length > 0) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
        
        // Timeout setelah 5 detik
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 5000);
    });
}

highlightAndScrollToPost(postId) {
    // Cari post element
    const postElements = document.querySelectorAll('.post-item');
    let targetPost = null;
    
    postElements.forEach(post => {
        const deleteBtn = post.querySelector('.delete-post');
        if (deleteBtn && deleteBtn.dataset.postid === postId) {
            targetPost = post;
        }
    });
    
    if (targetPost) {
        // Scroll ke post
        targetPost.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Highlight post dengan animasi
        this.highlightPost(targetPost);
        
        // Auto open comments jika ada
        this.autoOpenCommentsIfNeeded(postId);
    } else {
        console.log('Post not found in profile, it might be filtered out');
        // Tampilkan pesan bahwa post tidak ditemukan
        this.showTempMessage('Post tidak ditemukan di halaman ini', 'info');
    }
}

highlightPost(postElement) {
    // Tambahkan border dan background highlight
    postElement.style.border = '2px solid #10b981';
    postElement.style.borderRadius = '0.75rem';
    postElement.style.backgroundColor = '#f0fdf4';
    postElement.style.transition = 'all 0.5s ease';
    
    // Animasi pulse
    postElement.classList.add('animate-pulse');
    
    // Hapus highlight setelah 5 detik
    setTimeout(() => {
        postElement.style.border = '';
        postElement.style.backgroundColor = '';
        postElement.classList.remove('animate-pulse');
    }, 5000);
}

    async autoOpenCommentsIfNeeded(postId) {
        // Cek jika notifikasi berasal dari komentar
        const urlParams = new URLSearchParams(window.location.search);
        const notificationType = urlParams.get('type');
        
        if (notificationType === 'comment') {
            // Dapatkan data post untuk membuka modal komentar
            try {
                const postDoc = await db.collection('posts').doc(postId).get();
                if (postDoc.exists) {
                    const post = postDoc.data();
                    const authorName = post.authorName || 'User';
                    const authorJurusan = post.authorJurusan || '';
                    const createdAt = post.createdAt;
                    
                    // Tunggu sebentar sebelum membuka modal
                    setTimeout(() => {
                        this.showPostComments(
                            postId, 
                            post.content, 
                            authorName, 
                            createdAt, 
                            authorJurusan
                        );
                    }, 1000);
                }
            } catch (error) {
                console.error('Error loading post for auto-comment:', error);
            }
        }
    }
}

// Fungsi global untuk membuka modal gambar
window.showImageModal = function(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-[90vh]">
            <button class="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <img src="${imageUrl}" class="max-w-full max-h-[90vh] rounded-lg">
        </div>
    `;
    
    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    // Close modal with ESC key
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    
    document.addEventListener('keydown', handleEscKey);
    document.body.appendChild(modal);
};

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});