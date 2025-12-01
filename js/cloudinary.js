// js/cloudinary.js
class CloudinaryManager {
    constructor() {
        this.cloudName = 'dplvjwmvk';
        this.uploadPreset = 'saintek-buzz-upload';
        this.selectedImageUrl = null;
        this.selectedImageFile = null;
        this.init();
    }

    init() {
        console.log('CloudinaryManager initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const imageInput = document.getElementById('post-image');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.handleImageSelect(e);
            });
        }

        // Remove image button (akan di-attach setelah preview dibuat)
        this.setupRemoveButton();
    }

    setupRemoveButton() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'remove-image' || e.target.closest('#remove-image')) {
                e.preventDefault();
                this.removeImage();
            }
        });
    }

    handleImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('File selected:', file.name, 'Size:', file.size);

        // Validasi file
        if (!this.validateFile(file)) {
            return;
        }

        // Simpan file
        this.selectedImageFile = file;

        // Tampilkan preview
        this.showPreview(file);

        // Upload ke Cloudinary
        this.uploadToCloudinary(file);
    }

    validateFile(file) {
        // Validasi ukuran file (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('Ukuran file maksimal 5MB');
            this.removeImage();
            return false;
        }

        // Validasi tipe file
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP');
            this.removeImage();
            return false;
        }

        return true;
    }

    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.updatePreviewUI(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    updatePreviewUI(imageSrc) {
        const previewContainer = document.getElementById('image-preview-container');
        const imageUploadSection = document.getElementById('image-upload-section');
        
        if (!previewContainer || !imageUploadSection) return;

        // Tambah preview container jika belum ada
        if (!previewContainer.querySelector('#image-preview')) {
            previewContainer.innerHTML = `
                <div class="mt-3">
                    <div class="relative inline-block">
                        <img id="image-preview" class="w-32 h-32 object-cover rounded-lg border border-gray-300">
                        <button type="button" id="remove-image" 
                                class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-600">
                            ×
                        </button>
                    </div>
                    <div id="upload-status" class="text-xs text-gray-600 mt-1"></div>
                </div>
            `;
        }

        // Set gambar preview
        const previewImg = document.getElementById('image-preview');
        if (previewImg) {
            previewImg.src = imageSrc;
        }

        // Tampilkan container
        previewContainer.classList.remove('hidden');
        
        // Update status
        this.updateUploadStatus('Mempersiapkan upload...');
    }

    async uploadToCloudinary(file) {
        try {
            console.log('Starting upload to Cloudinary...');
            this.updateUploadStatus('Mengupload gambar...');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('cloud_name', this.cloudName);
            formData.append('timestamp', (Date.now() / 1000).toString());

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Cloudinary upload successful:', data);

            if (data.secure_url) {
                this.selectedImageUrl = data.secure_url;
                this.updateUploadStatus('Upload berhasil! ✓', 'text-green-600');
                
                // Tampilkan alert kecil atau notifikasi
                this.showSuccessMessage('Gambar berhasil diupload!');
            } else {
                throw new Error('Upload gagal: URL tidak ditemukan');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            this.updateUploadStatus('Upload gagal! ✗', 'text-red-600');
            alert('Gagal mengupload gambar: ' + error.message);
            this.removeImage();
        }
    }

    updateUploadStatus(message, colorClass = 'text-gray-600') {
        const statusElement = document.getElementById('upload-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `text-xs ${colorClass} mt-1`;
        }
    }

    showSuccessMessage(message) {
        // Buat notifikasi kecil
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.textContent = message;
        notification.style.animation = 'fadeInOut 3s ease-in-out';
        
        // Tambah style animasi
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(20px); }
                10% { opacity: 1; transform: translateY(0); }
                90% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(20px); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Hapus setelah 3 detik
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 3000);
    }

    removeImage() {
        // Reset semua state
        this.selectedImageUrl = null;
        this.selectedImageFile = null;
        
        // Reset UI
        const previewContainer = document.getElementById('image-preview-container');
        const imageInput = document.getElementById('post-image');
        
        if (previewContainer) {
            previewContainer.classList.add('hidden');
            previewContainer.innerHTML = '';
        }
        
        if (imageInput) {
            imageInput.value = '';
        }
        
        console.log('Image removed');
    }

    getImageData() {
        return {
            imageUrl: this.selectedImageUrl,
            imagePublicId: this.selectedImageUrl ? this.selectedImageUrl.split('/').pop().split('.')[0] : null
        };
    }

    reset() {
        this.removeImage();
    }
}

// Inisialisasi ketika DOM siap
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing CloudinaryManager...');
    window.cloudinaryManager = new CloudinaryManager();
});

// Export fungsi helper
window.getImageData = () => {
    return window.cloudinaryManager ? window.cloudinaryManager.getImageData() : null;
};