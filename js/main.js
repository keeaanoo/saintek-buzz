// Variabel global untuk state filter
let currentFilter = 'all';

// Cache untuk avatar user
const avatarCache = {};

// === FUNGSI UTAMA ===

// Cek status login dan update UI dengan avatar
auth.onAuthStateChanged((user) => {
    if (user) {
        // User sudah login
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        document.getElementById('post-form-container').classList.remove('hidden');
        document.getElementById('profile-link').classList.remove('hidden');
        
        // Update sidebar user info dengan avatar
        updateSidebarUserInfo(user);
        
        // Update avatar di form post
        updatePostFormAvatar(user);
        
        // Setup filter listeners terlebih dahulu
        setupFilterListeners();
        
        // Load hashtag counts
        loadHashtagCounts();
        
        // Load semua posts (default filter)
        filterPostsByHashtag('all');
        
    } else {
        // User belum login
        document.getElementById('login-btn').classList.remove('hidden');
        document.getElementById('logout-btn').classList.add('hidden');
        document.getElementById('post-form-container').classList.add('hidden');
        document.getElementById('profile-link').classList.add('hidden');
        document.getElementById('posts-container').innerHTML = '<p class="text-center text-gray-500 py-8">Silakan login untuk melihat posts</p>';
        
        // Reset sidebar
        const userInfoSidebar = document.getElementById('user-info-sidebar');
        const loginSidebar = document.getElementById('login-sidebar');
        if (userInfoSidebar) userInfoSidebar.classList.add('hidden');
        if (loginSidebar) loginSidebar.classList.remove('hidden');
    }
});

// Fungsi untuk update sidebar user info dengan avatar
function updateSidebarUserInfo(user) {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userInfoSidebar = document.getElementById('user-info-sidebar');
    const loginSidebar = document.getElementById('login-sidebar');
    
    if (userInfoSidebar) {
        userInfoSidebar.classList.remove('hidden');
    }
    if (loginSidebar) {
        loginSidebar.classList.add('hidden');
    }
    
    if (userAvatar && user.uid) {
        // Coba dapatkan dari cache dulu
        if (avatarCache[user.uid]) {
            userAvatar.innerHTML = `
                <img src="${avatarCache[user.uid]}" 
                     alt="${user.displayName || 'User'}" 
                     class="w-full h-full object-cover rounded-full">
            `;
        } else {
            // Load dari Firestore
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        if (userData.avatarUrl) {
                            // Tampilkan avatar
                            userAvatar.innerHTML = `
                                <img src="${userData.avatarUrl}" 
                                     alt="${user.displayName || 'User'}" 
                                     class="w-full h-full object-cover rounded-full">
                            `;
                            // Simpan di cache
                            avatarCache[user.uid] = userData.avatarUrl;
                        } else {
                            // Tampilkan initial
                            userAvatar.innerHTML = `<div class="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</div>`;
                        }
                    } else {
                        userAvatar.innerHTML = `<div class="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</div>`;
                    }
                })
                .catch((error) => {
                    console.error('Error loading user data:', error);
                    userAvatar.innerHTML = `<div class="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</div>`;
                });
        }
    }
    
    if (userName && user.displayName) {
        userName.textContent = user.displayName;
    }
}

// Fungsi untuk update avatar di form post
function updatePostFormAvatar(user) {
    const userAvatarForm = document.getElementById('user-avatar-form');
    
    if (userAvatarForm && user.uid) {
        // Coba dapatkan dari cache dulu
        if (avatarCache[user.uid]) {
            userAvatarForm.innerHTML = `
                <img src="${avatarCache[user.uid]}" 
                     alt="${user.displayName || 'User'}" 
                     class="w-full h-full object-cover rounded-full">
            `;
        } else {
            // Load dari Firestore
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        if (userData.avatarUrl) {
                            // Tampilkan avatar
                            userAvatarForm.innerHTML = `
                                <img src="${userData.avatarUrl}" 
                                     alt="${user.displayName || 'User'}" 
                                     class="w-full h-full object-cover rounded-full">
                            `;
                            // Simpan di cache
                            avatarCache[user.uid] = userData.avatarUrl;
                        } else {
                            // Tampilkan initial
                            userAvatarForm.innerHTML = `<div class="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</div>`;
                        }
                    } else {
                        userAvatarForm.innerHTML = `<div class="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</div>`;
                    }
                })
                .catch((error) => {
                    console.error('Error loading user data for form:', error);
                    userAvatarForm.innerHTML = `<div class="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</div>`;
                });
        }
    }
}

// === FUNGSI POST ===

// Event listener untuk form post
document.addEventListener('DOMContentLoaded', () => {
    const postContent = document.getElementById('post-content');
    const charCount = document.getElementById('char-count');
    const postBtn = document.getElementById('post-btn');
    
    // Update karakter count
    if (postContent && charCount) {
        postContent.addEventListener('input', () => {
            const count = postContent.value.length;
            charCount.textContent = `${count}/280`;
            
            if (count > 280) {
                charCount.classList.add('text-red-500');
                if (postBtn) {
                    postBtn.disabled = true;
                    postBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            } else {
                charCount.classList.remove('text-red-500');
                if (postBtn) {
                    postBtn.disabled = false;
                    postBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        });
    }
    
    // Post button handler
    if (postBtn) {
        postBtn.addEventListener('click', createPost);
    }
    
    // Enter key untuk post (opsional)
    if (postContent) {
        postContent.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                createPost();
            }
        });
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Setup login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
    
    // Setup profile link
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'profile.html';
        });
    }
});

