// Variabel global untuk state filter
let currentFilter = 'all';

// === FUNGSI UTAMA ===

// Cek status login
auth.onAuthStateChanged((user) => {
    if (user) {
        // User sudah login
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        document.getElementById('post-form-container').classList.remove('hidden');
        document.getElementById('profile-link').classList.remove('hidden');
        
        // Tampilkan avatar user
        const userAvatar = document.getElementById('user-avatar');
        if (user.displayName) {
            userAvatar.textContent = user.displayName.charAt(0).toUpperCase();
        }
        
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
    }
});

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
});

// Fungsi untuk membuat post baru
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
            imagePublicId: imageUrl ? imageUrl.split('/').pop().split('.')[0] : null
        };
        
        // Jika bukan anonymous, cari data jurusan user
        if (!anonymous) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                postData.authorJurusan = userData.jurusan || '';
            }
        }
        
        // Simpan post ke Firestore
        const docRef = await db.collection('posts').add(postData);
        console.log('Post berhasil dibuat dengan ID:', docRef.id);
        
        // Reset form
        if (postContent) {
            postContent.value = '';
        }
        document.getElementById('char-count').textContent = '0/280';
        document.getElementById('anonymous').checked = false;
        
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
        alert('Terjadi kesalahan saat membuat post: ' + error.message);
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
    
    // Format waktu
    const timeAgo = formatTimeAgo(post.createdAt);
    
    // Tampilkan avatar berdasarkan apakah post anonim atau tidak
    const avatar = post.isAnonymous 
        ? '<div class="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">A</div>'
        : `<div class="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">${post.authorName.charAt(0).toUpperCase()}</div>`;
    
    // Tampilkan nama author
    const authorName = post.isAnonymous ? 'Anonim' : post.authorName;
    
    // Tampilkan jurusan (jika ada dan bukan post anonim)
    const jurusanHtml = post.isAnonymous || !post.authorJurusan 
        ? '' 
        : `<div class="text-gray-500 text-xs mt-1">${post.authorJurusan}</div>`;
    
    // Tampilkan hashtag
    const hashtagsHtml = post.hashtags.map(tag => 
        `<span class="text-green-700 border rounded-full px-2 bg-green-100 border-green-200 hover:underline cursor-pointer">#${tag}</span>`
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
        ? `<button class="text-red-500 hover:text-red-700 delete-post" data-postid="${postId}">
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
                ${avatar}
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
            console.log('Comment button clicked for post:', postId);
            if (typeof window.openCommentModal === 'function') {
                window.openCommentModal(postId);
            } else {
                console.error('openCommentModal not available');
                alert('Fitur komentar sedang tidak tersedia');
            }
        });
    }
    
    // Tambahkan event listener untuk tombol hapus
    const deleteBtn = postElement.querySelector('.delete-post');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deletePost(postId));
    }
    
    return postElement;
}

// Fungsi untuk memformat konten post (menyoroti hashtag)
function formatPostContent(content) {
    return content.replace(/#(\w+)/g, '<span class="text-green-600">#$1</span>');
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

function toggleLike(postId) {
    const user = auth.currentUser;
    
    if (!user) {
        alert('Silakan login untuk like post');
        return;
    }
    
    const postRef = db.collection('posts').doc(postId);
    
    // Ambil data post terlebih dahulu
    postRef.get().then((doc) => {
        if (doc.exists) {
            const post = doc.data();
            const likes = post.likes || [];
            const isLiked = likes.includes(user.uid);
            
            if (isLiked) {
                // Unlike post
                const updatedLikes = likes.filter(uid => uid !== user.uid);
                return postRef.update({ likes: updatedLikes });
            } else {
                // Like post
                const updatedLikes = [...likes, user.uid];
                return postRef.update({ likes: updatedLikes });
            }
        }
    })
    .then(() => {
        // Muat ulang posts untuk memperbarui UI
        loadPosts();
    })
    .catch((error) => {
        console.error('Error toggling like: ', error);
    });
}

// === FUNGSI COMMENT MODAL === 

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
        .then((doc) => {
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

            modalContent.innerHTML = `
                <!-- Header Post -->
                <div class="mb-6 border-b pb-4">
                    <div class="flex space-x-3">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 ${post.isAnonymous ? 'bg-gray-400' : 'bg-yellow-500'} rounded-full flex items-center justify-center text-white font-bold">
                                ${post.isAnonymous ? 'A' : (post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U')}
                            </div>
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
                        ${comments.length > 0 ? 
                            comments.map(comment => `
                                <div class="flex space-x-3">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            ${comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    </div>
                                    <div class="flex-grow">
                                        <div class="flex justify-between items-start">
                                            <span class="font-semibold text-gray-800">${comment.authorName || 'User'}</span>
                                            <span class="text-gray-500 text-xs">${comment.createdAt ? formatTimeAgo(comment.createdAt) : 'Baru saja'}</span>
                                        </div>
                                        <p class="text-gray-700 mt-1 text-sm">${comment.content || ''}</p>
                                    </div>
                                </div>
                            `).join('') : 
                            '<div class="text-center py-8 text-gray-500">Belum ada komentar. Jadilah yang pertama berkomentar!</div>'
                        }
                    </div>
                </div>

                <!-- Form Tambah Komentar -->
                <div class="border-t pt-4">
                    <div class="flex space-x-3">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                ${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
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
            });
        })
        .then(() => {
            console.log('Komentar berhasil ditambahkan');
            
            // Reset input
            commentInput.value = '';
            
            // Tampilkan pesan sukses
            alert('Komentar berhasil ditambahkan!');
            
            // Muat ulang modal komentar untuk menampilkan komentar baru
            openCommentModal(postId);
            
            // Muat ulang posts di halaman utama untuk update count
            loadPosts();
        })
        .catch((error) => {
            console.error('Error menambah komentar:', error);
            alert('Terjadi kesalahan saat menambah komentar: ' + error.message);
        })
        .finally(() => {
            // Enable button kembali
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
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
        })
        .catch((error) => {
            console.error('Error menghapus post: ', error);
            alert('Terjadi kesalahan saat menghapus post');
        });
}

// === FUNGSI FILTER ===

function setupFilterListeners() {
    // Event listener untuk filter hashtag
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

// Di main.js tambahkan:
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
    document.body.appendChild(modal);
}



// === EXPORT FUNGSI KE GLOBAL SCOPE ===
window.openCommentModal = openCommentModal;
window.addComment = addComment;
window.formatTimeAgo = formatTimeAgo;
window.filterPostsByHashtag = filterPostsByHashtag;
window.openImageModal = openImageModal;