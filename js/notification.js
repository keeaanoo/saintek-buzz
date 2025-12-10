class NotificationManager {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        // Cek status login
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.user = user;
                this.handleUserAuthenticated(user);
            } else {
                window.location.href = 'login.html';
            }
        });

        this.setupEventListeners();
        this.setupSidebarInfo();
    }

    async handleUserAuthenticated(user) {
        try {
            // Update sidebar info
            this.updateSidebarInfo(user);
            
            // Load notifications
            await this.loadNotifications();
            
            // Setup real-time listener untuk notifikasi baru
            this.setupRealtimeListener();
            
        } catch (error) {
            console.error('Error handling authenticated user:', error);
            // Tampilkan pesan error yang lebih user-friendly
            if (error.code === 'permission-denied') {
                this.showError('Tidak memiliki izin untuk mengakses notifikasi');
            } else {
                this.showError('Terjadi kesalahan saat memuat notifikasi');
            }
        }
    }

    setupEventListeners() {
        // Mark all as read button
        const markAllReadBtn = document.getElementById('mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    setupSidebarInfo() {
        const user = auth.currentUser;
        if (user) {
            const sidebarName = document.getElementById('profile-sidebar-name');
            const userAvatar = document.getElementById('user-avatar');
            
            if (sidebarName && user.displayName) {
                sidebarName.textContent = user.displayName;
            }
            
            if (userAvatar && user.displayName) {
                userAvatar.textContent = user.displayName.charAt(0).toUpperCase();
            }
        }
    }

    updateSidebarInfo(user) {
        const sidebarName = document.getElementById('profile-sidebar-name');
        const userAvatar = document.getElementById('user-avatar');

        if (sidebarName && user.displayName) {
            sidebarName.textContent = user.displayName;
        }

        if (userAvatar && user.displayName) {
            userAvatar.textContent = user.displayName.charAt(0).toUpperCase();
        }
    }

    async loadNotifications() {
        const container = document.getElementById('notifications-container');
        const noNotifications = document.getElementById('no-notifications');
        
        if (!container) return;

        try {
            // Show loading
            container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-green-500 text-2xl"></i><p class="text-gray-500 mt-2">Memuat notifikasi...</p></div>';

            // Load notifications from Firestore dengan error handling
            const querySnapshot = await db.collection('notifications')
                .where('userId', '==', this.user.uid)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get()
                .catch(error => {
                    console.error('Firestore error:', error);
                    throw error;
                });

            if (querySnapshot.empty) {
                container.classList.add('hidden');
                noNotifications?.classList.remove('hidden');
                return;
            }

            let notificationsHTML = '';
            let hasNotifications = false;
            
            querySnapshot.forEach((doc) => {
                try {
                    const notification = doc.data();
                    const notificationId = doc.id;
                    
                    // Validasi data notifikasi
                    if (notification && notification.userId === this.user.uid) {
                        notificationsHTML += this.createNotificationElement(notification, notificationId);
                        hasNotifications = true;
                    }
                } catch (error) {
                    console.error('Error processing notification:', error);
                }
            });

            if (!hasNotifications) {
                container.classList.add('hidden');
                noNotifications?.classList.remove('hidden');
                return;
            }

            container.innerHTML = notificationsHTML;
            container.classList.remove('hidden');
            noNotifications?.classList.add('hidden');

            // Add click event listeners to notifications
            this.addNotificationClickListeners();

        } catch (error) {
            console.error('Error loading notifications:', error);
            
            let errorMessage = 'Terjadi kesalahan saat memuat notifikasi';
            if (error.code === 'permission-denied') {
                errorMessage = 'Tidak memiliki izin untuk mengakses notifikasi';
            } else if (error.code === 'failed-precondition') {
                errorMessage = 'Index belum dibuat, silakan refresh halaman';
            }
            
            container.innerHTML = `<div class="text-center py-8 text-red-500">${errorMessage}</div>`;
        }
    }

    setupRealtimeListener() {
        try {
            // Listen for new notifications in real-time dengan error handling
            const unsubscribe = db.collection('notifications')
                .where('userId', '==', this.user.uid)
                .orderBy('createdAt', 'desc')
                .limit(10) // Limit untuk performance
                .onSnapshot(
                    (snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'added') {
                                // Reload notifications when new one is added
                                this.loadNotifications();
                                
                                // Update notification badge
                                this.updateNotificationBadge();
                            }
                        });
                    },
                    (error) => {
                        console.error('Realtime listener error:', error);
                        // Nonaktifkan real-time listener jika ada error permission
                        if (error.code === 'permission-denied') {
                            unsubscribe(); // Unsubscribe dari listener
                        }
                    }
                );

            // Simpan unsubscribe function untuk cleanup
            this.unsubscribeListener = unsubscribe;

        } catch (error) {
            console.error('Error setting up realtime listener:', error);
        }
    }

    createNotificationElement(notification, notificationId) {
        try {
            const timeAgo = this.formatTimeAgo(notification.createdAt);
            const isUnread = notification.read === false;
            
            let icon = 'fas fa-bell';
            let iconColor = 'text-blue-500';
            let actionText = '';
            
            if (notification.type === 'like') {
                icon = 'fas fa-heart';
                iconColor = 'text-red-500';
                actionText = 'menyukai post Anda';
            } else if (notification.type === 'comment') {
                icon = 'fas fa-comment';
                iconColor = 'text-green-500';
                actionText = 'mengomentari post Anda';
            } else {
                // Fallback untuk tipe notifikasi yang tidak dikenal
                actionText = 'berinteraksi dengan post Anda';
            }

            // Validasi data
            const actorName = notification.actorName || 'Pengguna';
            const postContent = notification.postContent ? 
                this.truncateText(notification.postContent, 100) : '';

            return `
                <div class="notification-item px-6 py-4 ${isUnread ? 'unread' : ''}" 
                     data-id="${notificationId}"
                     data-postid="${notification.postId || ''}">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 relative">
                            <div class="w-10 h-10 ${iconColor} rounded-full flex items-center justify-center bg-gray-100">
                                <i class="${icon}"></i>
                            </div>
                            ${isUnread ? '<div class="notification-dot absolute -top-1 -right-1"></div>' : ''}
                        </div>
                        <div class="flex-grow">
                            <div class="flex justify-between">
                                <div>
                                    <span class="font-bold text-gray-800">${actorName}</span>
                                    <span class="text-gray-600 ml-1">${actionText}</span>
                                </div>
                                <span class="text-gray-500 text-sm">${timeAgo}</span>
                            </div>
                            ${postContent ? `
                                <div class="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p class="text-gray-600 text-sm">"${postContent}"</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error creating notification element:', error);
            return '';
        }
    }

    // Di dalam fungsi addNotificationClickListeners di notification.js