// Fungsi untuk membuat post baru
async function createPost() {
    const postContent = document.getElementById('post-content');
    const anonymous = document.getElementById('anonymous')?.checked || false;
    const user = auth.currentUser;
    
    if (!user) {
        alert('Silakan login untuk membuat post');
        return;
    }
    
    const content = postContent.value.trim();
    
    if (content === '') {
        alert('Post tidak boleh kosong');
        return;
    }
    
    if (content.length > 280) {
        alert('Post tidak boleh lebih dari 280 karakter');
        return;
    }
    
    // Disable tombol post sementara
    const postBtn = document.getElementById('post-btn');
    if (postBtn) {
        postBtn.disabled = true;
        postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    }
    
    try {
        // Dapatkan data gambar dari CloudinaryManager
        let imageUrl = null;
        let imagePublicId = null;
        
        if (window.cloudinaryManager) {
            const imageData = window.cloudinaryManager.getImageData();
            if (imageData && imageData.imageUrl) {
                imageUrl = imageData.imageUrl;
                console.log('Image data found:', imageUrl);
            }
        }
        
        // Ekstrak hashtag dari konten
        const hashtags = extractHashtags(content);
        
        // Cari data user untuk mendapatkan jurusan dan avatar
        let authorJurusan = '';
        let authorAvatarUrl = null;
        
        if (!anonymous) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                authorJurusan = userData.jurusan || '';
                authorAvatarUrl = userData.avatarUrl || null;
                
                // Simpan avatar di cache jika ada
                if (authorAvatarUrl) {
                    avatarCache[user.uid] = authorAvatarUrl;
                }
            }
        }
        
        // Buat data post dasar
        const postData = {
            content: content,
            authorId: user.uid,
            authorName: anonymous ? 'Anonim' : (user.displayName || 'User'),
            isAnonymous: anonymous,
            hashtags: hashtags,
            likes: [],
            comments: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            imageUrl: imageUrl,
            imagePublicId: imageUrl ? imageUrl.split('/').pop().split('.')[0] : null,
            authorJurusan: authorJurusan,
            authorAvatarUrl: anonymous ? null : authorAvatarUrl // Simpan avatar URL di post
        };
        
        // Simpan post ke Firestore
        const docRef = await db.collection('posts').add(postData);
        console.log('Post berhasil dibuat dengan ID:', docRef.id);
        
        // Reset form
        if (postContent) {
            postContent.value = '';
        }
        document.getElementById('char-count').textContent = '0/280';
        if (document.getElementById('anonymous')) {
            document.getElementById('anonymous').checked = false;
        }
        
        // Reset image preview
        if (window.cloudinaryManager) {
            window.cloudinaryManager.reset();
        }
        
        // Muat ulang posts dengan filter yang aktif
        loadPosts();
        
        // Perbarui jumlah hashtag
        loadHashtagCounts();
        
        // Tampilkan notifikasi sukses
        showNotification('Post berhasil dibuat!', 'success');
        
    } catch (error) {
        console.error('Error membuat post: ', error);
        showNotification('Gagal membuat post: ' + error.message, 'error');
    } finally {
        // Enable tombol post kembali
        if (postBtn) {
            postBtn.disabled = false;
            postBtn.innerHTML = 'Post';
        }
    }
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-y-0 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateY(20px)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Fungsi untuk mengekstrak hashtag dari teks
function extractHashtags(text) {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
}

// === FUNGSI LOAD POSTS ===

function loadPosts() {
    if (currentFilter === 'all') {
        loadAllPosts();
    } else {
        filterPostsByHashtag(currentFilter);
    }
}

function loadAllPosts() {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;
    
    // Tampilkan loading
    postsContainer.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-green-700 text-2xl"></i></div>';
    
    // Ambil semua posts dari Firestore, urutkan berdasarkan waktu dibuat (terbaru dulu)
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .get()
        .then((querySnapshot) => {
            postsContainer.innerHTML = '';
            
            if (querySnapshot.empty) {
                postsContainer.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-feather text-gray-300 text-4xl mb-3"></i>
                        <p class="text-gray-500">Belum ada posts</p>
                        <p class="text-gray-400 text-sm mt-2">Jadilah yang pertama membuat post!</p>
                    </div>
                `;
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const post = doc.data();
                const postId = doc.id;
                const postElement = createPostElement(post, postId);
                postsContainer.appendChild(postElement);
            });
        })
        .catch((error) => {
            console.error('Error memuat posts: ', error);
            postsContainer.innerHTML = '<p class="text-center text-red-500 py-8">Terjadi kesalahan saat memuat posts</p>';
        });
}

// === FUNGSI CREATE POST ELEMENT ===

function createPostElement(post, postId) {
    const postElement = document.createElement('div');
    postElement.className = 'bg-white rounded-xl shadow-sm p-4 mb-4 post-item';
    postElement.id = `post-${postId}`;
    postElement.dataset.authorId = post.authorId;
    
    // Format waktu
    const timeAgo = formatTimeAgo(post.createdAt);
    
    // Cek jika post memiliki avatar URL yang disimpan
    let avatarHtml = '';
    if (post.isAnonymous) {
        avatarHtml = '<div class="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">A</div>';
    } else if (post.authorAvatarUrl) {
        // Jika post sudah menyimpan avatar URL, gunakan itu
        const fallbackInitial = post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U';
        avatarHtml = `
            <div id="avatar-${postId}" class="w-10 h-10 rounded-full overflow-hidden">
                <img src="${post.authorAvatarUrl}" 
                     alt="${post.authorName || 'User'}" 
                     class="w-full h-full object-cover"
                     onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-yellow-500\\'>${fallbackInitial}</div>';">
            </div>
        `;
    } else {
        // Jika tidak ada avatar URL yang disimpan, buat placeholder dan load avatar
        const fallbackInitial = post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U';
        avatarHtml = `
            <div id="avatar-${postId}" class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-yellow-500">
                ${fallbackInitial}
            </div>
        `;
    }
    
    // Tampilkan nama author
    const authorName = post.isAnonymous ? 'Anonim' : post.authorName;
    
    // Tampilkan jurusan (jika ada dan bukan post anonim)
    const jurusanHtml = post.isAnonymous || !post.authorJurusan 
        ? '' 
        : `<div class="text-gray-500 text-xs mt-1">${post.authorJurusan}</div>`;
    
    // Tampilkan hashtag
    const hashtagsHtml = post.hashtags.map(tag => 
        `<span class="text-green-700 border rounded-full px-2 bg-green-100 border-green-200 hover:underline cursor-pointer hashtag-filter" data-hashtag="${tag}">#${tag}</span>`
    ).join(' ');
    
    // Cek apakah user sudah like post ini
    const user = auth.currentUser;
    const isLiked = user && post.likes && post.likes.includes(user.uid);
    const likeIcon = isLiked ? 'fas fa-heart text-red-500' : 'far fa-heart text-gray-500';
    
    // Hitung jumlah like dan komentar
    const likeCount = post.likes ? post.likes.length : 0;
    const commentCount = post.comments ? post.comments.length : 0;
    
    // Cek apakah user adalah author post (untuk tombol hapus)
    const isAuthor = user && post.authorId === user.uid;
    const deleteButton = isAuthor 
        ? `<button class="text-red-500 hover:text-red-700 delete-post" data-postid="${postId}" title="Hapus post">
              <i class="fas fa-trash"></i>
           </button>` 
        : '';
    
    // Tampilkan gambar jika ada
    let imageHtml = '';
    if (post.imageUrl) {
        imageHtml = `
            <div class="mt-3">
                <img src="${post.imageUrl}" 
                     alt="Post image" 
                     class="rounded-xl max-w-full h-auto max-h-96 object-contain cursor-pointer post-image"
                     onclick="window.openImageModal('${post.imageUrl}')">
            </div>
        `;
    }
    
    postElement.innerHTML = `
        <div class="flex space-x-3">
            <div class="flex-shrink-0">
                ${avatarHtml}
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="font-bold text-gray-800">${authorName}</span>
                        <span class="text-gray-500 text-sm"> · ${timeAgo}</span>
                        ${jurusanHtml}
                    </div>
                    ${deleteButton}
                </div>
                <p class="mt-2 text-gray-800 text-lg whitespace-pre-wrap">${formatPostContent(post.content)}</p>
                
                ${imageHtml}
                
                ${post.hashtags.length > 0 ? `
                    <div class="mt-3 flex flex-wrap gap-2">
                        ${hashtagsHtml}
                    </div>
                ` : ''}
                
                <div class="mt-4 flex space-x-12 text-gray-500">
                    <button class="flex items-center space-x-2 like-btn ${isLiked ? 'text-red-500' : ''}" data-postid="${postId}">
                        <i class="${likeIcon} text-lg"></i>
                        <span>${likeCount}</span>
                    </button>
                    <button class="flex items-center space-x-2 comment-btn" data-postid="${postId}">
                        <i class="far fa-comment text-lg"></i>
                        <span>${commentCount}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Load avatar jika bukan post anonim dan tidak ada avatar URL yang disimpan
    if (!post.isAnonymous && post.authorId && !post.authorAvatarUrl) {
        loadUserAvatar(post.authorId, postId, post.authorName);
    }
    
    // Tambahkan event listener untuk tombol like
    const likeBtn = postElement.querySelector('.like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', () => toggleLike(postId));
    }
    
    // Tambahkan event listener untuk tombol komentar
    const commentBtn = postElement.querySelector('.comment-btn');
    if (commentBtn) {
        commentBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.openCommentModal === 'function') {
                window.openCommentModal(postId);
            } else {
                alert('Fitur komentar sedang tidak tersedia');
            }
        });
    }
    
    // Tambahkan event listener untuk tombol hapus
    const deleteBtn = postElement.querySelector('.delete-post');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deletePost(postId));
    }
    
    // Tambahkan event listener untuk hashtag filter
    const hashtagElements = postElement.querySelectorAll('.hashtag-filter');
    hashtagElements.forEach(element => {
        element.addEventListener('click', (e) => {
            const hashtag = e.target.dataset.hashtag;
            filterPostsByHashtag(hashtag);
        });
    });
    
    return postElement;
}

// Fungsi untuk memuat avatar user
async function loadUserAvatar(userId, postId, userName) {
    // Cek cache dulu
    if (avatarCache[userId]) {
        updateAvatarInPost(postId, avatarCache[userId], userName);
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.avatarUrl) {
                // Simpan di cache
                avatarCache[userId] = userData.avatarUrl;
                updateAvatarInPost(postId, userData.avatarUrl, userName);
                
                // Update post di Firestore dengan avatar URL
                db.collection('posts').doc(postId).update({
                    authorAvatarUrl: userData.avatarUrl
                }).catch(err => console.error('Error updating post with avatar:', err));
            }
        }
    } catch (error) {
        console.error('Error loading user avatar:', error);
    }
}

// Fungsi untuk mengupdate avatar di post
function updateAvatarInPost(postId, avatarUrl, userName) {
    const avatarContainer = document.getElementById(`avatar-${postId}`);
    if (avatarContainer) {
        const fallbackInitial = userName ? userName.charAt(0).toUpperCase() : 'U';
        avatarContainer.innerHTML = `
            <img src="${avatarUrl}" 
                 alt="${userName || 'User'}" 
                 class="w-10 h-10 rounded-full object-cover"
                 onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-yellow-500\\'>${fallbackInitial}</div>'">
        `;
    }
}

// Fungsi untuk memformat konten post (menyoroti hashtag)
function formatPostContent(content) {
    return content.replace(/#(\w+)/g, '<span class="text-green-600 hashtag-inline">#$1</span>');
}

// Fungsi untuk memformat waktu
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Baru saja';
    
    let date;
    
    // Handle both Firestore Timestamp and regular Date
    if (timestamp.toDate) {
        // Firestore Timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        // Regular Date object
        date = timestamp;
    } else if (typeof timestamp === 'string') {
        // ISO string
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

// === FUNGSI LIKE/UNLIKE ===

async function toggleLike(postId) {
    const user = auth.currentUser;
    
    if (!user) {
        alert('Silakan login untuk like post');
        return;
    }
    
    // Update UI terlebih dahulu untuk responsif
    const postElement = document.getElementById(`post-${postId}`);
    const likeBtn = postElement?.querySelector('.like-btn');
    const likeIcon = postElement?.querySelector('.like-btn i');
    const likeCountSpan = postElement?.querySelector('.like-btn span');
    
    if (likeBtn && likeIcon && likeCountSpan) {
        // Dapatkan state saat ini dari UI
        const isCurrentlyLiked = likeIcon.classList.contains('fa-heart') && 
                                !likeIcon.classList.contains('far');
        const currentCount = parseInt(likeCountSpan.textContent) || 0;
        
        // Update UI lokal terlebih dahulu
        if (isCurrentlyLiked) {
            // Unlike
            likeIcon.className = 'far fa-heart text-gray-500 text-lg';
            likeBtn.classList.remove('text-red-500');
            likeCountSpan.textContent = Math.max(0, currentCount - 1);
        } else {
            // Like
            likeIcon.className = 'fas fa-heart text-red-500 text-lg';
            likeBtn.classList.add('text-red-500');
            likeCountSpan.textContent = currentCount + 1;
        }
        
        // Tambah animasi
        likeBtn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            likeBtn.style.transform = 'scale(1)';
        }, 200);
    }
    
    // Kemudian update ke server
    try {
        const postRef = db.collection('posts').doc(postId);
        const doc = await postRef.get();
        
        if (doc.exists) {
            const post = doc.data();
            const likes = post.likes || [];
            const isLikedOnServer = likes.includes(user.uid);
            
            if (isLikedOnServer) {
                // Unlike di server
                const updatedLikes = likes.filter(uid => uid !== user.uid);
                await postRef.update({ 
                    likes: updatedLikes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Like di server
                const updatedLikes = [...likes, user.uid];
                await postRef.update({ 
                    likes: updatedLikes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Buat notifikasi jika bukan like sendiri
                if (post.authorId && post.authorId !== user.uid) {
                    // Gunakan try-catch terpisah agar notifikasi error tidak mengganggu like
                    try {
                        const notificationResult = await createNotification({
                            userId: post.authorId,
                            type: 'like',
                            postId: postId,
                            postContent: post.content || ''
                        });
                        
                        if (!notificationResult) {
                            console.warn('Notification creation failed (but like succeeded)');
                        }
                    } catch (notifError) {
                        console.error('Error in notification creation (non-blocking):', notifError);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error updating like on server:', error);
        // ... (error handling UI) ...
    }
}

// === FUNGSI COMMENT MODAL === 

// Di dalam fungsi openCommentModal di main.js

function openCommentModal(postId) {
    console.log('Membuka modal komentar untuk post:', postId);
    
    const user = auth.currentUser;
    if (!user) {
        alert('Silakan login untuk melihat komentar');
        return;
    }

    const modal = document.getElementById('comment-modal');
    const modalContent = document.getElementById('comment-modal-content');
    
    if (!modal || !modalContent) {
        console.error('Modal elements not found');
        return;
    }

    // Tampilkan loading
    modalContent.innerHTML = `
        <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-green-500 text-2xl mb-2"></i>
            <p class="text-gray-500">Memuat komentar...</p>
        </div>
    `;
    modal.classList.remove('hidden');

    // Setup event listeners untuk menutup modal
    const closeBtn = document.getElementById('close-comment-modal');
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }

    // Click outside to close
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    };

    // ESC key to close
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            modal.classList.add('hidden');
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);

    // Ambil data post dan komentar
    db.collection('posts').doc(postId).get()
        .then(async (doc) => {
            if (!doc.exists) {
                throw new Error('Post tidak ditemukan');
            }

            const post = doc.data();
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
            if (!post.isAnonymous && post.authorId) {
                try {
                    const userDoc = await db.collection('users').doc(post.authorId).get();
                    if (userDoc.exists && userDoc.data().avatarUrl) {
                        postAvatarUrl = userDoc.data().avatarUrl;
                    }
                } catch (error) {
                    console.error('Error loading avatar for post:', error);
                }
            }

            // Avatar untuk post
            let postAvatarHtml = '';
            if (post.isAnonymous) {
                postAvatarHtml = '<div class="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">A</div>';
            } else if (postAvatarUrl) {
                const fallbackInitial = post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U';
                postAvatarHtml = `
                    <img src="${postAvatarUrl}" 
                         alt="${post.authorName || 'User'}" 
                         class="w-10 h-10 rounded-full object-cover"
                         onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold\\'>${fallbackInitial}</div>'">
                `;
            } else {
                const fallbackInitial = post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U';
                postAvatarHtml = `<div class="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">${fallbackInitial}</div>`;
            }

            // Avatar untuk user yang sedang login
            let currentUserAvatarHtml = '';
            if (user.uid && avatarCache[user.uid]) {
                const fallbackInitial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';
                currentUserAvatarHtml = `
                    <img src="${avatarCache[user.uid]}" 
                         alt="${user.displayName || 'User'}" 
                         class="w-8 h-8 rounded-full object-cover"
                         onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold\\'>${fallbackInitial}</div>'">
                `;
            } else {
                const fallbackInitial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';
                currentUserAvatarHtml = `
                    <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        ${fallbackInitial}
                    </div>
                `;
            }

            modalContent.innerHTML = `
                <!-- Header Post -->
                <div class="mb-6 border-b pb-4">
                    <div class="flex space-x-3">
                        <div class="flex-shrink-0">
                            ${postAvatarHtml}
                        </div>
                        <div class="flex-grow">
                            <div class="flex justify-between items-start">
                                <div>
                                    <span class="font-bold text-gray-800">${post.isAnonymous ? 'Anonim' : (post.authorName || 'User')}</span>
                                    <span class="text-gray-500 text-sm ml-2">${formatTimeAgo(post.createdAt)}</span>
                                    ${post.isAnonymous || !post.authorJurusan ? '' : 
                                      `<div class="text-gray-500 text-xs mt-1">${post.authorJurusan}</div>`}
                                </div>
                            </div>
                            <p class="mt-2 text-gray-800 whitespace-pre-wrap">${post.content}</p>
                        </div>
                    </div>
                </div>

                <!-- Daftar Komentar -->
                <div class="mb-6">
                    <h4 class="font-bold text-gray-800 mb-4 flex items-center">
                        <i class="far fa-comments mr-2"></i>
                        Komentar (${comments.length})
                    </h4>
                    
                    <div id="comments-list" class="space-y-4 mb-4 max-h-96 overflow-y-auto">
                        ${commentsWithAvatars.length > 0 ? 
                            commentsWithAvatars.map(comment => {
                                const commentTime = formatTimeAgo(comment.createdAt);
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
                                                <span class="text-gray-500 text-xs">${comment.createdAt ? formatTimeAgo(comment.createdAt) : 'Baru saja'}</span>
                                            </div>
                                            <p class="text-gray-700 mt-1 text-sm">${comment.content || ''}</p>
                                        </div>
                                    </div>
                                `;
                            }).join('') : 
                            '<div class="text-center py-8 text-gray-500">Belum ada komentar. Jadilah yang pertama berkomentar!</div>'
                        }
                    </div>
                </div>

                <!-- Form Tambah Komentar -->
                <div class="border-t pt-4">
                    <div class="flex space-x-3">
                        <div class="flex-shrink-0">
                            ${currentUserAvatarHtml}
                        </div>
                        <div class="flex-grow">
                            <textarea 
                                id="comment-input" 
                                placeholder="Tulis komentar Anda..." 
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                rows="3"
                            ></textarea>
                            <div class="mt-2 flex justify-between items-center">
                                <div class="text-xs text-gray-500">
                                    Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
                                </div>
                                <button 
                                    id="submit-comment" 
                                    class="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
                                >
                                    <i class="fas fa-paper-plane mr-2"></i>Kirim Komentar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Setup enter key behavior
            const commentInput = document.getElementById('comment-input');
            if (commentInput) {
                commentInput.focus();
                commentInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addComment(postId);
                    }
                });
            }

            // Setup submit button
            const submitButton = document.getElementById('submit-comment');
            if (submitButton) {
                submitButton.onclick = () => addComment(postId);
            }

        })
        .catch((error) => {
            console.error('Error loading comments:', error);
            modalContent.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                    <p class="text-red-500">Terjadi kesalahan saat memuat komentar</p>
                    <button onclick="document.getElementById('comment-modal').classList.add('hidden')" 
                            class="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">
                        Tutup
                    </button>
                </div>
            `;
        });
}

function addComment(postId) {
    const user = auth.currentUser;
    const commentInput = document.getElementById('comment-input');
    
    if (!user) {
        alert('Silakan login untuk menambah komentar');
        return;
    }

    if (!commentInput) {
        console.error('Comment input not found');
        return;
    }

    const content = commentInput.value.trim();

    if (!content) {
        alert('Komentar tidak boleh kosong');
        return;
    }

    // Disable button selama proses
    const submitButton = document.getElementById('submit-comment');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Mengirim...';

    // Dapatkan post terlebih dahulu
     db.collection('posts').doc(postId).get()
        .then((doc) => {
            if (!doc.exists) {
                throw new Error('Post tidak ditemukan');
            }
            
            const post = doc.data();
            const currentComments = Array.isArray(post.comments) ? post.comments : [];
            
            const newComment = {
                content: content,
                authorId: user.uid,
                authorName: user.displayName || 'User',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Update post dengan komentar baru
            return db.collection('posts').doc(postId).update({
                comments: [...currentComments, newComment],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(async () => {
                // Buat notifikasi jika bukan komentar sendiri
                if (post.authorId && post.authorId !== user.uid) {
                    try {
                        await createNotification({
                            userId: post.authorId,
                            type: 'comment',
                            postId: postId,
                            postContent: post.content || ''
                        });
                    } catch (notifError) {
                        console.error('Error creating comment notification:', notifError);
                    }
                }
            });
        })
        .then(() => {
            // ... (success handling) ...
        })
        .catch((error) => {
            console.error('Error menambah komentar:', error);
            // ... (error handling) ...
        });
}

// === FUNGSI LAINNYA ===

function deletePost(postId) {
    if (!confirm('Apakah Anda yakin ingin menghapus post ini?')) {
        return;
    }
    
    db.collection('posts').doc(postId).delete()
        .then(() => {
            // Hapus elemen post dari UI
            const postElement = document.getElementById(`post-${postId}`);
            if (postElement) {
                postElement.remove();
            }
            showNotification('Post berhasil dihapus', 'success');
            
            // Update hashtag counts
            loadHashtagCounts();
        })
        .catch((error) => {
            console.error('Error menghapus post: ', error);
            showNotification('Terjadi kesalahan saat menghapus post', 'error');
        });
}

async function handleLogout() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Terjadi kesalahan saat logout: ' + error.message, 'error');
    }
}

// === FUNGSI FILTER ===

function setupFilterListeners() {
    // Event listener untuk filter hashtag di sidebar
    document.querySelectorAll('.filter-hashtag').forEach(element => {
        element.addEventListener('click', () => {
            const hashtag = element.getAttribute('data-hashtag');
            filterPostsByHashtag(hashtag);
        });
    });
    
    // Event listener untuk tombol reset filter
    const resetBtn = document.getElementById('reset-filter');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            filterPostsByHashtag('all');
        });
    }
}

function filterPostsByHashtag(hashtag) {
    currentFilter = hashtag;
    const postsContainer = document.getElementById('posts-container');
    
    if (!postsContainer) return;
    
    // Tampilkan loading
    postsContainer.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-green-500 text-2xl"></i></div>';
    
    // Update UI filter aktif
    updateActiveFilterUI(hashtag);
    
    if (hashtag === 'all') {
        // Tampilkan semua posts
        loadAllPosts();
    } else {
        // Ambil posts yang mengandung hashtag tertentu
        db.collection('posts')
            .where('hashtags', 'array-contains', hashtag.toLowerCase())
            .orderBy('createdAt', 'desc')
            .get()
            .then((querySnapshot) => {
                postsContainer.innerHTML = '';
                
                if (querySnapshot.empty) {
                    postsContainer.innerHTML = `
                        <div class="text-center py-8">
                            <i class="fas fa-hashtag text-gray-300 text-4xl mb-3"></i>
                            <p class="text-gray-500">Tidak ada post dengan hashtag #${hashtag}</p>
                            <p class="text-gray-400 text-sm mt-2">Jadilah yang pertama membuat post dengan hashtag ini!</p>
                        </div>
                    `;
                    return;
                }
                
                // Tambahkan header filter
                const filterHeader = document.createElement('div');
                filterHeader.className = 'bg-green-50 rounded-lg p-4 mb-4';
                filterHeader.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="text-green-700 font-medium">Menampilkan post dengan hashtag</span>
                            <span class="bg-green-600 text-white px-2 py-1 rounded-full text-sm">#${hashtag}</span>
                        </div>
                        <span class="text-green-600 text-sm">${querySnapshot.size} posts ditemukan</span>
                    </div>
                `;
                postsContainer.appendChild(filterHeader);
                
                // Tampilkan posts
                querySnapshot.forEach((doc) => {
                    const post = doc.data();
                    const postId = doc.id;
                    const postElement = createPostElement(post, postId);
                    postsContainer.appendChild(postElement);
                });
            })
            .catch((error) => {
                console.error('Error memfilter posts: ', error);
                postsContainer.innerHTML = '<p class="text-center text-red-500 py-8">Terjadi kesalahan saat memfilter posts</p>';
            });
    }
}

function updateActiveFilterUI(hashtag) {
    // Reset semua filter
    document.querySelectorAll('.filter-hashtag').forEach(element => {
        element.classList.remove('bg-blue-50', 'border', 'border-blue-200', 'active');
        element.classList.add('hover:bg-gray-50');
    });
    
    // Tandai filter aktif
    const activeFilter = document.querySelector(`.filter-hashtag[data-hashtag="${hashtag}"]`);
    if (activeFilter) {
        activeFilter.classList.remove('hover:bg-gray-50');
        activeFilter.classList.add('bg-blue-50', 'border', 'border-blue-200', 'active');
    }
    
    // Tampilkan/sembunyikan tombol reset filter
    const resetButton = document.getElementById('reset-filter');
    if (resetButton) {
        if (hashtag === 'all') {
            resetButton.classList.add('hidden');
        } else {
            resetButton.classList.remove('hidden');
        }
    }
}

function loadHashtagCounts() {
    // Hitung total semua posts
    db.collection('posts').get()
        .then((querySnapshot) => {
            const totalCount = querySnapshot.size;
            const allPostsElement = document.getElementById('all-posts-count');
            if (allPostsElement) {
                allPostsElement.textContent = `${totalCount} posts`;
            }
        })
        .catch((error) => {
            console.error('Error menghitung total posts:', error);
        });
    
    // Hitung posts per hashtag
    const hashtags = ['Event', 'Kolaborasi', 'Informasi', 'Kocak', 'Magang', 'Beasiswa', 'Kuliah'];
    
    hashtags.forEach(hashtag => {
        db.collection('posts')
            .where('hashtags', 'array-contains', hashtag.toLowerCase())
            .get()
            .then((querySnapshot) => {
                const count = querySnapshot.size;
                const hashtagElement = document.querySelector(`.filter-hashtag[data-hashtag="${hashtag}"] .text-gray-500`);
                if (hashtagElement) {
                    hashtagElement.textContent = `${count} posts`;
                }
            })
            .catch((error) => {
                console.error('Error menghitung hashtag:', error);
            });
    });
}

// Fungsi untuk membuka modal gambar
function openImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="relative">
            <button class="absolute -top-10 right-0 text-white text-2xl" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <img src="${imageUrl}" class="max-w-full max-h-[90vh] rounded-lg">
        </div>
    `;
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    // Close with ESC key
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
    
    document.body.appendChild(modal);
}

// Fungsi untuk membersihkan cache avatar
function clearAvatarCache() {
    for (const key in avatarCache) {
        delete avatarCache[key];
    }
}

// === FUNGSI NOTIFIKASI ===

// Fungsi untuk membuat notifikasi (sudah ada di notification.js, tapi diulang di sini untuk akses mudah)
async function createNotification(notificationData) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        // Jangan buat notifikasi jika user memberi like/comment pada post sendiri
        if (notificationData.userId === user.uid) {
            return;
        }

        // Cek apakah notifikasi sudah ada (untuk menghindari duplikat)
        const existingNotification = await db.collection('notifications')
            .where('userId', '==', notificationData.userId)
            .where('type', '==', notificationData.type)
            .where('postId', '==', notificationData.postId)
            .where('actorId', '==', user.uid)
            .limit(1)
            .get();

        if (!existingNotification.empty) {
            console.log('Notification already exists');
            return;
        }

        const notification = {
            userId: notificationData.userId,
            type: notificationData.type, // 'like' atau 'comment'
            actorId: user.uid,
            actorName: user.displayName || 'User',
            postId: notificationData.postId || null,
            postContent: notificationData.postContent || null,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('notifications').add(notification);
        console.log('Notification created:', notification);

    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Update fungsi toggleLike untuk membuat notifikasi
async function toggleLike(postId) {
    const user = auth.currentUser;
    
    if (!user) {
        alert('Silakan login untuk like post');
        return;
    }
    
    // Update UI terlebih dahulu untuk responsif
    const postElement = document.getElementById(`post-${postId}`);
    const likeBtn = postElement?.querySelector('.like-btn');
    const likeIcon = postElement?.querySelector('.like-btn i');
    const likeCountSpan = postElement?.querySelector('.like-btn span');
    
    if (likeBtn && likeIcon && likeCountSpan) {
        // Dapatkan state saat ini dari UI
        const isCurrentlyLiked = likeIcon.classList.contains('fa-heart') && 
                                !likeIcon.classList.contains('far');
        const currentCount = parseInt(likeCountSpan.textContent) || 0;
        
        // Update UI lokal terlebih dahulu
        if (isCurrentlyLiked) {
            // Unlike
            likeIcon.className = 'far fa-heart text-gray-500 text-lg';
            likeBtn.classList.remove('text-red-500');
            likeCountSpan.textContent = Math.max(0, currentCount - 1);
        } else {
            // Like
            likeIcon.className = 'fas fa-heart text-red-500 text-lg';
            likeBtn.classList.add('text-red-500');
            likeCountSpan.textContent = currentCount + 1;
        }
        
        // Tambah animasi
        likeBtn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            likeBtn.style.transform = 'scale(1)';
        }, 200);
    }
    
    // Kemudian update ke server
    try {
        const postRef = db.collection('posts').doc(postId);
        const doc = await postRef.get();
        
        if (doc.exists) {
            const post = doc.data();
            const likes = post.likes || [];
            const isLikedOnServer = likes.includes(user.uid);
            
            if (isLikedOnServer) {
                // Unlike di server
                const updatedLikes = likes.filter(uid => uid !== user.uid);
                await postRef.update({ likes: updatedLikes });
            } else {
                // Like di server
                const updatedLikes = [...likes, user.uid];
                await postRef.update({ likes: updatedLikes });
                
                // Buat notifikasi jika bukan like sendiri
                if (post.authorId !== user.uid) {
                    await createNotification({
                        userId: post.authorId,
                        type: 'like',
                        postId: postId,
                        postContent: post.content
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error updating like on server:', error);
        
        // Rollback UI jika server error
        if (likeBtn && likeIcon && likeCountSpan) {
            // Kembalikan ke state sebelumnya
            if (isCurrentlyLiked) {
                likeIcon.className = 'fas fa-heart text-red-500 text-lg';
                likeBtn.classList.add('text-red-500');
                likeCountSpan.textContent = currentCount;
            } else {
                likeIcon.className = 'far fa-heart text-gray-500 text-lg';
                likeBtn.classList.remove('text-red-500');
                likeCountSpan.textContent = currentCount;
            }
            
            showNotification('Terjadi kesalahan saat menyimpan like', 'error');
        }
    }
}

// Update fungsi addComment untuk membuat notifikasi
function addComment(postId) {
    const user = auth.currentUser;
    const commentInput = document.getElementById('comment-input');
    
    if (!user) {
        alert('Silakan login untuk menambah komentar');
        return;
    }

    if (!commentInput) {
        console.error('Comment input not found');
        return;
    }

    const content = commentInput.value.trim();

    if (!content) {
        alert('Komentar tidak boleh kosong');
        return;
    }

    // Disable button selama proses
    const submitButton = document.getElementById('submit-comment');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Mengirim...';

    // Dapatkan post terlebih dahulu
    db.collection('posts').doc(postId).get()
        .then((doc) => {
            if (!doc.exists) {
                throw new Error('Post tidak ditemukan');
            }
            
            const post = doc.data();
            const currentComments = Array.isArray(post.comments) ? post.comments : [];
            
            // Buat objek komentar baru
            const newComment = {
                content: content,
                authorId: user.uid,
                authorName: user.displayName || 'User',
                createdAt: new Date()
            };
            
            console.log('Menambah komentar:', newComment);
            
            // Update post dengan komentar baru
            return db.collection('posts').doc(postId).update({
                comments: [...currentComments, newComment]
            }).then(() => {
                // Buat notifikasi jika bukan komentar sendiri
                if (post.authorId !== user.uid) {
                    return createNotification({
                        userId: post.authorId,
                        type: 'comment',
                        postId: postId,
                        postContent: post.content
                    });
                }
            });
        })
        .then(() => {
            console.log('Komentar berhasil ditambahkan');
            
            // Reset input
            commentInput.value = '';
            
            // Tampilkan pesan sukses
            showNotification('Komentar berhasil ditambahkan!', 'success');
            
            // Muat ulang modal komentar untuk menampilkan komentar baru
            openCommentModal(postId);
            
            // Muat ulang posts di halaman utama untuk update count
            loadPosts();
        })
        .catch((error) => {
            console.error('Error menambah komentar:', error);
            showNotification('Terjadi kesalahan saat menambah komentar: ' + error.message, 'error');
        })
        .finally(() => {
            // Enable button kembali
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        });
}

// === EXPORT FUNGSI KE GLOBAL SCOPE ===
window.openCommentModal = openCommentModal;
window.addComment = addComment;
window.formatTimeAgo = formatTimeAgo;
window.filterPostsByHashtag = filterPostsByHashtag;
window.openImageModal = openImageModal;
window.handleLogout = handleLogout;