addNotificationClickListeners() {
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            const notificationId = item.getAttribute('data-id');
            const postId = item.getAttribute('data-postid');
            const notificationType = item.getAttribute('data-type');
            
            if (!notificationId || !postId) return;
            
            try {
                // Mark as read
                await db.collection('notifications').doc(notificationId).update({
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Update UI
                item.classList.remove('unread');
                const dot = item.querySelector('.notification-dot');
                if (dot) dot.remove();

                // Update notification badge
                this.updateNotificationBadge();
                this.updateGlobalNotificationBadge();

                // Dapatkan data post untuk mendapatkan authorId
                const postDoc = await db.collection('posts').doc(postId).get();
                if (postDoc.exists) {
                    const post = postDoc.data();
                    const authorId = post.authorId;
                    
                    // Redirect ke profile author dengan parameter post
                    setTimeout(() => {
                        // Jika user adalah author post (notifikasi dari post sendiri)
                        if (this.user.uid === authorId) {
                            // Redirect ke profile sendiri dengan post highlight
                            window.location.href = `profile.html?post=${postId}&highlight=true`;
                        } else {
                            // Untuk testing, kita arahkan ke profile sendiri dulu
                            // Nanti bisa dikembangkan untuk melihat profile orang lain
                            window.location.href = `profile.html?post=${postId}&highlight=true`;
                        }
                    }, 300);
                } else {
                    // Fallback ke profile user sendiri
                    window.location.href = `profile.html`;
                }

            } catch (error) {
                console.error('Error handling notification click:', error);
                
                // Fallback: langsung redirect ke profile
                window.location.href = `profile.html`;
            }
        });
    });
}

    async markAllAsRead() {
        if (!confirm('Tandai semua notifikasi sebagai sudah dibaca?')) return;

        try {
            // Load all unread notifications
            const querySnapshot = await db.collection('notifications')
                .where('userId', '==', this.user.uid)
                .where('read', '==', false)
                .get()
                .catch(error => {
                    console.error('Error fetching unread notifications:', error);
                    throw error;
                });

            if (querySnapshot.empty) {
                this.showTempMessage('Tidak ada notifikasi yang belum dibaca', 'info');
                return;
            }

            // Update all to read menggunakan batch write
            const batch = db.batch();
            const updates = [];
            
            querySnapshot.forEach((doc) => {
                const notificationRef = db.collection('notifications').doc(doc.id);
                batch.update(notificationRef, {
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                updates.push(doc.id);
            });

            // Eksekusi batch
            await batch.commit();
            console.log(`Marked ${updates.length} notifications as read`);

            // Update UI lokal tanpa reload
            updates.forEach(notificationId => {
                const element = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
                if (element) {
                    element.classList.remove('unread');
                    const dot = element.querySelector('.notification-dot');
                    if (dot) dot.remove();
                }
            });

            // Update notification badge
            this.updateNotificationBadge();

            this.showTempMessage('Semua notifikasi telah ditandai sebagai sudah dibaca', 'success');

        } catch (error) {
            console.error('Error marking all as read:', error);
            
            let errorMessage = 'Terjadi kesalahan';
            if (error.code === 'permission-denied') {
                errorMessage = 'Tidak memiliki izin untuk memperbarui notifikasi';
            }
            
            this.showTempMessage(errorMessage, 'error');
        }
    }

    updateNotificationBadge() {
        try {
            // Hitung notifikasi yang belum dibaca di halaman saat ini
            const unreadElements = document.querySelectorAll('.notification-item.unread');
            const unreadCount = unreadElements.length;
            
            // Update badge di halaman notifikasi
            const badge = document.getElementById('notification-badge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.classList.remove('hidden');
                    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                } else {
                    badge.classList.add('hidden');
                }
            }
            
            // Simpan count di localStorage untuk halaman lain
            localStorage.setItem('notificationBadgeCount', unreadCount);
            
        } catch (error) {
            console.error('Error updating notification badge:', error);
        }
    }

    formatTimeAgo(timestamp) {
        if (!timestamp) return 'Baru saja';
        
        let date;
        try {
            if (timestamp.toDate) {
                date = timestamp.toDate();
            } else if (timestamp instanceof Date) {
                date = timestamp;
            } else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            } else {
                return 'Baru saja';
            }
            
            // Validasi date
            if (isNaN(date.getTime())) {
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
            } else if (diffInSeconds < 604800) {
                return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
            } else {
                return date.toLocaleDateString('id-ID');
            }
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'Baru saja';
        }
    }

    truncateText(text, maxLength) {
        if (!text || typeof text !== 'string') return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showTempMessage(message, type = 'info') {
        try {
            const messageElement = document.createElement('div');
            messageElement.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
                type === 'success' ? 'bg-green-500 text-white' :
                type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
            }`;
            messageElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
                    <span>${message}</span>
                </div>
            `;

            document.body.appendChild(messageElement);

            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 3000);
        } catch (error) {
            console.error('Error showing temp message:', error);
        }
    }

    showError(message) {
        const container = document.getElementById('notifications-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-3"></i>
                    <p class="text-red-500">${message}</p>
                    <button onclick="location.reload()" class="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                        Coba Lagi
                    </button>
                </div>
            `;
        }
    }

    cleanup() {
        // Unsubscribe dari listener jika ada
        if (this.unsubscribeListener) {
            this.unsubscribeListener();
        }
    }

    async handleLogout() {
        try {
            // Cleanup sebelum logout
            this.cleanup();
            
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Terjadi kesalahan saat logout: ' + error.message);
        }
    }
}

// Fungsi untuk membuat notifikasi
// Update fungsi createNotification di notification.js

async function createNotification(notificationData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('User not logged in, skipping notification');
            return false;
        }

        if (notificationData.userId === user.uid) {
            console.log('Self action, skipping notification');
            return false;
        }

        if (!notificationData.userId || !notificationData.type || !notificationData.postId) {
            console.error('Invalid notification data:', notificationData);
            return false;
        }

        // Dapatkan data post untuk menyimpan author info
        let postAuthorId = null;
        let postAuthorName = null;
        
        try {
            const postDoc = await db.collection('posts').doc(notificationData.postId).get();
            if (postDoc.exists) {
                const post = postDoc.data();
                postAuthorId = post.authorId;
                postAuthorName = post.authorName;
            }
        } catch (error) {
            console.error('Error getting post data for notification:', error);
        }

        // Cek apakah notifikasi sudah ada (untuk menghindari duplikat)
        if (notificationData.type === 'like') {
            const existingNotification = await db.collection('notifications')
                .where('userId', '==', notificationData.userId)
                .where('type', '==', 'like')
                .where('postId', '==', notificationData.postId)
                .where('actorId', '==', user.uid)
                .limit(1)
                .get();

            if (!existingNotification.empty) {
                console.log('Like notification already exists, skipping');
                return false;
            }
        }

        // Data notifikasi yang akan disimpan
        const notification = {
            userId: notificationData.userId,
            type: notificationData.type,
            actorId: user.uid,
            actorName: user.displayName || 'User',
            postId: notificationData.postId,
            postAuthorId: postAuthorId, // Simpan author post
            postAuthorName: postAuthorName, // Simpan nama author
            postContent: notificationData.postContent ? 
                String(notificationData.postContent).substring(0, 200) : null,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('notifications').add(notification);
        console.log('Notification created successfully:', {
            id: docRef.id,
            type: notification.type,
            to: notification.userId,
            from: notification.actorName,
            postAuthor: notification.postAuthorName
        });
        
        return true;

    } catch (error) {
        console.error('Error creating notification:', error);
        
        if (error.code === 'permission-denied') {
            console.error('Permission denied for creating notification');
        }
        
        return false;
    }
}

// Inisialisasi
let notificationManager;

document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
});

// Cleanup saat halaman ditutup
window.addEventListener('beforeunload', () => {
    if (notificationManager) {
        notificationManager.cleanup();
    }
});

// Export fungsi createNotification
window.createNotification = createNotification;